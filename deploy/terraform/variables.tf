variable "region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type        = string
  default     = "kelldev-mgmt"
  description = "AWS CLI profile. kelldev-mgmt is AdministratorAccess in account 003149845291, where the portfolio domain, buckets and distributions live. The `default` profile is a scoped S3/CloudFront deploy user and cannot apply this."
}

variable "repo_url" {
  type        = string
  default     = "https://github.com/kelldev-design/portfolio_api.git"
  description = "Git URL cloned on the instance at first boot."
}

variable "repo_branch" {
  type    = string
  default = "main"
}

variable "instance_type" {
  type        = string
  default     = "t4g.nano"
  description = "ARM/Graviton. The app is a single ~55MB Node process; 512MB is ample at runtime (builds lean on swap)."
}

variable "root_volume_size" {
  type    = number
  default = 8
}

variable "data_volume_size" {
  type        = number
  default     = 1
  description = "Persistent EBS volume holding the SQLite DB. Protected from destroy."
}

variable "node_version" {
  type        = string
  default     = "20.18.1"
  description = "Pinned Node.js LTS installed from nodejs.org (arm64 tarball)."
}

variable "swap_size_mb" {
  type        = number
  default     = 2048
  description = "Swapfile on the root volume. Needed for `npm install` and webpack on a 512MB box."
}

variable "domain_name" {
  type    = string
  default = "kelldev.design"
}

variable "origin_hostname" {
  type        = string
  default     = "origin-api.kelldev.design"
  description = "Stable DNS name for the instance's Elastic IP. Set this as the CloudFront origin so replacing the instance never touches the distribution."
}

variable "github_repo" {
  type        = string
  default     = "kelldev-design/portfolio_api"
  description = "owner/repo allowed to assume the deploy role via OIDC (main branch only)."
}

variable "app_secret_name" {
  type    = string
  default = "portfolio-api/env"
}

variable "snapshot_retain_count" {
  type    = number
  default = 7
}

variable "alert_email" {
  type        = string
  default     = ""
  description = "Optional. Subscribes this address to instance-health alarms."
}

variable "tags" {
  type = map(string)
  default = {
    app       = "portfolio-api"
    managedBy = "terraform"
  }
}
