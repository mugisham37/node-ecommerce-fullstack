# Production Environment Configuration

# Basic settings
environment = "production"
aws_region = "us-west-2"
cluster_name = "ecommerce-inventory-prod"
cluster_version = "1.27"

# Domain configuration
domain_name = "ecommerce-inventory.com"

# VPC configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]

# EKS node groups configuration
node_groups = {
  general = {
    instance_types = ["t3.large"]
    min_size      = 3
    max_size      = 15
    desired_size  = 5
  }
  compute = {
    instance_types = ["c5.xlarge"]
    min_size      = 2
    max_size      = 10
    desired_size  = 3
  }
  memory = {
    instance_types = ["r5.large"]
    min_size      = 1
    max_size      = 5
    desired_size  = 2
  }
}

# RDS configuration
rds_instance_class = "db.r5.large"
rds_allocated_storage = 100
rds_max_allocated_storage = 500
rds_backup_retention_period = 30
rds_multi_az = true
rds_performance_insights_enabled = true

# ElastiCache configuration
elasticache_node_type = "cache.r5.large"
elasticache_num_cache_clusters = 3
elasticache_automatic_failover_enabled = true
elasticache_multi_az_enabled = true

# S3 configuration
s3_versioning_enabled = true
s3_lifecycle_enabled = true
s3_intelligent_tiering_enabled = true

# CloudFront configuration
cloudfront_price_class = "PriceClass_All"
cloudfront_minimum_protocol_version = "TLSv1.2_2021"

# Monitoring and logging
enable_container_insights = true
log_retention_in_days = 30
enable_flow_logs = true

# Security settings
enable_encryption_at_rest = true
enable_encryption_in_transit = true
enable_secrets_manager = true

# Backup settings
enable_automated_backups = true
backup_retention_period = 30

# Tags
common_tags = {
  Environment = "production"
  Project     = "ecommerce-inventory"
  Owner       = "platform-team"
  CostCenter  = "engineering"
  Compliance  = "required"
}