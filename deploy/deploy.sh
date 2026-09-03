#!/usr/bin/env bash
#
# portfolio-api release. Runs on the instance as ec2-user — invoked by
# bootstrap.sh at first boot, and by CI over SSM for every release
# (.github/workflows/deploy.yml). Deploying by hand is the same one command:
#
#   aws ssm send-command --document-name AWS-RunShellScript \
#     --targets Key=instanceids,Values=<instance-id> \
#     --parameters 'commands=["sudo -u ec2-user -H /usr/local/bin/portfolio-api-deploy"]'

set -euo pipefail

APP_DIR=${APP_DIR:-/home/ec2-user/portfolio_api}
DATA_DIR=${DATA_DIR:-/var/lib/portfolio-api}
PM2_NAME=${PM2_NAME:-portfolio-api}
REPO_BRANCH=${REPO_BRANCH:-main}
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

npm ci
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

npm run build

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
