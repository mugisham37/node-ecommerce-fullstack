# Staging Environment Configuration

# Basic settings
environment = "staging"
aws_region = "us-west-2"
cluster_name = "ecommerce-inventory-staging"
cluster_version = "1.27"

# Domain configuration
domain_name = "staging.ecommerce-inventory.com"

# VPC configuration
vpc_cidr = "10.1.0.0/16"
availability_zones = ["us-west-2a", "us-west-2b"]

# EKS node groups configuration
node_groups = {
  general = {
    instance_types = ["t3.medium"]
    min_size      = 2
    max_size      = 8
    desired_size  = 3
  }
  compute = {
    instance_types = ["c5.large"]
    min_size      = 1
    max_size      = 4
    desired_size  = 2
  }
}

# RDS configuration
rds_instance_class = "db.t3.medium"
rds_allocated_storage = 50
rds_max_allocated_storage = 200
rds_backup_retention_period = 7
rds_multi_az = false
rds_performance_insights_enabled = false

# ElastiCache configuration
elasticache_node_type = "cache.t3.medium"
elasticache_num_cache_clusters = 2
elasticache_automatic_failover_enabled = true
elasticache_multi_az_enabled = false

# S3 configuration
s3_versioning_enabled = true
s3_lifecycle_enabled = false
s3_intelligent_tiering_enabled = false

# CloudFront configuration
cloudfront_price_class = "PriceClass_100"
cloudfront_minimum_protocol_version = "TLSv1.2_2021"

# Monitoring and logging
enable_container_insights = true
log_retention_in_days = 7
enable_flow_logs = false

# Security settings
enable_encryption_at_rest = true
enable_encryption_in_transit = true
enable_secrets_manager = true

# Backup settings
enable_automated_backups = true
backup_retention_period = 7

# Tags
common_tags = {
  Environment = "staging"
  Project     = "ecommerce-inventory"
  Owner       = "platform-team"
  CostCenter  = "engineering"
  Compliance  = "optional"
}