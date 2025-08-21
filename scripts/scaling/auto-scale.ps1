#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Auto-scaling script for the ecommerce inventory system
.DESCRIPTION
    Monitors system metrics and automatically scales resources based on load
.PARAMETER Environment
    Target environment (development, staging, production)
.PARAMETER DryRun
    Run in dry-run mode without making actual changes
.PARAMETER MetricsEndpoint
    Prometheus metrics endpoint URL
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment,
    
    [switch]$DryRun,
    
    [string]$MetricsEndpoint = "http://prometheus:9090",
    
    [string]$KubeConfig = "$env:HOME/.kube/config",
    
    [int]$CheckInterval = 60,
    
    [hashtable]$ScalingRules = @{
        api = @{
            minReplicas = 2
            maxReplicas = 10
            cpuThreshold = 70
            memoryThreshold = 80
            requestsPerSecondThreshold = 100
        }
        web = @{
            minReplicas = 2
            maxReplicas = 6
            cpuThreshold = 70
            memoryThreshold = 80
            requestsPerSecondThreshold = 50
        }
    }
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Import required modules
Import-Module -Name "Microsoft.PowerShell.Utility" -Force

# Configuration
$namespace = "ecommerce-inventory"
if ($Environment -eq "staging") {
    $namespace = "ecommerce-inventory-staging"
}

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    switch ($Level) {
        "INFO" { Write-Host $logMessage -ForegroundColor Green }
        "WARN" { Write-Host $logMessage -ForegroundColor Yellow }
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
    }
    
    # Also log to file
    $logFile = "logs/auto-scale-$(Get-Date -Format 'yyyy-MM-dd').log"
    if (!(Test-Path (Split-Path $logFile))) {
        New-Item -ItemType Directory -Path (Split-Path $logFile) -Force | Out-Null
    }
    Add-Content -Path $logFile -Value $logMessage
}

# Function to get metrics from Prometheus
function Get-PrometheusMetric {
    param(
        [string]$Query,
        [string]$Endpoint = $MetricsEndpoint
    )
    
    try {
        $encodedQuery = [System.Web.HttpUtility]::UrlEncode($Query)
        $url = "$Endpoint/api/v1/query?query=$encodedQuery"
        
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 30
        
        if ($response.status -eq "success" -and $response.data.result.Count -gt 0) {
            return [double]$response.data.result[0].value[1]
        }
        
        return $null
    }
    catch {
        Write-Log "Failed to get metric '$Query': $($_.Exception.Message)" -Level "ERROR"
        return $null
    }
}

# Function to get current replica count
function Get-CurrentReplicas {
    param(
        [string]$DeploymentName,
        [string]$Namespace = $namespace
    )
    
    try {
        $result = kubectl get deployment $DeploymentName -n $Namespace -o jsonpath='{.spec.replicas}' 2>$null
        if ($LASTEXITCODE -eq 0) {
            return [int]$result
        }
        return $null
    }
    catch {
        Write-Log "Failed to get replica count for $DeploymentName: $($_.Exception.Message)" -Level "ERROR"
        return $null
    }
}

# Function to scale deployment
function Set-DeploymentReplicas {
    param(
        [string]$DeploymentName,
        [int]$Replicas,
        [string]$Namespace = $namespace
    )
    
    try {
        if ($DryRun) {
            Write-Log "DRY RUN: Would scale $DeploymentName to $Replicas replicas" -Level "INFO"
            return $true
        }
        
        kubectl scale deployment $DeploymentName --replicas=$Replicas -n $Namespace
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Successfully scaled $DeploymentName to $Replicas replicas" -Level "INFO"
            return $true
        }
        else {
            Write-Log "Failed to scale $DeploymentName" -Level "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Error scaling $DeploymentName: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Function to calculate desired replicas based on metrics
function Get-DesiredReplicas {
    param(
        [string]$ServiceName,
        [hashtable]$Rules,
        [int]$CurrentReplicas
    )
    
    # Get current metrics
    $cpuUsage = Get-PrometheusMetric "avg(rate(container_cpu_usage_seconds_total{pod=~`"$ServiceName-.*`",namespace=`"$namespace`"}[5m])) * 100"
    $memoryUsage = Get-PrometheusMetric "avg(container_memory_working_set_bytes{pod=~`"$ServiceName-.*`",namespace=`"$namespace`"} / container_spec_memory_limit_bytes{pod=~`"$ServiceName-.*`",namespace=`"$namespace`"}) * 100"
    $requestRate = Get-PrometheusMetric "sum(rate(http_requests_total{service=`"$ServiceName`"}[5m]))"
    
    Write-Log "Metrics for $ServiceName - CPU: $cpuUsage%, Memory: $memoryUsage%, RPS: $requestRate" -Level "INFO"
    
    $scaleFactors = @()
    
    # CPU-based scaling
    if ($cpuUsage -ne $null -and $cpuUsage -gt $Rules.cpuThreshold) {
        $cpuScaleFactor = [math]::Ceiling($cpuUsage / $Rules.cpuThreshold)
        $scaleFactors += $cpuScaleFactor
        Write-Log "CPU threshold exceeded ($cpuUsage% > $($Rules.cpuThreshold)%), scale factor: $cpuScaleFactor" -Level "WARN"
    }
    
    # Memory-based scaling
    if ($memoryUsage -ne $null -and $memoryUsage -gt $Rules.memoryThreshold) {
        $memoryScaleFactor = [math]::Ceiling($memoryUsage / $Rules.memoryThreshold)
        $scaleFactors += $memoryScaleFactor
        Write-Log "Memory threshold exceeded ($memoryUsage% > $($Rules.memoryThreshold)%), scale factor: $memoryScaleFactor" -Level "WARN"
    }
    
    # Request rate-based scaling
    if ($requestRate -ne $null -and $requestRate -gt $Rules.requestsPerSecondThreshold) {
        $rpsScaleFactor = [math]::Ceiling($requestRate / $Rules.requestsPerSecondThreshold)
        $scaleFactors += $rpsScaleFactor
        Write-Log "RPS threshold exceeded ($requestRate > $($Rules.requestsPerSecondThreshold)), scale factor: $rpsScaleFactor" -Level "WARN"
    }
    
    # Calculate desired replicas
    if ($scaleFactors.Count -gt 0) {
        $maxScaleFactor = ($scaleFactors | Measure-Object -Maximum).Maximum
        $desiredReplicas = [math]::Min($CurrentReplicas * $maxScaleFactor, $Rules.maxReplicas)
    }
    else {
        # Scale down if metrics are low
        $allMetricsLow = $true
        
        if ($cpuUsage -ne $null -and $cpuUsage -gt ($Rules.cpuThreshold * 0.5)) {
            $allMetricsLow = $false
        }
        if ($memoryUsage -ne $null -and $memoryUsage -gt ($Rules.memoryThreshold * 0.5)) {
            $allMetricsLow = $false
        }
        if ($requestRate -ne $null -and $requestRate -gt ($Rules.requestsPerSecondThreshold * 0.5)) {
            $allMetricsLow = $false
        }
        
        if ($allMetricsLow -and $CurrentReplicas -gt $Rules.minReplicas) {
            $desiredReplicas = [math]::Max([math]::Ceiling($CurrentReplicas * 0.8), $Rules.minReplicas)
            Write-Log "All metrics are low, scaling down to $desiredReplicas" -Level "INFO"
        }
        else {
            $desiredReplicas = $CurrentReplicas
        }
    }
    
    # Ensure within bounds
    $desiredReplicas = [math]::Max($desiredReplicas, $Rules.minReplicas)
    $desiredReplicas = [math]::Min($desiredReplicas, $Rules.maxReplicas)
    
    return $desiredReplicas
}

# Function to check cluster health
function Test-ClusterHealth {
    try {
        kubectl cluster-info --request-timeout=10s | Out-Null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

# Function to send alerts
function Send-Alert {
    param(
        [string]$Message,
        [string]$Severity = "warning"
    )
    
    Write-Log "ALERT [$Severity]: $Message" -Level "WARN"
    
    # Here you could integrate with alerting systems like:
    # - Slack webhook
    # - PagerDuty
    # - Email notifications
    # - AWS SNS
    
    # Example Slack webhook (uncomment and configure)
    # $slackWebhook = $env:SLACK_WEBHOOK_URL
    # if ($slackWebhook) {
    #     $payload = @{
    #         text = "Auto-scaler Alert: $Message"
    #         username = "auto-scaler"
    #         icon_emoji = ":warning:"
    #     } | ConvertTo-Json
    #     
    #     Invoke-RestMethod -Uri $slackWebhook -Method Post -Body $payload -ContentType "application/json"
    # }
}

# Main scaling loop
function Start-AutoScaling {
    Write-Log "Starting auto-scaling for environment: $Environment" -Level "INFO"
    Write-Log "Namespace: $namespace" -Level "INFO"
    Write-Log "Check interval: $CheckInterval seconds" -Level "INFO"
    Write-Log "Dry run mode: $DryRun" -Level "INFO"
    
    # Verify kubectl is available
    if (!(Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Log "kubectl not found in PATH" -Level "ERROR"
        exit 1
    }
    
    # Set kubeconfig
    $env:KUBECONFIG = $KubeConfig
    
    while ($true) {
        try {
            # Check cluster health
            if (!(Test-ClusterHealth)) {
                Write-Log "Cluster health check failed, skipping this cycle" -Level "ERROR"
                Start-Sleep -Seconds $CheckInterval
                continue
            }
            
            Write-Log "Starting scaling check cycle" -Level "INFO"
            
            # Process each service
            foreach ($serviceName in $ScalingRules.Keys) {
                $rules = $ScalingRules[$serviceName]
                $currentReplicas = Get-CurrentReplicas -DeploymentName $serviceName
                
                if ($currentReplicas -eq $null) {
                    Write-Log "Could not get current replica count for $serviceName, skipping" -Level "WARN"
                    continue
                }
                
                Write-Log "Current replicas for $serviceName: $currentReplicas" -Level "INFO"
                
                $desiredReplicas = Get-DesiredReplicas -ServiceName $serviceName -Rules $rules -CurrentReplicas $currentReplicas
                
                if ($desiredReplicas -ne $currentReplicas) {
                    Write-Log "Scaling $serviceName from $currentReplicas to $desiredReplicas replicas" -Level "INFO"
                    
                    $success = Set-DeploymentReplicas -DeploymentName $serviceName -Replicas $desiredReplicas
                    
                    if ($success) {
                        $alertMessage = "Scaled $serviceName from $currentReplicas to $desiredReplicas replicas in $Environment environment"
                        Send-Alert -Message $alertMessage -Severity "info"
                    }
                    else {
                        $alertMessage = "Failed to scale $serviceName in $Environment environment"
                        Send-Alert -Message $alertMessage -Severity "error"
                    }
                }
                else {
                    Write-Log "No scaling needed for $serviceName" -Level "INFO"
                }
            }
            
            Write-Log "Scaling check cycle completed" -Level "INFO"
            
        }
        catch {
            Write-Log "Error in scaling cycle: $($_.Exception.Message)" -Level "ERROR"
            Send-Alert -Message "Auto-scaler error: $($_.Exception.Message)" -Severity "error"
        }
        
        Start-Sleep -Seconds $CheckInterval
    }
}

# Script entry point
if ($MyInvocation.InvocationName -ne '.') {
    # Validate environment
    if ($Environment -notin @("development", "staging", "production")) {
        Write-Log "Invalid environment: $Environment" -Level "ERROR"
        exit 1
    }
    
    # Create logs directory
    if (!(Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    }
    
    # Start auto-scaling
    Start-AutoScaling
}