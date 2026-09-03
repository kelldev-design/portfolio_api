###############################################################################
# Minimal health alarms. The point is to learn the box is down from an email
# rather than from looking at the site — the failure mode that went unnoticed
# for 377 days on the hand-built instance.
###############################################################################
resource "aws_sns_topic" "alerts" {
  name = "portfolio-api-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "instance_status" {
  alarm_name          = "portfolio-api-status-check"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "portfolio-api instance failed its EC2/system status check"
  dimensions          = { InstanceId = aws_instance.api.id }
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}
