output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = var.existing_eip
}

output "s3_website_url" {
  description = "URL of the S3 static website"
  value       = "http://${aws_s3_bucket.data_bucket.bucket_regional_domain_name}/frontend/index.html"
}

output "backend_health_url" {
  description = "URL to check backend health via Nginx"
  value       = "http://${var.existing_eip}/api/health"
}

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.app_server.id
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.data_bucket.id
}

output "ssh_key_path" {
  description = "Path to the generated SSH private key file"
  value       = "${path.module}/sivamedical.pem"
}

output "ssh_command" {
  description = "Command to SSH into the EC2 instance"
  value       = "ssh -i \"${path.module}/sivamedical.pem\" ubuntu@${var.existing_eip}"
}

output "private_key" {
  description = "The generated private key"
  value       = tls_private_key.rsa_key.private_key_pem
  sensitive   = true
}
