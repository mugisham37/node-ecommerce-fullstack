#!/usr/bin/env pwsh
# Database Backup Script - Automated backup system for PostgreSQL
param(
    [string]$Environment = "development",
    [string]$BackupType = "full",
    [switch]$Compress = $true,
    [switch]$Upload = $false,
    [string]$RetentionDays = "30"
)

# Configuration
$ErrorActionPreference = "Stop"
$BackupDir = "backups/database"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogFile = "logs/backup-$Timestamp.log"

# Database configuration based on environment
$DatabaseConfigs = @{
    development = @{
        Host = "localhost"
        Port = "5432"
        Database = "inventory_dev"
        Username = "postgres"
    }
    staging = @{
        Host = $env:STAGING_DB_HOST
        Port = $env:STAGING_DB_PORT
        Database = $env:STAGING_DB_NAME
        Username = $env:STAGING_DB_USER
    }
    production = @{
        Host = $env:PROD_DB_HOST
        Port = $env:PROD_DB_PORT
        Database = $env:PROD_DB_NAME
        Username = $env:PROD_DB_USER
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
    
    # Check if pg_dump is available
    try {
        $null = Get-Command pg_dump -ErrorAction Stop
        Write-Log "pg_dump found"
    }
    catch {
        Write-Log "pg_dump not found. Please install PostgreSQL client tools." "ERROR"
        exit 1
    }
    
    # Create backup directory
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        Write-Log "Created backup directory: $BackupDir"
    }
    
    # Create logs directory
    $LogDir = Split-Path $LogFile -Parent
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
}

function Get-DatabaseSize {
    param($Config)
    
    try {
        $Query = "SELECT pg_size_pretty(pg_database_size('$($Config.Database)')) as size;"
        $Size = psql -h $Config.Host -p $Config.Port -U $Config.Username -d $Config.Database -t -c $Query
        return $Size.Trim()
    }
    catch {
        return "Unknown"
    }
}

function Invoke-DatabaseBackup {
    param($Config, $BackupFile)
    
    Write-Log "Starting $BackupType backup for $($Config.Database)..."
    Write-Log "Database size: $(Get-DatabaseSize $Config)"
    
    $StartTime = Get-Date
    
    try {
        switch ($BackupType.ToLower()) {
            "full" {
                $Args = @(
                    "-h", $Config.Host,
                    "-p", $Config.Port,
                    "-U", $Config.Username,
                    "-d", $Config.Database,
                    "--verbose",
                    "--no-password",
                    "--format=custom",
                    "--file=$BackupFile"
                )
            }
            "schema" {
                $Args = @(
                    "-h", $Config.Host,
                    "-p", $Config.Port,
                    "-U", $Config.Username,
                    "-d", $Config.Database,
                    "--verbose",
                    "--no-password",
                    "--schema-only",
                    "--format=custom",
                    "--file=$BackupFile"
                )
            }
            "data" {
                $Args = @(
                    "-h", $Config.Host,
                    "-p", $Config.Port,
                    "-U", $Config.Username,
                    "-d", $Config.Database,
                    "--verbose",
                    "--no-password",
                    "--data-only",
                    "--format=custom",
                    "--file=$BackupFile"
                )
            }
        }
        
        $Process = Start-Process -FilePath "pg_dump" -ArgumentList $Args -Wait -PassThru -NoNewWindow
        
        if ($Process.ExitCode -eq 0) {
            $Duration = (Get-Date) - $StartTime
            $BackupSize = (Get-Item $BackupFile).Length / 1MB
            Write-Log "Backup completed successfully in $($Duration.TotalMinutes.ToString('F2')) minutes"
            Write-Log "Backup file size: $($BackupSize.ToString('F2')) MB"
            return $true
        }
        else {
            Write-Log "Backup failed with exit code: $($Process.ExitCode)" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Backup failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Compress-BackupFile {
    param($BackupFile)
    
    if (-not $Compress) { return $BackupFile }
    
    Write-Log "Compressing backup file..."
    
    try {
        $CompressedFile = "$BackupFile.gz"
        
        # Use 7-Zip if available, otherwise use PowerShell compression
        if (Get-Command 7z -ErrorAction SilentlyContinue) {
            $Process = Start-Process -FilePath "7z" -ArgumentList @("a", "-tgzip", $CompressedFile, $BackupFile) -Wait -PassThru -NoNewWindow
            if ($Process.ExitCode -eq 0) {
                Remove-Item $BackupFile -Force
                $OriginalSize = (Get-Item $CompressedFile).Length
                Write-Log "Compression completed. Compressed file: $CompressedFile"
                return $CompressedFile
            }
        }
        else {
            # Fallback to PowerShell compression (slower but available)
            Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip" -Force
            Remove-Item $BackupFile -Force
            Write-Log "Compression completed using PowerShell. Compressed file: $BackupFile.zip"
            return "$BackupFile.zip"
        }
    }
    catch {
        Write-Log "Compression failed: $($_.Exception.Message)" "WARNING"
        return $BackupFile
    }
}

function Upload-BackupToCloud {
    param($BackupFile)
    
    if (-not $Upload) { return }
    
    Write-Log "Uploading backup to cloud storage..."
    
    # AWS S3 upload (if configured)
    if ($env:AWS_BACKUP_BUCKET) {
        try {
            $S3Key = "database-backups/$Environment/$(Split-Path $BackupFile -Leaf)"
            aws s3 cp $BackupFile "s3://$($env:AWS_BACKUP_BUCKET)/$S3Key" --storage-class STANDARD_IA
            Write-Log "Backup uploaded to S3: s3://$($env:AWS_BACKUP_BUCKET)/$S3Key"
        }
        catch {
            Write-Log "S3 upload failed: $($_.Exception.Message)" "WARNING"
        }
    }
    
    # Azure Blob Storage upload (if configured)
    if ($env:AZURE_STORAGE_ACCOUNT -and $env:AZURE_STORAGE_KEY) {
        try {
            $BlobName = "database-backups/$Environment/$(Split-Path $BackupFile -Leaf)"
            az storage blob upload --account-name $env:AZURE_STORAGE_ACCOUNT --account-key $env:AZURE_STORAGE_KEY --container-name backups --name $BlobName --file $BackupFile --tier Cool
            Write-Log "Backup uploaded to Azure Blob Storage: $BlobName"
        }
        catch {
            Write-Log "Azure upload failed: $($_.Exception.Message)" "WARNING"
        }
    }
}

function Remove-OldBackups {
    Write-Log "Cleaning up old backups (retention: $RetentionDays days)..."
    
    try {
        $CutoffDate = (Get-Date).AddDays(-[int]$RetentionDays)
        $OldBackups = Get-ChildItem -Path $BackupDir -File | Where-Object { $_.CreationTime -lt $CutoffDate }
        
        foreach ($OldBackup in $OldBackups) {
            Remove-Item $OldBackup.FullName -Force
            Write-Log "Removed old backup: $($OldBackup.Name)"
        }
        
        Write-Log "Cleanup completed. Removed $($OldBackups.Count) old backup(s)"
    }
    catch {
        Write-Log "Cleanup failed: $($_.Exception.Message)" "WARNING"
    }
}

function Send-BackupNotification {
    param($Success, $BackupFile, $Duration)
    
    if (-not $env:BACKUP_WEBHOOK_URL) { return }
    
    $Status = if ($Success) { "SUCCESS" } else { "FAILED" }
    $Color = if ($Success) { "good" } else { "danger" }
    
    $Payload = @{
        text = "Database Backup $Status"
        attachments = @(
            @{
                color = $Color
                fields = @(
                    @{ title = "Environment"; value = $Environment; short = $true }
                    @{ title = "Database"; value = $DatabaseConfigs[$Environment].Database; short = $true }
                    @{ title = "Backup Type"; value = $BackupType; short = $true }
                    @{ title = "Duration"; value = "$($Duration.TotalMinutes.ToString('F2')) minutes"; short = $true }
                )
            }
        )
    }
    
    if ($Success -and $BackupFile) {
        $FileSize = (Get-Item $BackupFile).Length / 1MB
        $Payload.attachments[0].fields += @{ title = "File Size"; value = "$($FileSize.ToString('F2')) MB"; short = $true }
    }
    
    try {
        $Json = $Payload | ConvertTo-Json -Depth 3
        Invoke-RestMethod -Uri $env:BACKUP_WEBHOOK_URL -Method Post -Body $Json -ContentType "application/json"
        Write-Log "Notification sent successfully"
    }
    catch {
        Write-Log "Failed to send notification: $($_.Exception.Message)" "WARNING"
    }
}

# Main execution
try {
    Write-Log "=== Database Backup Started ==="
    Write-Log "Environment: $Environment"
    Write-Log "Backup Type: $BackupType"
    Write-Log "Compression: $Compress"
    Write-Log "Upload: $Upload"
    
    Test-Prerequisites
    
    $Config = $DatabaseConfigs[$Environment]
    if (-not $Config) {
        Write-Log "Invalid environment: $Environment" "ERROR"
        exit 1
    }
    
    $BackupFileName = "$($Config.Database)_$($Environment)_$($BackupType)_$Timestamp.backup"
    $BackupFile = Join-Path $BackupDir $BackupFileName
    
    $StartTime = Get-Date
    $Success = Invoke-DatabaseBackup -Config $Config -BackupFile $BackupFile
    $Duration = (Get-Date) - $StartTime
    
    if ($Success) {
        $FinalBackupFile = Compress-BackupFile -BackupFile $BackupFile
        Upload-BackupToCloud -BackupFile $FinalBackupFile
        Remove-OldBackups
        
        Write-Log "=== Backup Process Completed Successfully ==="
        Write-Log "Final backup file: $FinalBackupFile"
    }
    else {
        Write-Log "=== Backup Process Failed ===" "ERROR"
        exit 1
    }
    
    Send-BackupNotification -Success $Success -BackupFile $FinalBackupFile -Duration $Duration
}
catch {
    Write-Log "Unexpected error: $($_.Exception.Message)" "ERROR"
    Send-BackupNotification -Success $false -BackupFile $null -Duration $Duration
    exit 1
}