# PowerShell script to build all Docker images

param(
    [string]$Environment = "development",
    [switch]$NoCache = $false,
    [switch]$Parallel = $false
)

Write-Host "Building Docker images for $Environment environment..." -ForegroundColor Green

# Set Docker Compose file based on environment
$ComposeFile = if ($Environment -eq "production") { "docker-compose.prod.yml" } else { "docker-compose.yml" }

# Build arguments
$BuildArgs = @("--build")
if ($NoCache) {
    $BuildArgs += "--no-cache"
}
if ($Parallel) {
    $BuildArgs += "--parallel"
}

try {
    # Build all services
    Write-Host "Building all services..." -ForegroundColor Yellow
    docker-compose -f $ComposeFile build @BuildArgs

    # Verify images were built successfully
    Write-Host "Verifying built images..." -ForegroundColor Yellow
    $Images = @(
        "ecommerce-web",
        "ecommerce-api",
        "ecommerce-mobile"
    )

    foreach ($Image in $Images) {
        $ImageExists = docker images --format "table {{.Repository}}" | Select-String $Image
        if ($ImageExists) {
            Write-Host "✓ $Image image built successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ $Image image build failed" -ForegroundColor Red
        }
    }

    Write-Host "Docker build completed successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Error building Docker images: $_" -ForegroundColor Red
    exit 1
}