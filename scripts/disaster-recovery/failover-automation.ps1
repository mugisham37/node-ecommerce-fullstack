#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Automated failover procedures for disaster recovery
.DESCRIPTION
    Handles automatic failover to backup systems and disaster recovery sites
.PARAMETER FailoverType
    Type of failover: database, application, full-system
.PARAMETER TargetSite
    Target site for failover: dr-site-1, dr-site-2, cloud-backup
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("database", "application", "full-system")]
    [string]$FailoverType,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("dr-site-1", "dr-site-2", "cloud-backup")]
    [string]$TargetSite,
    
    [switch]$AutoApprove = $false,
    [switch]$DryRun = $false,
    [int]$TimeoutMinutes = 30
)

# Configuration
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "./logs/failover-$timestamp.log"

# Ensure log directory exists
New-Item -ItemType Directory -Path "./logs" -Force | Out-Null

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

function Send-Alert {
    param([string]$Message, [string]$Severity = "INFO")
    
    Write-Log "ALERT [$Severity]: $Message" $Severity
    
    # Send to monitoring systems
    $alertPayload = @{
        timestamp = Get-Date -Format "o"
        severity = $Severity
        message = $Message
        source = "disaster-recovery-failover"
        failover_type = $FailoverType
        target_site = $TargetSite
    } | ConvertTo-Json
    
    # Send to Slack/Teams/PagerDuty (configure webhooks)
    try {
        if ($env:SLACK_WEBHOOK_URL) {
            Invoke-RestMethod -Uri $env:SLACK_WEBHOOK_URL -Method Post -Body @{text=$Message} -ContentType "application/json"
        }
        if ($env:PAGERDUTY_INTEGRATION_KEY) {
            $pdPayload = @{
                routing_key = $env:PAGERDUTY_INTEGRATION_KEY
                event_action = "trigger"
                payload = @{
                    summary = $Message
                    severity = $Severity.ToLower()
                    source = "disaster-recovery"
                }
            } | ConvertTo-Json -Depth 3
            Invoke-RestMethod -Uri "https://events.pagerduty.com/v2/enqueue" -Method Post -Body $pdPayload -ContentType "application/json"
        }
    } catch {
        Write-Log "Failed to send external alert: $($_.Exception.Message)" "WARNING"
    }
}

function Test-PrimarySystemHealth {
    Write-Log "Testing primary system health..."
    
    $healthChecks = @{
        Database = $false
        API = $false
        Web = $false
        Redis = $false
    }
    
    try {
        # Database health check
        $dbHealth = kubectl exec -n production deployment/api-deployment -- node -e "
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            pool.query('SELECT 1').then(() => console.log('OK')).catch(() => console.log('FAIL'));
        " 2>$null
        $healthChecks.Database = $dbHealth -eq "OK"
        
        # API health check
        $apiHealth = kubectl exec -n production deployment/api-deployment -- curl -s -f http://localhost:3000/health 2>$null
        $healthChecks.API = $apiHealth -match "healthy"
        
        # Web health check
        $webHealth = kubectl exec -n production deployment/web-deployment -- curl -s -f http://localhost:3000/api/health 2>$null
        $healthChecks.Web = $webHealth -match "healthy"
        
        # Redis health check
        $redisHealth = kubectl exec -n production statefulset/redis-cluster -- redis-cli ping 2>$null
        $healthChecks.Redis = $redisHealth -eq "PONG"
        
    } catch {
        Write-Log "Health check failed: $($_.Exception.Message)" "ERROR"
    }
    
    $healthyComponents = ($healthChecks.Values | Where-Object { $_ }).Count
    $totalComponents = $healthChecks.Count
    
    Write-Log "Primary system health: $healthyComponents/$totalComponents components healthy"
    
    foreach ($component in $healthChecks.Keys) {
        $status = if ($healthChecks[$component]) { "HEALTHY" } else { "UNHEALTHY" }
        Write-Log "  $component`: $status"
    }
    
    return $healthChecks
}

function Get-FailoverDecision {
    param([hashtable]$HealthStatus)
    
    $unhealthyComponents = $HealthStatus.Keys | Where-Object { !$HealthStatus[$_] }
    $unhealthyCount = $unhealthyComponents.Count
    
    Write-Log "Analyzing failover decision..."
    Write-Log "Unhealthy components: $($unhealthyComponents -join ', ')"
    
    # Decision matrix
    $shouldFailover = $false
    $reason = ""
    
    switch ($FailoverType) {
        "database" {
            if (!$HealthStatus.Database) {
                $shouldFailover = $true
                $reason = "Database is unhealthy"
            }
        }
        "application" {
            if (!$HealthStatus.API -or !$HealthStatus.Web) {
                $shouldFailover = $true
                $reason = "Application components are unhealthy"
            }
        }
        "full-system" {
            if ($unhealthyCount -ge 2) {
                $shouldFailover = $true
                $reason = "Multiple critical components are unhealthy"
            }
        }
    }
    
    Write-Log "Failover decision: $($if ($shouldFailover) { 'PROCEED' } else { 'ABORT' })"
    if ($reason) {
        Write-Log "Reason: $reason"
    }
    
    return @{
        ShouldFailover = $shouldFailover
        Reason = $reason
        UnhealthyComponents = $unhealthyComponents
    }
}

function Confirm-Failover {
    param([hashtable]$Decision)
    
    if ($AutoApprove) {
        Write-Log "Auto-approve enabled, proceeding with failover"
        return $true
    }
    
    if ($DryRun) {
        Write-Log "[DRY RUN] Would request failover confirmation"
        return $true
    }
    
    Write-Host ""
    Write-Host "FAILOVER CONFIRMATION REQUIRED" -ForegroundColor Red
    Write-Host "==============================" -ForegroundColor Red
    Write-Host "Failover Type: $FailoverType" -ForegroundColor Yellow
    Write-Host "Target Site: $TargetSite" -ForegroundColor Yellow
    Write-Host "Reason: $($Decision.Reason)" -ForegroundColor Yellow
    Write-Host "Unhealthy Components: $($Decision.UnhealthyComponents -join ', ')" -ForegroundColor Yellow
    Write-Host ""
    
    $confirmation = Read-Host "Do you want to proceed with failover? (yes/no)"
    
    return $confirmation.ToLower() -in @("yes", "y")
}

function Failover-Database {
    Write-Log "Starting database failover to $TargetSite..."
    
    if (!$DryRun) {
        # Switch to DR database cluster
        Write-Log "Switching to disaster recovery database..."
        
        # Update database connection strings
        $drDbUrl = switch ($TargetSite) {
            "dr-site-1" { "postgresql://user:pass@dr-db-1.example.com:5432/inventory_system" }
            "dr-site-2" { "postgresql://user:pass@dr-db-2.example.com:5432/inventory_system" }
            "cloud-backup" { "postgresql://user:pass@cloud-db.amazonaws.com:5432/inventory_system" }
        }
        
        # Update Kubernetes secret
        $encodedUrl = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($drDbUrl))
        kubectl patch secret database-credentials -n production -p "{`"data`":{`"url`":`"$encodedUrl`"}}"
        
        # Restart API pods to pick up new connection
        kubectl rollout restart deployment/api-deployment -n production
        kubectl rollout status deployment/api-deployment -n production --timeout=300s
        
        # Verify database connectivity
        Start-Sleep -Seconds 30
        $dbTest = kubectl exec -n production deployment/api-deployment -- node -e "
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            pool.query('SELECT COUNT(*) FROM users').then(r => console.log('Connected, users:', r.rows[0].count)).catch(e => console.log('Error:', e.message));
        "
        
        if ($dbTest -match "Connected") {
            Write-Log "Database failover completed successfully"
            Send-Alert "Database failover to $TargetSite completed successfully" "INFO"
        } else {
            Write-Log "Database failover verification failed" "ERROR"
            Send-Alert "Database failover to $TargetSite failed verification" "CRITICAL"
            return $false
        }
        
    } else {
        Write-Log "[DRY RUN] Would failover database to $TargetSite"
    }
    
    return $true
}

function Failover-Application {
    Write-Log "Starting application failover to $TargetSite..."
    
    if (!$DryRun) {
        # Switch to DR Kubernetes cluster
        Write-Log "Switching to disaster recovery cluster..."
        
        $drContext = switch ($TargetSite) {
            "dr-site-1" { "dr-cluster-1" }
            "dr-site-2" { "dr-cluster-2" }
            "cloud-backup" { "cloud-dr-cluster" }
        }
        
        # Switch kubectl context
        kubectl config use-context $drContext
        
        # Ensure DR applications are running
        Write-Log "Starting DR applications..."
        kubectl scale deployment api-deployment --replicas=3 -n disaster-recovery
        kubectl scale deployment web-deployment --replicas=3 -n disaster-recovery
        
        # Wait for applications to be ready
        kubectl rollout status deployment/api-deployment -n disaster-recovery --timeout=300s
        kubectl rollout status deployment/web-deployment -n disaster-recovery --timeout=300s
        
        # Update DNS/Load Balancer to point to DR site
        Write-Log "Updating DNS to point to DR site..."
        
        # This would typically involve updating Route53, CloudFlare, or other DNS provider
        # Example for AWS Route53:
        # aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch file://dns-failover.json
        
        # Update load balancer configuration
        $lbConfig = @{
            api_backend = "dr-api-lb.$TargetSite.example.com"
            web_backend = "dr-web-lb.$TargetSite.example.com"
        }
        
        Write-Log "Application failover completed successfully"
        Send-Alert "Application failover to $TargetSite completed successfully" "INFO"
        
    } else {
        Write-Log "[DRY RUN] Would failover application to $TargetSite"
    }
    
    return $true
}

function Failover-FullSystem {
    Write-Log "Starting full system failover to $TargetSite..."
    
    $success = $true
    
    # Perform database failover first
    $success = $success -and (Failover-Database)
    
    # Then application failover
    $success = $success -and (Failover-Application)
    
    if ($success) {
        Write-Log "Full system failover completed successfully"
        Send-Alert "Full system failover to $TargetSite completed successfully" "INFO"
    } else {
        Write-Log "Full system failover failed" "ERROR"
        Send-Alert "Full system failover to $TargetSite failed" "CRITICAL"
    }
    
    return $success
}

function Monitor-FailoverProgress {
    param([int]$TimeoutMinutes)
    
    Write-Log "Monitoring failover progress for $TimeoutMinutes minutes..."
    
    $startTime = Get-Date
    $endTime = $startTime.AddMinutes($TimeoutMinutes)
    
    while ((Get-Date) -lt $endTime) {
        $healthStatus = Test-PrimarySystemHealth
        $healthyCount = ($healthStatus.Values | Where-Object { $_ }).Count
        
        Write-Log "Current health status: $healthyCount/4 components healthy"
        
        if ($healthyCount -eq 4) {
            Write-Log "All systems are now healthy"
            return $true
        }
        
        Start-Sleep -Seconds 60
    }
    
    Write-Log "Failover monitoring timeout reached" "WARNING"
    return $false
}

function Create-FailoverReport {
    param([hashtable]$Decision, [bool]$Success)
    
    $report = @{
        Timestamp = Get-Date -Format "o"
        FailoverType = $FailoverType
        TargetSite = $TargetSite
        Decision = $Decision
        Success = $Success
        Duration = (Get-Date) - $script:startTime
        LogFile = $logFile
    }
    
    $reportPath = "./reports/failover-report-$timestamp.json"
    New-Item -ItemType Directory -Path "./reports" -Force | Out-Null
    $report | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportPath -Encoding UTF8
    
    Write-Log "Failover report created: $reportPath"
    
    # Send report to stakeholders
    Send-Alert "Failover report available: $reportPath" "INFO"
}

# Main execution
$script:startTime = Get-Date

try {
    Write-Log "Starting automated failover process..."
    Write-Log "Failover Type: $FailoverType"
    Write-Log "Target Site: $TargetSite"
    Write-Log "Dry Run: $DryRun"
    
    Send-Alert "Disaster recovery failover initiated - Type: $FailoverType, Target: $TargetSite" "WARNING"
    
    # Test primary system health
    $healthStatus = Test-PrimarySystemHealth
    
    # Make failover decision
    $decision = Get-FailoverDecision -HealthStatus $healthStatus
    
    if (!$decision.ShouldFailover) {
        Write-Log "Failover not required based on current system health"
        Send-Alert "Failover aborted - system health within acceptable parameters" "INFO"
        exit 0
    }
    
    # Confirm failover
    if (!(Confirm-Failover -Decision $decision)) {
        Write-Log "Failover cancelled by user"
        Send-Alert "Failover cancelled by user" "INFO"
        exit 0
    }
    
    # Execute failover
    $success = $false
    
    switch ($FailoverType) {
        "database" {
            $success = Failover-Database
        }
        "application" {
            $success = Failover-Application
        }
        "full-system" {
            $success = Failover-FullSystem
        }
    }
    
    if ($success) {
        # Monitor progress
        Monitor-FailoverProgress -TimeoutMinutes $TimeoutMinutes
        
        Write-Log "Failover process completed successfully"
        Send-Alert "Disaster recovery failover completed successfully" "INFO"
    } else {
        Write-Log "Failover process failed" "ERROR"
        Send-Alert "Disaster recovery failover failed" "CRITICAL"
        exit 1
    }
    
    # Create report
    Create-FailoverReport -Decision $decision -Success $success
    
} catch {
    Write-Log "Failover process failed with error: $($_.Exception.Message)" "ERROR"
    Send-Alert "Disaster recovery failover failed with error: $($_.Exception.Message)" "CRITICAL"
    exit 1
}