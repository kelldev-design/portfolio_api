###############################################################################
# Lookups: latest Amazon Linux 2023 (arm64) AMI, default VPC + a subnet.
###############################################################################
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

data "aws_vpc" "default" {
  default = true
}

# AZs that actually offer the chosen instance type — not every AZ does.
data "aws_ec2_instance_type_offerings" "supported" {
  filter {
    name   = "instance-type"
    values = [var.instance_type]
  }
  location_type = "availability-zone"
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "availability-zone"
    values = data.aws_ec2_instance_type_offerings.supported.locations
  }
}

data "aws_subnet" "selected" {
  id = sort(data.aws_subnets.default.ids)[0]
}

###############################################################################
# Security group: inbound :80 from CloudFront's origin-facing ranges ONLY.
# No inbound :22 — shell access is SSM Session Manager (no key, no open port).
# The current hand-built box has :80 open to 0.0.0.0/0; this closes that.
###############################################################################
data "aws_ec2_managed_prefix_list" "cloudfront_origins" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "api" {
  name_prefix = "portfolio-api-"
  description = "portfolio-api: :80 from CloudFront origin-facing only, all egress"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "HTTP from CloudFront edge (TLS terminates at the distribution)"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront_origins.id]
  }

  egress {
    description = "all egress (GitHub, npm, FRED API, SSM, Secrets Manager)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

###############################################################################
# Secrets Manager: container only. Set the VALUE out-of-band (see README) so it
# never lands in Terraform state. Dotenv format; bootstrap writes it to .env.
###############################################################################
resource "aws_secretsmanager_secret" "app" {
  name                    = var.app_secret_name
  description             = "portfolio-api app env (dotenv: FRED_API_KEY, *_CLIENT_URL)"
  recovery_window_in_days = 7
}

###############################################################################
# IAM: instance role (read the secret) + SSM for shell access and deploys.
###############################################################################
data "aws_iam_policy_document" "assume_ec2" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = "portfolio-api-instance"
  assume_role_policy = data.aws_iam_policy_document.assume_ec2.json
}

data "aws_iam_policy_document" "api" {
  statement {
    sid       = "ReadSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.app.arn]
  }
}

resource "aws_iam_role_policy" "api" {
  name   = "portfolio-api"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api.json
}

# Shell access + the deploy transport. Replaces SSH entirely.
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "api" {
  name = "portfolio-api"
  role = aws_iam_role.api.name
}

###############################################################################
# Persistent data volume — the SQLite DB. Its own resource, protected from
# destroy, so the instance stays replaceable without taking the database with
# it. This is what gets the DB out of the git checkout.
###############################################################################
resource "aws_ebs_volume" "data" {
  availability_zone = data.aws_subnet.selected.availability_zone
  size              = var.data_volume_size
  type              = "gp3"
  encrypted         = true

  tags = { Name = "portfolio-api-data", dlm = "portfolio-api-data" }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf" # appears as /dev/nvme1n1 inside the Nitro instance
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.api.id
}

###############################################################################
# The instance.
###############################################################################
locals {
  user_data = <<-EOT
    #!/usr/bin/env bash
    export REPO_URL="${var.repo_url}"
    export REPO_BRANCH="${var.repo_branch}"
    export AWS_REGION="${var.region}"
    export APP_SECRET_ID="${var.app_secret_name}"
    export NODE_VERSION="${var.node_version}"
    export SWAP_SIZE_MB="${var.swap_size_mb}"
    export SERVER_NAME="api.${var.domain_name}"
    export DATA_DEVICE="/dev/nvme1n1"
    ${file("${path.module}/../bootstrap.sh")}
  EOT
}

resource "aws_instance" "api" {
  ami                    = nonsensitive(data.aws_ssm_parameter.al2023.value)
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnet.selected.id
  vpc_security_group_ids = [aws_security_group.api.id]
  iam_instance_profile   = aws_iam_instance_profile.api.name
  user_data              = local.user_data

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size
    encrypted   = true
  }

  metadata_options {
    http_tokens   = "required" # IMDSv2 only
    http_endpoint = "enabled"
  }

  tags = { Name = "portfolio-api" }

  # A user_data change alone should not replace the instance. To re-bootstrap:
  #   terraform apply -replace=aws_instance.api
  # (the data volume detaches and reattaches; the DB is safe).
  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

###############################################################################
# Stable origin address. CloudFront points at `origin_hostname`, never at the
# instance's own DNS, so replacing the instance never touches the distribution.
###############################################################################
resource "aws_eip" "api" {
  instance = aws_instance.api.id
  domain   = "vpc"
  tags     = { Name = "portfolio-api" }
}

data "aws_route53_zone" "primary" {
  name         = "${var.domain_name}."
  private_zone = false
}

resource "aws_route53_record" "origin" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.origin_hostname
  type    = "A"
  ttl     = 300
  records = [aws_eip.api.public_ip]
}

###############################################################################
# Daily snapshots of the data volume. The database currently has no backups
# of any kind; this is the first.
###############################################################################
data "aws_iam_policy_document" "assume_dlm" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["dlm.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "dlm" {
  name               = "portfolio-api-dlm"
  assume_role_policy = data.aws_iam_policy_document.assume_dlm.json
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "data" {
  description        = "portfolio-api data volume daily snapshots"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]
    target_tags    = { dlm = "portfolio-api-data" }

    schedule {
      name = "daily"
      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["03:00"]
      }
      retain_rule {
        count = var.snapshot_retain_count
      }
      copy_tags = true
    }
  }
}
