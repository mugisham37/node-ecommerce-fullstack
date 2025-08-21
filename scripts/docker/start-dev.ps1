# PowerShell script to start development environment

param(
    [switch]$Build = $false,
    [switch]$Detached = $true,
    [string]$Service = ""
)

Write-Host "Starting development environment..." -ForegroundColor Green

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
        docker-compose up @Args $Service
    } else {
        Write-Host "Starting all services..." -ForegroundColor Yellow
        docker-compose up @Args
    }

    if ($Detached) {
        # Wait a moment for services to start
        Start-Sleep -Seconds 5

        # Check service status
        Write-Host "Checking service status..." -ForegroundColor Yellow
        docker-compose ps

        # Display service URLs
        Write-Host "`nServices are running at:" -ForegroundColor Green
        Write-Host "Web Application: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "API Server: http://localhost:4000" -ForegroundColor Cyan
        Write-Host "Database Admin: http://localhost:8080" -ForegroundColor Cyan
        Write-Host "Redis Commander: http://localhost:8081" -ForegroundColor Cyan
        Write-Host "Mobile Metro: http://localhost:8081" -ForegroundColor Cyan

        Write-Host "`nTo view logs: docker-compose logs -f [service-name]" -ForegroundColor Yellow
        Write-Host "To stop services: docker-compose down" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Error starting development environment: $_" -ForegroundColor Red
    exit 1
}