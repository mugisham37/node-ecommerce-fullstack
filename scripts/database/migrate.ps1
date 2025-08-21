#!/usr/bin/env pwsh
# Database Migration Management Script - Handles Drizzle ORM migrations
param(
    [string]$Action = "migrate",
    [string]$Environment = "development",
    [string]$MigrationName = "",
    [switch]$DryRun = $false,
    [switch]$Force = $false,
    [switch]$Rollback = $false,
    [int]$RollbackSteps = 1
)

# Configuration
$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogFile = "logs/migration-$Timestamp.log"
$MigrationsDir = "packages/database/migrations"
$SchemaDir = "packages/database/src/schema"

# Environment configuration
$DatabaseConfigs = @{
    development = @{
        Host = "localhost"
        Port = "5432"
        Database = "inventory_dev"
        Username = "postgres"
        ConnectionString = "postgresql://postgres:password@localhost:5432/inventory_dev"
    }
    staging = @{
        Host = $env:STAGING_DB_HOST
        Port = $env:STAGING_DB_PORT
        Database = $env:STAGING_DB_NAME
        Username = $env:STAGING_DB_USER
        ConnectionString = $env:STAGING_DATABASE_URL
    }
    production = @{
        Host = $env:PROD_DB_HOST
        Port = $env:PROD_DB_PORT
        Database = $env:PROD_DB_NAME
        Username = $env:PROD_DB_USER
        ConnectionString = $env:PROD_DATABASE_URL
    }
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check if Node.js is available
    try {
        $NodeVersion = node --version
        Write-Log "Node.js version: $NodeVersion"
    }
    catch {
        Write-Log "Node.js not found. Please install Node.js." "ERROR"
        exit 1
    }
    
    # Check if npm/yarn is available
    try {
        if (Get-Command yarn -ErrorAction SilentlyContinue) {
            $YarnVersion = yarn --version
            Write-Log "Yarn version: $YarnVersion"
            $script:PackageManager = "yarn"
        }
        else {
            $NpmVersion = npm --version
            Write-Log "npm version: $NpmVersion"
            $script:PackageManager = "npm"
        }
    }
    catch {
        Write-Log "Package manager not found." "ERROR"
        exit 1
    }
    
    # Check if Drizzle CLI is available
    try {
        if ($script:PackageManager -eq "yarn") {
            $DrizzleVersion = yarn drizzle-kit --version 2>$null
        }
        else {
            $DrizzleVersion = npx drizzle-kit --version 2>$null
        }
        Write-Log "Drizzle Kit available"
    }
    catch {
        Write-Log "Drizzle Kit not found. Installing..." "WARNING"
        if ($script:PackageManager -eq "yarn") {
            yarn add -D drizzle-kit
        }
        else {
            npm install -D drizzle-kit
        }
    }
    
    # Create logs directory
    $LogDir = Split-Path $LogFile -Parent
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    # Verify migrations directory exists
    if (-not (Test-Path $MigrationsDir)) {
        New-Item -ItemType Directory -Path $MigrationsDir -Force | Out-Null
        Write-Log "Created migrations directory: $MigrationsDir"
    }
}

function Test-DatabaseConnection {
    param($Config)
    
    Write-Log "Testing database connection..."
    
    try {
        $TestQuery = "SELECT version();"
        $Result = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.Database -t -c $TestQuery 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Database connection successful"
            return $true
        }
        else {
            Write-Log "Database connection failed" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Database connection test failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Initialize-MigrationTable {
    param($Config)
    
    Write-Log "Initializing migration tracking table..."
    
    $CreateTableQuery = @"
CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash TEXT NOT NULL,
    created_at BIGINT NOT NULL
);
"@
    
    try {
        psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.Database -c $CreateTableQuery
        Write-Log "Migration table initialized"
        return $true
    }
    catch {
        Write-Log "Failed to initialize migration table: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Get-PendingMigrations {
    param($Config)
    
    Write-Log "Checking for pending migrations..."
    
    try {
        # Get applied migrations from database
        $AppliedQuery = "SELECT hash FROM __drizzle_migrations ORDER BY created_at;"
        $AppliedMigrations = @()
        
        $Result = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.Database -t -c $AppliedQuery 2>$null
        if ($LASTEXITCODE -eq 0 -and $Result) {
            $AppliedMigrations = $Result.Split("`n") | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }
        }
        
        # Get available migrations from filesystem
        $MigrationFiles = Get-ChildItem -Path $MigrationsDir -Filter "*.sql" | Sort-Object Name
        $PendingMigrations = @()
        
        foreach ($MigrationFile in $MigrationFiles) {
            $MigrationHash = (Get-FileHash $MigrationFile.FullName -Algorithm SHA256).Hash.ToLower()
            
            if ($MigrationHash -notin $AppliedMigrations) {
                $PendingMigrations += @{
                    File = $MigrationFile.FullName
                    Name = $MigrationFile.BaseName
                    Hash = $MigrationHash
                }
            }
        }
        
        Write-Log "Found $($PendingMigrations.Count) pending migration(s)"
        return $PendingMigrations
    }
    catch {
        Write-Log "Failed to check pending migrations: $($_.Exception.Message)" "ERROR"
        return @()
    }
}

function Invoke-Migration {
    param($Config, $Migration)
    
    Write-Log "Applying migration: $($Migration.Name)"
    
    if ($DryRun) {
        Write-Log "[DRY RUN] Would apply migration: $($Migration.Name)" "WARNING"
        return $true
    }
    
    try {
        # Read migration SQL
        $MigrationSQL = Get-Content $Migration.File -Raw
        
        # Start transaction
        $TransactionSQL = @"
BEGIN;

$MigrationSQL

-- Record migration
INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('$($Migration.Hash)', EXTRACT(EPOCH FROM NOW()) * 1000);

COMMIT;
"@
        
        # Apply migration
        $TempFile = [System.IO.Path]::GetTempFileName()
        $TransactionSQL | Out-File -FilePath $TempFile -Encoding UTF8
        
        $Result = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.Database -f $TempFile
        
        Remove-Item $TempFile -Force
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Migration applied successfully: $($Migration.Name)"
            return $true
        }
        else {
            Write-Log "Migration failed: $($Migration.Name)" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Migration execution failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function New-Migration {
    param($MigrationName)
    
    if (-not $MigrationName) {
        Write-Log "Migration name is required for generating new migrations" "ERROR"
        return $false
    }
    
    Write-Log "Generating new migration: $MigrationName"
    
    try {
        # Set environment variable for Drizzle
        $env:DATABASE_URL = $DatabaseConfigs[$Environment].ConnectionString
        
        # Generate migration using Drizzle Kit
        $DrizzleCommand = if ($script:PackageManager -eq "yarn") {
            "yarn drizzle-kit generate:pg --schema=$SchemaDir --out=$MigrationsDir"
        }
        else {
            "npx drizzle-kit generate:pg --schema=$SchemaDir --out=$MigrationsDir"
        }
        
        Write-Log "Executing: $DrizzleCommand"
        
        $Process = Start-Process -FilePath "cmd" -ArgumentList "/c", $DrizzleCommand -Wait -PassThru -NoNewWindow
        
        if ($Process.ExitCode -eq 0) {
            Write-Log "Migration generated successfully"
            
            # List generated files
            $NewMigrations = Get-ChildItem -Path $MigrationsDir -Filter "*.sql" | Sort-Object CreationTime -Descending | Select-Object -First 1
            if ($NewMigrations) {
                Write-Log "Generated migration file: $($NewMigrations.Name)"
            }
            
            return $true
        }
        else {
            Write-Log "Migration generation failed" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Migration generation failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Invoke-Rollback {
    param($Config, $Steps)
    
    Write-Log "Rolling back $Steps migration(s)..."
    
    if ($DryRun) {
        Write-Log "[DRY RUN] Would rollback $Steps migration(s)" "WARNING"
        return $true
    }
    
    try {
        # Get applied migrations
        $AppliedQuery = "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT $Steps;"
        $Result = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.Database -t -c $AppliedQuery
        
        if ($LASTEXITCODE -ne 0 -or -not $Result) {
            Write-Log "No migrations to rollback" "WARNING"
            return $true
        }
        
        $MigrationsToRollback = $Result.Split("`n") | Where-Object { $_.Trim() -ne "" }
        
        foreach ($MigrationHash in $MigrationsToRollback) {
            $Hash = $MigrationHash.Split("|")[0].Trim()
            
            # Find corresponding rollback file
            $MigrationFiles = Get-ChildItem -Path $MigrationsDir -Filter "*.sql"
            $RollbackFile = $null
            
            foreach ($File in $MigrationFiles) {
                $FileHash = (Get-FileHash $File.FullName -Algorithm SHA256).Hash.ToLower()
                if ($FileHash -eq $Hash) {
                    $RollbackFileName = $File.FullName -replace "\.sql$", ".rollback.sql"
                    if (Test-Path $RollbackFileName) {
                        $RollbackFile = $RollbackFileName
                        break
                    }
                }
            }
            
            if ($RollbackFile) {
                Write-Log "Rolling back migration with hash: $Hash"
                
                $RollbackSQL = Get-Content $RollbackFile -Raw
                $TransactionSQL = @"
BEGIN;

$RollbackSQL

-- Remove migration record
DELETE FROM __drizzle_migrations WHERE hash = '$Hash';

COMMIT;
"@
                
                $TempFile = [System.IO.Path]::GetTempFileName()
                $TransactionSQL | Out-File -FilePath $TempFile -Encoding UTF8
                
                $Result = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.Database -f $TempFile
                Remove-Item $TempFile -Force
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Rollback completed for hash: $Hash"
                }
                else {
                    Write-Log "Rollback failed for hash: $Hash" "ERROR"
                    return $false
                }
            }
            else {
                Write-Log "No rollback file found for hash: $Hash" "WARNING"
            }
        }
        
        return $true
    }
    catch {
        Write-Log "Rollback failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Get-MigrationStatus {
    param($Config)
    
    Write-Log "Getting migration status..."
    
    try {
        # Get applied migrations
        $AppliedQuery = @"
SELECT 
    hash,
    TO_TIMESTAMP(created_at / 1000) as applied_at
FROM __drizzle_migrations 
ORDER BY created_at;
"@
        
        Write-Log "Applied Migrations:"
        psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.Database -c $AppliedQuery
        
        # Get pending migrations
        $PendingMigrations = Get-PendingMigrations -Config $Config
        
        if ($PendingMigrations.Count -gt 0) {
            Write-Log "Pending Migrations:"
            foreach ($Migration in $PendingMigrations) {
                Write-Log "  - $($Migration.Name)"
            }
        }
        else {
            Write-Log "No pending migrations"
        }
        
        return $true
    }
    catch {
        Write-Log "Failed to get migration status: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Send-MigrationNotification {
    param($Success, $Action, $Details)
    
    if (-not $env:MIGRATION_WEBHOOK_URL) { return }
    
    $Status = if ($Success) { "SUCCESS" } else { "FAILED" }
    $Color = if ($Success) { "good" } else { "danger" }
    
    $Payload = @{
        text = "Database Migration $Status"
        attachments = @(
            @{
                color = $Color
                fields = @(
                    @{ title = "Environment"; value = $Environment; short = $true }
                    @{ title = "Action"; value = $Action; short = $true }
                    @{ title = "Database"; value = $DatabaseConfigs[$Environment].Database; short = $true }
                    @{ title = "Details"; value = $Details; short = $false }
                )
            }
        )
    }
    
    try {
        $Json = $Payload | ConvertTo-Json -Depth 3
        Invoke-RestMethod -Uri $env:MIGRATION_WEBHOOK_URL -Method Post -Body $Json -ContentType "application/json"
        Write-Log "Notification sent successfully"
    }
    catch {
        Write-Log "Failed to send notification: $($_.Exception.Message)" "WARNING"
    }
}

# Main execution
try {
    Write-Log "=== Database Migration Started ==="
    Write-Log "Action: $Action"
    Write-Log "Environment: $Environment"
    Write-Log "Dry Run: $DryRun"
    
    Test-Prerequisites
    
    $Config = $DatabaseConfigs[$Environment]
    if (-not $Config) {
        Write-Log "Invalid environment: $Environment" "ERROR"
        exit 1
    }
    
    # Test database connection
    if (-not (Test-DatabaseConnection -Config $Config)) {
        exit 1
    }
    
    # Initialize migration table
    if (-not (Initialize-MigrationTable -Config $Config)) {
        exit 1
    }
    
    $Success = $false
    $Details = ""
    
    switch ($Action.ToLower()) {
        "migrate" {
            $PendingMigrations = Get-PendingMigrations -Config $Config
            
            if ($PendingMigrations.Count -eq 0) {
                Write-Log "No pending migrations to apply"
                $Success = $true
                $Details = "No pending migrations"
            }
            else {
                $AppliedCount = 0
                foreach ($Migration in $PendingMigrations) {
                    if (Invoke-Migration -Config $Config -Migration $Migration) {
                        $AppliedCount++
                    }
                    else {
                        break
                    }
                }
                
                $Success = ($AppliedCount -eq $PendingMigrations.Count)
                $Details = "Applied $AppliedCount of $($PendingMigrations.Count) migrations"
                
                if ($Success) {
                    Write-Log "All migrations applied successfully"
                }
                else {
                    Write-Log "Some migrations failed to apply" "ERROR"
                }
            }
        }
        
        "generate" {
            $Success = New-Migration -MigrationName $MigrationName
            $Details = "Generated migration: $MigrationName"
        }
        
        "rollback" {
            $Success = Invoke-Rollback -Config $Config -Steps $RollbackSteps
            $Details = "Rolled back $RollbackSteps migration(s)"
        }
        
        "status" {
            $Success = Get-MigrationStatus -Config $Config
            $Details = "Migration status retrieved"
        }
        
        default {
            Write-Log "Invalid action: $Action" "ERROR"
            Write-Log "Valid actions: migrate, generate, rollback, status" "ERROR"
            exit 1
        }
    }
    
    if ($Success) {
        Write-Log "=== Migration Process Completed Successfully ==="
    }
    else {
        Write-Log "=== Migration Process Failed ===" "ERROR"
        exit 1
    }
    
    Send-MigrationNotification -Success $Success -Action $Action -Details $Details
}
catch {
    Write-Log "Unexpected error: $($_.Exception.Message)" "ERROR"
    Send-MigrationNotification -Success $false -Action $Action -Details "Unexpected error: $($_.Exception.Message)"
    exit 1
}