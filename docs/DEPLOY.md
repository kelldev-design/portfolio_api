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

Push to `main`. [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) assumes the
OIDC deploy role and triggers `deploy.sh` on the instance over SSM. The instance pulls,
builds, migrates, restarts pm2 and health-checks itself; CI fails if the health check does.

Before merge, [.github/workflows/ci.yml](../.github/workflows/ci.yml) runs lint and the
production build on every pull request. It needs no AWS credentials and no database — the
only Prisma command it runs is `prisma generate`.

By hand:

```sh
aws ssm start-session --target <instance-id>
sudo -u ec2-user -H /usr/local/bin/portfolio-api-deploy
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
- **`dist/` is built on the box**, not shipped. The 512MB instance relies on a 2GB
  swapfile to get through `npm ci` and webpack.
- Origin traffic is plain HTTP; TLS is CloudFront's job. The security group admits only
  CloudFront's origin-facing prefix list, so the origin is not reachable directly.

## Environment

Production `.env` is written at boot from the `portfolio-api/env` secret in Secrets
Manager, plus `DATABASE_URL` and `NODE_ENV` appended by `bootstrap.sh`. To change a value,
`aws secretsmanager put-secret-value` then redeploy. Required keys are in
[.env.example](../.env.example); `FRED_API_KEY` is mandatory — the market rates layer in
[src/services/fred.ts](../src/services/fred.ts) fails at runtime without it.

## Market data refresh

FRED series go stale after `FRED_TTL_HOURS` (default 12) and
[refreshStaleSeries](../src/services/fred.ts) then refetches **each series' full history**
— about 141k observations across 24 series, roughly 59 seconds of work. It is upserts, so
the database does not grow; measured footprint is 9.2MB on a 960MB volume.

This is a deliberate choice: the box supports the load comfortably (two ~60s bursts a day
against a ~144 credit/day burst balance), and refetching everything keeps revisions to
historical values correct without incremental-sync logic.

Two pieces of the deployment exist solely to make it invisible, and are therefore
**load-bearing, not temporary**:

- `portfolio-api-warm.timer` runs every 6 hours, comfortably inside the 12h TTL, so the
  refresh happens off the request path. If this timer stops, one visitor per TTL window
  absorbs the ~59s on the `marketSeries` query specifically — not an outage.
- nginx's `proxy_read_timeout 300s`. The default 60s sits right on the refresh duration
  and returns 504.

A refresh does **not** degrade the rest of the API. Measured under a forced full refresh,
twelve concurrent `portfolioItems` requests returned 200 in 16–119ms against a ~40ms
baseline: Prisma's query engine does the writes off the Node event loop, so readers are
never blocked. The portfolio site, which is the only thing `kelldev.design` queries, is
unaffected.

If the history ever grows enough to make this uncomfortable, the fix is to pass
`observation_start` to the FRED API and upsert only observations after the newest stored
date per series.

## Migration from the old box

Completed 2026-09-03. The hand-built `t2.micro` (`i-0e1e29099d92822ef`, Ubuntu 22.04) that
ran production from 2024 has been terminated. Its final root volume is preserved as
snapshot `snap-00634a3d058b30547` — the only remaining copy of the original database.

The new instance was seeded from [src/prisma/seed.ts](../src/prisma/seed.ts) rather than
importing that database; the seed was verified field-by-field against production first.
Keep it that way — if you change portfolio content, change it in the seed.
