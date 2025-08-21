#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Health check script for monitoring services
.DESCRIPTION
    Checks the health of all monitoring services and reports their status
.PARAMETER Detailed
    Show detailed health information for each service
.PARAMETER Fix
    Attempt to fix unhealthy services automatically
#>

param(
    [Parameter(Mandatory=$false)]
    [switch]$Detailed,
    
    [Parameter(Mandatory=$false)]
    [switch]$Fix
)

$ErrorActionPreference = "Stop"

Write-Host "🏥 Checking monitoring services health..." -ForegroundColor Green

# Define services and their health endpoints
$services = @{
    "Prometheus" = @{
        url = "http://localhost:9090/-/ready"
        container = "prometheus"
        port = 9090
    }
    "Grafana" = @{
        url = "http://localhost:3001/api/health"
        container = "grafana"
        port = 3001
    }
    "Alertmanager" = @{
        url = "http://localhost:9093/-/ready"
        container = "alertmanager"
        port = 9093
    }
    "Elasticsearch" = @{
        url = "http://localhost:9200/_cluster/health"
        container = "elasticsearch"
        port = 9200
    }
    "Logstash" = @{
        url = "http://localhost:9600/_node/stats"
        container = "logstash"
        port = 9600
    }
    "Kibana" = @{
        url = "http://localhost:5601/api/status"
        container = "kibana"
        port = 5601
    }
    "Jaeger" = @{
        url = "http://localhost:16686/"
        container = "jaeger"
        port = 16686
    }
    "Node Exporter" = @{
        url = "http://localhost:9100/metrics"
        container = "node-exporter"
        port = 9100
    }
    "cAdvisor" = @{
        url = "http://localhost:8080/healthz"
        container = "cadvisor"
        port = 8080
    }
}

$healthyServices = 0
$totalServices = $services.Count
$unhealthyServices = @()

foreach ($service in $services.GetEnumerator()) {
    $serviceName = $service.Key
    $serviceConfig = $service.Value
    
    Write-Host "Checking $serviceName..." -ForegroundColor Yellow -NoNewline
    
    # Check if container is running
    try {
        $containerStatus = docker ps --filter "name=$($serviceConfig.container)" --format "{{.Status}}"
        if (-not $containerStatus) {
            Write-Host " ❌ Container not running" -ForegroundColor Red
            $unhealthyServices += @{
                name = $serviceName
                issue = "Container not running"
                container = $serviceConfig.container
            }
            continue
        }
    } catch {
        Write-Host " ❌ Docker error" -ForegroundColor Red
        continue
    }
    
    # Check health endpoint
    try {
        $response = Invoke-WebRequest -Uri $serviceConfig.url -Method GET -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅ Healthy" -ForegroundColor Green
            $healthyServices++
            
            if ($Detailed) {
                # Get additional details for specific services
                switch ($serviceName) {
                    "Prometheus" {
                        try {
                            $targets = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/targets" -TimeoutSec 5
                            $activeTargets = ($targets.data.activeTargets | Where-Object { $_.health -eq "up" }).Count
                            $totalTargets = $targets.data.activeTargets.Count
                            Write-Host "    📊 Targets: $activeTargets/$totalTargets up" -ForegroundColor Cyan
                        } catch {
                            Write-Host "    ⚠️ Could not fetch target status" -ForegroundColor Yellow
                        }
                    }
                    "Elasticsearch" {
                        try {
                            $clusterHealth = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -TimeoutSec 5
                            Write-Host "    📊 Cluster: $($clusterHealth.status), Nodes: $($clusterHealth.number_of_nodes)" -ForegroundColor Cyan
                        } catch {
                            Write-Host "    ⚠️ Could not fetch cluster status" -ForegroundColor Yellow
                        }
                    }
                    "Grafana" {
                        try {
                            $datasources = Invoke-RestMethod -Uri "http://localhost:3001/api/datasources" -Headers @{Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123"))} -TimeoutSec 5
                            Write-Host "    📊 Datasources: $($datasources.Count) configured" -ForegroundColor Cyan
                        } catch {
                            Write-Host "    ⚠️ Could not fetch datasource status" -ForegroundColor Yellow
                        }
                    }
                }
            }
        } else {
            Write-Host " ❌ Unhealthy (HTTP $($response.StatusCode))" -ForegroundColor Red
            $unhealthyServices += @{
                name = $serviceName
                issue = "HTTP $($response.StatusCode)"
                container = $serviceConfig.container
            }
        }
    } catch {
        Write-Host " ❌ Connection failed" -ForegroundColor Red
        $unhealthyServices += @{
            name = $serviceName
            issue = "Connection failed: $($_.Exception.Message)"
            container = $serviceConfig.container
        }
    }
}

# Summary
Write-Host "`n📊 Health Summary:" -ForegroundColor Cyan
Write-Host "  Healthy: $healthyServices/$totalServices services" -ForegroundColor Green

if ($unhealthyServices.Count -gt 0) {
    Write-Host "  Unhealthy: $($unhealthyServices.Count) services" -ForegroundColor Red
    Write-Host "`n❌ Unhealthy Services:" -ForegroundColor Red
    
    foreach ($unhealthy in $unhealthyServices) {
        Write-Host "  • $($unhealthy.name): $($unhealthy.issue)" -ForegroundColor White
        
        if ($Fix) {
            Write-Host "    🔧 Attempting to fix..." -ForegroundColor Yellow
            try {
                # Try to restart the container
                docker restart $unhealthy.container
                Write-Host "    ✅ Container restarted" -ForegroundColor Green
                Start-Sleep -Seconds 5
                
                # Re-check health
                $serviceConfig = $services[$unhealthy.name]
                $response = Invoke-WebRequest -Uri $serviceConfig.url -Method GET -TimeoutSec 10 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    Write-Host "    ✅ Service is now healthy" -ForegroundColor Green
                } else {
                    Write-Host "    ❌ Service still unhealthy after restart" -ForegroundColor Red
                }
            } catch {
                Write-Host "    ❌ Failed to fix: $_" -ForegroundColor Red
            }
        }
    }
    
    if (-not $Fix) {
        Write-Host "`n💡 Run with -Fix parameter to attempt automatic repairs" -ForegroundColor Blue
    }
} else {
    Write-Host "  All services are healthy! 🎉" -ForegroundColor Green
}

# Check disk space for data volumes
Write-Host "`n💾 Checking data volume disk usage..." -ForegroundColor Cyan
try {
    $volumes = docker volume ls --filter "name=monitoring" --format "{{.Name}}"
    foreach ($volume in $volumes) {
        if ($volume) {
            $usage = docker system df -v | Select-String $volume
            if ($usage) {
                Write-Host "  📁 $volume" -ForegroundColor White
            }
        }
    }
} catch {
    Write-Host "  ⚠️ Could not check volume usage" -ForegroundColor Yellow
}

# Check for recent alerts
Write-Host "`n🚨 Checking recent alerts..." -ForegroundColor Cyan
try {
    $alerts = Invoke-RestMethod -Uri "http://localhost:9093/api/v1/alerts" -TimeoutSec 5
    $activeAlerts = $alerts | Where-Object { $_.status.state -eq "active" }
    
    if ($activeAlerts.Count -gt 0) {
        Write-Host "  ⚠️ $($activeAlerts.Count) active alerts" -ForegroundColor Yellow
        if ($Detailed) {
            foreach ($alert in $activeAlerts) {
                Write-Host "    • $($alert.labels.alertname): $($alert.annotations.summary)" -ForegroundColor White
            }
        }
    } else {
        Write-Host "  ✅ No active alerts" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️ Could not fetch alerts from Alertmanager" -ForegroundColor Yellow
}

# Exit with appropriate code
if ($unhealthyServices.Count -gt 0) {
    exit 1
} else {
    exit 0
}