# Admin authentication

There is one admin account, used by the admin UI at `kelldev.design/admin`. Queries are
public. Every mutation except `login` needs an admin token.

## How it works

Three environment variables define the account:

| Key | What it is |
|---|---|
| `ADMIN_USERNAME` | The login name. |
| `ADMIN_PASSWORD_HASH` | A bcrypt hash of the password. The plaintext is never stored anywhere. |
| `JWT_SECRET` | Signs and verifies tokens. A long random string. |

1. The client sends `login(username, password)`.
2. [src/graphql/auth.ts](../src/graphql/auth.ts) compares the username in constant time and
   the password against the bcrypt hash. It runs the bcrypt compare even when the username
   is wrong, so response time doesn't reveal whether a username exists.
3. On success it returns a JWT (HS256, `role: "admin"`) that lasts **12 hours**.
4. The client sends that token as `Authorization: Bearer <token>`.
   [src/graphql/context.ts](../src/graphql/context.ts) verifies it and sets
   `context.isAdmin`, and `requireAdmin` rejects mutations without it.

If any of the three variables is missing or empty, every login fails and the server logs
`Admin login is disabled: missing …` at startup. There is no default credential.

## Setting or changing the login

Use [deploy/set-admin-credentials.sh](../deploy/set-admin-credentials.sh) rather than editing
values by hand. It asks for the username and password (input hidden, entered twice, at least
12 characters), hashes the password locally and writes all three keys. It keeps an existing
`JWT_SECRET` and only generates one when there is none. Run `npm ci` first, because it uses
the repo's `bcryptjs`.

### Local development

```sh
deploy/set-admin-credentials.sh --local   # creates .env from .env.example if needed
npm run start:dev                         # restart so the new .env is read
```

### Production

Needs the `kelldev-mgmt` profile (`aws sso login --profile kelldev-mgmt`).

```sh
deploy/set-admin-credentials.sh   # updates the portfolio-api/env secret
gh workflow run deploy.yml        # or push to main
```

The deploy is required: [deploy/deploy.sh](../deploy/deploy.sh) re-reads the secret into the
instance's `.env` on every deploy, and the app reads `.env` only at startup. Check that the
deploy log contains `.env refreshed from portfolio-api/env`.

### Rotating the token secret

```sh
deploy/set-admin-credentials.sh --rotate-jwt
```

This invalidates every token already issued, so anyone logged in has to log in again. Do it if
a token may have leaked; a token otherwise stays valid until it expires.

## Checking it works

```sh
curl -sS https://api.kelldev.design/ -H 'content-type: application/json' \
  -d '{"query":"mutation($u:String!,$p:String!){login(username:$u,password:$p){success message token}}","variables":{"u":"<username>","p":"<password>"}}'
```

`success: true` with a token means the login is set up. `Invalid credentials` means the username
or password is wrong, or the instance is still running the old `.env` — check that the
deploy ran after you changed the secret. Use `http://localhost:4000/` locally.

## Troubleshooting

- **Every login fails right after changing the secret.** The instance hasn't been
  redeployed, or the deploy couldn't read the secret. Look for
  `WARNING: could not read portfolio-api/env` in the deploy output.
- **`Admin login is disabled` in the logs.** One of the three keys is missing or empty.
- **Mutations return `Not authenticated` after working earlier.** The token is more than
  12 hours old, or `JWT_SECRET` was changed. Log in again.
- **A hand-written hash doesn't match.** A bcrypt hash contains `$`. Wrap it in single
  quotes in `.env` so nothing treats it as a variable; the script already does this.
