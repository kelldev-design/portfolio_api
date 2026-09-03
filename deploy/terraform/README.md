# Terraform — portfolio-api AWS footprint

Provisions the API host: a `t4g.nano` EC2 instance, a **protected** EBS data volume
for the SQLite database, a CloudFront-only security group, a scoped IAM role, the
Secrets Manager container, daily EBS snapshots, and the GitHub OIDC deploy role.
In-instance setup (Node, nginx, pm2, the app) is done by
[`../bootstrap.sh`](../bootstrap.sh), which Terraform wires in as `user_data`.

Replaces the hand-built `t2.micro` (`i-0e1e29099d92822ef`) that ran production from
2024 until this migration. Roughly $15/mo → $8/mo.

## What changes vs. the old box

| | old | new |
|---|---|---|
| instance | t2.micro, x86, hand-built 2024 | t4g.nano, arm64, `user_data` |
| OS | Ubuntu 22.04 | Amazon Linux 2023 |
| database | `src/prisma/dev.db`, inside the git checkout | `/var/lib/portfolio-api/prod.db` on its own volume |
| backups | none | daily EBS snapshots + per-deploy local copies |
| reboot | API stays down (no pm2 systemd unit) | `pm2-ec2-user` unit, enabled |
| shell | SSH with a `.pem` | SSM Session Manager, no open port |
| port 80 | open to `0.0.0.0/0` | CloudFront origin-facing prefix list only |
| deploy | SSH in and run commands | push to `main` → Actions → SSM |
| secrets | hand-edited `.env` | Secrets Manager, fetched at boot |

## Prerequisites (manual — not in Terraform)

1. **Admin credentials in AWS account `003149845291`.** The only existing credential
   is `user/portfolio-site-deploy`, which is S3/CloudFront-scoped and cannot create
   any of this.
2. **State bucket + lock table**, created out-of-band (they can't manage their own
   state). Names are in [`versions.tf`](./versions.tf):
   ```sh
   aws s3api create-bucket --bucket kelldev-portfolio-tfstate-003149845291 --region us-east-1
   aws s3api put-bucket-versioning --bucket kelldev-portfolio-tfstate-003149845291 \
     --versioning-configuration Status=Enabled
   aws dynamodb create-table --table-name kelldev-portfolio-tflock \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST
   ```
3. **A FRED API key** — https://fred.stlouisfed.org/docs/api/api_key.html

## Deploy (two-phase — the secret value must exist before the instance boots)

```sh
cp terraform.tfvars.example terraform.tfvars   # then edit
terraform init

# Phase 1: create the secret container only
terraform apply -target=aws_secretsmanager_secret.app

# Set the secret VALUE (never enters Terraform state)
aws secretsmanager put-secret-value --secret-id portfolio-api/env \
  --secret-string $'KELLEGHAN_DESIGN_CLIENT_URL="https://kelleghandesign.com"\nKELLDEV_CLIENT_URL="https://kelldev.design"\nFRED_API_KEY="..."'

# Phase 2: everything else (the instance now boots with the secret available)
terraform apply
```

First boot runs `bootstrap.sh` via user-data. Watch `/var/log/cloud-init-output.log`
on the instance if you need to debug it.

## Cutover

The new instance seeds itself. `src/prisma/seed.ts` has been verified field-by-field
against the live database — all 21 portfolio items, every description, image, link,
category and product match exactly — so `bootstrap.sh` builds a complete production
database on first boot and **the live database never has to be copied**.

Market rates data is intentionally not seeded: the FRED layer refetches observations on
its TTL, so the tables populate themselves on first use.

1. `terraform apply`, then confirm the instance's own health check passed:
   ```sh
   aws ssm start-session --target $(terraform output -raw instance_id)
   curl -sS localhost:4000 -H 'content-type: application/json' -d '{"query":"{__typename}"}'
   ```
2. Sanity-check the seeded content — expect 21 items:
   ```sh
   sudo -u ec2-user -H bash -c 'cd ~/portfolio_api && npx prisma studio' # or a quick count
   ```
3. Point the existing CloudFront distribution's origin at the `origin_hostname` output
   (HTTP only, port 80), then verify `https://api.kelldev.design`.
4. Leave the old instance **running** during the soak — do not stop it. Its address is an
   auto-assigned public IP, not an Elastic IP, so stopping it changes both the IP and the
   `ec2-3-85-185-143…` hostname. That hostname is the rollback target, and stopping the
   box destroys the ability to roll back by switching the origin.

   Rollback is: set the distribution's origin back to
   `ec2-3-85-185-143.compute-1.amazonaws.com`.

5. Before terminating, snapshot the root volume. It is marked `DeleteOnTermination`, so
   terminating destroys the original database irreversibly:
   ```sh
   aws ec2 create-snapshot --volume-id vol-03cd5be709dabd916 \
     --description "portfolio_api old box final state"
   aws ec2 terminate-instances --instance-ids i-0e1e29099d92822ef
   ```
   Nothing else is attached — no Elastic IP to release. The old box costs ~$15/mo while it
   runs, so a week's soak is about $3.50.

### If you ever do need to move the live database

Preserved here because the migration histories are incompatible and the failure is
silent. The old database has one applied migration, `20240716023002_init`, which does not
exist in this repo; the repo has `20240108040130_` and `20260903033612_market_rates`,
which it has never seen. Baseline before applying anything:

```sh
npx prisma migrate resolve --applied 20240108040130_
npx prisma migrate deploy
```

## After it's up

- Shell: `aws ssm start-session --target $(terraform output -raw instance_id)`
- Deploys: push to `main`. Set the repo variables `AWS_DEPLOY_ROLE_ARN` and
  `AWS_INSTANCE_ID` from the Terraform outputs first.
- Manual deploy: run `/usr/local/bin/portfolio-api-deploy` as `ec2-user`.

## Important behaviors

- **The data volume is `prevent_destroy`.** `terraform destroy` will *refuse* until you
  remove that guard. It is the production database. To tear down for real, snapshot
  first, then remove the `lifecycle` block.
- **Changing `user_data`/`bootstrap.sh` does not re-run on the existing instance** — the
  instance ignores changes to both. To re-bootstrap:
  `terraform apply -replace=aws_instance.api` (the data volume detaches and reattaches;
  the database is safe).
- **Secret values are not managed here.** Rotate with `aws secretsmanager put-secret-value`,
  then redeploy so the instance rewrites its `.env`.
- **Origin traffic is plain HTTP.** TLS terminates at CloudFront and the security group
  admits only CloudFront's origin-facing ranges — the same posture as the old box, minus
  the world-open port.

## Not managed here (yet)

The site's CloudFront distribution `E310RTA2TDL598`, the `kelldev.design` S3 bucket, the
API's own distribution, and the Route 53 zone all predate this module and are unmanaged.
They can be brought in with `terraform import` — worth doing so both apps are described
in one place.
