provider "aws" {
  region = var.aws_region
}

# Dynamically find the latest Ubuntu 20.04 AMI for this region
data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}

# Create a new private key and corresponding public key
resource "tls_private_key" "rsa_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Save the private key to a local file
resource "local_file" "private_key" {
  content  = tls_private_key.rsa_key.private_key_pem
  filename = "sivamedicals_ec2_key.pem"
  file_permission = "0400" # Important for SSH access
}

# Upload the public key to AWS to create an EC2 Key Pair
resource "aws_key_pair" "ec2_key_pair" {
  key_name   = "${var.project_name}-ec2-key"
  public_key = tls_private_key.rsa_key.public_key_openssh
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "${var.project_name}-VPC"
  }
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone = "${var.aws_region}a"
  tags = {
    Name = "${var.project_name}-PublicSubnet"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "${var.project_name}-IGW"
  }
}

resource "aws_route_table" "r" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
  tags = {
    Name = "${var.project_name}-RouteTable"
  }
}

resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.r.id
}

resource "aws_security_group" "ec2_sg" {
  vpc_id      = aws_vpc.main.id
  name        = "${var.project_name}-EC2-SG"
  description = "Allow SSH, HTTP, and K8s API access"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-EC2-SecurityGroup"
  }
}

resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.ec2_key_pair.key_name # Use the key pair created by Terraform
  subnet_id     = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update
              sudo apt-get install -y docker.io
              sudo systemctl start docker
              sudo systemctl enable docker
              sudo usermod -aG docker ubuntu
              EOF

  tags = {
    Name = "${var.project_name}-AppServer"
  }
}

data "aws_eip" "selected" {
  public_ip = var.existing_eip
}

resource "aws_eip_association" "eip_assoc" {
  instance_id   = aws_instance.app_server.id
  allocation_id = data.aws_eip.selected.id
}

resource "aws_s3_bucket" "data_bucket" {
  bucket = "${var.s3_bucket_name_prefix}-${var.aws_region}-${random_id.bucket_suffix.hex}"
  tags = {
    Name = "${var.project_name}-DataBucket"
  }
}

resource "aws_s3_bucket_ownership_controls" "data_bucket_oc" {
  bucket = aws_s3_bucket.data_bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "data_bucket_acl" {
  depends_on = [aws_s3_bucket_ownership_controls.data_bucket_oc]
  bucket = aws_s3_bucket.data_bucket.id
  acl    = "private"
}

resource "random_id" "bucket_suffix" {
  byte_length = 8
}

resource "aws_ebs_volume" "data_volume" {
  availability_zone = aws_instance.app_server.availability_zone
  size              = var.ebs_volume_size_gb
  type              = "gp3"
  tags = {
    Name = "${var.project_name}-DataVolume"
  }
}

resource "aws_volume_attachment" "ebs_att" {
  device_name = "/dev/sdh"
  volume_id   = aws_ebs_volume.data_volume.id
  instance_id = aws_instance.app_server.id
}
