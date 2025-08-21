#!/usr/bin/env pwsh
# PostgreSQL Replication Setup Script - Master-Slave replication configuration
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("master", "slave", "promote")]
    [string]$Role,
    [string]$MasterHost = "",
    [string]$MasterPort = "5432",
    [string]$ReplicationUser = "replicator",
    [string]$ReplicationPassword = "",
    [string]$SlaveDataDir = "/var/lib/postgresql/slave",
    [switch]$Force = $false,
    [switch]$DryRun = $false
)

# Configuration
$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogFile = "logs/replication-setup-$Timestamp.log"

# Default PostgreSQL configuration
$PostgreSQLConfig = @{
    DataDir = "/var/lib/postgresql/data"
    ConfigFile = "/var/lib/postgresql/data/postgresql.conf"
    HbaFile = "/var/lib/postgresql/data/pg_hba.conf"
    Port = "5432"
    Username = "postgres"
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check if PostgreSQL is installed
    try {
        $PostgreSQLVersion = psql --version
        Write-Log "PostgreSQL found: $PostgreSQLVersion"
    }
    catch {
        Write-Log "PostgreSQL not found. Please install PostgreSQL." "ERROR"
        exit 1
    }
    
    # Check if pg_basebackup is available
    try {
        $null = Get-Command pg_basebackup -ErrorAction Stop
        Write-Log "pg_basebackup found"
    }
    catch {
        Write-Log "pg_basebackup not found. Please install PostgreSQL client tools." "ERROR"
        exit 1
    }
    
    # Create logs directory
    $LogDir = Split-Path $LogFile -Parent
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
}

function Test-PostgreSQLRunning {
    Write-Log "Checking if PostgreSQL is running..."
    
    try {
        $TestQuery = "SELECT version();"
        $Result = psql -h localhost -p $PostgreSQLConfig.Port -U $PostgreSQLConfig.Username -d postgres -t -c $TestQuery 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "PostgreSQL is running"
            return $true
        }
        else {
            Write-Log "PostgreSQL is not running or not accessible" "WARNING"
            return $false
        }
    }
    catch {
        Write-Log "Failed to connect to PostgreSQL: $($_.Exception.Message)" "WARNING"
        return $false
    }
}

function Stop-PostgreSQL {
    Write-Log "Stopping PostgreSQL service..."
    
    if ($DryRun) {
        Write-Log "[DRY RUN] Would stop PostgreSQL service" "WARNING"
        return $true
    }
    
    try {
        # Try systemctl first (Linux)
        if (Get-Command systemctl -ErrorAction SilentlyContinue) {
            systemctl stop postgresql
            Write-Log "PostgreSQL stopped using systemctl"
            return $true
        }
        
        # Try service command (Linux)
        if (Get-Command service -ErrorAction SilentlyContinue) {
            service postgresql stop
            Write-Log "PostgreSQL stopped using service command"
            return $true
        }
        
        # Try pg_ctl (cross-platform)
        if (Get-Command pg_ctl -ErrorAction SilentlyContinue) {
            pg_ctl -D $PostgreSQLConfig.DataDir stop -m fast
            Write-Log "PostgreSQL stopped using pg_ctl"
            return $true
        }
        
        Write-Log "Could not determine how to stop PostgreSQL" "ERROR"
        return $false
    }
    catch {
        Write-Log "Failed to stop PostgreSQL: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Start-PostgreSQL {
    param([string]$DataDirectory = $PostgreSQLConfig.DataDir)
    
    Write-Log "Starting PostgreSQL service..."
    
    if ($DryRun) {
        Write-Log "[DRY RUN] Would start PostgreSQL service with data directory: $DataDirectory" "WARNING"
        return $true
    }
    
    try {
        # Try systemctl first (Linux)
        if (Get-Command systemctl -ErrorAction SilentlyContinue) {
            systemctl start postgresql
            Write-Log "PostgreSQL started using systemctl"
            Start-Sleep -Seconds 5  # Wait for startup
            return $true
        }
        
        # Try service command (Linux)
        if (Get-Command service -ErrorAction SilentlyContinue) {
            service postgresql start
            Write-Log "PostgreSQL started using service command"
            Start-Sleep -Seconds 5
            return $true
        }
        
        # Try pg_ctl (cross-platform)
        if (Get-Command pg_ctl -ErrorAction SilentlyContinue) {
            pg_ctl -D $DataDirectory start -l "$DataDirectory/postgresql.log"
            Write-Log "PostgreSQL started using pg_ctl"
            Start-Sleep -Seconds 5
            return $true
        }
        
        Write-Log "Could not determine how to start PostgreSQL" "ERROR"
        return $false
    }
    catch {
        Write-Log "Failed to start PostgreSQL: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Setup-MasterReplication {
    Write-Log "Setting up master server for replication..."
    
    # Create replication user
    Write-Log "Creating replication user: $ReplicationUser"
    
    if (-not $DryRun) {
        $CreateUserSQL = @"
DO `$`$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$ReplicationUser') THEN
        CREATE ROLE $ReplicationUser WITH REPLICATION LOGIN PASSWORD '$ReplicationPassword';
    END IF;
END
`$`$;
"@
        
        try {
            psql -h localhost -p $PostgreSQLConfig.Port -U $PostgreSQLConfig.Username -d postgres -c $CreateUserSQL
            Write-Log "Replication user created successfully"
        }
        catch {
            Write-Log "Failed to create replication user: $($_.Exception.Message)" "ERROR"
            return $false
        }
    }
    
    # Update postgresql.conf for replication
    Write-Log "Updating postgresql.conf for replication..."
    
    $ReplicationSettings = @"

# Replication settings added by setup script
wal_level = replica
max_wal_senders = 5
max_replication_slots = 5
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f'
hot_standby = on
"@
    
    if (-not $DryRun) {
        try {
            # Create archive directory
            $ArchiveDir = "/var/lib/postgresql/archive"
            if (-not (Test-Path $ArchiveDir)) {
                New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
                Write-Log "Created archive directory: $ArchiveDir"
            }
            
            # Append replication settings to postgresql.conf
            Add-Content -Path $PostgreSQLConfig.ConfigFile -Value $ReplicationSettings
            Write-Log "Updated postgresql.conf with replication settings"
        }
        catch {
            Write-Log "Failed to update postgresql.conf: $($_.Exception.Message)" "ERROR"
            return $false
        }
    }
    
    # Update pg_hba.conf for replication
    Write-Log "Updating pg_hba.conf for replication access..."
    
    $HbaReplicationEntry = "host replication $ReplicationUser 0.0.0.0/0 md5"
    
    if (-not $DryRun) {
        try {
            # Check if entry already exists
            $HbaContent = Get-Content $PostgreSQLConfig.HbaFile
            if ($HbaContent -notcontains $HbaReplicationEntry) {
                Add-Content -Path $PostgreSQLConfig.HbaFile -Value $HbaReplicationEntry
                Write-Log "Added replication entry to pg_hba.conf"
            }
            else {
                Write-Log "Replication entry already exists in pg_hba.conf"
            }
        }
        catch {
            Write-Log "Failed to update pg_hba.conf: $($_.Exception.Message)" "ERROR"
            return $false
        }
    }
    
    Write-Log "Master replication setup completed. PostgreSQL restart required."
    return $true
}

function Setup-SlaveReplication {
    Write-Log "Setting up slave server for replication..."
    
    if (-not $MasterHost) {
        Write-Log "Master host is required for slave setup" "ERROR"
        return $false
    }
    
    if (-not $ReplicationPassword) {
        Write-Log "Replication password is required for slave setup" "ERROR"
        return $false
    }
    
    # Stop PostgreSQL if running
    if (Test-PostgreSQLRunning) {
        if (-not (Stop-PostgreSQL)) {
            return $false
        }
    }
    
    # Backup existing data directory if it exists
    if (Test-Path $SlaveDataDir) {
        if ($Force) {
            Write-Log "Removing existing slave data directory: $SlaveDataDir" "WARNING"
            if (-not $DryRun) {
                Remove-Item -Path $SlaveDataDir -Recurse -Force
            }
        }
        else {
            $BackupDir = "$SlaveDataDir.backup.$Timestamp"
            Write-Log "Backing up existing data directory to: $BackupDir"
            if (-not $DryRun) {
                Move-Item -Path $SlaveDataDir -Destination $BackupDir
            }
        }
    }
    
    # Create base backup from master
    Write-Log "Creating base backup from master: $MasterHost:$MasterPort"
    
    if (-not $DryRun) {
        try {
            $env:PGPASSWORD = $ReplicationPassword
            
            $BaseBackupArgs = @(
                "-h", $MasterHost,
                "-p", $MasterPort,
                "-U", $ReplicationUser,
                "-D", $SlaveDataDir,
                "-P",
                "-W",
                "-R"  # Create recovery.conf automatically
            )
            
            $Process = Start-Process -FilePath "pg_basebackup" -ArgumentList $BaseBackupArgs -Wait -PassThru -NoNewWindow
            
            if ($Process.ExitCode -eq 0) {
                Write-Log "Base backup completed successfully"
            }
            else {
                Write-Log "Base backup failed with exit code: $($Process.ExitCode)" "ERROR"
                return $false
            }
        }
        catch {
            Write-Log "Base backup failed: $($_.Exception.Message)" "ERROR"
            return $false
        }
        finally {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        }
    }
    
    # Create recovery configuration
    Write-Log "Creating recovery configuration..."
    
    $RecoveryConf = @"
standby_mode = 'on'
primary_conninfo = 'host=$MasterHost port=$MasterPort user=$ReplicationUser password=$ReplicationPassword'
recovery_target_timeline = 'latest'
"@
    
    if (-not $DryRun) {
        try {
            $RecoveryFile = Join-Path $SlaveDataDir "recovery.conf"
            $RecoveryConf | Out-File -FilePath $RecoveryFile -Encoding UTF8
            Write-Log "Created recovery.conf"
        }
        catch {
            Write-Log "Failed to create recovery.conf: $($_.Exception.Message)" "ERROR"
            return $false
        }
    }
    
    # Update postgresql.conf for slave
    Write-Log "Updating postgresql.conf for slave configuration..."
    
    $SlaveSettings = @"

# Slave replication settings
hot_standby = on
max_standby_streaming_delay = 30s
max_standby_archive_delay = 30s
wal_receiver_status_interval = 10s
hot_standby_feedback = on
"@
    
    if (-not $DryRun) {
        try {
            $SlaveConfigFile = Join-Path $SlaveDataDir "postgresql.conf"
            Add-Content -Path $SlaveConfigFile -Value $SlaveSettings
            Write-Log "Updated postgresql.conf for slave"
        }
        catch {
            Write-Log "Failed to update postgresql.conf: $($_.Exception.Message)" "ERROR"
            return $false
        }
    }
    
    Write-Log "Slave replication setup completed. Ready to start PostgreSQL."
    return $true
}

function Invoke-SlavePromotion {
    Write-Log "Promoting slave to master..."
    
    if ($DryRun) {
        Write-Log "[DRY RUN] Would promote slave to master" "WARNING"
        return $true
    }
    
    try {
        # Use pg_promote or pg_ctl promote
        if (Get-Command pg_promote -ErrorAction SilentlyContinue) {
            pg_promote -D $SlaveDataDir
            Write-Log "Slave promoted using pg_promote"
        }
        elseif (Get-Command pg_ctl -ErrorAction SilentlyContinue) {
            pg_ctl promote -D $SlaveDataDir
            Write-Log "Slave promoted using pg_ctl"
        }
        else {
            # Manual promotion by creating trigger file
            $TriggerFile = Join-Path $SlaveDataDir "promote"
            New-Item -Path $TriggerFile -ItemType File -Force | Out-Null
            Write-Log "Created promotion trigger file: $TriggerFile"
        }
        
        # Wait for promotion to complete
        Start-Sleep -Seconds 10
        
        # Verify promotion
        $TestQuery = "SELECT pg_is_in_recovery();"
        $Result = psql -h localhost -p $PostgreSQLConfig.Port -U $PostgreSQLConfig.Username -d postgres -t -c $TestQuery
        
        if ($Result.Trim() -eq "f") {
            Write-Log "Slave successfully promoted to master"
            return $true
        }
        else {
            Write-Log "Slave promotion may have failed - still in recovery mode" "WARNING"
            return $false
        }
    }
    catch {
        Write-Log "Slave promotion failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Test-ReplicationStatus {
    Write-Log "Checking replication status..."
    
    try {
        # Check if this is a master or slave
        $RecoveryQuery = "SELECT pg_is_in_recovery();"
        $IsInRecovery = psql -h localhost -p $PostgreSQLConfig.Port -U $PostgreSQLConfig.Username -d postgres -t -c $RecoveryQuery
        
        if ($IsInRecovery.Trim() -eq "f") {
            Write-Log "This server is a MASTER"
            
            # Show replication slots and connections
            $ReplicationQuery = @"
SELECT 
    client_addr,
    client_hostname,
    client_port,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;
"@
            
            Write-Log "Active replication connections:"
            psql -h localhost -p $PostgreSQLConfig.Port -U $PostgreSQLConfig.Username -d postgres -c $ReplicationQuery
        }
        else {
            Write-Log "This server is a SLAVE"
            
            # Show recovery status
            $SlaveStatusQuery = @"
SELECT 
    pg_is_in_recovery() as in_recovery,
    pg_last_wal_receive_lsn() as receive_lsn,
    pg_last_wal_replay_lsn() as replay_lsn,
    pg_last_xact_replay_timestamp() as last_replay;
"@
            
            Write-Log "Slave replication status:"
            psql -h localhost -p $PostgreSQLConfig.Port -U $PostgreSQLConfig.Username -d postgres -c $SlaveStatusQuery
        }
        
        return $true
    }
    catch {
        Write-Log "Failed to check replication status: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Send-ReplicationNotification {
    param($Success, $Role, $Details)
    
    if (-not $env:REPLICATION_WEBHOOK_URL) { return }
    
    $Status = if ($Success) { "SUCCESS" } else { "FAILED" }
    $Color = if ($Success) { "good" } else { "danger" }
    
    $Payload = @{
        text = "PostgreSQL Replication Setup $Status"
        attachments = @(
            @{
                color = $Color
                fields = @(
                    @{ title = "Role"; value = $Role; short = $true }
                    @{ title = "Master Host"; value = $MasterHost; short = $true }
                    @{ title = "Replication User"; value = $ReplicationUser; short = $true }
                    @{ title = "Details"; value = $Details; short = $false }
                )
            }
        )
    }
    
    try {
        $Json = $Payload | ConvertTo-Json -Depth 3
        Invoke-RestMethod -Uri $env:REPLICATION_WEBHOOK_URL -Method Post -Body $Json -ContentType "application/json"
        Write-Log "Notification sent successfully"
    }
    catch {
        Write-Log "Failed to send notification: $($_.Exception.Message)" "WARNING"
    }
}

# Main execution
try {
    Write-Log "=== PostgreSQL Replication Setup Started ==="
    Write-Log "Role: $Role"
    Write-Log "Master Host: $MasterHost"
    Write-Log "Replication User: $ReplicationUser"
    Write-Log "Dry Run: $DryRun"
    
    Test-Prerequisites
    
    $Success = $false
    $Details = ""
    
    switch ($Role.ToLower()) {
        "master" {
            $Success = Setup-MasterReplication
            $Details = "Master replication configured"
            
            if ($Success) {
                Write-Log "Master setup completed. Please restart PostgreSQL to apply changes."
                Write-Log "After restart, run with -Role status to verify replication."
            }
        }
        
        "slave" {
            $Success = Setup-SlaveReplication
            $Details = "Slave replication configured from master: $MasterHost"
            
            if ($Success) {
                Write-Log "Slave setup completed. Starting PostgreSQL with slave data directory..."
                if (Start-PostgreSQL -DataDirectory $SlaveDataDir) {
                    Start-Sleep -Seconds 10
                    Test-ReplicationStatus
                }
            }
        }
        
        "promote" {
            $Success = Invoke-SlavePromotion
            $Details = "Slave promoted to master"
            
            if ($Success) {
                Test-ReplicationStatus
            }
        }
        
        "status" {
            $Success = Test-ReplicationStatus
            $Details = "Replication status checked"
        }
        
        default {
            Write-Log "Invalid role: $Role" "ERROR"
            Write-Log "Valid roles: master, slave, promote, status" "ERROR"
            exit 1
        }
    }
    
    if ($Success) {
        Write-Log "=== Replication Setup Completed Successfully ==="
    }
    else {
        Write-Log "=== Replication Setup Failed ===" "ERROR"
        exit 1
    }
    
    Send-ReplicationNotification -Success $Success -Role $Role -Details $Details
}
catch {
    Write-Log "Unexpected error: $($_.Exception.Message)" "ERROR"
    Send-ReplicationNotification -Success $false -Role $Role -Details "Unexpected error: $($_.Exception.Message)"
    exit 1
}