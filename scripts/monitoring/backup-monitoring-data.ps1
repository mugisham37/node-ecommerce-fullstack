#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Backup monitoring data and configurations
.DESCRIPTION
    Creates backups of Prometheus data, Grafana dashboards, and Elasticsearch indices
.PARAMETER BackupPath
    Path where backups will be stored
.PARAMETER RetentionDays
    Number of days to keep backups (default: 30)
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupPath = "./backups/monitoring",
    
    [Parameter(Mandatory=$false)]
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path $BackupPath $timestamp

Write-Host "💾 Starting monitoring data backup..." -ForegroundColor Green
Write-Host "📁 Backup location: $backupDir" -ForegroundColor Cyan

# Create backup directory
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Backup Prometheus data
Write-Host "📊 Backing up Prometheus data..." -ForegroundColor Yellow
try {
    $prometheusBackupDir = Join-Path $backupDir "prometheus"
    New-Item -ItemType Directory -Path $prometheusBackupDir -Force | Out-Null
    
    # Create Prometheus snapshot
    $snapshotResponse = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/admin/tsdb/snapshot" -Method POST
    if ($snapshotResponse.status -eq "success") {
        $snapshotName = $snapshotResponse.data.name
        Write-Host "✅ Prometheus snapshot created: $snapshotName" -ForegroundColor Green
        
        # Copy snapshot data
        docker cp prometheus:/prometheus/snapshots/$snapshotName $prometheusBackupDir
        Write-Host "✅ Prometheus data backed up" -ForegroundColor Green
    }
} catch {
    Write-Warning "⚠️ Failed to backup Prometheus data: $_"
}

# Backup Grafana dashboards and datasources
Write-Host "📊 Backing up Grafana configuration..." -ForegroundColor Yellow
try {
    $grafanaBackupDir = Join-Path $backupDir "grafana"
    New-Item -ItemType Directory -Path $grafanaBackupDir -Force | Out-Null
    
    $headers = @{
        'Authorization' = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123"))
    }
    
    # Backup dashboards
    $dashboards = Invoke-RestMethod -Uri "http://localhost:3001/api/search" -Headers $headers
    $dashboardsDir = Join-Path $grafanaBackupDir "dashboards"
    New-Item -ItemType Directory -Path $dashboardsDir -Force | Out-Null
    
    foreach ($dashboard in $dashboards) {
        if ($dashboard.type -eq "dash-db") {
            $dashboardData = Invoke-RestMethod -Uri "http://localhost:3001/api/dashboards/uid/$($dashboard.uid)" -Headers $headers
            $dashboardFile = Join-Path $dashboardsDir "$($dashboard.uid).json"
            $dashboardData | ConvertTo-Json -Depth 20 | Out-File -FilePath $dashboardFile -Encoding UTF8
        }
    }
    
    # Backup datasources
    $datasources = Invoke-RestMethod -Uri "http://localhost:3001/api/datasources" -Headers $headers
    $datasourcesFile = Join-Path $grafanaBackupDir "datasources.json"
    $datasources | ConvertTo-Json -Depth 10 | Out-File -FilePath $datasourcesFile -Encoding UTF8
    
    Write-Host "✅ Grafana configuration backed up" -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Failed to backup Grafana configuration: $_"
}

# Backup Elasticsearch indices
Write-Host "🔍 Backing up Elasticsearch indices..." -ForegroundColor Yellow
try {
    $elasticsearchBackupDir = Join-Path $backupDir "elasticsearch"
    New-Item -ItemType Directory -Path $elasticsearchBackupDir -Force | Out-Null
    
    # Get list of indices
    $indices = Invoke-RestMethod -Uri "http://localhost:9200/_cat/indices?format=json"
    $logIndices = $indices | Where-Object { $_.index -like "logs-*" }
    
    foreach ($index in $logIndices) {
        $indexName = $index.index
        Write-Host "  📋 Backing up index: $indexName" -ForegroundColor Cyan
        
        # Create index backup using Elasticsearch snapshot API
        $snapshotRepo = "backup_repo"
        $snapshotName = "$indexName-$timestamp"
        
        # Register snapshot repository if not exists
        try {
            $repoConfig = @{
                type = "fs"
                settings = @{
                    location = "/usr/share/elasticsearch/backup"
                }
            } | ConvertTo-Json -Depth 5
            
            Invoke-RestMethod -Uri "http://localhost:9200/_snapshot/$snapshotRepo" -Method PUT -Body $repoConfig -ContentType "application/json"
        } catch {
            # Repository might already exist
        }
        
        # Create snapshot
        $snapshotConfig = @{
            indices = $indexName
            ignore_unavailable = $true
            include_global_state = $false
        } | ConvertTo-Json -Depth 5
        
        Invoke-RestMethod -Uri "http://localhost:9200/_snapshot/$snapshotRepo/$snapshotName" -Method PUT -Body $snapshotConfig -ContentType "application/json"
    }
    
    Write-Host "✅ Elasticsearch indices backed up" -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Failed to backup Elasticsearch indices: $_"
}

# Backup monitoring configurations
Write-Host "⚙️ Backing up monitoring configurations..." -ForegroundColor Yellow
try {
    $configBackupDir = Join-Path $backupDir "config"
    New-Item -ItemType Directory -Path $configBackupDir -Force | Out-Null
    
    # Copy configuration files
    $configFiles = @(
        "infrastructure/monitoring/prometheus.yml",
        "infrastructure/monitoring/alertmanager.yml",
        "infrastructure/monitoring/rules/*.yml",
        "infrastructure/monitoring/grafana/provisioning/**/*",
        "infrastructure/monitoring/elasticsearch/*.yml",
        "infrastructure/monitoring/docker-compose.monitoring.yml"
    )
    
    foreach ($configPattern in $configFiles) {
        $files = Get-ChildItem $configPattern -Recurse -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart("\", "/")
            $backupFile = Join-Path $configBackupDir $relativePath
            $backupFileDir = Split-Path $backupFile -Parent
            
            if (!(Test-Path $backupFileDir)) {
                New-Item -ItemType Directory -Path $backupFileDir -Force | Out-Null
            }
            
            Copy-Item $file.FullName $backupFile -Force
        }
    }
    
    Write-Host "✅ Monitoring configurations backed up" -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Failed to backup monitoring configurations: $_"
}

# Create backup metadata
$metadata = @{
    timestamp = $timestamp
    version = "1.0"
    services = @{
        prometheus = @{
            version = (docker inspect prometheus --format '{{.Config.Image}}' 2>$null)
            status = (docker ps --filter "name=prometheus" --format "{{.Status}}" 2>$null)
        }
        grafana = @{
            version = (docker inspect grafana --format '{{.Config.Image}}' 2>$null)
            status = (docker ps --filter "name=grafana" --format "{{.Status}}" 2>$null)
        }
        elasticsearch = @{
            version = (docker inspect elasticsearch --format '{{.Config.Image}}' 2>$null)
            status = (docker ps --filter "name=elasticsearch" --format "{{.Status}}" 2>$null)
        }
    }
    backup_size = (Get-ChildItem $backupDir -Recurse | Measure-Object -Property Length -Sum).Sum
}

$metadataFile = Join-Path $backupDir "backup-metadata.json"
$metadata | ConvertTo-Json -Depth 10 | Out-File -FilePath $metadataFile -Encoding UTF8

# Compress backup
Write-Host "🗜️ Compressing backup..." -ForegroundColor Yellow
try {
    $archiveName = "monitoring-backup-$timestamp.zip"
    $archivePath = Join-Path $BackupPath $archiveName
    
    if (Get-Command Compress-Archive -ErrorAction SilentlyContinue) {
        Compress-Archive -Path "$backupDir/*" -DestinationPath $archivePath -Force
        Remove-Item $backupDir -Recurse -Force
        Write-Host "✅ Backup compressed: $archivePath" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Compression not available, backup saved uncompressed" -ForegroundColor Blue
    }
} catch {
    Write-Warning "⚠️ Failed to compress backup: $_"
}

# Clean up old backups
Write-Host "🧹 Cleaning up old backups..." -ForegroundColor Yellow
try {
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $oldBackups = Get-ChildItem $BackupPath -Filter "monitoring-backup-*.zip" | Where-Object { $_.CreationTime -lt $cutoffDate }
    
    foreach ($oldBackup in $oldBackups) {
        Remove-Item $oldBackup.FullName -Force
        Write-Host "🗑️ Removed old backup: $($oldBackup.Name)" -ForegroundColor Gray
    }
    
    # Also clean up uncompressed directories
    $oldDirs = Get-ChildItem $BackupPath -Directory | Where-Object { $_.Name -match "^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$" -and $_.CreationTime -lt $cutoffDate }
    foreach ($oldDir in $oldDirs) {
        Remove-Item $oldDir.FullName -Recurse -Force
        Write-Host "🗑️ Removed old backup directory: $($oldDir.Name)" -ForegroundColor Gray
    }
    
    Write-Host "✅ Cleanup completed" -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Failed to clean up old backups: $_"
}

$backupSize = if (Test-Path $archivePath) { 
    [math]::Round((Get-Item $archivePath).Length / 1MB, 2) 
} else { 
    [math]::Round((Get-ChildItem $backupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2) 
}

Write-Host "`n🎉 Monitoring backup completed successfully!" -ForegroundColor Green
Write-Host "📊 Backup Details:" -ForegroundColor Cyan
Write-Host "  • Timestamp: $timestamp" -ForegroundColor White
Write-Host "  • Size: $backupSize MB" -ForegroundColor White
Write-Host "  • Location: $BackupPath" -ForegroundColor White
Write-Host "  • Retention: $RetentionDays days" -ForegroundColor White