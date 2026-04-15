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
  content         = tls_private_key.rsa_key.private_key_pem
  filename        = "sivamedicals_ec2_key.pem"
  file_permission = "0400" # Important for SSH access
}

# Upload the public key to AWS to create an EC2 Key Pair
resource "aws_key_pair" "ec2_key_pair" {
  key_name   = "${var.project_name}-ec2-key"
  public_key = tls_private_key.rsa_key.public_key_openssh
}

# IAM Role for S3 Access
resource "aws_iam_role" "ec2_s3_role" {
  name = "${var.project_name}-S3Role"
  assume_role_policy = jsonencode( {
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  } )
}

resource "aws_iam_role_policy" "s3_policy" {
  name = "${var.project_name}-S3Policy"
  role = aws_iam_role.ec2_s3_role.id
  policy = jsonencode( {
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      Resource = [aws_s3_bucket.data_bucket.arn, "${aws_s3_bucket.data_bucket.arn}/*"]
    }]
  } )
}

resource "aws_iam_instance_profile" "s3_profile" {
  name = "${var.project_name}-S3Profile"
  role = aws_iam_role.ec2_s3_role.name
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = {
    Name = "${var.project_name}-VPC"
  }
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"
  tags                    = {
    Name = "${var.project_name}-PublicSubnet"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags   = {
    Name = "${var.project_name}-IGW"
  }
}

resource "aws_route_table" "r" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
  tags   = {
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
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.ec2_key_pair.key_name # Use the key pair created by Terraform
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.s3_profile.name

  user_data = <<-EOF
              #/bin/bash
              sudo apt-get update
              sudo apt-get install -y docker.io nginx s3fs
ECHO is off.
              # Mount EBS Volume for Postgres Data
              # t3 instances use NVMe, /dev/sdh usually becomes /dev/nvme1n1
              DEVICE=$(lsblk -dno NAME | grep -v "nvme0n1" | head -n 1)
              if [  -z "$DEVICE" ]; then
                if  blkid /dev/$DEVICE; then
                  mkfs -t ext4 /dev/$DEVICE
                fi
                mkdir -p /mnt/postgres_data
                mount /dev/$DEVICE /mnt/postgres_data
                echo "/dev/$DEVICE /mnt/postgres_data ext4 defaults,nofail 0 2" >> /etc/fstab
              fi

              # Mount S3 Bucket for Uploads
              mkdir -p /mnt/s3_uploads
              sed -i 's/#user_allow_other/user_allow_other/' /etc/fuse.conf
              echo "s3fs#${aws_s3_bucket.data_bucket.id} /mnt/s3_uploads fuse _netdev,allow_other,iam_role=auto,endpoint=${var.aws_region},url=https://s3.${var.aws_region}.amazonaws.com 0 0" >> /etc/fstab
              mount /mnt/s3_uploads
              mkdir -p /mnt/s3_uploads/uploads
              chmod 777 /mnt/s3_uploads/uploads

              sudo systemctl start docker
              sudo systemctl enable docker
              sudo usermod -aG docker ubuntu

              # Run PostgreSQL with Persistence
              docker run -d --name postgres-db \
                -v /mnt/postgres_data:/var/lib/postgresql/data \
                -e POSTGRES_PASSWORD=admin123 \
                postgres:14

              # Pull and Run Siva Medicals App
              docker pull pravinnpci/siva-medicals:latest
              docker run -d --name siva-app -p 3001:3001 -v /mnt/s3_uploads/uploads:/app/uploads --link postgres-db:db -e DB_HOST=db -e DB_PASSWORD=admin123 pravinnpci/siva-medicals:latest

              # Configure Nginx as Reverse Proxy
              cat > /etc/nginx/sites-available/default <<NX
              server {
                  listen 80;
                  location / {
                      proxy_pass http://${aws_s3_bucket.data_bucket.bucket_regional_domain_name}/frontend/;
                      proxy_set_header Host ${aws_s3_bucket.data_bucket.bucket_regional_domain_name};
                  }
                  location /uploads {
                      alias /mnt/s3_uploads/uploads/;
                  }
                  location /api {
                      proxy_pass http://localhost:3001;
                  }
              }
              NX
              systemctl restart nginx
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
  tags   = {
    Name = "${var.project_name}-DataBucket"
  }
}

resource "aws_s3_bucket_website_configuration" "data_bucket_web" {
  bucket = aws_s3_bucket.data_bucket.id
  index_document { suffix = "index.html" }
  error_document { key = "error.html" }
}

resource "aws_s3_bucket_public_access_block" "data_bucket_access" {
  bucket = aws_s3_bucket.data_bucket.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "allow_public_access" {
  bucket = aws_s3_bucket.data_bucket.id
  policy = jsonencode( {
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.data_bucket.arn}/*"
    }]
  } )
}
resource "aws_s3_bucket_ownership_controls" "data_bucket_oc" {
  bucket = aws_s3_bucket.data_bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "data_bucket_acl" {
  depends_on = [aws_s3_bucket_ownership_controls.data_bucket_oc]
  bucket     = aws_s3_bucket.data_bucket.id
  acl        = "private"
}

resource "random_id" "bucket_suffix" {
  byte_length = 8
}

resource "aws_ebs_volume" "data_volume" {
  availability_zone = aws_instance.app_server.availability_zone
  size              = var.ebs_volume_size_gb
  type              = "gp3"
  tags              = {
    Name = "${var.project_name}-DataVolume"
  }
}

resource "aws_volume_attachment" "ebs_att" {
  device_name = "/dev/sdh"
  volume_id   = aws_ebs_volume.data_volume.id
  instance_id = aws_instance.app_server.id
}
