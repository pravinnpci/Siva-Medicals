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

variable "manual_bucket_name" {
  description = "Used if an existing bucket is found"
  type        = string
  default     = ""
}

variable "public_key_data" {
  description = "The public key part of the EC2_SSH_KEY secret"
  type        = string
  default     = ""
}

variable "twilio_account_sid" {
  description = "Twilio Account SID"
  type        = string
  default     = ""
}

variable "twilio_auth_token" {
  description = "Twilio Auth Token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_whatsapp_number" {
  description = "Twilio WhatsApp number (sandbox or verified)"
  type        = string
  default     = "+16626893955"
}

variable "website_whatsapp_number" {
  description = "WhatsApp number where owner receives notifications"
  type        = string
  default     = "9245464648"
}
