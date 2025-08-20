#!/usr/bin/env pwsh

# Build script for @ecommerce/constants package

Write-Host "Building @ecommerce/constants package..." -ForegroundColor Green

# Clean previous build
Write-Host "Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

# Type check
Write-Host "Running type check..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -ne 0) {
    Write-Host "Type check failed!" -ForegroundColor Red
    exit 1
}

# Build
Write-Host "Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ @ecommerce/constants package built successfully!" -ForegroundColor Green