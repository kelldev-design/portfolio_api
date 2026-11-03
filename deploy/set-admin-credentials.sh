#!/usr/bin/env bash
#
# Sets the admin login (ADMIN_USERNAME, ADMIN_PASSWORD_HASH, JWT_SECRET) — in the
# production secret by default, or in the local .env with --local. Run it from your
# own machine, not the instance. See docs/AUTH.md.
#
#   deploy/set-admin-credentials.sh                 production: update portfolio-api/env
#   deploy/set-admin-credentials.sh --local         local dev: update ./.env
#   deploy/set-admin-credentials.sh --rotate-jwt    also replace JWT_SECRET
#
# The password is read with echo off and piped to bcrypt over stdin, so the
# plaintext never lands in a file, in shell history or in a process listing. Only
# the hash is stored. JWT_SECRET is kept if one already exists, unless
# --rotate-jwt is passed; rotating it logs out every session.
#
# Production changes take effect on the next deploy, which re-reads the secret
# into .env: `gh workflow run deploy.yml`, or push to main.

set -euo pipefail

AWS_PROFILE=${AWS_PROFILE:-kelldev-mgmt}
AWS_REGION=${AWS_REGION:-us-east-1}
APP_SECRET_ID=${APP_SECRET_ID:-portfolio-api/env}
export AWS_PROFILE AWS_REGION

LOCAL=0
ROTATE_JWT=0
for arg in "$@"; do
  case "${arg}" in
    --local) LOCAL=1 ;;
    --rotate-jwt) ROTATE_JWT=1 ;;
    *) echo "unknown option: ${arg}" >&2; exit 2 ;;
  esac
done

# Run from the repo root, so `require('bcryptjs')` resolves and --local finds .env.
cd "$(dirname "$0")/.."
if [ ! -d node_modules/bcryptjs ]; then
  echo "bcryptjs is not installed; run npm ci first" >&2
  exit 1
fi

read -r -p "Admin username: " username
if [ -z "${username}" ] || [[ "${username}" =~ [\"\'[:space:]] ]]; then
  echo "username must be non-empty, with no spaces or quotes" >&2
  exit 1
fi

read -r -s -p "Password: " password; echo
read -r -s -p "Password again: " password_again; echo
if [ "${password}" != "${password_again}" ]; then
  echo "passwords do not match" >&2
  exit 1
fi
if [ "${#password}" -lt 12 ]; then
  echo "use at least 12 characters" >&2
  exit 1
fi

password_hash=$(printf '%s' "${password}" | node -e '
  let input = ""
  process.stdin.on("data", chunk => { input += chunk })
  process.stdin.on("end", () => console.log(require("bcryptjs").hashSync(input, 10)))
')
unset password password_again

# Read the current env text, from the secret or the local file.
if [ "${LOCAL}" -eq 1 ]; then
  [ -f .env ] || cp .env.example .env
  current=$(cat .env)
else
  current=$(aws secretsmanager get-secret-value --secret-id "${APP_SECRET_ID}" \
    --query SecretString --output text)
fi

jwt_secret=$(printf '%s\n' "${current}" | sed -n 's/^JWT_SECRET="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' | tail -n 1)
if [ "${ROTATE_JWT}" -eq 1 ] || [ -z "${jwt_secret}" ]; then
  jwt_secret=$(openssl rand -base64 48 | tr -d '\n')
  echo "generated a new JWT_SECRET (existing sessions will need to log in again)"
fi

# Drop any existing admin lines and append the new ones. Single quotes around the
# hash keep its `$` characters literal for anything that reads the file as shell.
umask 077
tmp_env=$(mktemp)
trap 'rm -f "${tmp_env}"' EXIT
{
  printf '%s\n' "${current}" | grep -Ev '^(ADMIN_USERNAME|ADMIN_PASSWORD_HASH|JWT_SECRET)=' || true
  printf 'ADMIN_USERNAME="%s"\n' "${username}"
  printf "ADMIN_PASSWORD_HASH='%s'\n" "${password_hash}"
  printf 'JWT_SECRET="%s"\n' "${jwt_secret}"
} > "${tmp_env}"

if [ "${LOCAL}" -eq 1 ]; then
  cp "${tmp_env}" .env
  echo "updated .env — restart the dev server to pick it up"
else
  aws secretsmanager put-secret-value --secret-id "${APP_SECRET_ID}" \
    --secret-string "file://${tmp_env}" > /dev/null
  echo "updated ${APP_SECRET_ID} — deploy to apply it: gh workflow run deploy.yml"
fi
