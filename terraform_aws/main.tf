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
  filename        = "sivamedical.pem"
  file_permission = "0400" # Important for SSH access
}

# Upload the public key to AWS to create an EC2 Key Pair
resource "aws_key_pair" "ec2_key_pair" {
  key_name   = "sivamedical"
  public_key = var.public_key_data != "" ? var.public_key_data : tls_private_key.rsa_key.public_key_openssh
  
  # Prevent Terraform from replacing the key pair if it already exists,
  # as replacing a launch-time key pair does not update running instances.
  lifecycle {
    ignore_changes = [public_key]
  }
}

# IAM Role for S3 Access
resource "aws_iam_role" "ec2_s3_role" {
  name = "${var.project_name}-S3Role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "s3_policy" {
  name = "${var.project_name}-S3Policy"
  role = aws_iam_role.ec2_s3_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      Resource = [aws_s3_bucket.data_bucket.arn, "${aws_s3_bucket.data_bucket.arn}/*"]
    }]
  })
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
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
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
  lifecycle {
    prevent_destroy = true
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
  key_name               = aws_key_pair.ec2_key_pair.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.s3_profile.name

  user_data_replace_on_change = false
  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Create Swap Space (Critical for t3.micro/1GB RAM)
    if [ ! -f /swapfile ]; then
      fallocate -l 2G /swapfile
      chmod 600 /swapfile
      mkswap /swapfile
      swapon /swapfile
      echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi

    apt-get update
    # Install only host essentials. K3s handles containerization.
    apt-get install -y nginx s3fs curl

    # Sync SSH Key (Ensures CI/CD can always connect)
    echo "${var.public_key_data != "" ? var.public_key_data : tls_private_key.rsa_key.public_key_openssh}" >> /home/ubuntu/.ssh/authorized_keys

    # Mount EBS Volume for Postgres Data (T3 uses NVMe)
    while [ ! -b /dev/$(lsblk -dno NAME | grep -v "nvme0n1" | head -n 1) ]; do
      sleep 5
    done
    DEVICE=/dev/$(lsblk -dno NAME | grep -v "nvme0n1" | head -n 1)
    if [ ! -z "$DEVICE" ]; then
      if ! blkid $DEVICE; then
        mkfs -t ext4 $DEVICE
      fi
      mkdir -p /mnt/postgres_data
      mount $DEVICE /mnt/postgres_data
      echo "$DEVICE /mnt/postgres_data ext4 defaults,nofail 0 2" >> /etc/fstab
      chown -R 999:999 /mnt/postgres_data
    fi

    # Setup S3 mount
    mkdir -p /mnt/s3_uploads/backend/uploads
    chmod 777 /mnt/s3_uploads/backend/uploads
    sed -i 's/#user_allow_other/user_allow_other/' /etc/fuse.conf || true
    echo "s3fs#${aws_s3_bucket.data_bucket.id} /mnt/s3_uploads fuse _netdev,allow_other,iam_role=auto,endpoint=${var.aws_region},url=https://s3.${var.aws_region}.amazonaws.com 0 0" >> /etc/fstab
    mount -a || true

    # Install K3s (Master + Slave on one node) - Disable Traefik to save RAM
    curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644 --disable traefik" sh -
    
    # Create kubectl symlink immediately
    ln -s /usr/local/bin/k3s /usr/local/bin/kubectl || true
    
    # Wait for K3s readiness
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
    for i in {1..30}; do
       if [ -f /usr/local/bin/kubectl ] && /usr/local/bin/kubectl get nodes | grep -q "Ready"; then break; fi
       sleep 10
    done

    # Clean up legacy deployments if they exist
    /usr/local/bin/k3s kubectl delete deployment postgres siva-medicals --ignore-not-found
    sleep 10

    # Deploy to Kubernetes
    cat <<K8S | /usr/local/bin/k3s kubectl apply -f -
    apiVersion: v1
    kind: PersistentVolume
    metadata:
      name: postgres-pv
    spec:
      capacity:
        storage: 10Gi
      accessModes: [ReadWriteOnce]
      hostPath:
        path: "/mnt/postgres_data"
    ---
    apiVersion: v1
    kind: PersistentVolumeClaim
    metadata:
      name: postgres-pvc
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 10Gi
    ---
    apiVersion: v1
    kind: Service
    metadata:
      name: db
    spec:
      selector: { app: postgres }
      ports: [{ port: 5432 }]
    ---
    apiVersion: apps/v1
    kind: StatefulSet
    metadata:
      name: postgres
    spec:
      serviceName: "db"
      replicas: 1
      selector: { matchLabels: { app: postgres } }
      template:
        metadata: { labels: { app: postgres } }
        spec:
          containers:
          - name: postgres
            image: postgres:14
            env: [{ name: POSTGRES_PASSWORD, value: "admin123" }]
            volumeMounts: [{ name: data, mountPath: /var/lib/postgresql/data }]
          volumes: [{ name: data, persistentVolumeClaim: { claimName: postgres-pvc } }]
    ---
    apiVersion: v1
    kind: Service
    metadata:
      name: backend-service
    spec:
      type: NodePort
      selector: { app: backend }
      ports: [{ port: 3001, targetPort: 3001, nodePort: 30001 }]
    ---
    apiVersion: apps/v1
    kind: StatefulSet
    metadata:
      name: siva-medicals
    spec:
      serviceName: "backend-service"
      replicas: 1
      selector: { matchLabels: { app: backend } }
      template:
        metadata: { labels: { app: backend } }
        spec:
          containers:
          - name: backend
            image: pravinnpci/siva-medicals:latest
            imagePullPolicy: Always
            ports: [{ containerPort: 3001 }]
            env:
            - { name: DB_HOST, value: "db" }
            - { name: DB_PASSWORD, value: "admin123" }
            volumeMounts: [{ name: uploads, mountPath: /app/uploads }]
          volumes: [{ name: uploads, hostPath: { path: /mnt/s3_uploads/backend/uploads } }]
    K8S

    # Configure Nginx as Reverse Proxy
    cat > /etc/nginx/sites-available/default <<NX
    server {
        listen 80;
        resolver 8.8.8.8 1.1.1.1 valid=30s;
        set \$s3_backend '${aws_s3_bucket.data_bucket.id}.s3-website.ap-south-2.amazonaws.com';

        location / {
            proxy_pass http://\$s3_backend/frontend/;
            proxy_set_header Host \$s3_backend;
        }
        location /uploads {
            alias /mnt/s3_uploads/backend/uploads/;
        }
        location /api {
            proxy_pass http://localhost:30001;
        }
    }
    NX
    systemctl restart nginx
  EOF

  tags = {
    Name = "${var.project_name}-AppServer"
  }
  lifecycle {
    ignore_changes = [ami]
    prevent_destroy = true
  }
}

data "aws_eip" "selected" {
  public_ip = var.existing_eip
}

resource "aws_eip_association" "eip_assoc" {
  instance_id   = aws_instance.app_server.id
  allocation_id = data.aws_eip.selected.id
}

resource "aws_ebs_volume" "data_volume" {
  availability_zone = aws_instance.app_server.availability_zone
  size              = 10
  tags = {
    Name = "${var.project_name}-DataVolume"
  }
}

resource "aws_volume_attachment" "ebs_att" {
  device_name = "/dev/sdh"
  volume_id   = aws_ebs_volume.data_volume.id
  instance_id = aws_instance.app_server.id
  force_detach = true
}

resource "aws_s3_bucket" "data_bucket" {
  bucket = var.manual_bucket_name == "" ? "siva-medicals-data-hyderabad-ap-south-2" : var.manual_bucket_name
  force_destroy = true
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
  depends_on = [aws_s3_bucket_public_access_block.data_bucket_access]
  bucket = aws_s3_bucket.data_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.data_bucket.arn}/*"
    }]
  })
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
