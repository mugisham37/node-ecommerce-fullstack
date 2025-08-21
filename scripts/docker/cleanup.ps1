# PowerShell script to cleanup Docker resources

param(
    [switch]$All = $false,
    [switch]$Volumes = $false,
    [switch]$Images = $false,
    [switch]$Containers = $false,
    [switch]$Force = $false
)

Write-Host "Docker cleanup script" -ForegroundColor Green

if (-not ($All -or $Volumes -or $Images -or $Containers)) {
    Write-Host "Please specify what to cleanup:" -ForegroundColor Yellow
    Write-Host "  -All        : Clean everything (containers, images, volumes)" -ForegroundColor White
    Write-Host "  -Containers : Stop and remove containers" -ForegroundColor White
    Write-Host "  -Images     : Remove unused images" -ForegroundColor White
    Write-Host "  -Volumes    : Remove unused volumes" -ForegroundColor White
    Write-Host "  -Force      : Force removal without confirmation" -ForegroundColor White
    exit 0
}

try {
    if ($All -or $Containers) {
        Write-Host "Stopping and removing containers..." -ForegroundColor Yellow
        
        # Stop development environment
        docker-compose down --remove-orphans
        
        # Stop production environment
        docker-compose -f docker-compose.prod.yml down --remove-orphans
        
        if ($Force) {
            # Remove all stopped containers
            $StoppedContainers = docker ps -aq --filter "status=exited"
            if ($StoppedContainers) {
                docker rm $StoppedContainers
                Write-Host "Removed stopped containers" -ForegroundColor Green
            }
        }
    }

    if ($All -or $Images) {
        Write-Host "Removing unused images..." -ForegroundColor Yellow
        
        if ($Force) {
            # Remove dangling images
            docker image prune -f
            
            # Remove unused images
            docker image prune -a -f
        } else {
            docker image prune
        }
        
        Write-Host "Removed unused images" -ForegroundColor Green
    }

    if ($All -or $Volumes) {
        Write-Host "Removing unused volumes..." -ForegroundColor Yellow
        
        if ($Force) {
            docker volume prune -f
        } else {
            docker volume prune
        }
        
        Write-Host "Removed unused volumes" -ForegroundColor Green
    }

    if ($All) {
        Write-Host "Cleaning up networks..." -ForegroundColor Yellow
        docker network prune -f
        
        Write-Host "Cleaning up build cache..." -ForegroundColor Yellow
        docker builder prune -f
    }

    # Show disk usage after cleanup
    Write-Host "`nDocker disk usage after cleanup:" -ForegroundColor Green
    docker system df

    Write-Host "Cleanup completed successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Error during cleanup: $_" -ForegroundColor Red
    exit 1
}