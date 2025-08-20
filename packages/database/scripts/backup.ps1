# Database Backup Script for PostgreSQL
# Usage: .\backup.ps1 [-Environment dev|staging|prod] [-BackupType full|schema|data]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("full", "schema", "data")]
    [string]$BackupType = "full",
    
    [Parameter(Mandatory=$false)]
    [string]$BackupDir = ".\backups",
    
    [Parameter(Mandatory=$false)]
    [switch]$Compress = $true
)

# Load environment variables based on environment
switch ($Environment) {
    "dev" {
        $DB_HOST = $env:DB_HOST ?? "localhost"
        $DB_PORT = $env:DB_PORT ?? "5432"
        $DB_NAME = $env:DB_NAME ?? "ecommerce_inventory"
        $DB_USER = $env:DB_USER ?? "postgres"
        $DB_PASSWORD = $env:DB_PASSWORD ?? "password"
    }
    "staging" {
        $DB_HOST = $env:STAGING_DB_HOST ?? "staging-db.example.com"
        $DB_PORT = $env:STAGING_DB_PORT ?? "5432"
        $DB_NAME = $env:STAGING_DB_NAME ?? "ecommerce_inventory_staging"
        $DB_USER = $env:STAGING_DB_USER ?? "postgres"
        $DB_PASSWORD = $env:STAGING_DB_PASSWORD
    }
    "prod" {
        $DB_HOST = $env:PROD_DB_HOST ?? "prod-db.example.com"
        $DB_PORT = $env:PROD_DB_PORT ?? "5432"
        $DB_NAME = $env:PROD_DB_NAME ?? "ecommerce_inventory_prod"
        $DB_USER = $env:PROD_DB_USER ?? "postgres"
        $DB_PASSWORD = $env:PROD_DB_PASSWORD
    }
}

# Validate required environment variables
if (-not $DB_PASSWORD) {
    Write-Error "Database password not found. Please set the appropriate environment variable."
    exit 1
}

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "Created backup directory: $BackupDir" -ForegroundColor Green
}

# Generate backup filename with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "${DB_NAME}_${Environment}_${BackupType}_${timestamp}"

# Set PGPASSWORD environment variable for pg_dump
$env:PGPASSWORD = $DB_PASSWORD

try {
    Write-Host "Starting $BackupType backup for $Environment environment..." -ForegroundColor Yellow
    Write-Host "Database: $DB_NAME on $DB_HOST:$DB_PORT" -ForegroundColor Cyan
    
    # Construct pg_dump command based on backup type
    $pgDumpArgs = @(
        "--host=$DB_HOST",
        "--port=$DB_PORT",
        "--username=$DB_USER",
        "--dbname=$DB_NAME",
        "--verbose",
        "--no-password"
    )
    
    switch ($BackupType) {
        "schema" {
            $pgDumpArgs += "--schema-only"
            $backupFile = "$BackupDir\${backupFileName}.sql"
        }
        "data" {
            $pgDumpArgs += "--data-only"
            $backupFile = "$BackupDir\${backupFileName}.sql"
        }
        "full" {
            $pgDumpArgs += "--clean", "--create"
            $backupFile = "$BackupDir\${backupFileName}.sql"
        }
    }
    
    # Add compression if requested
    if ($Compress) {
        $pgDumpArgs += "--format=custom"
        $backupFile = "$BackupDir\${backupFileName}.backup"
    }
    
    $pgDumpArgs += "--file=$backupFile"
    
    # Execute pg_dump
    Write-Host "Executing: pg_dump $($pgDumpArgs -join ' ')" -ForegroundColor Gray
    & pg_dump @pgDumpArgs
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFile).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host "Backup completed successfully!" -ForegroundColor Green
        Write-Host "Backup file: $backupFile" -ForegroundColor Green
        Write-Host "File size: $fileSizeMB MB" -ForegroundColor Green
        
        # Create a metadata file with backup information
        $metadata = @{
            Environment = $Environment
            BackupType = $BackupType
            Database = $DB_NAME
            Host = $DB_HOST
            Port = $DB_PORT
            Timestamp = $timestamp
            FileName = Split-Path $backupFile -Leaf
            FileSizeMB = $fileSizeMB
            Compressed = $Compress
        }
        
        $metadataFile = "$BackupDir\${backupFileName}_metadata.json"
        $metadata | ConvertTo-Json -Depth 2 | Out-File -FilePath $metadataFile -Encoding UTF8
        
        Write-Host "Metadata saved: $metadataFile" -ForegroundColor Green
        
        # Clean up old backups (keep last 10 backups of same type)
        Write-Host "Cleaning up old backups..." -ForegroundColor Yellow
        $oldBackups = Get-ChildItem -Path $BackupDir -Filter "*_${Environment}_${BackupType}_*" | 
                     Sort-Object LastWriteTime -Descending | 
                     Select-Object -Skip 10
        
        foreach ($oldBackup in $oldBackups) {
            Remove-Item $oldBackup.FullName -Force
            Write-Host "Removed old backup: $($oldBackup.Name)" -ForegroundColor Gray
        }
        
    } else {
        Write-Error "Backup failed with exit code: $LASTEXITCODE"
        exit 1
    }
    
} catch {
    Write-Error "Backup failed with error: $($_.Exception.Message)"
    exit 1
} finally {
    # Clean up environment variable
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "Backup process completed." -ForegroundColor Green