output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = var.existing_eip
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
  value       = "${path.module}/sivamedicals_ec2_key.pem"
}

output "ssh_command" {
  description = "Command to SSH into the EC2 instance"
  value       = "ssh -i \"${path.module}/sivamedicals_ec2_key.pem\" ubuntu@${var.existing_eip}"
}
