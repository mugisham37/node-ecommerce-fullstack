resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.cluster_name}-cache-subnet"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_parameter_group" "main" {
  family = "redis7.x"
  name   = "${var.cluster_name}-cache-params"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.cluster_name}-cache"
  description                = "Redis cluster for ${var.cluster_name}"
  
  node_type                  = var.elasticache_node_type
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.main.name
  
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.elasticache.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_password.result
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.elasticache_slow.name
    destination_type = "cloudwatch-logs"
    log_format      = "text"
    log_type        = "slow-log"
  }
  
  tags = {
    Name = "${var.cluster_name}-redis"
  }
}

resource "random_password" "redis_password" {
  length  = 16
  special = false
}

resource "aws_cloudwatch_log_group" "elasticache_slow" {
  name              = "/aws/elasticache/${var.cluster_name}/slow-log"
  retention_in_days = 7
}