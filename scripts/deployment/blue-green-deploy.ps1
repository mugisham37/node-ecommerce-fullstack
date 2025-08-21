#!/usr/bin/env pwsh
# Blue-Green Deployment Script for Zero-Downtime Deployment
# This script implements blue-green deployment strategy for production

param(
    [Parameter(Mandatory=$true)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [string]$BlueSlot = "blue",
    [string]$GreenSlot = "green",
    [string]$ConfigPath = "./config/production",
    [switch]$DryRun,
    [switch]$Rollback
)

# Configuration
$DeploymentConfig = @{
    ApiImage = "ecommerce-api:$Version"
    WebImage = "ecommerce-web:$Version"
    DatabaseMigrations = $true
    HealthCheckTimeout = 300
    LoadBalancerConfig = "$ConfigPath/nginx.conf"
    MonitoringEnabled = $true
}

function Write-DeploymentLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $(
        switch($Level) {
            "ERROR" { "Red" }
            "WARN" { "Yellow" }
            "SUCCESS" { "Green" }
            default { "White" }
        }
    )
}

function Test-ServiceHealth {
    param([string]$Url, [int]$TimeoutSeconds = 30)
    
    try {
        $response = Invoke-RestMethod -Uri "$Url/health" -TimeoutSec $TimeoutSeconds -ErrorAction Stop
        return $response.status -eq "healthy"
    }
    catch {
        Write-DeploymentLog "Health check failed for $Url`: $_" "ERROR"
        return $false
    }
}

function Get-CurrentSlot {
    try {
        $nginxConfig = Get-Content "$($DeploymentConfig.LoadBalancerConfig)" -Raw
        if ($nginxConfig -match "upstream.*$BlueSlot") {
            return $BlueSlot
        }
        return $GreenSlot
    }
    catch {
        Write-DeploymentLog "Could not determine current slot, defaulting to blue" "WARN"
        return $BlueSlot
    }
}

function Switch-LoadBalancer {
    param([string]$TargetSlot)
    
    Write-DeploymentLog "Switching load balancer to $TargetSlot slot"
    
    if ($DryRun) {
        Write-DeploymentLog "DRY RUN: Would switch load balancer to $TargetSlot" "INFO"
        return $true
    }
    
    try {
        # Update nginx configuration
        $nginxTemplate = Get-Content "$ConfigPath/nginx-template.conf" -Raw
        $nginxConfig = $nginxTemplate -replace "{{ACTIVE_SLOT}}", $TargetSlot
        Set-Content -Path "$($DeploymentConfig.LoadBalancerConfig)" -Value $nginxConfig
        
        # Reload nginx
        docker exec nginx-lb nginx -s reload
        
        Write-DeploymentLog "Load balancer switched to $TargetSlot successfully" "SUCCESS"
        return $true
    }
    catch {
        Write-DeploymentLog "Failed to switch load balancer: $_" "ERROR"
        return $false
    }
}

function Deploy-ToSlot {
    param([string]$Slot, [string]$Version)
    
    Write-DeploymentLog "Deploying version $Version to $Slot slot"
    
    if ($DryRun) {
        Write-DeploymentLog "DRY RUN: Would deploy $Version to $Slot" "INFO"
        return $true
    }
    
    try {
        # Stop existing services in slot
        docker-compose -f "docker-compose.$Slot.yml" down --remove-orphans
        
        # Pull new images
        docker pull $DeploymentConfig.ApiImage
        docker pull $DeploymentConfig.WebImage
        
        # Run database migrations if needed
        if ($DeploymentConfig.DatabaseMigrations) {
            Write-DeploymentLog "Running database migrations"
            docker run --rm --network ecommerce-network `
                -e DATABASE_URL=$env:DATABASE_URL `
                $DeploymentConfig.ApiImage npm run migrate
        }
        
        # Start services in new slot
        $env:SLOT = $Slot
        $env:VERSION = $Version
        docker-compose -f "docker-compose.$Slot.yml" up -d
        
        Write-DeploymentLog "Services deployed to $Slot slot" "SUCCESS"
        return $true
    }
    catch {
        Write-DeploymentLog "Failed to deploy to $Slot slot: $_" "ERROR"
        return $false
    }
}

function Wait-ForHealthy {
    param([string]$Slot, [int]$TimeoutSeconds = 300)
    
    Write-DeploymentLog "Waiting for $Slot slot to become healthy (timeout: ${TimeoutSeconds}s)"
    
    $apiUrl = "http://api-$Slot.internal:3000"
    $webUrl = "http://web-$Slot.internal:3001"
    
    $startTime = Get-Date
    $timeout = $startTime.AddSeconds($TimeoutSeconds)
    
    while ((Get-Date) -lt $timeout) {
        $apiHealthy = Test-ServiceHealth -Url $apiUrl
        $webHealthy = Test-ServiceHealth -Url $webUrl
        
        if ($apiHealthy -and $webHealthy) {
            Write-DeploymentLog "$Slot slot is healthy" "SUCCESS"
            return $true
        }
        
        Write-DeploymentLog "Waiting for $Slot slot to become healthy..."
        Start-Sleep -Seconds 10
    }
    
    Write-DeploymentLog "$Slot slot failed to become healthy within timeout" "ERROR"
    return $false
}

function Perform-SmokeTests {
    param([string]$Slot)
    
    Write-DeploymentLog "Running smoke tests against $Slot slot"
    
    $baseUrl = "http://api-$Slot.internal:3000"
    
    $tests = @(
        @{ Name = "Health Check"; Url = "$baseUrl/health"; ExpectedStatus = 200 }
        @{ Name = "API Version"; Url = "$baseUrl/api/version"; ExpectedStatus = 200 }
        @{ Name = "Authentication"; Url = "$baseUrl/api/auth/status"; ExpectedStatus = 401 }
    )
    
    foreach ($test in $tests) {
        try {
            $response = Invoke-WebRequest -Uri $test.Url -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq $test.ExpectedStatus) {
                Write-DeploymentLog "✓ $($test.Name) passed" "SUCCESS"
            } else {
                Write-DeploymentLog "✗ $($test.Name) failed - Expected $($test.ExpectedStatus), got $($response.StatusCode)" "ERROR"
                return $false
            }
        }
        catch {
            Write-DeploymentLog "✗ $($test.Name) failed - $_" "ERROR"
            return $false
        }
    }
    
    return $true
}

function Start-BlueGreenDeployment {
    Write-DeploymentLog "Starting Blue-Green deployment for version $Version"
    
    # Determine current and target slots
    $currentSlot = Get-CurrentSlot
    $targetSlot = if ($currentSlot -eq $BlueSlot) { $GreenSlot } else { $BlueSlot }
    
    Write-DeploymentLog "Current slot: $currentSlot, Target slot: $targetSlot"
    
    # Deploy to target slot
    if (-not (Deploy-ToSlot -Slot $targetSlot -Version $Version)) {
        Write-DeploymentLog "Deployment to $targetSlot failed" "ERROR"
        return $false
    }
    
    # Wait for services to become healthy
    if (-not (Wait-ForHealthy -Slot $targetSlot)) {
        Write-DeploymentLog "Health check failed for $targetSlot" "ERROR"
        return $false
    }
    
    # Run smoke tests
    if (-not (Perform-SmokeTests -Slot $targetSlot)) {
        Write-DeploymentLog "Smoke tests failed for $targetSlot" "ERROR"
        return $false
    }
    
    # Switch load balancer
    if (-not (Switch-LoadBalancer -TargetSlot $targetSlot)) {
        Write-DeploymentLog "Failed to switch load balancer" "ERROR"
        return $false
    }
    
    # Wait and verify new slot is receiving traffic
    Start-Sleep -Seconds 30
    if (-not (Test-ServiceHealth -Url "http://api.production.internal:3000")) {
        Write-DeploymentLog "Production health check failed after switch" "ERROR"
        return $false
    }
    
    Write-DeploymentLog "Blue-Green deployment completed successfully" "SUCCESS"
    Write-DeploymentLog "Active slot: $targetSlot, Inactive slot: $currentSlot"
    
    return $true
}

function Start-Rollback {
    Write-DeploymentLog "Starting rollback procedure"
    
    $currentSlot = Get-CurrentSlot
    $previousSlot = if ($currentSlot -eq $BlueSlot) { $GreenSlot } else { $BlueSlot }
    
    Write-DeploymentLog "Rolling back from $currentSlot to $previousSlot"
    
    # Verify previous slot is healthy
    if (-not (Wait-ForHealthy -Slot $previousSlot -TimeoutSeconds 60)) {
        Write-DeploymentLog "Previous slot $previousSlot is not healthy, cannot rollback" "ERROR"
        return $false
    }
    
    # Switch load balancer back
    if (-not (Switch-LoadBalancer -TargetSlot $previousSlot)) {
        Write-DeploymentLog "Failed to rollback load balancer" "ERROR"
        return $false
    }
    
    Write-DeploymentLog "Rollback completed successfully" "SUCCESS"
    return $true
}

# Main execution
try {
    Write-DeploymentLog "Blue-Green Deployment Script Started"
    Write-DeploymentLog "Environment: $Environment, Version: $Version, DryRun: $DryRun"
    
    if ($Rollback) {
        $success = Start-Rollback
    } else {
        $success = Start-BlueGreenDeployment
    }
    
    if ($success) {
        Write-DeploymentLog "Deployment operation completed successfully" "SUCCESS"
        exit 0
    } else {
        Write-DeploymentLog "Deployment operation failed" "ERROR"
        exit 1
    }
}
catch {
    Write-DeploymentLog "Unexpected error: $_" "ERROR"
    exit 1
}