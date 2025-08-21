# Production Operations Runbook

## Overview
This runbook provides comprehensive operational procedures for the eCommerce platform production environment.

## Quick Reference

### Emergency Contacts
- **On-Call Engineer**: [Contact Information]
- **DevOps Team**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **Security Team**: [Contact Information]

### Critical URLs
- **Production Application**: https://production.domain.com
- **Monitoring Dashboard**: https://grafana.production.internal
- **Metrics**: https://prometheus.production.internal
- **Log Aggregation**: https://elasticsearch.production.internal

## Deployment Procedures

### Blue-Green Deployment
```powershell
# Standard deployment
./scripts/deployment/blue-green-deploy.ps1 -Version "v1.2.3"

# Dry run
./scripts/deployment/blue-green-deploy.ps1 -Version "v1.2.3" -DryRun

# Rollback
./scripts/deployment/blue-green-deploy.ps1 -Rollback
```

### Canary Deployment
```powershell
# Canary deployment with auto-promotion
./scripts/deployment/canary-deploy.ps1 -Version "v1.2.3" -AutoPromote

# Manual canary deployment
./scripts/deployment/canary-deploy.ps1 -Version "v1.2.3" -InitialTrafficPercent 5

# Rollback canary
./scripts/deployment/canary-deploy.ps1 -Rollback
```

## Health Monitoring

### Health Check Commands
```powershell
# Basic health check
./scripts/operations/health-check.ps1

# Detailed health check with metrics
./scripts/operations/health-check.ps1 -Detailed

# Continuous monitoring
./scripts/operations/health-check.ps1 -Continuous -IntervalSeconds 30

# JSON output for automation
./scripts/operations/health-check.ps1 -Json
```

### Service Status Verification
1. **API Service**: `curl https://production.domain.com/api/health`
2. **Web Application**: `curl https://production.domain.com/health`
3. **Database**: Check via API health endpoint
4. **Redis Cache**: Check via API health endpoint
5. **Load Balancer**: `curl https://production.domain.com/health`

## Incident Response

### Severity Levels
- **P0 (Critical)**: Complete service outage, data loss
- **P1 (High)**: Major functionality impaired, significant user impact
- **P2 (Medium)**: Minor functionality issues, limited user impact
- **P3 (Low)**: Cosmetic issues, no user impact

### Response Procedures

#### P0/P1 Incident Response
1. **Immediate Actions** (0-5 minutes)
   - Acknowledge the alert
   - Assess the scope and impact
   - Notify stakeholders via incident channel
   - Begin investigation

2. **Investigation** (5-15 minutes)
   - Check monitoring dashboards
   - Review recent deployments
   - Examine error logs
   - Identify root cause

3. **Mitigation** (15-30 minutes)
   - Implement immediate fix or rollback
   - Verify service restoration
   - Monitor for stability

4. **Communication**
   - Update status page
   - Notify affected users
   - Provide regular updates

#### Common Issues and Solutions

##### High Error Rate
```powershell
# Check error logs
docker logs ecommerce-api-prod --tail 100

# Check metrics
curl "http://prometheus.internal:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])"

# Possible actions
- Scale up services
- Rollback recent deployment
- Check database connections
```

##### High Response Time
```powershell
# Check system resources
./scripts/operations/health-check.ps1 -Detailed

# Check database performance
docker exec ecommerce-postgres-prod psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Possible actions
- Scale horizontally
- Optimize database queries
- Clear cache
- Check for memory leaks
```

##### Database Issues
```powershell
# Check database health
docker exec ecommerce-postgres-prod pg_isready -U postgres

# Check connections
docker exec ecommerce-postgres-prod psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check locks
docker exec ecommerce-postgres-prod psql -U postgres -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Possible actions
- Restart database (last resort)
- Kill long-running queries
- Increase connection limits
```

##### Cache Issues
```powershell
# Check Redis health
docker exec ecommerce-redis-prod redis-cli ping

# Check memory usage
docker exec ecommerce-redis-prod redis-cli info memory

# Clear cache if needed
docker exec ecommerce-redis-prod redis-cli flushall

# Possible actions
- Restart Redis
- Increase memory limits
- Optimize cache keys
```

## Scaling Procedures

### Horizontal Scaling
```powershell
# Scale API service
docker-compose -f infrastructure/production/docker-compose.production.yml up -d --scale api=3

# Scale web service
docker-compose -f infrastructure/production/docker-compose.production.yml up -d --scale web=2

# Update load balancer configuration
docker exec nginx-lb nginx -s reload
```

### Vertical Scaling
1. Update resource limits in docker-compose.production.yml
2. Recreate services with new limits
3. Monitor performance improvements

## Backup and Recovery

### Database Backup
```powershell
# Manual backup
./scripts/backup/full-system-backup.ps1

# Verify backup
./scripts/database/restore.ps1 -DryRun -BackupFile "backup-2024-01-01.sql"
```

### Application Data Backup
```powershell
# Backup uploaded files
docker run --rm -v ecommerce_api_uploads:/data -v $(pwd)/backups:/backup alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .

# Backup logs
docker run --rm -v ecommerce_api_logs:/data -v $(pwd)/backups:/backup alpine tar czf /backup/logs-$(date +%Y%m%d).tar.gz -C /data .
```

## Performance Optimization

### Database Optimization
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public';

-- Analyze tables
ANALYZE;
```

### Cache Optimization
```powershell
# Warm up cache
./scripts/optimization/cache-warming.ps1

# Check cache hit ratio
docker exec ecommerce-redis-prod redis-cli info stats | grep keyspace
```

## Security Procedures

### Security Incident Response
1. **Immediate Actions**
   - Isolate affected systems
   - Preserve evidence
   - Notify security team
   - Document timeline

2. **Investigation**
   - Analyze logs for suspicious activity
   - Check for data breaches
   - Identify attack vectors
   - Assess damage

3. **Remediation**
   - Patch vulnerabilities
   - Update security configurations
   - Reset compromised credentials
   - Implement additional monitoring

### Security Monitoring
```powershell
# Check for failed login attempts
docker logs ecommerce-api-prod | grep "authentication failed"

# Monitor unusual traffic patterns
curl "http://prometheus.internal:9090/api/v1/query?query=rate(http_requests_total[5m])"

# Check SSL certificate expiry
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout | grep "Not After"
```

## Maintenance Procedures

### Scheduled Maintenance
1. **Pre-maintenance**
   - Notify users via status page
   - Create maintenance window
   - Prepare rollback plan
   - Backup critical data

2. **During Maintenance**
   - Follow maintenance checklist
   - Monitor system health
   - Document changes
   - Test functionality

3. **Post-maintenance**
   - Verify all services are healthy
   - Update documentation
   - Close maintenance window
   - Notify users of completion

### Regular Maintenance Tasks

#### Daily
- Review monitoring alerts
- Check backup completion
- Monitor disk space usage
- Review error logs

#### Weekly
- Update security patches
- Review performance metrics
- Clean up old logs
- Test backup restoration

#### Monthly
- Review and update documentation
- Conduct security audit
- Performance optimization review
- Disaster recovery testing

## Troubleshooting Guide

### Log Locations
- **API Logs**: `docker logs ecommerce-api-prod`
- **Web Logs**: `docker logs ecommerce-web-prod`
- **Database Logs**: `docker logs ecommerce-postgres-prod`
- **Redis Logs**: `docker logs ecommerce-redis-prod`
- **Nginx Logs**: `docker logs ecommerce-nginx-prod`

### Common Commands
```powershell
# Check container status
docker ps -a

# Check resource usage
docker stats

# Check network connectivity
docker network ls
docker network inspect ecommerce-network

# Check volumes
docker volume ls
docker volume inspect ecommerce_postgres_data
```

### Performance Debugging
```powershell
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s "https://production.domain.com/api/health"

# Check database query performance
docker exec ecommerce-postgres-prod psql -U postgres -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 5;"

# Check memory usage
docker exec ecommerce-api-prod cat /proc/meminfo
```

## Contact Information

### Escalation Matrix
1. **Level 1**: On-call engineer
2. **Level 2**: Senior DevOps engineer
3. **Level 3**: Engineering manager
4. **Level 4**: CTO

### External Vendors
- **Cloud Provider**: [Contact Information]
- **CDN Provider**: [Contact Information]
- **Monitoring Service**: [Contact Information]
- **Security Service**: [Contact Information]

## Documentation Links
- [Architecture Documentation](../architecture/)
- [API Documentation](../api/)
- [Disaster Recovery Plan](../disaster-recovery/)
- [Security Policies](../../security/policies/)
- [Change Management Process](./change-management.md)