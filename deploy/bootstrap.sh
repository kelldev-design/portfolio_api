# shellcheck shell=bash
#
# portfolio-api first-boot bootstrap. Runs as root via EC2 user-data; Terraform
# prepends the environment variables it needs (see deploy/terraform/main.tf).
#
# Idempotent enough to re-run by hand, but its real contract is "a blank AL2023
# arm64 instance becomes a working API host". Debug at
# /var/log/cloud-init-output.log.

set -euxo pipefail

: "${REPO_URL:?}"
: "${REPO_BRANCH:=main}"
: "${AWS_REGION:?}"
: "${APP_SECRET_ID:?}"
: "${NODE_VERSION:?}"
: "${SWAP_SIZE_MB:=2048}"
: "${SERVER_NAME:?}"
: "${DATA_DEVICE:=/dev/nvme1n1}"

APP_USER=ec2-user
APP_HOME=/home/${APP_USER}
APP_DIR=${APP_HOME}/portfolio_api
DATA_DIR=/var/lib/portfolio-api

###############################################################################
# Packages. (ssm-agent ships preinstalled and enabled on AL2023.)
###############################################################################
dnf -y update
dnf -y install git nginx tar xz findutils

###############################################################################
# Swap. 512MB of RAM is fine for the running process but not for `npm install`
# or a webpack build, both of which happen on the box during a deploy.
###############################################################################
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count="${SWAP_SIZE_MB}"
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

###############################################################################
# Node, pinned, from nodejs.org — AL2023's repo package name/version moves
# around, and the arm64 tarball is deterministic.
###############################################################################
if [ "$(/usr/local/bin/node -v 2>/dev/null || true)" != "v${NODE_VERSION}" ]; then
  TARBALL="node-v${NODE_VERSION}-linux-arm64.tar.xz"
  cd /tmp
  curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}"
  curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"
  grep " ${TARBALL}\$" SHASUMS256.txt | sha256sum -c -
  tar -xJf "${TARBALL}" -C /usr/local --strip-components=1 \
    --exclude=CHANGELOG.md --exclude=LICENSE --exclude=README.md
  rm -f "${TARBALL}" SHASUMS256.txt
fi
/usr/local/bin/npm install -g pm2@5

###############################################################################
# Data volume: the SQLite database lives here, NOT in the git checkout. The
# volume is `prevent_destroy` in Terraform and snapshotted daily, so the
# instance is disposable and the database is not.
###############################################################################
for _ in $(seq 1 60); do
  [ -b "${DATA_DEVICE}" ] && break
  sleep 5
done
[ -b "${DATA_DEVICE}" ] || { echo "data volume ${DATA_DEVICE} never attached"; exit 1; }

# Only format a genuinely blank volume — never one that already carries the DB.
if ! blkid "${DATA_DEVICE}"; then
  mkfs.xfs "${DATA_DEVICE}"
fi
mkdir -p "${DATA_DIR}"
DATA_UUID=$(blkid -s UUID -o value "${DATA_DEVICE}")
grep -q "${DATA_UUID}" /etc/fstab || \
  echo "UUID=${DATA_UUID} ${DATA_DIR} xfs defaults,nofail 0 2" >> /etc/fstab
mount -a
chown "${APP_USER}:${APP_USER}" "${DATA_DIR}"

###############################################################################
# App checkout + env. The secret's VALUE is set out-of-band, so it is never in
# Terraform state; DATABASE_URL is appended here because it points at the data
# volume, which only this script knows about.
###############################################################################
if [ ! -d "${APP_DIR}/.git" ]; then
  sudo -u "${APP_USER}" git clone --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

aws secretsmanager get-secret-value \
  --region "${AWS_REGION}" --secret-id "${APP_SECRET_ID}" \
  --query SecretString --output text > "${APP_DIR}/.env"
echo "DATABASE_URL=\"file:${DATA_DIR}/prod.db\"" >> "${APP_DIR}/.env"
echo 'NODE_ENV="production"' >> "${APP_DIR}/.env"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
chmod 600 "${APP_DIR}/.env"

install -m 0755 "${APP_DIR}/deploy/deploy.sh" /usr/local/bin/portfolio-api-deploy

###############################################################################
# Build, migrate, start. deploy.sh is the same path a CI deploy takes, so first
# boot and every subsequent release run identical steps.
###############################################################################
sudo -u "${APP_USER}" -H /usr/local/bin/portfolio-api-deploy --first-boot

# Survive a reboot. The hand-built box never had this: no pm2 systemd unit and
# no saved process list, so a stop/start would have taken the API down for good.
env PATH="$PATH:/usr/local/bin" pm2 startup systemd -u "${APP_USER}" --hp "${APP_HOME}"
sudo -u "${APP_USER}" -H /usr/local/bin/pm2 save
systemctl enable "pm2-${APP_USER}"

###############################################################################
# nginx. TLS terminates at CloudFront; the origin speaks plain HTTP on :80 and
# the security group only admits CloudFront's origin-facing ranges.
###############################################################################
cat > /etc/nginx/conf.d/portfolio-api.conf <<NGINX
server {
    # Both stacks, both default_server. AL2023 ships its own :80 server block
    # inside /etc/nginx/nginx.conf (NOT conf.d/default.conf) which listens on
    # IPv4 and IPv6 and serves static files; claiming default_server on both
    # here neutralises it without editing the vendor config. Its server_name is
    # `_`, which never matches a real Host header.
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${SERVER_NAME};

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;

        # A cold FRED refresh re-upserts ~155k observations synchronously inside
        # the request and takes well over nginx's 60s default. The warm timer
        # below should keep that off the request path; this is the safety net.
        proxy_connect_timeout 10s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

nginx -t
systemctl enable --now nginx
systemctl reload nginx

###############################################################################
# Market data warmer. FRED series go stale after FRED_TTL_HOURS (default 12),
# and the refresh runs inside whichever request arrives first — a minute-plus
# wait for a real visitor, twice a day. Warming on a shorter interval keeps the
# refresh off the request path.
#
# This is a mitigation, not a fix: the app refetches every series' full history
# rather than only observations after the last stored date.
###############################################################################
cat > /etc/systemd/system/portfolio-api-warm.service <<'UNIT'
[Unit]
Description=Warm the portfolio-api FRED market data cache
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -sS --max-time 600 -o /dev/null http://127.0.0.1:4000   -H 'content-type: application/json'   --data-raw '{"query":"{marketSeries{fredId}}"}'
UNIT

cat > /etc/systemd/system/portfolio-api-warm.timer <<'UNIT'
[Unit]
Description=Warm portfolio-api market data ahead of the 12h FRED TTL

[Timer]
OnBootSec=3min
OnUnitActiveSec=6h
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now portfolio-api-warm.timer
