#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Sets up the complete monitoring and observability stack
.DESCRIPTION
    This script initializes Prometheus, Grafana, Jaeger, Elasticsearch, and related monitoring tools
.PARAMETER Environment
    The environment to set up monitoring for (development, staging, production)
.PARAMETER SkipDataVolumes
    Skip creating data volumes (useful for development)
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDataVolumes
)

$ErrorActionPreference = "Stop"

Write-Host "🔧 Setting up monitoring stack for $Environment environment..." -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Error "❌ Docker is not running. Please start Docker and try again."
    exit 1
}

# Create monitoring network
Write-Host "📡 Creating monitoring network..." -ForegroundColor Yellow
try {
    docker network create monitoring 2>$null
    Write-Host "✅ Monitoring network created" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ Monitoring network already exists" -ForegroundColor Blue
}

# Create necessary directories
Write-Host "📁 Creating monitoring directories..." -ForegroundColor Yellow
$directories = @(
    "infrastructure/monitoring/data/prometheus",
    "infrastructure/monitoring/data/grafana",
    "infrastructure/monitoring/data/elasticsearch",
    "infrastructure/monitoring/data/alertmanager",
    "infrastructure/monitoring/logs"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created directory: $dir" -ForegroundColor Green
    }
}

# Set proper permissions for data directories
if ($IsLinux -or $IsMacOS) {
    Write-Host "🔐 Setting permissions for data directories..." -ForegroundColor Yellow
    chmod -R 755 infrastructure/monitoring/data/
    chown -R 472:472 infrastructure/monitoring/data/grafana/  # Grafana user
}

# Copy environment-specific configurations
Write-Host "⚙️ Copying environment-specific configurations..." -ForegroundColor Yellow
$configFiles = @{
    "prometheus.yml" = "infrastructure/monitoring/prometheus.yml"
    "alertmanager.yml" = "infrastructure/monitoring/alertmanager.yml"
}

foreach ($config in $configFiles.GetEnumerator()) {
    $envConfig = $config.Value -replace "\.yml$", ".$Environment.yml"
    if (Test-Path $envConfig) {
        Copy-Item $envConfig $config.Value -Force
        Write-Host "✅ Using $Environment configuration for $($config.Key)" -ForegroundColor Green
    }
}

# Start monitoring services
Write-Host "🚀 Starting monitoring services..." -ForegroundColor Yellow
Set-Location "infrastructure/monitoring"

try {
    # Start core monitoring services first
    docker-compose -f docker-compose.monitoring.yml up -d prometheus grafana alertmanager node-exporter
    Start-Sleep -Seconds 10
    
    # Start logging stack
    docker-compose -f docker-compose.monitoring.yml up -d elasticsearch logstash kibana filebeat
    Start-Sleep -Seconds 15
    
    # Start tracing
    docker-compose -f docker-compose.monitoring.yml up -d jaeger
    Start-Sleep -Seconds 5
    
    # Start additional exporters
    docker-compose -f docker-compose.monitoring.yml up -d cadvisor
    
    Write-Host "✅ All monitoring services started successfully" -ForegroundColor Green
} catch {
    Write-Error "❌ Failed to start monitoring services: $_"
    exit 1
} finally {
    Set-Location "../.."
}

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
$services = @{
    "Prometheus" = "http://localhost:9090/-/ready"
    "Grafana" = "http://localhost:3001/api/health"
    "Elasticsearch" = "http://localhost:9200/_cluster/health"
    "Jaeger" = "http://localhost:16686/"
    "Kibana" = "http://localhost:5601/api/status"
}

foreach ($service in $services.GetEnumerator()) {
    $maxAttempts = 30
    $attempt = 0
    $ready = $false
    
    while ($attempt -lt $maxAttempts -and -not $ready) {
        try {
            $response = Invoke-WebRequest -Uri $service.Value -Method GET -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                $ready = $true
                Write-Host "✅ $($service.Key) is ready" -ForegroundColor Green
            }
        } catch {
            $attempt++
            Start-Sleep -Seconds 2
        }
    }
    
    if (-not $ready) {
        Write-Warning "⚠️ $($service.Key) may not be fully ready yet"
    }
}

# Import Grafana dashboards
Write-Host "📊 Importing Grafana dashboards..." -ForegroundColor Yellow
Start-Sleep -Seconds 5  # Give Grafana more time to fully start

$dashboards = Get-ChildItem "infrastructure/monitoring/grafana/dashboards/*.json"
foreach ($dashboard in $dashboards) {
    try {
        $dashboardContent = Get-Content $dashboard.FullName -Raw | ConvertFrom-Json
        $body = @{
            dashboard = $dashboardContent.dashboard
            overwrite = $true
        } | ConvertTo-Json -Depth 20
        
        $headers = @{
            'Content-Type' = 'application/json'
            'Authorization' = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123"))
        }
        
        Invoke-RestMethod -Uri "http://localhost:3001/api/dashboards/db" -Method POST -Body $body -Headers $headers
        Write-Host "✅ Imported dashboard: $($dashboard.BaseName)" -ForegroundColor Green
    } catch {
        Write-Warning "⚠️ Failed to import dashboard $($dashboard.BaseName): $_"
    }
}

# Create index patterns in Kibana
Write-Host "🔍 Creating Kibana index patterns..." -ForegroundColor Yellow
Start-Sleep -Seconds 10  # Give Kibana time to start

try {
    $indexPattern = @{
        attributes = @{
            title = "logs-*"
            timeFieldName = "@timestamp"
        }
    } | ConvertTo-Json -Depth 5
    
    $headers = @{
        'Content-Type' = 'application/json'
        'kbn-xsrf' = 'true'
    }
    
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/index-pattern/logs-*" -Method POST -Body $indexPattern -Headers $headers
    Write-Host "✅ Created Kibana index pattern for logs" -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Failed to create Kibana index pattern: $_"
}

# Display service URLs
Write-Host "`n🎉 Monitoring stack setup complete!" -ForegroundColor Green
Write-Host "`n📊 Service URLs:" -ForegroundColor Cyan
Write-Host "  • Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "  • Grafana: http://localhost:3001 (admin/admin123)" -ForegroundColor White
Write-Host "  • Alertmanager: http://localhost:9093" -ForegroundColor White
Write-Host "  • Jaeger: http://localhost:16686" -ForegroundColor White
Write-Host "  • Kibana: http://localhost:5601" -ForegroundColor White
Write-Host "  • Elasticsearch: http://localhost:9200" -ForegroundColor White

Write-Host "`n📈 Available Dashboards:" -ForegroundColor Cyan
Write-Host "  • System Overview - Infrastructure metrics" -ForegroundColor White
Write-Host "  • Application Metrics - API performance and health" -ForegroundColor White
Write-Host "  • Business Metrics - Inventory and order analytics" -ForegroundColor White

Write-Host "`n🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Configure your applications to send metrics to Prometheus" -ForegroundColor White
Write-Host "  2. Set up log forwarding to Logstash" -ForegroundColor White
Write-Host "  3. Implement distributed tracing with Jaeger" -ForegroundColor White
Write-Host "  4. Configure alerting rules and notification channels" -ForegroundColor White

if ($Environment -eq "production") {
    Write-Host "`n⚠️ Production Notes:" -ForegroundColor Yellow
    Write-Host "  • Change default passwords before going live" -ForegroundColor White
    Write-Host "  • Configure proper SSL certificates" -ForegroundColor White
    Write-Host "  • Set up external storage for data persistence" -ForegroundColor White
    Write-Host "  • Configure backup strategies for monitoring data" -ForegroundColor White
}