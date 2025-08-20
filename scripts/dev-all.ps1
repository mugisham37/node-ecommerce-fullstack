#!/usr/bin/env pwsh

# Full-Stack Monolith Development Script
# This script starts all development servers concurrently

param(
    [switch]$API = $false,
    [switch]$Web = $false,
    [switch]$Mobile = $false,
    [switch]$All = $true,
    [switch]$Verbose = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Magenta = "`e[35m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "🚀 $Message" $Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" $Green
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" $Red
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" $Yellow
}

try {
    Write-ColorOutput "🔥 Starting Full-Stack Development Environment" $Magenta
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        throw "package.json not found. Please run this script from the project root."
    }

    # Install dependencies if node_modules doesn't exist
    if (-not (Test-Path "node_modules")) {
        Write-Step "Installing dependencies..."
        npm install
        Write-Success "Dependencies installed"
    }

    # Check which services to start
    $services = @()
    
    if ($All -or $API) {
        if (Test-Path "apps/api/package.json") {
            $services += @{
                Name = "API Server"
                Path = "apps/api"
                Command = "npm run dev"
                Port = "3001"
                Color = $Green
            }
        }
    }
    
    if ($All -or $Web) {
        if (Test-Path "apps/web/package.json") {
            $services += @{
                Name = "Web App"
                Path = "apps/web"
                Command = "npm run dev"
                Port = "3000"
                Color = $Blue
            }
        }
    }
    
    if ($All -or $Mobile) {
        if (Test-Path "apps/mobile/package.json") {
            $services += @{
                Name = "Mobile App"
                Path = "apps/mobile"
                Command = "npm run start"
                Port = "8081"
                Color = $Cyan
            }
        }
    }

    if ($services.Count -eq 0) {
        Write-Warning "No services found to start. Make sure the applications exist."
        exit 1
    }

    Write-Step "Starting $($services.Count) development server(s)..."

    # Start each service in a separate process
    $jobs = @()
    
    foreach ($service in $services) {
        Write-ColorOutput "Starting $($service.Name) on port $($service.Port)..." $service.Color
        
        $job = Start-Job -ScriptBlock {
            param($ServicePath, $Command, $ServiceName)
            
            Set-Location $ServicePath
            Write-Host "[$ServiceName] Starting in $(Get-Location)..."
            
            # Execute the command
            Invoke-Expression $Command
            
        } -ArgumentList $service.Path, $service.Command, $service.Name
        
        $jobs += @{
            Job = $job
            Service = $service
        }
        
        Start-Sleep -Seconds 2  # Small delay between starting services
    }

    Write-Success "All development servers started!"
    Write-ColorOutput "Services running:" $Yellow
    
    foreach ($service in $services) {
        Write-ColorOutput "  • $($service.Name): http://localhost:$($service.Port)" $service.Color
    }

    Write-ColorOutput "`n📝 Development URLs:" $Yellow
    Write-ColorOutput "  • Web App: http://localhost:3000" $Blue
    Write-ColorOutput "  • API Server: http://localhost:3001" $Green
    Write-ColorOutput "  • API Docs: http://localhost:3001/api/docs" $Green
    Write-ColorOutput "  • Mobile Metro: http://localhost:8081" $Cyan

    Write-ColorOutput "`n🛑 Press Ctrl+C to stop all services" $Red

    # Wait for user to stop or jobs to complete
    try {
        while ($true) {
            Start-Sleep -Seconds 5
            
            # Check if any jobs have failed
            foreach ($jobInfo in $jobs) {
                if ($jobInfo.Job.State -eq "Failed") {
                    Write-Error "$($jobInfo.Service.Name) has failed!"
                    Receive-Job $jobInfo.Job
                }
            }
        }
    } catch {
        Write-Warning "Stopping all services..."
    }

} catch {
    Write-Error "Failed to start development environment: $($_.Exception.Message)"
    exit 1
} finally {
    # Clean up jobs
    if ($jobs) {
        Write-Step "Cleaning up background jobs..."
        foreach ($jobInfo in $jobs) {
            Stop-Job $jobInfo.Job -ErrorAction SilentlyContinue
            Remove-Job $jobInfo.Job -ErrorAction SilentlyContinue
        }
    }
    
    Write-Success "Development environment stopped."
}