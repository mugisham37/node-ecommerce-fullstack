#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Comprehensive backup strategy for disaster recovery
.DESCRIPTION
    Performs full system backup including database, files, configurations, and application state
.PARAMETER BackupType
    Type of backup: full, incremental, or differential
.PARAMETER Destination
    Backup destination (local, s3, azure, gcp)
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("full", "incremental", "differential")]
    [string]$BackupType,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("local", "s3", "azure", "gcp")]
    [string]$Destination,
    
    [string]$BackupPath = "./backups",
    [switch]$Compress = $true,
    [switch]$Encrypt = $true
)

# Configuration
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "system-backup-$BackupType-$timestamp"
$logFile = "$BackupPath/logs/backup-$timestamp.log"

# Ensure backup directory exists
New-Item -ItemType Directory -Path "$BackupPath/logs" -Force | Out-Null

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check required tools
    $requiredTools = @("kubectl", "pg_dump", "redis-cli", "aws", "docker")
    foreach ($tool in $requiredTools) {
        if (!(Get-Command $tool -ErrorAction SilentlyContinue)) {
            Write-Log "Required tool '$tool' not found" "ERROR"
            return $false
        }
    }
    
    # Check connectivity
    try {
        kubectl cluster-info | Out-Null
        Write-Log "Kubernetes cluster accessible"
    } catch {
        Write-Log "Cannot connect to Kubernetes cluster" "ERROR"
        return $false
    }
    
    return $true
}

function Backup-Database {
    Write-Log "Starting database backup..."
    
    $dbBackupPath = "$BackupPath/$backupName/database"
    New-Item -ItemType Directory -Path $dbBackupPath -Force | Out-Null
    
    # Get database credentials from Kubernetes secret
    $dbSecret = kubectl get secret postgres-credentials -n production -o json | ConvertFrom-Json
    $dbUser = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($dbSecret.data.username))
    $dbPassword = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($dbSecret.data.password))
    
    # Primary database backup
    $env:PGPASSWORD = $dbPassword
    $dumpFile = "$dbBackupPath/primary-db-$timestamp.sql"
    
    Write-Log "Backing up primary database..."
    pg_dump -h postgres-ha-cluster-rw.production.svc.cluster.local -U $dbUser -d inventory_system --verbose --no-password --format=custom --file=$dumpFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Database backup completed successfully"
        
        # Backup database schema separately
        pg_dump -h postgres-ha-cluster-rw.production.svc.cluster.local -U $dbUser -d inventory_system --schema-only --no-password --file="$dbBackupPath/schema-$timestamp.sql"
        
        # Backup specific tables with high priority
        $criticalTables = @("users", "products", "inventory", "orders", "suppliers")
        foreach ($table in $criticalTables) {
            pg_dump -h postgres-ha-cluster-rw.production.svc.cluster.local -U $dbUser -d inventory_system --table=$table --no-password --format=custom --file="$dbBackupPath/$table-$timestamp.sql"
        }
    } else {
        Write-Log "Database backup failed" "ERROR"
        return $false
    }
    
    return $true
}

function Backup-Redis {
    Write-Log "Starting Redis backup..."
    
    $redisBackupPath = "$BackupPath/$backupName/redis"
    New-Item -ItemType Directory -Path $redisBackupPath -Force | Out-Null
    
    # Get Redis nodes
    $redisNodes = kubectl get pods -n production -l app=redis-cluster -o jsonpath='{.items[*].metadata.name}'
    
    foreach ($node in $redisNodes.Split(' ')) {
        if ($node) {
            Write-Log "Backing up Redis node: $node"
            kubectl exec -n production $node -- redis-cli BGSAVE
            Start-Sleep -Seconds 5
            kubectl cp "production/$node:/data/dump.rdb" "$redisBackupPath/$node-dump-$timestamp.rdb"
        }
    }
    
    Write-Log "Redis backup completed"
    return $true
}

function Backup-ApplicationState {
    Write-Log "Starting application state backup..."
    
    $appBackupPath = "$BackupPath/$backupName/application"
    New-Item -ItemType Directory -Path $appBackupPath -Force | Out-Null
    
    # Backup Kubernetes configurations
    Write-Log "Backing up Kubernetes configurations..."
    kubectl get all -n production -o yaml > "$appBackupPath/k8s-resources-$timestamp.yaml"
    kubectl get secrets -n production -o yaml > "$appBackupPath/k8s-secrets-$timestamp.yaml"
    kubectl get configmaps -n production -o yaml > "$appBackupPath/k8s-configmaps-$timestamp.yaml"
    kubectl get pvc -n production -o yaml > "$appBackupPath/k8s-pvc-$timestamp.yaml"
    
    # Backup persistent volumes
    Write-Log "Backing up persistent volume data..."
    $pvcs = kubectl get pvc -n production -o jsonpath='{.items[*].metadata.name}'
    foreach ($pvc in $pvcs.Split(' ')) {
        if ($pvc) {
            kubectl exec -n production deployment/backup-pod -- tar czf "/backup/$pvc-$timestamp.tar.gz" "/mnt/$pvc/"
        }
    }
    
    # Backup application logs
    Write-Log "Backing up application logs..."
    kubectl logs -n production -l app=api --tail=10000 > "$appBackupPath/api-logs-$timestamp.log"
    kubectl logs -n production -l app=web --tail=10000 > "$appBackupPath/web-logs-$timestamp.log"
    
    return $true
}

function Backup-FileStorage {
    Write-Log "Starting file storage backup..."
    
    $fileBackupPath = "$BackupPath/$backupName/files"
    New-Item -ItemType Directory -Path $fileBackupPath -Force | Out-Null
    
    # Backup uploaded files from S3 or local storage
    if ($Destination -eq "s3") {
        aws s3 sync s3://your-app-files-bucket "$fileBackupPath/uploaded-files" --delete
    } else {
        # Backup from persistent volumes
        kubectl exec -n production deployment/file-storage-pod -- tar czf "/backup/uploaded-files-$timestamp.tar.gz" "/app/uploads/"
        kubectl cp "production/file-storage-pod:/backup/uploaded-files-$timestamp.tar.gz" "$fileBackupPath/"
    }
    
    Write-Log "File storage backup completed"
    return $true
}

function Compress-Backup {
    if ($Compress) {
        Write-Log "Compressing backup..."
        $archivePath = "$BackupPath/$backupName.tar.gz"
        tar -czf $archivePath -C $BackupPath $backupName
        
        if ($LASTEXITCODE -eq 0) {
            Remove-Item -Path "$BackupPath/$backupName" -Recurse -Force
            Write-Log "Backup compressed to: $archivePath"
            return $archivePath
        } else {
            Write-Log "Backup compression failed" "ERROR"
            return $null
        }
    }
    return "$BackupPath/$backupName"
}

function Encrypt-Backup {
    param([string]$BackupPath)
    
    if ($Encrypt -and $BackupPath) {
        Write-Log "Encrypting backup..."
        $encryptedPath = "$BackupPath.enc"
        
        # Use GPG for encryption (requires GPG key setup)
        gpg --cipher-algo AES256 --compress-algo 1 --symmetric --output $encryptedPath $BackupPath
        
        if ($LASTEXITCODE -eq 0) {
            Remove-Item -Path $BackupPath -Force
            Write-Log "Backup encrypted to: $encryptedPath"
            return $encryptedPath
        } else {
            Write-Log "Backup encryption failed" "ERROR"
            return $BackupPath
        }
    }
    return $BackupPath
}

function Upload-Backup {
    param([string]$BackupPath)
    
    Write-Log "Uploading backup to $Destination..."
    
    switch ($Destination) {
        "s3" {
            aws s3 cp $BackupPath "s3://your-backup-bucket/disaster-recovery/" --storage-class GLACIER
        }
        "azure" {
            az storage blob upload --file $BackupPath --container-name backups --name "disaster-recovery/$(Split-Path $BackupPath -Leaf)"
        }
        "gcp" {
            gsutil cp $BackupPath "gs://your-backup-bucket/disaster-recovery/"
        }
        "local" {
            Write-Log "Backup stored locally at: $BackupPath"
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Backup uploaded successfully"
    } else {
        Write-Log "Backup upload failed" "ERROR"
    }
}

function Create-BackupManifest {
    param([string]$BackupPath)
    
    $manifest = @{
        BackupName = $backupName
        BackupType = $BackupType
        Timestamp = $timestamp
        BackupPath = $BackupPath
        Components = @{
            Database = $true
            Redis = $true
            ApplicationState = $true
            FileStorage = $true
        }
        Metadata = @{
            KubernetesVersion = (kubectl version --client -o json | ConvertFrom-Json).clientVersion.gitVersion
            DatabaseVersion = "PostgreSQL 15"
            RedisVersion = "Redis 7"
            BackupSize = (Get-Item $BackupPath).Length
        }
    }
    
    $manifestPath = "$BackupPath.manifest.json"
    $manifest | ConvertTo-Json -Depth 3 | Out-File -FilePath $manifestPath -Encoding UTF8
    Write-Log "Backup manifest created: $manifestPath"
}

# Main execution
try {
    Write-Log "Starting $BackupType backup process..."
    
    if (!(Test-Prerequisites)) {
        Write-Log "Prerequisites check failed" "ERROR"
        exit 1
    }
    
    # Perform backups
    $success = $true
    $success = $success -and (Backup-Database)
    $success = $success -and (Backup-Redis)
    $success = $success -and (Backup-ApplicationState)
    $success = $success -and (Backup-FileStorage)
    
    if ($success) {
        $finalBackupPath = Compress-Backup
        $finalBackupPath = Encrypt-Backup -BackupPath $finalBackupPath
        
        if ($finalBackupPath) {
            Create-BackupManifest -BackupPath $finalBackupPath
            Upload-Backup -BackupPath $finalBackupPath
            
            Write-Log "Backup process completed successfully"
            Write-Log "Backup location: $finalBackupPath"
        }
    } else {
        Write-Log "Backup process failed" "ERROR"
        exit 1
    }
    
} catch {
    Write-Log "Backup process failed with error: $($_.Exception.Message)" "ERROR"
    exit 1
}