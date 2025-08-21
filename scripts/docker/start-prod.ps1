# PowerShell script to start production environment

param(
    [switch]$Build = $false,
    [switch]$Detached = $true,
    [string]$Service = ""
)

Write-Host "Starting production environment..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Please copy .env.example to .env and configure it." -ForegroundColor Yellow
    Write-Host "Copying .env.example to .env..." -ForegroundColor Yellow
    Copy-Item "infrastructure/docker/.env.example" ".env"
    Write-Host "Please edit .env file with your production configuration before continuing." -ForegroundColor Red
    exit 1
}

# Build arguments
$Args = @()
if ($Build) {
    $Args += "--build"
}
if ($Detached) {
    $Args += "-d"
}

try {
    # Start services
    if ($Service) {
        Write-Host "Starting service: $Service" -ForegroundColor Yellow
        docker-compose -f docker-compose.prod.yml up @Args $Service
    } else {
        Write-Host "Starting all production services..." -ForegroundColor Yellow
        docker-compose -f docker-compose.prod.yml up @Args
    }

    if ($Detached) {
        # Wait a moment for services to start
        Start-Sleep -Seconds 10

        # Check service status
        Write-Host "Checking service status..." -ForegroundColor Yellow
        docker-compose -f docker-compose.prod.yml ps

        # Display service URLs
        Write-Host "`nProduction services are running:" -ForegroundColor Green
        Write-Host "Web Application: http://localhost (via Nginx)" -ForegroundColor Cyan
        Write-Host "API Server: http://localhost/api (via Nginx)" -ForegroundColor Cyan
        Write-Host "Prometheus: http://localhost:9090" -ForegroundColor Cyan
        Write-Host "Grafana: http://localhost:3001" -ForegroundColor Cyan

        Write-Host "`nTo view logs: docker-compose -f docker-compose.prod.yml logs -f [service-name]" -ForegroundColor Yellow
        Write-Host "To stop services: docker-compose -f docker-compose.prod.yml down" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Error starting production environment: $_" -ForegroundColor Red
    exit 1
}