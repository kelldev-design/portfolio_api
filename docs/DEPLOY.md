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

## Migration from the old box

The `t2.micro` (`i-0e1e29099d92822ef`, Ubuntu, `ec2-3-85-185-143.compute-1.amazonaws.com`)
ran production from 2024 until this migration. **The cutover has not been run yet** — the
old box is still serving `api.kelldev.design`. Steps are in
[deploy/terraform/README.md](../deploy/terraform/README.md#cutover).

The new instance seeds itself rather than importing the old database:
[src/prisma/seed.ts](../src/prisma/seed.ts) has been verified field-by-field against the
live database and reproduces all 21 portfolio items exactly. Keep it that way — if you
change portfolio content, change it in the seed.
