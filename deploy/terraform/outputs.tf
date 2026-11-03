output "instance_id" {
  description = "Shell in with: aws ssm start-session --target <this>"
  value       = aws_instance.api.id
}

output "origin_hostname" {
  description = "Set this as the CloudFront distribution's origin domain name (HTTP only, port 80)."
  value       = aws_route53_record.origin.fqdn
}

output "origin_ip" {
  value = aws_eip.api.public_ip
}

output "data_volume_id" {
  value = aws_ebs_volume.data.id
}

output "github_deploy_role_arn" {
  description = "Set as the GitHub repo variable AWS_DEPLOY_ROLE_ARN for the deploy workflow."
  value       = aws_iam_role.github_deploy.arn
}

output "app_secret_arn" {
  value = aws_secretsmanager_secret.app.arn
}
