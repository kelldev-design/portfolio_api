#!/usr/bin/env bash
#
# portfolio-api release. Runs on the instance as ec2-user — invoked by
# bootstrap.sh at first boot, and by CI over SSM for every release
# (.github/workflows/deploy.yml).
#
# Two modes, decided by whether BUNDLE_URL is set:
#
#   BUNDLE_URL set    CI already built dist/index.js on a runner and published it
#                     as a release asset. Install runtime dependencies only, then
#                     download the bundle. This is what every CI deploy does.
#
#   BUNDLE_URL unset  Build here instead: full install, then webpack. Slow on a
#                     t4g.nano — 26 minutes when its CPU credits run dry — but it
#                     keeps first boot and hand-deploys working with no artifact
#                     to hand, and is the fallback if a release asset is missing.
#
# Deploying by hand is one command, and takes the slow path:
#
#   aws ssm send-command --document-name AWS-RunShellScript \
#     --targets Key=instanceids,Values=<instance-id> \
#     --parameters 'commands=["sudo -u ec2-user -H /usr/local/bin/portfolio-api-deploy"]'

set -euo pipefail

APP_DIR=${APP_DIR:-/home/ec2-user/portfolio_api}
DATA_DIR=${DATA_DIR:-/var/lib/portfolio-api}
PM2_NAME=${PM2_NAME:-portfolio-api}
REPO_BRANCH=${REPO_BRANCH:-main}
BUNDLE_URL=${BUNDLE_URL:-}
export PATH="/usr/local/bin:${PATH}"

FIRST_BOOT=0
[ "${1:-}" = "--first-boot" ] && FIRST_BOOT=1

cd "${APP_DIR}"

###############################################################################
# Back up the database before anything touches it. Daily EBS snapshots cover
# the disaster case; this covers the "that migration was wrong" case.
###############################################################################
if [ -f "${DATA_DIR}/prod.db" ]; then
  mkdir -p "${DATA_DIR}/backups"
  cp "${DATA_DIR}/prod.db" "${DATA_DIR}/backups/prod.db.$(date +%Y%m%d%H%M%S)"
  # Keep the last 10.
  ls -1t "${DATA_DIR}"/backups/prod.db.* | tail -n +11 | xargs -r rm --
fi

if [ "${FIRST_BOOT}" -eq 0 ]; then
  git fetch --prune origin
  git reset --hard "origin/${REPO_BRANCH}"
fi

###############################################################################
# .env, re-read from Secrets Manager on every deploy so that changing the
# secret and redeploying is all a rotation takes. bootstrap.sh writes it once at
# first boot; before this, nothing ever rewrote it, so a changed secret never
# reached the running app. The instance role grants GetSecretValue on this one
# secret. A failed fetch keeps the existing .env rather than failing the deploy,
# but says so loudly, because the app is then running on the old values.
###############################################################################
APP_SECRET_ID=${APP_SECRET_ID:-portfolio-api/env}
if [ -z "${AWS_REGION:-}" ]; then
  imds_token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token \
    -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' || true)
  AWS_REGION=$(curl -fsS -H "X-aws-ec2-metadata-token: ${imds_token}" \
    http://169.254.169.254/latest/meta-data/placement/region || true)
fi

tmp_env=$(mktemp "${APP_DIR}/.env.XXXXXX")
chmod 600 "${tmp_env}"
if aws secretsmanager get-secret-value --region "${AWS_REGION}" --secret-id "${APP_SECRET_ID}" \
     --query SecretString --output text > "${tmp_env}" && [ -s "${tmp_env}" ]; then
  echo "DATABASE_URL=\"file:${DATA_DIR}/prod.db\"" >> "${tmp_env}"
  echo 'NODE_ENV="production"' >> "${tmp_env}"
  mv "${tmp_env}" .env
  echo ".env refreshed from ${APP_SECRET_ID}"
else
  rm -f "${tmp_env}"
  echo "WARNING: could not read ${APP_SECRET_ID}; keeping the existing .env" >&2
fi

###############################################################################
# Dependencies. With a prebuilt bundle the 16 devDependencies — webpack,
# ts-loader, typescript, the codegen toolchain — are dead weight on this box,
# and skipping them is most of what makes a CI-built deploy quick. The Prisma
# CLI is a runtime dependency, not a dev one, so `migrate deploy` and `generate`
# below survive --omit=dev.
###############################################################################
if [ -n "${BUNDLE_URL}" ]; then
  npm ci --omit=dev
else
  npm ci
fi

npx prisma generate

# `migrate deploy`, never `migrate dev`. The dev command is interactive and
# will offer to reset the database — see docs/DEPLOY.md.
npx prisma migrate deploy

# First boot only: an empty database gets the portfolio content from the seed,
# which is a verified exact mirror of production (all 21 items, every field).
# This is why the cutover never has to copy the live database around. Market
# rates data is deliberately not seeded — the FRED layer refetches it on TTL.
if [ "${FIRST_BOOT}" -eq 1 ]; then
  item_count=$(node -e '
    const { PrismaClient } = require("@prisma/client")
    const p = new PrismaClient()
    p.portfolioItem.count()
      .then(n => { console.log(n); return p.$disconnect() })
      .catch(() => console.log("error"))
  ')
  if [ "${item_count}" = "0" ]; then
    echo "empty database on first boot — seeding"
    npx prisma db seed
  else
    echo "database already has ${item_count} portfolio items — not seeding"
  fi
fi

###############################################################################
# The bundle. Downloaded to a temporary file and moved into place only once it
# has arrived intact, so a truncated transfer cannot leave a half-written
# dist/index.js for pm2 to start. dist/ is gitignored, so the reset above leaves
# the previous bundle untouched on disk and a failed download falls back to
# building rather than to nothing.
###############################################################################
if [ -n "${BUNDLE_URL}" ]; then
  echo "fetching bundle: ${BUNDLE_URL}"
  mkdir -p dist
  tmp_bundle=$(mktemp)
  trap 'rm -f "${tmp_bundle}"' EXIT

  if ! curl -fsSL --retry 3 --retry-delay 2 --max-time 120 -o "${tmp_bundle}" "${BUNDLE_URL}"; then
    echo "bundle download failed; falling back to building here" >&2
    npm ci
    npm run build
  elif [ ! -s "${tmp_bundle}" ]; then
    echo "bundle downloaded empty; falling back to building here" >&2
    npm ci
    npm run build
  else
    mv "${tmp_bundle}" dist/index.js
  fi
else
  npm run build
fi

if pm2 describe "${PM2_NAME}" > /dev/null 2>&1; then
  pm2 restart "${PM2_NAME}" --update-env
else
  # --cwd matters: the app's dotenv call resolves .env relative to the working
  # directory, and .env lives at the repo root, not in dist/.
  pm2 start dist/index.js --name "${PM2_NAME}" --cwd "${APP_DIR}"
fi
pm2 save

###############################################################################
# Health check. Fail the deploy loudly rather than leaving a dead process up.
###############################################################################
for i in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:4000/ \
       -H 'content-type: application/json' \
       -d '{"query":"{__typename}"}' | grep -q '"Query"'; then
    echo "deploy ok: $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 3
done

echo "health check failed after restart; recent logs:" >&2
pm2 logs "${PM2_NAME}" --lines 50 --nostream >&2 || true
exit 1
