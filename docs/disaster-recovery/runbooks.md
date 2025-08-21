# Disaster Recovery Runbooks

## Quick Reference

### Emergency Contacts
- **Primary On-Call**: +1-555-0123 (ops-primary@company.com)
- **Secondary On-Call**: +1-555-0124 (ops-secondary@company.com)
- **Management**: +1-555-0125 (management@company.com)
- **Security Team**: +1-555-0126 (security@company.com)

### Critical Commands
```powershell
# Check system health
./scripts/disaster-recovery/health-check.ps1

# Execute failover
./scripts/disaster-recovery/failover-automation.ps1 -FailoverType "full-system" -TargetSite "dr-site-1"

# Restore from backup
./scripts/disaster-recovery/restore-procedures.ps1 -BackupPath "latest" -RestoreType "full"
```

## Incident Response Procedures

### 1. Initial Assessment (0-5 minutes)

#### Step 1: Acknowledge the Alert
- [ ] Acknowledge alert in monitoring system
- [ ] Join incident response channel (#incident-response)
- [ ] Notify secondary on-call engineer

#### Step 2: Assess Severity
Use the following criteria to determine incident severity:

**Severity 1 (Critical)**
- Complete system outage
- Data loss or corruption
- Security breach
- Customer-facing services down

**Severity 2 (High)**
- Partial system outage
- Performance degradation >50%
- Non-critical data loss
- Internal services affected

**Severity 3 (Medium)**
- Minor performance issues
- Non-critical feature unavailable
- Monitoring alerts

#### Step 3: Initial Triage
```powershell
# Run health check script
./scripts/monitoring/health-check.ps1

# Check system status
kubectl get pods --all-namespaces
kubectl get nodes
kubectl top nodes
```

### 2. Investigation Phase (5-15 minutes)

#### Database Issues
```powershell
# Check database connectivity
kubectl exec -n production deployment/api-deployment -- pg_isready -h postgres-ha-cluster-rw

# Check replication status
kubectl exec -n production postgres-ha-cluster-1 -- psql -c "SELECT * FROM pg_stat_replication;"

# Check database performance
kubectl exec -n production postgres-ha-cluster-1 -- psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

#### Application Issues
```powershell
# Check application logs
kubectl logs -n production -l app=api --tail=100
kubectl logs -n production -l app=web --tail=100

# Check resource usage
kubectl top pods -n production

# Check service endpoints
kubectl get endpoints -n production
```

#### Infrastructure Issues
```powershell
# Check node status
kubectl describe nodes

# Check persistent volumes
kubectl get pv,pvc --all-namespaces

# Check network policies
kubectl get networkpolicies --all-namespaces
```

### 3. Decision Making (15-20 minutes)

#### Failover Decision Matrix

| Condition | Database Failover | Application Failover | Full System Failover |
|-----------|-------------------|---------------------|---------------------|
| DB Primary Down | ✅ | ❌ | ❌ |
| DB Cluster Down | ✅ | ❌ | ✅ |
| API Pods Down | ❌ | ✅ | ❌ |
| Multiple Components Down | ❌ | ❌ | ✅ |
| Site Connectivity Lost | ❌ | ❌ | ✅ |

#### Approval Process
- **Severity 1**: Automatic approval for predefined scenarios
- **Severity 2**: On-call engineer approval required
- **Severity 3**: Management approval required

### 4. Execution Phase (20-35 minutes)

#### Database Failover
```powershell
# Automated database failover
./scripts/disaster-recovery/failover-automation.ps1 -FailoverType "database" -TargetSite "dr-site-1" -AutoApprove

# Manual database failover
kubectl patch postgresql postgres-ha-cluster -n production --type='merge' -p='{"spec":{"switchover":{"targetPrimary":"postgres-ha-cluster-2"}}}'

# Verify failover
kubectl exec -n production postgres-ha-cluster-2 -- psql -c "SELECT pg_is_in_recovery();"
```

#### Application Failover
```powershell
# Scale up DR site applications
kubectl config use-context dr-site-1
kubectl scale deployment api-deployment --replicas=3 -n disaster-recovery
kubectl scale deployment web-deployment --replicas=3 -n disaster-recovery

# Update load balancer
kubectl patch service nginx-lb -n production -p '{"spec":{"selector":{"site":"dr-site-1"}}}'

# Verify application health
kubectl get pods -n disaster-recovery
curl -f https://api.yourdomain.com/health
```

#### Full System Failover
```powershell
# Execute full system failover
./scripts/disaster-recovery/failover-automation.ps1 -FailoverType "full-system" -TargetSite "dr-site-1" -AutoApprove

# Monitor failover progress
./scripts/disaster-recovery/monitor-failover.ps1 -TargetSite "dr-site-1"
```

### 5. Validation Phase (35-40 minutes)

#### System Health Validation
```powershell
# Comprehensive health check
./scripts/disaster-recovery/validate-recovery.ps1

# Database validation
kubectl exec -n production deployment/api-deployment -- node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) FROM users').then(r => console.log('Users:', r.rows[0].count));
"

# Application validation
curl -f https://api.yourdomain.com/health
curl -f https://app.yourdomain.com/api/health

# Performance validation
./scripts/monitoring/performance-test.ps1 -Duration 300
```

#### Data Integrity Validation
```powershell
# Check data consistency
./scripts/database/integrity-check.ps1

# Verify recent transactions
kubectl exec -n production deployment/api-deployment -- node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL \\'1 hour\\'').then(r => console.log('Recent orders:', r.rows[0].count));
"
```

## Recovery Procedures

### Database Recovery

#### From Backup
```powershell
# List available backups
./scripts/backup/list-backups.ps1 -Type "database"

# Restore specific backup
./scripts/disaster-recovery/restore-procedures.ps1 -BackupPath "backups/database/db-backup-20241221-120000.sql" -RestoreType "database-only" -TargetEnvironment "production"

# Verify restore
./scripts/database/verify-restore.ps1
```

#### Point-in-Time Recovery
```powershell
# Restore to specific timestamp
./scripts/database/point-in-time-recovery.ps1 -TargetTime "2024-12-21 12:00:00"

# Verify recovery point
kubectl exec -n production postgres-ha-cluster-1 -- psql -c "SELECT pg_last_xact_replay_timestamp();"
```

### Application Recovery

#### Rollback Deployment
```powershell
# Rollback to previous version
kubectl rollout undo deployment/api-deployment -n production
kubectl rollout undo deployment/web-deployment -n production

# Check rollback status
kubectl rollout status deployment/api-deployment -n production
kubectl rollout status deployment/web-deployment -n production
```

#### Restore from Backup
```powershell
# Restore application state
./scripts/disaster-recovery/restore-procedures.ps1 -BackupPath "latest" -RestoreType "application-only" -TargetEnvironment "production"

# Restart applications
kubectl rollout restart deployment/api-deployment -n production
kubectl rollout restart deployment/web-deployment -n production
```

### File Storage Recovery

#### S3 Recovery
```powershell
# Restore from S3 backup
aws s3 sync s3://backup-bucket/file-storage ./restore/files

# Copy to persistent volume
kubectl run file-restore --image=alpine --restart=Never -- sleep 3600
kubectl cp ./restore/files file-restore:/mnt/uploads/
kubectl delete pod file-restore
```

#### Local Storage Recovery
```powershell
# Restore from local backup
./scripts/disaster-recovery/restore-procedures.ps1 -BackupPath "latest" -RestoreType "files-only" -TargetEnvironment "production"
```

## Communication Procedures

### Internal Communication

#### Incident Declaration
```
Subject: [INCIDENT] Severity X - Brief Description

Incident Details:
- Severity: X
- Start Time: YYYY-MM-DD HH:MM UTC
- Affected Systems: List of systems
- Impact: Description of impact
- Incident Commander: Name
- Status: Investigating/Mitigating/Resolved

Next Update: In X minutes
```

#### Status Updates
```
Subject: [INCIDENT UPDATE] Severity X - Brief Description

Update:
- Current Status: Description
- Actions Taken: List of actions
- Next Steps: Planned actions
- ETA: Estimated resolution time

Next Update: In X minutes
```

#### Resolution Notice
```
Subject: [INCIDENT RESOLVED] Brief Description

Resolution Summary:
- Resolution Time: YYYY-MM-DD HH:MM UTC
- Root Cause: Brief description
- Actions Taken: Summary of resolution steps
- Follow-up Actions: Any required follow-up

Post-Incident Review: Scheduled for [date/time]
```

### External Communication

#### Customer Notification Template
```
Subject: Service Disruption Notice

Dear Customers,

We are currently experiencing technical difficulties that may affect your ability to access our services. Our team is actively working to resolve this issue.

Affected Services: [List]
Impact: [Description]
Estimated Resolution: [Time]

We apologize for any inconvenience and will provide updates as they become available.

Status Page: https://status.company.com
Support: support@company.com

Thank you for your patience.
```

## Post-Incident Procedures

### Immediate Actions (0-2 hours after resolution)

#### System Stabilization
```powershell
# Monitor system stability
./scripts/monitoring/stability-check.ps1 -Duration 3600

# Check for any lingering issues
kubectl get events --all-namespaces --sort-by='.lastTimestamp'

# Verify all services are healthy
./scripts/monitoring/comprehensive-health-check.ps1
```

#### Data Validation
```powershell
# Comprehensive data integrity check
./scripts/database/full-integrity-check.ps1

# Verify backup systems
./scripts/backup/verify-backup-systems.ps1

# Check monitoring systems
./scripts/monitoring/verify-monitoring.ps1
```

### Documentation (2-24 hours after resolution)

#### Incident Timeline
Document the following:
- [ ] Initial detection time
- [ ] Escalation timeline
- [ ] Key decision points
- [ ] Actions taken with timestamps
- [ ] Resolution time
- [ ] Total impact duration

#### Impact Assessment
- [ ] Number of affected users
- [ ] Revenue impact (if applicable)
- [ ] Data loss assessment
- [ ] SLA impact calculation
- [ ] Customer complaints received

### Post-Incident Review (24-72 hours after resolution)

#### Review Meeting Agenda
1. **Incident Overview** (10 minutes)
   - Timeline review
   - Impact summary
   - Key metrics

2. **Root Cause Analysis** (20 minutes)
   - Technical root cause
   - Process failures
   - Human factors

3. **Response Evaluation** (15 minutes)
   - What went well
   - What could be improved
   - Communication effectiveness

4. **Action Items** (15 minutes)
   - Technical improvements
   - Process changes
   - Training needs
   - Timeline for implementation

#### Follow-up Actions
- [ ] Create improvement tickets
- [ ] Update runbooks
- [ ] Schedule training sessions
- [ ] Review and update monitoring
- [ ] Test disaster recovery procedures

## Training and Drills

### Monthly Drills

#### Database Failover Drill
```powershell
# Simulate database failure
./scripts/testing/simulate-db-failure.ps1

# Execute failover procedure
./scripts/disaster-recovery/failover-automation.ps1 -FailoverType "database" -TargetSite "dr-site-1" -DryRun

# Validate and document results
./scripts/testing/validate-drill-results.ps1 -DrillType "database-failover"
```

#### Application Recovery Drill
```powershell
# Simulate application failure
./scripts/testing/simulate-app-failure.ps1

# Execute recovery procedure
./scripts/disaster-recovery/restore-procedures.ps1 -BackupPath "test-backup" -RestoreType "application-only" -TargetEnvironment "staging" -DryRun

# Validate results
./scripts/testing/validate-drill-results.ps1 -DrillType "application-recovery"
```

### Quarterly Full DR Test

#### Preparation Checklist
- [ ] Schedule maintenance window
- [ ] Notify stakeholders
- [ ] Prepare test environment
- [ ] Create test data set
- [ ] Review procedures

#### Execution Steps
1. **Simulate Disaster** (15 minutes)
2. **Execute Full Recovery** (45 minutes)
3. **Validate Systems** (30 minutes)
4. **Document Results** (30 minutes)
5. **Cleanup and Restore** (30 minutes)

#### Success Criteria
- [ ] RTO met (< 60 minutes)
- [ ] RPO met (< 15 minutes data loss)
- [ ] All critical systems operational
- [ ] Data integrity maintained
- [ ] Communication procedures followed

## Troubleshooting Guide

### Common Issues and Solutions

#### Database Connection Issues
```powershell
# Check database pods
kubectl get pods -n production -l app=postgres

# Check database logs
kubectl logs -n production postgres-ha-cluster-1

# Test connectivity
kubectl exec -n production deployment/api-deployment -- pg_isready -h postgres-ha-cluster-rw

# Reset connections
kubectl rollout restart deployment/api-deployment -n production
```

#### Application Performance Issues
```powershell
# Check resource usage
kubectl top pods -n production

# Check application logs for errors
kubectl logs -n production -l app=api --tail=1000 | grep -i error

# Scale up if needed
kubectl scale deployment api-deployment --replicas=5 -n production

# Check database performance
kubectl exec -n production postgres-ha-cluster-1 -- psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

#### Network Connectivity Issues
```powershell
# Check service endpoints
kubectl get endpoints -n production

# Test internal connectivity
kubectl run test-pod --image=busybox --restart=Never -- sleep 3600
kubectl exec test-pod -- nslookup postgres-ha-cluster-rw.production.svc.cluster.local

# Check ingress
kubectl get ingress -n production
kubectl describe ingress api-ingress -n production
```

#### Storage Issues
```powershell
# Check persistent volumes
kubectl get pv,pvc --all-namespaces

# Check storage usage
kubectl exec -n production postgres-ha-cluster-1 -- df -h

# Check for storage alerts
kubectl get events --all-namespaces | grep -i storage
```

### Escalation Procedures

#### Level 1: On-Call Engineer
- Initial response and triage
- Execute standard procedures
- Escalate if unable to resolve in 30 minutes

#### Level 2: Senior Engineer/Team Lead
- Complex technical issues
- Cross-system problems
- Escalate if unable to resolve in 60 minutes

#### Level 3: Management/Architecture Team
- System-wide outages
- Major architectural decisions
- External vendor coordination

#### Level 4: Executive Team
- Business-critical decisions
- Customer communication
- Media relations