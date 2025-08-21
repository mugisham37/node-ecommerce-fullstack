#!/usr/bin/env pwsh
# Database Restore Script - Recovery procedures for PostgreSQL
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$Environment = "development",
    [string]$TargetDatabase = "",
    [switch]$CreateDatabase = $false,
    [switch]$DropExisting = $false,
    [switch]$DataOnly = $false,
    [switch]$SchemaOnly = $false,
    [switch]$Verbose = $false
)

# Configuration
$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogFile = "logs/restore-$Timestamp.log"

# Database configuration based on environment
$DatabaseConfigs = @{
    development = @{
        Host = "localhost"
        Port = "5432"
        Database = "inventory_dev"
        Username = "postgres"
        AdminDatabase = "postgres"
    }
    staging = @{
        Host = $env:STAGING_DB_HOST
        Port = $env:STAGING_DB_PORT
        Database = $env:STAGING_DB_NAME
        Username = $env:STAGING_DB_USER
        AdminDatabase = "postgres"
    }
    production = @{
        Host = $env:PROD_DB_HOST
        Port = $env:PROD_DB_PORT
        Database = $env:PROD_DB_NAME
        Username = $env:PROD_DB_USER
        AdminDatabase = "postgres"
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
    
    # Check if pg_restore is available
    try {
        $null = Get-Command pg_restore -ErrorAction Stop
        Write-Log "pg_restore found"
    }
    catch {
        Write-Log "pg_restore not found. Please install PostgreSQL client tools." "ERROR"
        exit 1
    }
    
    # Check if psql is available
    try {
        $null = Get-Command psql -ErrorAction Stop
        Write-Log "psql found"
    }
    catch {
        Write-Log "psql not found. Please install PostgreSQL client tools." "ERROR"
        exit 1
    }
    
    # Create logs directory
    $LogDir = Split-Path $LogFile -Parent
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    # Verify backup file exists
    if (-not (Test-Path $BackupFile)) {
        Write-Log "Backup file not found: $BackupFile" "ERROR"
        exit 1
    }
    
    Write-Log "Backup file found: $BackupFile"
    $BackupSize = (Get-Item $BackupFile).Length / 1MB
    Write-Log "Backup file size: $($BackupSize.ToString('F2')) MB"
}

function Test-DatabaseConnection {
    param($Config)
    
    Write-Log "Testing database connection..."
    
    try {
        $TestQuery = "SELECT version();"
        $Result = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.AdminDatabase -t -c $TestQuery 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Database connection successful"
            Write-Log "PostgreSQL version: $($Result.Trim())"
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

function Test-DatabaseExists {
    param($Config, $DatabaseName)
    
    try {
        $Query = "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';"
        $Result = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.AdminDatabase -t -c $Query 2>$null
        
        return ($Result.Trim() -eq "1")
    }
    catch {
        return $false
    }
}

function New-Database {
    param($Config, $DatabaseName)
    
    Write-Log "Creating database: $DatabaseName"
    
    try {
        $Query = "CREATE DATABASE `"$DatabaseName`" WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';"
        $Result = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.AdminDatabase -c $Query
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Database created successfully: $DatabaseName"
            return $true
        }
        else {
            Write-Log "Failed to create database: $DatabaseName" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Database creation failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Remove-Database {
    param($Config, $DatabaseName)
    
    Write-Log "Dropping existing database: $DatabaseName" "WARNING"
    
    # Terminate active connections
    try {
        $TerminateQuery = @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DatabaseName' AND pid <> pg_backend_pid();
"@
        psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.AdminDatabase -c $TerminateQuery | Out-Null
        Write-Log "Terminated active connections to database: $DatabaseName"
    }
    catch {
        Write-Log "Warning: Could not terminate all connections" "WARNING"
    }
    
    try {
        $Query = "DROP DATABASE IF EXISTS `"$DatabaseName`";"
        $Result = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.AdminDatabase -c $Query
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Database dropped successfully: $DatabaseName"
            return $true
        }
        else {
            Write-Log "Failed to drop database: $DatabaseName" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Database drop failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Get-BackupInfo {
    param($BackupFile)
    
    Write-Log "Analyzing backup file..."
    
    try {
        # Extract compressed backup if needed
        $WorkingBackupFile = $BackupFile
        
        if ($BackupFile.EndsWith(".gz")) {
            Write-Log "Extracting compressed backup..."
            $ExtractedFile = $BackupFile -replace "\.gz$", ""
            
            if (Get-Command 7z -ErrorAction SilentlyContinue) {
                $Process = Start-Process -FilePath "7z" -ArgumentList @("e", $BackupFile, "-o$(Split-Path $ExtractedFile -Parent)", "-y") -Wait -PassThru -NoNewWindow
                if ($Process.ExitCode -eq 0) {
                    $WorkingBackupFile = $ExtractedFile
                    Write-Log "Backup extracted successfully"
                }
            }
            else {
                Write-Log "7-Zip not found. Cannot extract compressed backup." "ERROR"
                exit 1
            }
        }
        elseif ($BackupFile.EndsWith(".zip")) {
            Write-Log "Extracting ZIP backup..."
            $ExtractPath = Split-Path $BackupFile -Parent
            Expand-Archive -Path $BackupFile -DestinationPath $ExtractPath -Force
            $WorkingBackupFile = Get-ChildItem -Path $ExtractPath -Filter "*.backup" | Select-Object -First 1 -ExpandProperty FullName
        }
        
        # Get backup information using pg_restore --list
        $ListOutput = pg_restore --list $WorkingBackupFile 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            $TableCount = ($ListOutput | Where-Object { $_ -match "TABLE DATA" }).Count
            $SchemaObjects = ($ListOutput | Where-Object { $_ -match "(TABLE|INDEX|CONSTRAINT|SEQUENCE)" }).Count
            
            Write-Log "Backup analysis complete:"
            Write-Log "  - Tables with data: $TableCount"
            Write-Log "  - Schema objects: $SchemaObjects"
        }
        
        return $WorkingBackupFile
    }
    catch {
        Write-Log "Backup analysis failed: $($_.Exception.Message)" "WARNING"
        return $BackupFile
    }
}

function Invoke-DatabaseRestore {
    param($Config, $BackupFile, $DatabaseName)
    
    Write-Log "Starting database restore..."
    Write-Log "Target database: $DatabaseName"
    
    $StartTime = Get-Date
    
    try {
        $Args = @(
            "-h", $Config.Host,
            "-p", $Config.Port,
            "-U", $Config.Username,
            "-d", $DatabaseName,
            "--no-password"
        )
        
        if ($Verbose) {
            $Args += "--verbose"
        }
        
        if ($DataOnly) {
            $Args += "--data-only"
            Write-Log "Restoring data only"
        }
        elseif ($SchemaOnly) {
            $Args += "--schema-only"
            Write-Log "Restoring schema only"
        }
        else {
            Write-Log "Restoring full backup (schema + data)"
        }
        
        # Add cleanup options
        $Args += @("--clean", "--if-exists")
        
        # Add the backup file
        $Args += $BackupFile
        
        Write-Log "Executing pg_restore with arguments: $($Args -join ' ')"
        
        $Process = Start-Process -FilePath "pg_restore" -ArgumentList $Args -Wait -PassThru -NoNewWindow
        
        $Duration = (Get-Date) - $StartTime
        
        if ($Process.ExitCode -eq 0) {
            Write-Log "Restore completed successfully in $($Duration.TotalMinutes.ToString('F2')) minutes"
            return $true
        }
        else {
            Write-Log "Restore failed with exit code: $($Process.ExitCode)" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Restore failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Test-RestoreIntegrity {
    param($Config, $DatabaseName)
    
    Write-Log "Performing post-restore integrity checks..."
    
    try {
        # Check table counts
        $TableCountQuery = @"
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;
"@
        
        $TableStats = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $DatabaseName -c $TableCountQuery
        Write-Log "Table statistics retrieved"
        
        # Check for foreign key violations
        $FKCheckQuery = @"
DO $$
DECLARE
    r RECORD;
    violations INTEGER := 0;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE contype = 'f'
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ONLY ' || r.table_name || ' WHERE NOT EXISTS (SELECT 1 FROM ' || 
                (SELECT confrelid::regclass FROM pg_constraint WHERE conname = r.conname) || 
                ' WHERE ' || array_to_string(ARRAY(
                    SELECT a.attname || ' = ' || af.attname
                    FROM pg_attribute a
                    JOIN pg_constraint c ON c.conrelid = a.attrelid
                    JOIN pg_attribute af ON af.attrelid = c.confrelid
                    WHERE c.conname = r.conname
                    AND a.attnum = ANY(c.conkey)
                    AND af.attnum = ANY(c.confkey)
                ), ' AND ') || ')' INTO violations;
        
        IF violations > 0 THEN
            RAISE NOTICE 'Foreign key violation in %: % rows', r.table_name, violations;
        END IF;
    END LOOP;
END $$;
"@
        
        psql -h $Config.Host -p $Config.Port -U $Config.Username -d $DatabaseName -c $FKCheckQuery
        Write-Log "Foreign key integrity check completed"
        
        # Check database size
        $SizeQuery = "SELECT pg_size_pretty(pg_database_size('$DatabaseName')) as size;"
        $DatabaseSize = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $DatabaseName -t -c $SizeQuery
        Write-Log "Restored database size: $($DatabaseSize.Trim())"
        
        return $true
    }
    catch {
        Write-Log "Integrity check failed: $($_.Exception.Message)" "WARNING"
        return $false
    }
}

function Send-RestoreNotification {
    param($Success, $DatabaseName, $Duration)
    
    if (-not $env:RESTORE_WEBHOOK_URL) { return }
    
    $Status = if ($Success) { "SUCCESS" } else { "FAILED" }
    $Color = if ($Success) { "good" } else { "danger" }
    
    $Payload = @{
        text = "Database Restore $Status"
        attachments = @(
            @{
                color = $Color
                fields = @(
                    @{ title = "Environment"; value = $Environment; short = $true }
                    @{ title = "Database"; value = $DatabaseName; short = $true }
                    @{ title = "Backup File"; value = (Split-Path $BackupFile -Leaf); short = $true }
                    @{ title = "Duration"; value = "$($Duration.TotalMinutes.ToString('F2')) minutes"; short = $true }
                )
            }
        )
    }
    
    try {
        $Json = $Payload | ConvertTo-Json -Depth 3
        Invoke-RestMethod -Uri $env:RESTORE_WEBHOOK_URL -Method Post -Body $Json -ContentType "application/json"
        Write-Log "Notification sent successfully"
    }
    catch {
        Write-Log "Failed to send notification: $($_.Exception.Message)" "WARNING"
    }
}

# Main execution
try {
    Write-Log "=== Database Restore Started ==="
    Write-Log "Environment: $Environment"
    Write-Log "Backup File: $BackupFile"
    Write-Log "Target Database: $TargetDatabase"
    Write-Log "Create Database: $CreateDatabase"
    Write-Log "Drop Existing: $DropExisting"
    
    Test-Prerequisites
    
    $Config = $DatabaseConfigs[$Environment]
    if (-not $Config) {
        Write-Log "Invalid environment: $Environment" "ERROR"
        exit 1
    }
    
    # Determine target database name
    $DatabaseName = if ($TargetDatabase) { $TargetDatabase } else { $Config.Database }
    
    # Test database connection
    if (-not (Test-DatabaseConnection -Config $Config)) {
        exit 1
    }
    
    # Analyze backup file
    $WorkingBackupFile = Get-BackupInfo -BackupFile $BackupFile
    
    # Handle database creation/dropping
    $DatabaseExists = Test-DatabaseExists -Config $Config -DatabaseName $DatabaseName
    
    if ($DatabaseExists -and $DropExisting) {
        if (-not (Remove-Database -Config $Config -DatabaseName $DatabaseName)) {
            exit 1
        }
        $DatabaseExists = $false
    }
    
    if (-not $DatabaseExists -and $CreateDatabase) {
        if (-not (New-Database -Config $Config -DatabaseName $DatabaseName)) {
            exit 1
        }
    }
    elseif (-not $DatabaseExists) {
        Write-Log "Target database does not exist: $DatabaseName" "ERROR"
        Write-Log "Use -CreateDatabase switch to create it automatically" "ERROR"
        exit 1
    }
    
    # Perform the restore
    $StartTime = Get-Date
    $Success = Invoke-DatabaseRestore -Config $Config -BackupFile $WorkingBackupFile -DatabaseName $DatabaseName
    $Duration = (Get-Date) - $StartTime
    
    if ($Success) {
        # Perform integrity checks
        Test-RestoreIntegrity -Config $Config -DatabaseName $DatabaseName
        
        Write-Log "=== Restore Process Completed Successfully ==="
        Write-Log "Database: $DatabaseName"
        Write-Log "Duration: $($Duration.TotalMinutes.ToString('F2')) minutes"
    }
    else {
        Write-Log "=== Restore Process Failed ===" "ERROR"
        exit 1
    }
    
    # Clean up extracted files if needed
    if ($WorkingBackupFile -ne $BackupFile -and (Test-Path $WorkingBackupFile)) {
        Remove-Item $WorkingBackupFile -Force
        Write-Log "Cleaned up extracted backup file"
    }
    
    Send-RestoreNotification -Success $Success -DatabaseName $DatabaseName -Duration $Duration
}
catch {
    Write-Log "Unexpected error: $($_.Exception.Message)" "ERROR"
    Send-RestoreNotification -Success $false -DatabaseName $DatabaseName -Duration $Duration
    exit 1
}