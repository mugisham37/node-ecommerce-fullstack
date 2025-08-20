#!/usr/bin/env pwsh

# Full-Stack Monolith Test Script
# This script runs all tests across the monorepo

param(
    [string]$Type = "all",  # all, unit, integration, e2e
    [switch]$Watch = $false,
    [switch]$Coverage = $false,
    [switch]$Verbose = $false,
    [string]$Filter = ""
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Magenta = "`e[35m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "🧪 $Message" $Blue
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

function Run-Tests {
    param(
        [string]$Path,
        [string]$Name,
        [string]$TestType = "all"
    )
    
    if (-not (Test-Path "$Path/package.json")) {
        Write-Warning "$Name not found at $Path, skipping..."
        return $true
    }
    
    Write-Step "Running $TestType tests for $Name..."
    
    try {
        Set-Location $Path
        
        $testCommand = "npm run test"
        
        # Add specific test type if specified
        switch ($TestType) {
            "unit" { $testCommand += ":unit" }
            "integration" { $testCommand += ":integration" }
            "e2e" { $testCommand += ":e2e" }
        }
        
        # Add watch mode if requested
        if ($Watch) {
            $testCommand += " -- --watch"
        }
        
        # Add coverage if requested
        if ($Coverage) {
            $testCommand += " -- --coverage"
        }
        
        # Add filter if specified
        if ($Filter) {
            $testCommand += " -- --testNamePattern='$Filter'"
        }
        
        # Add verbose if requested
        if ($Verbose) {
            $testCommand += " -- --verbose"
        }
        
        Write-ColorOutput "Executing: $testCommand" $Yellow
        Invoke-Expression $testCommand
        
        Set-Location "../.."
        Write-Success "$Name tests completed successfully"
        return $true
        
    } catch {
        Set-Location "../.."
        Write-Error "$Name tests failed: $($_.Exception.Message)"
        return $false
    }
}

try {
    Write-ColorOutput "🚀 Starting Full-Stack Test Suite" $Magenta
    Write-ColorOutput "Test Type: $Type" $Yellow
    if ($Watch) { Write-ColorOutput "Watch Mode: Enabled" $Yellow }
    if ($Coverage) { Write-ColorOutput "Coverage: Enabled" $Yellow }
    if ($Filter) { Write-ColorOutput "Filter: $Filter" $Yellow }
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        throw "package.json not found. Please run this script from the project root."
    }

    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Step "Installing dependencies..."
        npm install
        Write-Success "Dependencies installed"
    }

    $allPassed = $true
    $testResults = @()

    # Test packages first (dependencies)
    Write-Step "Testing shared packages..."
    
    $packages = @(
        @{ Path = "packages/shared"; Name = "Shared Package" },
        @{ Path = "packages/validation"; Name = "Validation Package" },
        @{ Path = "packages/config"; Name = "Config Package" },
        @{ Path = "packages/database"; Name = "Database Package" },
        @{ Path = "packages/cache"; Name = "Cache Package" },
        @{ Path = "packages/api-client"; Name = "API Client Package" },
        @{ Path = "packages/ui"; Name = "UI Package" }
    )

    foreach ($package in $packages) {
        $result = Run-Tests -Path $package.Path -Name $package.Name -TestType $Type
        $testResults += @{
            Name = $package.Name
            Passed = $result
        }
        if (-not $result) { $allPassed = $false }
    }

    # Test applications
    Write-Step "Testing applications..."
    
    $apps = @(
        @{ Path = "apps/api"; Name = "API Server" },
        @{ Path = "apps/web"; Name = "Web Application" },
        @{ Path = "apps/mobile"; Name = "Mobile Application" }
    )

    foreach ($app in $apps) {
        $result = Run-Tests -Path $app.Path -Name $app.Name -TestType $Type
        $testResults += @{
            Name = $app.Name
            Passed = $result
        }
        if (-not $result) { $allPassed = $false }
    }

    # Run integration tests if requested
    if ($Type -eq "all" -or $Type -eq "integration") {
        Write-Step "Running integration tests..."
        if (Test-Path "tests/integration") {
            Set-Location "tests"
            try {
                npm run test:integration
                Write-Success "Integration tests completed"
            } catch {
                Write-Error "Integration tests failed: $($_.Exception.Message)"
                $allPassed = $false
            } finally {
                Set-Location ".."
            }
        } else {
            Write-Warning "Integration tests directory not found, skipping..."
        }
    }

    # Run E2E tests if requested
    if ($Type -eq "all" -or $Type -eq "e2e") {
        Write-Step "Running E2E tests..."
        if (Test-Path "tests/e2e") {
            Set-Location "tests"
            try {
                npm run test:e2e
                Write-Success "E2E tests completed"
            } catch {
                Write-Error "E2E tests failed: $($_.Exception.Message)"
                $allPassed = $false
            } finally {
                Set-Location ".."
            }
        } else {
            Write-Warning "E2E tests directory not found, skipping..."
        }
    }

    # Display results summary
    Write-ColorOutput "`n📊 Test Results Summary:" $Magenta
    Write-ColorOutput "========================" $Magenta
    
    foreach ($result in $testResults) {
        $status = if ($result.Passed) { "✅ PASSED" } else { "❌ FAILED" }
        $color = if ($result.Passed) { $Green } else { $Red }
        Write-ColorOutput "  $($result.Name): $status" $color
    }

    if ($allPassed) {
        Write-Success "`n🎉 All tests passed successfully!"
        exit 0
    } else {
        Write-Error "`n💥 Some tests failed. Please check the output above."
        exit 1
    }

} catch {
    Write-Error "Test execution failed: $($_.Exception.Message)"
    exit 1
} finally {
    # Ensure we're back in the root directory
    Set-Location $PSScriptRoot/..
}