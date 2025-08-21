# Development Environment Configuration

# Basic settings
environment = "development"
aws_region = "us-west-2"
cluster_name = "ecommerce-inventory-dev"
cluster_version = "1.27"

# Domain configuration
domain_name = "dev.ecommerce-inventory.com"

# VPC configuration
vpc_cidr = "10.2.0.0/16"
availability_zones = ["us-west-2a", "us-west-2b"]

# EKS node groups configuration
node_groups = {
  general = {
    instance_types = ["t3.small"]
    min_size      = 1
    max_size      = 4
    desired_size  = 2
  }
}

# RDS configuration
rds_instance_class = "db.t3.micro"
rds_allocated_storage = 20
rds_max_allocated_storage = 100
rds_backup_retention_period = 1
rds_multi_az = false
rds_performance_insights_enabled = false

# ElastiCache configuration
elasticache_node_type = "cache.t3.micro"
elasticache_num_cache_clusters = 1
elasticache_automatic_failover_enabled = false
elasticache_multi_az_enabled = false

# S3 configuration
s3_versioning_enabled = false
s3_lifecycle_enabled = false
s3_intelligent_tiering_enabled = false

# CloudFront configuration
cloudfront_price_class = "PriceClass_100"
cloudfront_minimum_protocol_version = "TLSv1.2_2021"

# Monitoring and logging
enable_container_insights = false
log_retention_in_days = 3
enable_flow_logs = false

# Security settings
enable_encryption_at_rest = false
enable_encryption_in_transit = true
enable_secrets_manager = false

# Backup settings
enable_automated_backups = false
backup_retention_period = 1

# Tags
common_tags = {
  Environment = "development"
  Project     = "ecommerce-inventory"
  Owner       = "development-team"
  CostCenter  = "engineering"
  Compliance  = "none"
}