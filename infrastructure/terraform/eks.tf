module "eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true
  
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
  
  eks_managed_node_groups = {
    for name, config in var.node_groups : name => {
      instance_types = config.instance_types
      min_size      = config.min_size
      max_size      = config.max_size
      desired_size  = config.desired_size
      
      vpc_security_group_ids = [aws_security_group.node_group.id]
      
      labels = {
        Environment = var.environment
        NodeGroup   = name
      }
      
      tags = {
        Environment = var.environment
        NodeGroup   = name
      }
    }
  }
  
  # Cluster access entry
  access_entries = {
    admin = {
      kubernetes_groups = []
      principal_arn     = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
      
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }
}

resource "aws_security_group" "node_group" {
  name_prefix = "${var.cluster_name}-node-group"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.cluster_name}-node-group-sg"
  }
}

data "aws_caller_identity" "current" {}