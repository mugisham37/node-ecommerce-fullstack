#!/usr/bin/env pwsh
# Production Health Check Script
# Comprehensive health monitoring for all production services

param(
    [string]$Environment = "production",
    [string]$ConfigPath = "./config/production",
    [int]$TimeoutSeconds = 30,
    [switch]$Detailed,
    [switch]$Json,
    [switch]$Continuous,
    [int]$IntervalSeconds = 60
)

# Health check configuration
$HealthConfig = @{
    Services = @{
        API = @{
            Url = "http://api.production.internal:3000/health"
            Critical = $true
            Timeout = 10
        }
        Web = @{
            Url = "http://web.production.internal:3000/api/health"
            Critical = $true
            Timeout = 10
        }
        Database = @{
            Url = "http://api.production.internal:3000/health/database"
            Critical = $true
            Timeout = 15
        }
        Redis = @{
            Url = "http://api.production.internal:3000/health/redis"
            Critical = $true
            Timeout = 10
        }
        LoadBalancer = @{
            Url = "https://production.domain.com/health"
            Critical = $true
            Timeout = 10
        }
    }
    Metrics = @{
        Prometheus = "http://prometheus.internal:9090"
        Grafana = "http://grafana.internal:3000"
    }
    Thresholds = @{
        ResponseTime = 2000  # 2 seconds
        ErrorRate = 0.05     # 5%
        CpuUsage = 0.8       # 80%
        MemoryUsage = 0.9    # 90%
        DiskUsage = 0.85     # 85%
    }
}

function Write-HealthLog {
    param([string]$Message, [string]$Level = "INFO")
    if (-not $Json) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $color = switch($Level) {
            "ERROR" { "Red" }
            "WARN" { "Yellow" }
            "SUCCESS" { "Green" }
            default { "White" }
        }
        Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
    }
}

function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [hashtable]$ServiceConfig
    )
    
    $result = @{
        Name = $ServiceName
        Status = "Unknown"
        ResponseTime = $null
        Error = $null
        Details = @{}
        Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    }
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $response = Invoke-RestMethod -Uri $ServiceConfig.Url -TimeoutSec $ServiceConfig.Timeout -ErrorAction Stop
        
        $stopwatch.Stop()
        $result.ResponseTime = $stopwatch.ElapsedMilliseconds
        
        # Parse health response
        if ($response -is [string]) {
            $result.Status = if ($response -eq "OK" -or $response -eq "healthy") { "Healthy" } else { "Unhealthy" }
        } elseif ($response.status) {
            $result.Status = if ($response.status -eq "healthy" -or $response.status -eq "ok") { "Healthy" } else { "Unhealthy" }
            if ($response.details) {
                $result.Details = $response.details
            }
        } else {
            $result.Status = "Healthy"  # Assume healthy if we got a response
        }
        
        # Check response time threshold
        if ($result.ResponseTime -gt $HealthConfig.Thresholds.ResponseTime) {
            $result.Status = "Degraded"
            $result.Error = "Response time exceeded threshold: $($result.ResponseTime)ms > $($HealthConfig.Thresholds.ResponseTime)ms"
        }
        
    }
    catch {
        $stopwatch.Stop() if $stopwatch
        $result.Status = "Unhealthy"
        $result.Error = $_.Exception.Message
        $result.ResponseTime = $stopwatch.ElapsedMilliseconds if $stopwatch
    }
    
    return $result
}

function Get-SystemMetrics {
    try {
        $prometheusUrl = $HealthConfig.Metrics.Prometheus
        
        # CPU Usage
        $cpuQuery = 'avg(100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))'
        $cpuResponse = Invoke-RestMethod -Uri "$prometheusUrl/api/v1/query?query=$cpuQuery" -TimeoutSec 10
        $cpuUsage = if ($cpuResponse.status -eq "success" -and $cpuResponse.data.result.Count -gt 0) {
            [double]$cpuResponse.data.result[0].value[1] / 100
        } else { $null }
        
        # Memory Usage
        $memQuery = 'avg((1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)))'
        $memResponse = Invoke-RestMethod -Uri "$prometheusUrl/api/v1/query?query=$memQuery" -TimeoutSec 10
        $memUsage = if ($memResponse.status -eq "success" -and $memResponse.data.result.Count -gt 0) {
            [double]$memResponse.data.result[0].value[1]
        } else { $null }
        
        # Disk Usage
        $diskQuery = 'avg((1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"})))'
        $diskResponse = Invoke-RestMethod -Uri "$prometheusUrl/api/v1/query?query=$diskQuery" -TimeoutSec 10
        $diskUsage = if ($diskResponse.status -eq "success" -and $diskResponse.data.result.Count -gt 0) {
            [double]$diskResponse.data.result[0].value[1]
        } else { $null }
        
        return @{
            CPU = $cpuUsage
            Memory = $memUsage
            Disk = $diskUsage
        }
    }
    catch {
        Write-HealthLog "Failed to get system metrics: $_" "WARN"
        return @{
            CPU = $null
            Memory = $null
            Disk = $null
        }
    }
}

function Get-ApplicationMetrics {
    try {
        $prometheusUrl = $HealthConfig.Metrics.Prometheus
        
        # Error Rate
        $errorQuery = 'rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])'
        $errorResponse = Invoke-RestMethod -Uri "$prometheusUrl/api/v1/query?query=$errorQuery" -TimeoutSec 10
        $errorRate = if ($errorResponse.status -eq "success" -and $errorResponse.data.result.Count -gt 0) {
            [double]$errorResponse.data.result[0].value[1]
        } else { $null }
        
        # Request Rate
        $requestQuery = 'sum(rate(http_requests_total[5m]))'
        $requestResponse = Invoke-RestMethod -Uri "$prometheusUrl/api/v1/query?query=$requestQuery" -TimeoutSec 10
        $requestRate = if ($requestResponse.status -eq "success" -and $requestResponse.data.result.Count -gt 0) {
            [double]$requestResponse.data.result[0].value[1]
        } else { $null }
        
        # Average Response Time
        $latencyQuery = 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'
        $latencyResponse = Invoke-RestMethod -Uri "$prometheusUrl/api/v1/query?query=$latencyQuery" -TimeoutSec 10
        $p95Latency = if ($latencyResponse.status -eq "success" -and $latencyResponse.data.result.Count -gt 0) {
            [double]$latencyResponse.data.result[0].value[1] * 1000  # Convert to ms
        } else { $null }
        
        return @{
            ErrorRate = $errorRate
            RequestRate = $requestRate
            P95Latency = $p95Latency
        }
    }
    catch {
        Write-HealthLog "Failed to get application metrics: $_" "WARN"
        return @{
            ErrorRate = $null
            RequestRate = $null
            P95Latency = $null
        }
    }
}

function Perform-HealthCheck {
    $healthResults = @{
        Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
        Environment = $Environment
        OverallStatus = "Healthy"
        Services = @{}
        SystemMetrics = @{}
        ApplicationMetrics = @{}
        Summary = @{
            Total = 0
            Healthy = 0
            Degraded = 0
            Unhealthy = 0
            Critical = 0
        }
    }
    
    Write-HealthLog "Starting health check for $Environment environment"
    
    # Check all services
    foreach ($serviceName in $HealthConfig.Services.Keys) {
        $serviceConfig = $HealthConfig.Services[$serviceName]
        $result = Test-ServiceHealth -ServiceName $serviceName -ServiceConfig $serviceConfig
        
        $healthResults.Services[$serviceName] = $result
        $healthResults.Summary.Total++
        
        switch ($result.Status) {
            "Healthy" { $healthResults.Summary.Healthy++ }
            "Degraded" { 
                $healthResults.Summary.Degraded++
                if ($healthResults.OverallStatus -eq "Healthy") {
                    $healthResults.OverallStatus = "Degraded"
                }
            }
            "Unhealthy" { 
                $healthResults.Summary.Unhealthy++
                $healthResults.OverallStatus = "Unhealthy"
                if ($serviceConfig.Critical) {
                    $healthResults.Summary.Critical++
                }
            }
        }
        
        if (-not $Json) {
            $status = $result.Status
            $responseTime = if ($result.ResponseTime) { "$($result.ResponseTime)ms" } else { "N/A" }
            Write-HealthLog "$serviceName`: $status ($responseTime)" $(
                switch($status) {
                    "Healthy" { "SUCCESS" }
                    "Degraded" { "WARN" }
                    "Unhealthy" { "ERROR" }
                }
            )
        }
    }
    
    # Get system metrics if detailed check requested
    if ($Detailed) {
        $healthResults.SystemMetrics = Get-SystemMetrics
        $healthResults.ApplicationMetrics = Get-ApplicationMetrics
        
        # Check metric thresholds
        $systemMetrics = $healthResults.SystemMetrics
        if ($systemMetrics.CPU -and $systemMetrics.CPU -gt $HealthConfig.Thresholds.CpuUsage) {
            $healthResults.OverallStatus = "Degraded"
            Write-HealthLog "High CPU usage: $($systemMetrics.CPU * 100)%" "WARN"
        }
        
        if ($systemMetrics.Memory -and $systemMetrics.Memory -gt $HealthConfig.Thresholds.MemoryUsage) {
            $healthResults.OverallStatus = "Degraded"
            Write-HealthLog "High memory usage: $($systemMetrics.Memory * 100)%" "WARN"
        }
        
        if ($systemMetrics.Disk -and $systemMetrics.Disk -gt $HealthConfig.Thresholds.DiskUsage) {
            $healthResults.OverallStatus = "Degraded"
            Write-HealthLog "High disk usage: $($systemMetrics.Disk * 100)%" "WARN"
        }
        
        $appMetrics = $healthResults.ApplicationMetrics
        if ($appMetrics.ErrorRate -and $appMetrics.ErrorRate -gt $HealthConfig.Thresholds.ErrorRate) {
            $healthResults.OverallStatus = "Degraded"
            Write-HealthLog "High error rate: $($appMetrics.ErrorRate * 100)%" "WARN"
        }
    }
    
    return $healthResults
}

function Format-HealthOutput {
    param([hashtable]$Results)
    
    if ($Json) {
        return $Results | ConvertTo-Json -Depth 10
    }
    
    Write-Host ""
    Write-Host "=== HEALTH CHECK SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Environment: $($Results.Environment)" -ForegroundColor White
    Write-Host "Timestamp: $($Results.Timestamp)" -ForegroundColor White
    Write-Host "Overall Status: $($Results.OverallStatus)" -ForegroundColor $(
        switch($Results.OverallStatus) {
            "Healthy" { "Green" }
            "Degraded" { "Yellow" }
            "Unhealthy" { "Red" }
        }
    )
    
    Write-Host ""
    Write-Host "Services: $($Results.Summary.Healthy)/$($Results.Summary.Total) healthy" -ForegroundColor White
    if ($Results.Summary.Degraded -gt 0) {
        Write-Host "  - $($Results.Summary.Degraded) degraded" -ForegroundColor Yellow
    }
    if ($Results.Summary.Unhealthy -gt 0) {
        Write-Host "  - $($Results.Summary.Unhealthy) unhealthy" -ForegroundColor Red
    }
    if ($Results.Summary.Critical -gt 0) {
        Write-Host "  - $($Results.Summary.Critical) critical failures" -ForegroundColor Red
    }
    
    if ($Detailed -and $Results.SystemMetrics) {
        Write-Host ""
        Write-Host "=== SYSTEM METRICS ===" -ForegroundColor Cyan
        $sys = $Results.SystemMetrics
        if ($sys.CPU) { Write-Host "CPU Usage: $([math]::Round($sys.CPU * 100, 1))%" -ForegroundColor White }
        if ($sys.Memory) { Write-Host "Memory Usage: $([math]::Round($sys.Memory * 100, 1))%" -ForegroundColor White }
        if ($sys.Disk) { Write-Host "Disk Usage: $([math]::Round($sys.Disk * 100, 1))%" -ForegroundColor White }
        
        Write-Host ""
        Write-Host "=== APPLICATION METRICS ===" -ForegroundColor Cyan
        $app = $Results.ApplicationMetrics
        if ($app.ErrorRate) { Write-Host "Error Rate: $([math]::Round($app.ErrorRate * 100, 2))%" -ForegroundColor White }
        if ($app.RequestRate) { Write-Host "Request Rate: $([math]::Round($app.RequestRate, 1))/s" -ForegroundColor White }
        if ($app.P95Latency) { Write-Host "P95 Latency: $([math]::Round($app.P95Latency, 1))ms" -ForegroundColor White }
    }
    
    Write-Host ""
}

# Main execution
try {
    do {
        $results = Perform-HealthCheck
        $output = Format-HealthOutput -Results $results
        
        if ($Json) {
            Write-Output $output
        }
        
        # Exit with appropriate code
        $exitCode = switch($results.OverallStatus) {
            "Healthy" { 0 }
            "Degraded" { 1 }
            "Unhealthy" { 2 }
        }
        
        if (-not $Continuous) {
            exit $exitCode
        }
        
        if ($Continuous) {
            Write-HealthLog "Next check in $IntervalSeconds seconds..." "INFO"
            Start-Sleep -Seconds $IntervalSeconds
        }
        
    } while ($Continuous)
}
catch {
    Write-HealthLog "Health check failed: $_" "ERROR"
    exit 3
}