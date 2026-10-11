# Deploying portfolio_api

## Production

```
api.kelldev.design
  -> CloudFront (TLS terminates here)
     -> origin-api.kelldev.design  (Elastic IP, stable across instance replacement)
        -> nginx :80 on Amazon Linux 2023, t4g.nano
           -> proxy_pass http://127.0.0.1:4000
              -> pm2 "portfolio-api" -> node dist/index.js
                 -> SQLite at /var/lib/portfolio-api/prod.db  (own EBS volume)
```

Infrastructure is Terraform: [deploy/terraform/](../deploy/terraform/). Instance setup is
[deploy/bootstrap.sh](../deploy/bootstrap.sh) via user-data. Releases are
[deploy/deploy.sh](../deploy/deploy.sh).

There is no Docker in production. The [Dockerfile](../Dockerfile) and
[docker-compose.yaml](../docker-compose.yaml) are local-development only, and the Helm
chart that used to sit in `helm/` has been deleted — it described a Kubernetes cluster
that never existed.

## Deploy

Push to `main`. [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) builds the
server bundle on the runner, publishes it as a release asset, then assumes the OIDC deploy
role and triggers `deploy.sh` on the instance over SSM. The instance pulls, installs
runtime dependencies, downloads the bundle, migrates, restarts pm2 and health-checks
itself; CI fails if the health check does.

The build is on the runner because the instance is bad at it. `npm ci` across all 26
dependencies plus webpack on a t4g.nano was measured at **26m21s** once its CPU credits ran
dry, against 30-120s for the same work on a runner. Both repos are public, so runner minutes
are free.

Two things follow from building there:

- **The bundle travels as a release asset**, tagged `build-<sha>`. Tagged by commit, not
  rolling, so the instance fetches the bundle built from exactly the commit it checked out.
  The repo is public, so the instance needs no credentials to fetch it — which is why this
  needs no S3 bucket and no new IAM. The workflow keeps the five most recent and deletes
  the rest.
- **The instance installs with `--omit=dev`**: 143 packages and 180MB, against 540 and
  302MB for a full install. webpack, ts-loader, typescript and the codegen toolchain never
  land on the box. The Prisma CLI is a runtime dependency, not a dev one, so
  `prisma generate` and `prisma migrate deploy` still work there.

`deploy.sh` decides between the two modes on whether `BUNDLE_URL` is set. Unset — first
boot, a hand-deploy, or a download that fails — and it does a full install and builds
locally, the slow path, which is why that path still has to work.

**`/usr/local/bin/portfolio-api-deploy` is a copy, not the repo file.** `bootstrap.sh`
installs it once at first boot, and that copy is what actually runs. Editing
`deploy/deploy.sh` therefore changes nothing on its own: the edit reaches the checkout and
is ignored. The deploy workflow reinstalls the copy over SSM before invoking it, as root,
having first updated the checkout — without that step a change to the release process can
appear to ship and silently not take effect, which is exactly what happened on the first
CI-built deploy (`db5cab4`).

Before merge, [.github/workflows/ci.yml](../.github/workflows/ci.yml) runs lint and the
production build on every pull request. It needs no AWS credentials and no database — the
only Prisma command it runs is `prisma generate`.

By hand — note this builds on the instance, so expect minutes, not seconds:

```sh
aws ssm start-session --target <instance-id>
sudo -u ec2-user -H /usr/local/bin/portfolio-api-deploy
```

To take the fast path by hand, point it at the bundle CI already published for that commit:

```sh
sudo -u ec2-user -H env \
  BUNDLE_URL=https://github.com/kelldev-design/portfolio_api/releases/download/build-<sha>/index.js \
  /usr/local/bin/portfolio-api-deploy
```

Verify:

```sh
curl -sS https://api.kelldev.design/ -H 'content-type: application/json' \
  -d '{"query":"{__typename}"}'
```

## Rules

- **Never run `npm run prisma:migrate` against production.** That script is
  `prisma migrate dev`, the interactive development command, and it will offer to reset
  the database. `deploy.sh` uses `prisma migrate deploy`.
- **`DATABASE_URL` decides where the database lives.** Production points at the data
  volume; local dev points at `file:./dev.db` in the checkout. See [.env.example](../.env.example).
- **The data volume is `prevent_destroy`** and snapshotted daily. `deploy.sh` also keeps
  the last 10 per-deploy copies under `/var/lib/portfolio-api/backups/`.
- **`dist/` is built in CI and shipped**, not built on the box — except on the fallback
  path, where the 512MB instance relies on a 2GB swapfile to get through `npm ci` and
  webpack.
- Origin traffic is plain HTTP; TLS is CloudFront's job. The security group admits only
  CloudFront's origin-facing prefix list, so the origin is not reachable directly.

## Environment

Production `.env` is written at boot from the `portfolio-api/env` secret in Secrets
Manager, plus `DATABASE_URL` and `NODE_ENV` appended by `bootstrap.sh`. To change a value,
`aws secretsmanager put-secret-value` then redeploy. Required keys are in
[.env.example](../.env.example); `FRED_API_KEY` is mandatory — the market rates layer in
[src/services/fred.ts](../src/services/fred.ts) fails at runtime without it.

## Admin credentials

The `login` mutation issues a 12-hour JWT that every mutation except `login` requires as
`Authorization: Bearer <token>`. Queries stay public. Three keys drive it, and they live in
the same `portfolio-api/env` secret as everything else:

- `ADMIN_USERNAME` — the admin login name.
- `ADMIN_PASSWORD_HASH` — a bcrypt hash of the password. The plaintext is never stored
  anywhere; generate the hash with
  `node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'the-password'`.
- `JWT_SECRET` — signs and verifies the tokens. Any long random string, e.g.
  `openssl rand -base64 48`.

If any of the three is missing or empty, login always fails and the server logs a warning at
startup — there is no default credential. Rotating the password or the secret means
`aws secretsmanager put-secret-value` then a redeploy; rotating `JWT_SECRET` also invalidates
every token already issued, which just means logging in again.

## Market data refresh

[refreshStaleSeries](../src/services/fred.ts) refetches a series only when it is stale, and
staleness is publication-aware — it depends on whether the series already holds the newest
value FRED is expected to have published, not on elapsed time alone:

- `FRED_TTL_HOURS` (default 12) applies once the series holds that print. Nothing new can
  arrive until the next release, so the series is left alone.
- `FRED_POLL_TTL_HOURS` (default 1) applies while the series is behind it, so a new print is
  picked up soon after FRED publishes rather than at the next full TTL. It is clamped to
  `FRED_TTL_HOURS`, which always wins when deliberately set shorter.

`lastExpectedPrintDate` resolves what FRED should currently hold. **FRED runs one business
day behind**: its load on any given business day carries the *previous* business day's value,
not that day's. Verified against FRED's own "last updated" stamp — DGS10 read
`2026-09-14 3:16pm CDT`, and that load is what first carried Friday 2026-09-11.

So it resolves in two steps: find the latest weekday whose release has run, then step back
one business day to the value that release actually delivered. The release cutoff is 22:00
UTC, past H.15's 4:15pm ET post under both EDT (20:15 UTC) and EST (21:15 UTC), and still
the same calendar day in ET — which avoids needing a timezone database.

Getting this wrong in either direction is worth understanding. Expecting *today's* value
means no series is ever current, so every one of them polls at the short TTL forever —
correct data, roughly 27 series × 24 fetches a day instead of two. Expecting too little means
a new print sits unnoticed for a full TTL.

Market holidays are deliberately not modelled: there is no print to find on one, so a holiday
leaves the polling TTL in force for the day. That costs one wasted fetch per poll interval.

A refresh is incremental. Each request starts 30 days before the series' newest stored
observation (`REVISION_OVERLAP_DAYS`), so it moves tens of rows per series rather than the full
history, while still absorbing FRED's revisions to already-stored values. The newest-observation
read that decides staleness is reused as that start anchor, and is skipped entirely for a series
still inside its polling TTL — so publication-awareness adds no queries to a refresh and none to
the common fresh path.

Footprint is about 141k observations across 27 series, a measured 9.2MB on a 960MB volume. The
writes are upserts, so the database does not grow.

A full-history fetch — a new series, or an empty database — is still the cold-start case: about
59 seconds of work. Two pieces of the deployment exist to keep that off a visitor's request, and
are therefore **load-bearing, not temporary**:

- `portfolio-api-warm.timer` (defined in [bootstrap.sh](../deploy/bootstrap.sh)) runs every 6 hours and
  issues `{marketSeries{fredId}}` against localhost, which refreshes the whole registry off the
  request path. It is also what drives polling when no real traffic arrives: the polling TTL can
  only act inside a request, so this interval bounds how soon a new print is noticed on a quiet
  day. Dropping it to 1h would let the default poll TTL act at full resolution; the instance's
  `user_data` is under `ignore_changes`, so that needs a deliberate re-bootstrap.
- nginx's `proxy_read_timeout 300s`. The default 60s sits right on the cold-start duration and
  returns 504.

A refresh does **not** degrade the rest of the API. Measured under a forced full refresh —
now the worst case rather than the routine one — twelve concurrent `portfolioItems` requests
returned 200 in 16-119ms against a ~40ms baseline: Prisma's query engine does the writes off the
Node event loop, so readers are never blocked. The portfolio site, which is the only thing
`kelldev.design` queries, is unaffected.

## Migration from the old box

Completed 2026-09-03. The hand-built `t2.micro` (`i-0e1e29099d92822ef`, Ubuntu 22.04) that
ran production from 2024 has been terminated. Its final root volume is preserved as
snapshot `snap-00634a3d058b30547` — the only remaining copy of the original database.

The new instance was seeded from [src/prisma/seed.ts](../src/prisma/seed.ts) rather than
importing that database; the seed was verified field-by-field against production first.
Keep it that way — if you change portfolio content, change it in the seed.
