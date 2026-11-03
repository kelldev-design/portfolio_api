terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State lives in an encrypted, versioned S3 bucket with a DynamoDB lock.
  # The bucket/table are created out-of-band (they can't manage their own state).
  # State contains resource metadata but NOT the secret values (set out-of-band).
  backend "s3" {
    bucket = "kelldev-portfolio-tfstate-003149845291"
    key    = "portfolio-api/terraform.tfstate"
    region = "us-east-1"
    # Backends cannot read variables, so the admin profile is named literally here.
    # Without it, state access falls through to the default credential chain.
    profile        = "kelldev-mgmt"
    dynamodb_table = "kelldev-portfolio-tflock"
    encrypt        = true
  }
}

provider "aws" {
  region  = var.region
  profile = var.aws_profile

  default_tags {
    tags = var.tags
  }
}
