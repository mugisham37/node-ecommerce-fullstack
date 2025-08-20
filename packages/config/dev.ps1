#!/usr/bin/env pwsh

# Development script for @ecommerce/config package

Write-Host "Starting @ecommerce/config package in development mode..." -ForegroundColor Green

# Clean previous build
Write-Host "Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

# Start development mode with watch
Write-Host "Starting TypeScript compiler in watch mode..." -ForegroundColor Yellow
npm run dev