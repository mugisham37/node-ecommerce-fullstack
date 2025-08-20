#!/usr/bin/env pwsh

# Full-Stack Monolith Build Script
# This script builds all applications and packages in the correct order

param(
    [string]$Environment = "production",
    [switch]$Clean = $false,
    [switch]$Verbose = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "🔨 $Message" $Blue
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
    Write-ColorOutput "🚀 Starting Full-Stack Monolith Build Process" $Blue
    Write-ColorOutput "Environment: $Environment" $Yellow
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        throw "package.json not found. Please run this script from the project root."
    }

    # Clean if requested
    if ($Clean) {
        Write-Step "Cleaning previous builds..."
        if (Test-Path "node_modules") {
            Remove-Item -Recurse -Force "node_modules"
        }
        Get-ChildItem -Path "." -Recurse -Name "node_modules" | ForEach-Object {
            Remove-Item -Recurse -Force $_
        }
        Get-ChildItem -Path "." -Recurse -Name "dist" | ForEach-Object {
            Remove-Item -Recurse -Force $_
        }
        Get-ChildItem -Path "." -Recurse -Name ".next" | ForEach-Object {
            Remove-Item -Recurse -Force $_
        }
        Write-Success "Clean completed"
    }

    # Install dependencies
    Write-Step "Installing dependencies..."
    npm install
    Write-Success "Dependencies installed"

    # Type checking
    Write-Step "Running type checks..."
    npm run type-check
    Write-Success "Type checking completed"

    # Linting
    Write-Step "Running linting..."
    npm run lint
    Write-Success "Linting completed"

    # Build packages first (dependencies)
    Write-Step "Building shared packages..."
    
    $packages = @(
        "packages/shared",
        "packages/validation", 
        "packages/config",
        "packages/database",
        "packages/cache",
        "packages/api-client",
        "packages/ui"
    )

    foreach ($package in $packages) {
        if (Test-Path "$package/package.json") {
            Write-Step "Building $package..."
            Set-Location $package
            npm run build
            Set-Location "../.."
            Write-Success "$package built successfully"
        } else {
            Write-Warning "$package not found, skipping..."
        }
    }

    # Build applications
    Write-Step "Building applications..."
    
    $apps = @(
        "apps/api",
        "apps/web",
        "apps/mobile"
    )

    foreach ($app in $apps) {
        if (Test-Path "$app/package.json") {
            Write-Step "Building $app..."
            Set-Location $app
            npm run build
            Set-Location "../.."
            Write-Success "$app built successfully"
        } else {
            Write-Warning "$app not found, skipping..."
        }
    }

    # Run tests
    Write-Step "Running tests..."
    npm run test
    Write-Success "All tests passed"

    Write-Success "🎉 Build completed successfully!"
    Write-ColorOutput "All applications and packages have been built and tested." $Green

} catch {
    Write-Error "Build failed: $($_.Exception.Message)"
    exit 1
} finally {
    # Ensure we're back in the root directory
    Set-Location $PSScriptRoot/..
}