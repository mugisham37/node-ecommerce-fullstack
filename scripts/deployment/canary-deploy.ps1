#!/usr/bin/env pwsh
# Canary Deployment Script for Gradual Traffic Shifting
# This script implements canary deployment strategy for safe production releases

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [string]$Environment = "production",
    [int]$InitialTrafficPercent = 5,
    [int]$MaxTrafficPercent = 100,
    [int]$TrafficIncrementPercent = 10,
    [int]$StageDelayMinutes = 5,
    [string]$ConfigPath = "./config/production",
    [switch]$DryRun,
    [switch]$Rollback,
    [switch]$AutoPromote
)

# Configuration
$CanaryConfig = @{
    ApiImage = "ecommerce-api:$Version"
    WebImage = "ecommerce-web:$Version"
    HealthCheckUrl = "http://api-canary.internal:3000/health"
    MetricsUrl = "http://prometheus.internal:9090"
    AlertManagerUrl = "http://alertmanager.internal:9093"
    ErrorThreshold = 0.05  # 5% error rate threshold
    LatencyThreshold = 2000  # 2 second latency threshold
    MinObservationPeriod = 300  # 5 minutes minimum observation
}

function Write-CanaryLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] [CANARY] $Message" -ForegroundColor $(
        switch($Level) {
            "ERROR" { "Red" }
            "WARN" { "Yellow" }
            "SUCCESS" { "Green" }
            default { "White" }
        }
    )
}

function Get-MetricValue {
    param([string]$Query, [int]$TimeRangeMinutes = 5)
    
    try {
        $endTime = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        $startTime = $endTime - ($TimeRangeMinutes * 60)
        
        $url = "$($CanaryConfig.MetricsUrl)/api/v1/query_range"
        $params = @{
            query = $Query
            start = $startTime
            end = $endTime
            step = "30s"
        }
        
        $response = Invoke-RestMethod -Uri $url -Method Get -Body $params
        
        if ($response.status -eq "success" -and $response.data.result.Count -gt 0) {
            $values = $response.data.result[0].values
            if ($values.Count -gt 0) {
                return [double]$values[-1][1]  # Return latest value
            }
        }
        
        return $null
    }
    catch {
        Write-CanaryLog "Failed to get metric value for query '$Query': $_" "ERROR"
        return $null
    }
}

function Test-CanaryHealth {
    try {
        $response = Invoke-RestMethod -Uri $CanaryConfig.HealthCheckUrl -TimeoutSec 10
        return $response.status -eq "healthy"
    }
    catch {
        Write-CanaryLog "Canary health check failed: $_" "ERROR"
        return $false
    }
}

function Get-CanaryMetrics {
    Write-CanaryLog "Collecting canary metrics"
    
    $metrics = @{}
    
    # Error rate
    $errorRateQuery = 'rate(http_requests_total{job="api-canary",status=~"5.."}[5m]) / rate(http_requests_total{job="api-canary"}[5m])'
    $metrics.ErrorRate = Get-MetricValue -Query $errorRateQuery
    
    # Average latency
    $latencyQuery = 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="api-canary"}[5m]))'
    $metrics.P95Latency = Get-MetricValue -Query $latencyQuery
    
    # Request rate
    $requestRateQuery = 'rate(http_requests_total{job="api-canary"}[5m])'
    $metrics.RequestRate = Get-MetricValue -Query $requestRateQuery
    
    # CPU usage
    $cpuQuery = 'rate(container_cpu_usage_seconds_total{name=~"api-canary.*"}[5m])'
    $metrics.CpuUsage = Get-MetricValue -Query $cpuQuery
    
    # Memory usage
    $memoryQuery = 'container_memory_usage_bytes{name=~"api-canary.*"} / container_spec_memory_limit_bytes{name=~"api-canary.*"}'
    $metrics.MemoryUsage = Get-MetricValue -Query $memoryQuery
    
    return $metrics
}

function Test-CanaryMetrics {
    param([hashtable]$Metrics)
    
    $issues = @()
    
    # Check error rate
    if ($null -ne $Metrics.ErrorRate -and $Metrics.ErrorRate -gt $CanaryConfig.ErrorThreshold) {
        $issues += "Error rate too high: $($Metrics.ErrorRate * 100)% (threshold: $($CanaryConfig.ErrorThreshold * 100)%)"
    }
    
    # Check latency
    if ($null -ne $Metrics.P95Latency -and $Metrics.P95Latency -gt ($CanaryConfig.LatencyThreshold / 1000)) {
        $issues += "P95 latency too high: $($Metrics.P95Latency * 1000)ms (threshold: $($CanaryConfig.LatencyThreshold)ms)"
    }
    
    # Check CPU usage
    if ($null -ne $Metrics.CpuUsage -and $Metrics.CpuUsage -gt 0.8) {
        $issues += "CPU usage too high: $($Metrics.CpuUsage * 100)%"
    }
    
    # Check memory usage
    if ($null -ne $Metrics.MemoryUsage -and $Metrics.MemoryUsage -gt 0.9) {
        $issues += "Memory usage too high: $($Metrics.MemoryUsage * 100)%"
    }
    
    return $issues
}

function Deploy-CanaryVersion {
    param([string]$Version)
    
    Write-CanaryLog "Deploying canary version $Version"
    
    if ($DryRun) {
        Write-CanaryLog "DRY RUN: Would deploy canary version $Version" "INFO"
        return $true
    }
    
    try {
        # Stop existing canary if running
        docker-compose -f "docker-compose.canary.yml" down --remove-orphans
        
        # Pull new images
        docker pull $CanaryConfig.ApiImage
        docker pull $CanaryConfig.WebImage
        
        # Start canary services
        $env:CANARY_VERSION = $Version
        docker-compose -f "docker-compose.canary.yml" up -d
        
        # Wait for canary to be healthy
        Write-CanaryLog "Waiting for canary to become healthy"
        $attempts = 0
        $maxAttempts = 30
        
        while ($attempts -lt $maxAttempts) {
            if (Test-CanaryHealth) {
                Write-CanaryLog "Canary is healthy" "SUCCESS"
                return $true
            }
            
            Start-Sleep -Seconds 10
            $attempts++
        }
        
        Write-CanaryLog "Canary failed to become healthy" "ERROR"
        return $false
    }
    catch {
        Write-CanaryLog "Failed to deploy canary: $_" "ERROR"
        return $false
    }
}

function Set-TrafficSplit {
    param([int]$CanaryPercent)
    
    Write-CanaryLog "Setting traffic split: $CanaryPercent% to canary, $($100 - $CanaryPercent)% to stable"
    
    if ($DryRun) {
        Write-CanaryLog "DRY RUN: Would set traffic split to $CanaryPercent%" "INFO"
        return $true
    }
    
    try {
        # Update nginx configuration with traffic split
        $nginxTemplate = Get-Content "$ConfigPath/nginx-canary-template.conf" -Raw
        $nginxConfig = $nginxTemplate -replace "{{CANARY_WEIGHT}}", $CanaryPercent
        $nginxConfig = $nginxConfig -replace "{{STABLE_WEIGHT}}", ($100 - $CanaryPercent)
        
        Set-Content -Path "$ConfigPath/nginx.conf" -Value $nginxConfig
        
        # Reload nginx
        docker exec nginx-lb nginx -s reload
        
        Write-CanaryLog "Traffic split updated successfully" "SUCCESS"
        return $true
    }
    catch {
        Write-CanaryLog "Failed to update traffic split: $_" "ERROR"
        return $false
    }
}

function Start-CanaryDeployment {
    Write-CanaryLog "Starting canary deployment for version $Version"
    
    # Deploy canary version
    if (-not (Deploy-CanaryVersion -Version $Version)) {
        Write-CanaryLog "Failed to deploy canary version" "ERROR"
        return $false
    }
    
    # Start with initial traffic percentage
    $currentTrafficPercent = $InitialTrafficPercent
    
    while ($currentTrafficPercent -le $MaxTrafficPercent) {
        Write-CanaryLog "Phase: $currentTrafficPercent% traffic to canary"
        
        # Set traffic split
        if (-not (Set-TrafficSplit -CanaryPercent $currentTrafficPercent)) {
            Write-CanaryLog "Failed to set traffic split" "ERROR"
            return $false
        }
        
        # Wait for observation period
        Write-CanaryLog "Observing for $($CanaryConfig.MinObservationPeriod) seconds"
        Start-Sleep -Seconds $CanaryConfig.MinObservationPeriod
        
        # Collect and analyze metrics
        $metrics = Get-CanaryMetrics
        $issues = Test-CanaryMetrics -Metrics $metrics
        
        if ($issues.Count -gt 0) {
            Write-CanaryLog "Canary metrics failed validation:" "ERROR"
            foreach ($issue in $issues) {
                Write-CanaryLog "  - $issue" "ERROR"
            }
            
            Write-CanaryLog "Rolling back canary deployment" "WARN"
            Set-TrafficSplit -CanaryPercent 0
            return $false
        }
        
        Write-CanaryLog "Canary metrics look good:" "SUCCESS"
        Write-CanaryLog "  - Error Rate: $($metrics.ErrorRate * 100)%" "INFO"
        Write-CanaryLog "  - P95 Latency: $($metrics.P95Latency * 1000)ms" "INFO"
        Write-CanaryLog "  - Request Rate: $($metrics.RequestRate)/s" "INFO"
        
        # Check if we should auto-promote or wait for manual approval
        if ($currentTrafficPercent -lt $MaxTrafficPercent) {
            if ($AutoPromote) {
                Write-CanaryLog "Auto-promoting to next stage" "INFO"
                $currentTrafficPercent = [Math]::Min($currentTrafficPercent + $TrafficIncrementPercent, $MaxTrafficPercent)
            } else {
                Write-CanaryLog "Waiting for manual approval to continue..." "INFO"
                Write-Host "Press 'y' to continue, 'r' to rollback, or 'a' to auto-promote: " -NoNewline
                $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown").Character
                Write-Host ""
                
                switch ($key.ToString().ToLower()) {
                    'y' { 
                        $currentTrafficPercent = [Math]::Min($currentTrafficPercent + $TrafficIncrementPercent, $MaxTrafficPercent)
                    }
                    'r' { 
                        Write-CanaryLog "Manual rollback requested" "WARN"
                        Set-TrafficSplit -CanaryPercent 0
                        return $false
                    }
                    'a' { 
                        Write-CanaryLog "Auto-promote enabled" "INFO"
                        $AutoPromote = $true
                        $currentTrafficPercent = [Math]::Min($currentTrafficPercent + $TrafficIncrementPercent, $MaxTrafficPercent)
                    }
                    default { 
                        Write-CanaryLog "Invalid input, continuing with current stage" "WARN"
                    }
                }
            }
        } else {
            break
        }
        
        # Wait between stages
        if ($currentTrafficPercent -le $MaxTrafficPercent -and $StageDelayMinutes -gt 0) {
            Write-CanaryLog "Waiting $StageDelayMinutes minutes before next stage"
            Start-Sleep -Seconds ($StageDelayMinutes * 60)
        }
    }
    
    Write-CanaryLog "Canary deployment completed successfully - 100% traffic on new version" "SUCCESS"
    
    # Clean up old stable version
    Write-CanaryLog "Promoting canary to stable"
    docker-compose -f "docker-compose.stable.yml" down --remove-orphans
    
    # Rename canary to stable
    $env:STABLE_VERSION = $Version
    docker-compose -f "docker-compose.stable.yml" up -d
    
    # Remove canary
    docker-compose -f "docker-compose.canary.yml" down --remove-orphans
    
    # Update nginx to point to stable only
    Set-TrafficSplit -CanaryPercent 0
    
    return $true
}

function Start-CanaryRollback {
    Write-CanaryLog "Starting canary rollback"
    
    # Set traffic to 0% for canary
    if (-not (Set-TrafficSplit -CanaryPercent 0)) {
        Write-CanaryLog "Failed to rollback traffic" "ERROR"
        return $false
    }
    
    # Stop canary services
    docker-compose -f "docker-compose.canary.yml" down --remove-orphans
    
    Write-CanaryLog "Canary rollback completed" "SUCCESS"
    return $true
}

# Main execution
try {
    Write-CanaryLog "Canary Deployment Script Started"
    Write-CanaryLog "Version: $Version, Environment: $Environment, DryRun: $DryRun"
    Write-CanaryLog "Traffic: $InitialTrafficPercent% -> $MaxTrafficPercent% (increment: $TrafficIncrementPercent%)"
    
    if ($Rollback) {
        $success = Start-CanaryRollback
    } else {
        $success = Start-CanaryDeployment
    }
    
    if ($success) {
        Write-CanaryLog "Canary operation completed successfully" "SUCCESS"
        exit 0
    } else {
        Write-CanaryLog "Canary operation failed" "ERROR"
        exit 1
    }
}
catch {
    Write-CanaryLog "Unexpected error: $_" "ERROR"
    exit 1
}