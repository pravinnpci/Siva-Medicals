variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-2"
}

variable "instance_type" {
  description = "EC2 instance type (t3.micro for free tier eligibility in ap-south-2)"
  type        = string
  default     = "t3.micro"
}

variable "existing_eip" {
  description = "Existing Elastic IP address"
  type        = string
  default     = "18.60.246.115"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "SIVAMedicals"
}

variable "s3_bucket_name_prefix" {
  description = "Prefix for the S3 bucket name (must be globally unique)"
  type        = string
  default     = "siva-medicals-data-hyderabad"
}

variable "ebs_volume_size_gb" {
  description = "Size of the EBS volume in GB (stay within free tier 30GB)"
  type        = number
  default     = 20
}
