# Database Restore Script for PostgreSQL
# Usage: .\restore.ps1 -BackupFile "path\to\backup.sql" [-Environment dev|staging|prod] [-Force]

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateDatabase = $false
)

# Validate backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file not found: $BackupFile"
    exit 1
}

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

# Safety check for production environment
if ($Environment -eq "prod" -and -not $Force) {
    Write-Warning "You are about to restore to PRODUCTION environment!"
    Write-Warning "Database: $DB_NAME on $DB_HOST:$DB_PORT"
    Write-Warning "This will OVERWRITE all existing data!"
    
    $confirmation = Read-Host "Type 'RESTORE-PRODUCTION' to confirm"
    if ($confirmation -ne "RESTORE-PRODUCTION") {
        Write-Host "Restore cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $DB_PASSWORD

try {
    Write-Host "Starting database restore for $Environment environment..." -ForegroundColor Yellow
    Write-Host "Database: $DB_NAME on $DB_HOST:$DB_PORT" -ForegroundColor Cyan
    Write-Host "Backup file: $BackupFile" -ForegroundColor Cyan
    
    # Check if backup file is compressed (custom format)
    $isCompressed = $BackupFile.EndsWith(".backup")
    
    # Test database connection
    Write-Host "Testing database connection..." -ForegroundColor Yellow
    $testConnection = & psql --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=postgres --command="SELECT 1;" --quiet --tuples-only 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Cannot connect to database server. Please check connection parameters."
        exit 1
    }
    
    Write-Host "Database connection successful." -ForegroundColor Green
    
    # Create database if requested
    if ($CreateDatabase) {
        Write-Host "Creating database: $DB_NAME" -ForegroundColor Yellow
        & psql --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=postgres --command="CREATE DATABASE `"$DB_NAME`";" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database created successfully." -ForegroundColor Green
        } else {
            Write-Warning "Database creation failed or database already exists."
        }
    }
    
    # Check if target database exists
    $dbExists = & psql --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=postgres --command="SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" --quiet --tuples-only 2>$null
    
    if (-not $dbExists -or $dbExists.Trim() -ne "1") {
        Write-Error "Target database '$DB_NAME' does not exist. Use -CreateDatabase flag to create it."
        exit 1
    }
    
    # Create a backup of current database before restore (if not dev environment)
    if ($Environment -ne "dev") {
        Write-Host "Creating backup of current database before restore..." -ForegroundColor Yellow
        $preRestoreBackup = ".\backups\pre_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss').backup"
        
        # Ensure backup directory exists
        $backupDir = Split-Path $preRestoreBackup -Parent
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }
        
        & pg_dump --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=$DB_NAME --format=custom --file=$preRestoreBackup --verbose --no-password
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Pre-restore backup created: $preRestoreBackup" -ForegroundColor Green
        } else {
            Write-Warning "Failed to create pre-restore backup. Continuing with restore..."
        }
    }
    
    # Perform the restore
    Write-Host "Starting database restore..." -ForegroundColor Yellow
    
    if ($isCompressed) {
        # Use pg_restore for custom format backups
        $restoreArgs = @(
            "--host=$DB_HOST",
            "--port=$DB_PORT",
            "--username=$DB_USER",
            "--dbname=$DB_NAME",
            "--verbose",
            "--clean",
            "--if-exists",
            "--no-password",
            $BackupFile
        )
        
        Write-Host "Executing: pg_restore $($restoreArgs -join ' ')" -ForegroundColor Gray
        & pg_restore @restoreArgs
        
    } else {
        # Use psql for SQL format backups
        $restoreArgs = @(
            "--host=$DB_HOST",
            "--port=$DB_PORT",
            "--username=$DB_USER",
            "--dbname=$DB_NAME",
            "--file=$BackupFile",
            "--quiet"
        )
        
        Write-Host "Executing: psql $($restoreArgs -join ' ')" -ForegroundColor Gray
        & psql @restoreArgs
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database restore completed successfully!" -ForegroundColor Green
        
        # Verify restore by checking table count
        Write-Host "Verifying restore..." -ForegroundColor Yellow
        $tableCount = & psql --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=$DB_NAME --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" --quiet --tuples-only 2>$null
        
        if ($tableCount -and $tableCount.Trim() -gt 0) {
            Write-Host "Verification successful. Found $($tableCount.Trim()) tables in the database." -ForegroundColor Green
        } else {
            Write-Warning "Verification failed or no tables found in the database."
        }
        
        # Update database statistics
        Write-Host "Updating database statistics..." -ForegroundColor Yellow
        & psql --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=$DB_NAME --command="ANALYZE;" --quiet 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database statistics updated." -ForegroundColor Green
        }
        
    } else {
        Write-Error "Database restore failed with exit code: $LASTEXITCODE"
        
        if ($Environment -ne "dev" -and (Test-Path $preRestoreBackup)) {
            Write-Host "You can restore the pre-restore backup using:" -ForegroundColor Yellow
            Write-Host ".\restore.ps1 -BackupFile `"$preRestoreBackup`" -Environment $Environment -Force" -ForegroundColor Yellow
        }
        
        exit 1
    }
    
} catch {
    Write-Error "Restore failed with error: $($_.Exception.Message)"
    exit 1
} finally {
    # Clean up environment variable
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "Restore process completed." -ForegroundColor Green