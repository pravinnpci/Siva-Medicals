@echo off
setlocal enabledelayedexpansion

:: --- Configuration Variables (can be changed here) ---
set "BASE_DIR=%~dp0"
set "TF_NAME=terraform_aws"
set "TF_DIR=%BASE_DIR%%TF_NAME%"
set "AWS_REGION=ap-south-2"  :: Changed to ap-south-2 (Hyderabad)

set "EXISTING_EIP=18.60.246.115"

set "PROJECT_NAME=SIVAMedicals"
set "S3_BUCKET_PREFIX=siva-medicals-data-hyderabad" :: S3 bucket names must be globally unique
set "EC2_INSTANCE_TYPE=t3.micro" :: t3.micro is the Free Tier eligible type in ap-south-2.

echo.
if /i not "%CI%"=="true" (
    echo Checking for Terraform installation...
    where terraform >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Terraform is not found in your PATH. Please install Terraform and add it to your system PATH.
        echo Exiting.
        goto :eof
    )
)

echo Checking for AWS CLI installation...
where aws >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI is not found in your PATH. Please install AWS CLI and configure your credentials.
    echo Exiting.
    goto :eof
)


echo.
echo Creating Terraform directory: %TF_DIR%
if not exist "%TF_DIR%" (
    mkdir "%TF_DIR%"
)
echo Clearing old .tf files...
del /q "%TF_DIR%\*.tf" >nul 2>&1
cd /d "%TF_DIR%" || (echo Failed to change directory. Exiting. && exit /b 1)

echo.
echo Creating versions.tf...
(
echo terraform {
echo   required_version = ">= 1.5.0"
echo   required_providers {
echo     aws = {
echo       source  = "hashicorp/aws"
echo       version = "~> 5.0"
echo     }
echo   }
echo }
echo.
echo # Provider for generating local private key (not AWS specific)
echo provider "tls" {
echo   version = "~> 4.0"
echo }
echo.
echo provider "local" {
echo   version = "~> 2.0"
echo }
) > versions.tf

echo.
echo Creating variables.tf...
(
echo variable "aws_region" {
echo   description = "AWS region"
echo   type        = string
echo   default     = "%AWS_REGION%"
echo }
echo.
echo variable "instance_type" {
echo   description = "EC2 instance type (t3.micro for free tier eligibility in ap-south-2)"
echo   type        = string
echo   default     = "%EC2_INSTANCE_TYPE%"
echo }
echo.
echo variable "existing_eip" {
echo   description = "Existing Elastic IP address"
echo   type        = string
echo   default     = "%EXISTING_EIP%"
echo }
echo.
echo variable "project_name" {
echo   description = "Name of the project"
echo   type        = string
echo   default     = "%PROJECT_NAME%"
echo }
echo.
echo variable "s3_bucket_name_prefix" {
echo   description = "Prefix for the S3 bucket name (must be globally unique)"
echo   type        = string
echo   default     = "%S3_BUCKET_PREFIX%"
echo }
) > variables.tf

echo.
echo Creating main.tf...
(
echo provider "aws" {
echo   region = var.aws_region
echo }
echo.
echo # Dynamically find the latest Ubuntu 20.04 AMI for this region
echo data "aws_ami" "ubuntu" {
echo   most_recent = true
echo   filter {
echo     name   = "name"
echo     values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
echo   }
echo   filter {
echo     name   = "virtualization-type"
echo     values = ["hvm"]
echo   }
echo   owners = ["099720109477"] # Canonical
echo }
echo.
echo # Create a new private key and corresponding public key
echo resource "tls_private_key" "rsa_key" {
echo   algorithm = "RSA"
echo   rsa_bits  = 4096
echo }
echo.
echo # Save the private key to a local file
echo resource "local_file" "private_key" {
echo   content         = tls_private_key.rsa_key.private_key_pem
echo   filename        = "sivamedicals_ec2_key.pem"
echo   file_permission = "0400" # Important for SSH access
echo }
echo.
echo # Upload the public key to AWS to create an EC2 Key Pair
echo resource "aws_key_pair" "ec2_key_pair" {
echo   key_name   = "${var.project_name}-ec2-key-${random_id.bucket_suffix.hex}"
echo   public_key = tls_private_key.rsa_key.public_key_openssh
echo }
echo.
echo # IAM Role for S3 Access
echo resource "aws_iam_role" "ec2_s3_role" {
echo   name = "${var.project_name}-S3Role-${random_id.bucket_suffix.hex}"
echo   assume_role_policy = jsonencode^( {
echo     Version = "2012-10-17"
echo     Statement = [{
echo       Action = "sts:AssumeRole"
echo       Effect = "Allow"
echo       Principal = { Service = "ec2.amazonaws.com" }
echo     }]
echo   } ^)
echo }
echo.
echo resource "aws_iam_role_policy" "s3_policy" {
echo   name = "${var.project_name}-S3Policy-${random_id.bucket_suffix.hex}"
echo   role = aws_iam_role.ec2_s3_role.id
echo   policy = jsonencode^({
echo     Version = "2012-10-17"
echo     Statement = [{
echo       Effect   = "Allow"
echo       Action   = ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
echo       Resource = [aws_s3_bucket.data_bucket.arn, "${aws_s3_bucket.data_bucket.arn}/*"]
echo     }]
echo   }^)
echo }
echo.
echo resource "aws_iam_instance_profile" "s3_profile" {
echo   name = "${var.project_name}-S3Profile-${random_id.bucket_suffix.hex}"
echo   role = aws_iam_role.ec2_s3_role.name
echo }
echo.
echo resource "aws_vpc" "main" {
echo   cidr_block = "10.0.0.0/16"
echo   tags       = {
echo     Name = "${var.project_name}-VPC"
echo   }
echo }
echo.
echo resource "aws_subnet" "public" {
echo   vpc_id            = aws_vpc.main.id
echo   cidr_block        = "10.0.1.0/24"
echo   map_public_ip_on_launch = true
echo   availability_zone       = "${var.aws_region}a"
echo   tags                    = {
echo     Name = "${var.project_name}-PublicSubnet"
echo   }
echo }
echo.
echo resource "aws_internet_gateway" "gw" {
echo   vpc_id = aws_vpc.main.id
echo   tags   = {
echo     Name = "${var.project_name}-IGW"
echo   }
echo }
echo.
echo resource "aws_route_table" "r" {
echo   vpc_id = aws_vpc.main.id
echo.
echo   route {
echo     cidr_block = "0.0.0.0/0"
echo     gateway_id = aws_internet_gateway.gw.id
echo   }
echo   tags   = {
echo     Name = "${var.project_name}-RouteTable"
echo   }
echo }
echo.
echo resource "aws_route_table_association" "a" {
echo   subnet_id      = aws_subnet.public.id
echo   route_table_id = aws_route_table.r.id
echo }
echo.
echo resource "aws_security_group" "ec2_sg" {
echo   vpc_id      = aws_vpc.main.id
echo   name        = "${var.project_name}-EC2-SG"
echo   description = "Allow SSH, HTTP, and K8s API access"
echo.
echo   ingress {
echo     from_port   = 22
echo     to_port     = 22
echo     protocol    = "tcp"
echo     cidr_blocks = ["0.0.0.0/0"]
echo   }
echo.
echo   ingress {
echo     from_port   = 80
echo     to_port     = 80
echo     protocol    = "tcp"
echo     cidr_blocks = ["0.0.0.0/0"]
echo   }
echo.
echo   ingress {
echo     from_port   = 6443
echo     to_port     = 6443
echo     protocol    = "tcp"
echo     cidr_blocks = ["0.0.0.0/0"]
echo   }
echo.
echo   egress {
echo     from_port   = 0
echo     to_port     = 0
echo     protocol    = "-1"
echo     cidr_blocks = ["0.0.0.0/0"]
echo   }
echo.
echo   tags = {
echo     Name = "${var.project_name}-EC2-SecurityGroup"
echo   }
echo }
echo.
echo resource "aws_instance" "app_server" {
echo   ami                    = data.aws_ami.ubuntu.id
echo   instance_type          = var.instance_type
echo   key_name               = aws_key_pair.ec2_key_pair.key_name
echo   subnet_id              = aws_subnet.public.id
echo   vpc_security_group_ids = [aws_security_group.ec2_sg.id]
echo   iam_instance_profile   = aws_iam_instance_profile.s3_profile.name
echo.
echo   user_data = ^<^<-EOF
echo     #!/bin/bash
echo     sudo apt-get update
echo     sudo apt-get install -y docker.io nginx s3fs
echo     
echo     # Mount S3 Bucket for Uploads
echo     mkdir -p /mnt/s3_uploads
echo     sed -i 's/#user_allow_other/user_allow_other/' /etc/fuse.conf
echo     echo "s3fs#${aws_s3_bucket.data_bucket.id} /mnt/s3_uploads fuse _netdev,allow_other,iam_role=auto,endpoint=${var.aws_region},url=https://s3.${var.aws_region}.amazonaws.com 0 0" ^>^> /etc/fstab
echo     mount /mnt/s3_uploads
echo     mkdir -p /mnt/s3_uploads/backend/uploads
echo     chmod 777 /mnt/s3_uploads/backend/uploads
echo.
echo     sudo systemctl start docker
echo     sudo systemctl enable docker
echo     sudo usermod -aG docker ubuntu
echo.
echo     # Run PostgreSQL with Persistence
echo     docker run -d --name postgres-db \
echo       -e POSTGRES_PASSWORD=admin123 \
echo       postgres:14
echo.
echo     # Pull and Run Siva Medicals App
echo     docker pull pravinnpci/siva-medicals:latest
echo     docker run -d --name siva-app -p 3001:3001 -v /mnt/s3_uploads/backend/uploads:/app/uploads --link postgres-db:db -e DB_HOST=db -e DB_PASSWORD=admin123 pravinnpci/siva-medicals:latest
echo.
echo     # Configure Nginx as Reverse Proxy
echo     cat ^> /etc/nginx/sites-available/default ^<^<NX
echo     server {
echo         listen 80;
echo         location / {
echo             proxy_pass http://${aws_s3_bucket.data_bucket.bucket_regional_domain_name}/frontend/;
echo             proxy_set_header Host ${aws_s3_bucket.data_bucket.bucket_regional_domain_name};
echo         }
echo         location /uploads {
echo             alias /mnt/s3_uploads/backend/uploads/;
echo         }
echo         location /api {
echo             proxy_pass http://localhost:3001;
echo         }
echo     }
echo     NX
echo     systemctl restart nginx
echo     EOF
echo.
echo   tags = {
echo     Name = "${var.project_name}-AppServer"
echo   }
echo }
echo.
echo data "aws_eip" "selected" {
echo   public_ip = var.existing_eip
echo }
echo.
echo resource "aws_eip_association" "eip_assoc" {
echo   instance_id   = aws_instance.app_server.id
echo   allocation_id = data.aws_eip.selected.id
echo }
echo.
echo resource "aws_s3_bucket" "data_bucket" {
echo   bucket = "${var.s3_bucket_name_prefix}-${var.aws_region}-${random_id.bucket_suffix.hex}"
echo   tags   = {
echo     Name = "${var.project_name}-DataBucket"
echo   }
echo }
echo.
echo resource "aws_s3_bucket_website_configuration" "data_bucket_web" {
echo   bucket = aws_s3_bucket.data_bucket.id
echo   index_document { suffix = "index.html" }
echo   error_document { key = "error.html" }
echo }
echo.
echo resource "aws_s3_bucket_public_access_block" "data_bucket_access" {
echo   bucket = aws_s3_bucket.data_bucket.id
echo   block_public_acls       = false
echo   block_public_policy     = false
echo   ignore_public_acls      = false
echo   restrict_public_buckets = false
echo }
echo.
echo resource "aws_s3_bucket_policy" "allow_public_access" {
echo   depends_on = [aws_s3_bucket_public_access_block.data_bucket_access]
echo   bucket = aws_s3_bucket.data_bucket.id
echo   policy = jsonencode^({
echo     Version = "2012-10-17"
echo     Statement = [{
echo       Effect    = "Allow"
echo       Principal = "*"
echo       Action    = "s3:GetObject"
echo       Resource  = "${aws_s3_bucket.data_bucket.arn}/*"
echo     }]
echo   }^)
echo }
echo resource "aws_s3_bucket_ownership_controls" "data_bucket_oc" {
echo   bucket = aws_s3_bucket.data_bucket.id
echo   rule {
echo     object_ownership = "BucketOwnerPreferred"
echo   }
echo }
echo.
echo resource "aws_s3_bucket_acl" "data_bucket_acl" {
echo   depends_on = [aws_s3_bucket_ownership_controls.data_bucket_oc]
echo   bucket     = aws_s3_bucket.data_bucket.id
echo   acl        = "private"
echo }
echo.
echo resource "random_id" "bucket_suffix" {
echo   byte_length = 8
echo }
) > main.tf

echo.
echo Creating outputs.tf...
(
echo output "instance_public_ip" {
echo   description = "Public IP address of the EC2 instance"
echo   value       = var.existing_eip
echo }
echo.
echo output "s3_website_url" {
echo   description = "URL of the S3 static website"
echo   value       = "http://${aws_s3_bucket.data_bucket.bucket_regional_domain_name}/frontend/index.html"
echo }
echo.
echo output "instance_id" {
echo   description = "ID of the EC2 instance"
echo   value       = aws_instance.app_server.id
echo }
echo.
echo output "s3_bucket_name" {
echo   description = "Name of the S3 bucket"
echo   value       = aws_s3_bucket.data_bucket.id
echo }
echo.
echo output "ssh_key_path" {
echo   description = "Path to the generated SSH private key file"
echo   value       = "${path.module}/sivamedicals_ec2_key.pem"
echo }
echo.
echo output "ssh_command" {
echo   description = "Command to SSH into the EC2 instance"
echo   value       = "ssh -i \"${path.module}/sivamedicals_ec2_key.pem\" ubuntu@${var.existing_eip}"
echo }
) > outputs.tf

echo.
echo All Terraform files created successfully in ./%TF_DIR%.
echo Formatting Terraform files...
terraform fmt

echo Initializing Terraform...
terraform init

echo.
echo Planning Terraform changes...
terraform plan -refresh=true -out=tfplan.out

echo.
echo Securing private key permissions (if file exists)...
if exist "sivamedicals_ec2_key.pem" icacls "sivamedicals_ec2_key.pem" /inheritance:r /grant:r "%USERNAME%":"(R)" >nul 2>&1

echo.
echo Applying Terraform changes...
terraform apply -auto-approve "tfplan.out"

echo.
for /f "tokens=*" %%i in ('terraform output -raw instance_id') do set "ACTUAL_INSTANCE_ID=%%i"
if defined ACTUAL_INSTANCE_ID (
    echo Ensuring instance !ACTUAL_INSTANCE_ID! is started...
    aws ec2 start-instances --instance-ids !ACTUAL_INSTANCE_ID! --region %AWS_REGION% >nul 2>&1
)

echo.
echo Ensuring local backend\uploads directory exists for S3 sync...
if not exist "%BASE_DIR%backend" mkdir "%BASE_DIR%backend"
if not exist "%BASE_DIR%backend\uploads" mkdir "%BASE_DIR%backend\uploads"
echo Syncing frontend files to S3...
for /f "tokens=*" %%i in ('terraform output -raw s3_bucket_name') do (
    aws s3 sync "%BASE_DIR%frontend" s3://%%i/frontend --delete --region %AWS_REGION%
    aws s3 sync "%BASE_DIR%backend/uploads" s3://%%i/backend/uploads --delete --region %AWS_REGION%
)

echo.
echo Terraform deployment complete!
echo You can find the outputs above, including your EC2 instance's public IP and SSH command.
echo IMPORTANT: The private key file 'sivamedicals_ec2_key.pem' has been saved in the '%TF_DIR%' folder.
echo Keep this file secure, as it is required to SSH into your EC2 instance.
echo Remember to manage your EC2 instance (stop/start) to stay within free tier limits.

echo.
if defined ACTUAL_INSTANCE_ID (
    if /i "%CI%"=="true" (
        echo [CI] Running in automated environment. Skipping interactive cost-saving prompt.
        goto :end_script
    )

    echo Instance ID: %ACTUAL_INSTANCE_ID%
    :: Clear variable to ensure fresh input
    set "USER_DECISION="
    set /p USER_DECISION="Do you want to STOP the instance now to save costs? (Y/N): "

    if /i "!USER_DECISION!"=="Y" (
        echo.
        echo Sending stop request to AWS for instance %ACTUAL_INSTANCE_ID%...
        aws ec2 stop-instances --instance-ids %ACTUAL_INSTANCE_ID% --region %AWS_REGION%
    ) else (
        echo.
        echo Instance %ACTUAL_INSTANCE_ID% is left in the RUNNING state.
    )
) else (
    echo Warning: Could not retrieve Instance ID from Terraform outputs.
)

:end_script
if /i not "%CI%"=="true" pause
endlocal