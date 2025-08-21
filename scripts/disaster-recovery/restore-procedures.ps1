#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Disaster recovery restore procedures
.DESCRIPTION
    Restores system from backup including database, application state, and file storage
.PARAMETER BackupPath
    Path to the backup file or directory
.PARAMETER RestoreType
    Type of restore: full, database-only, application-only
.PARAMETER TargetEnvironment
    Target environment for restore: production, staging, disaster-recovery
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("full", "database-only", "application-only", "files-only")]
    [string]$RestoreType,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("production", "staging", "disaster-recovery")]
    [string]$TargetEnvironment,
    
    [string]$RestoreLocation = "./restore",
    [switch]$SkipValidation = $false,
    [switch]$DryRun = $false
)

# Configuration
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "$RestoreLocation/logs/restore-$timestamp.log"

# Ensure restore directory exists
New-Item -ItemType Directory -Path "$RestoreLocation/logs" -Force | Out-Null

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites for restore..."
    
    # Check required tools
    $requiredTools = @("kubectl", "pg_restore", "redis-cli", "tar", "gpg")
    foreach ($tool in $requiredTools) {
        if (!(Get-Command $tool -ErrorAction SilentlyContinue)) {
            Write-Log "Required tool '$tool' not found" "ERROR"
            return $false
        }
    }
    
    # Check target environment accessibility
    try {
        kubectl config use-context $TargetEnvironment
        kubectl cluster-info | Out-Null
        Write-Log "Target environment '$TargetEnvironment' accessible"
    } catch {
        Write-Log "Cannot connect to target environment '$TargetEnvironment'" "ERROR"
        return $false
    }
    
    # Check backup file exists
    if (!(Test-Path $BackupPath)) {
        Write-Log "Backup file not found: $BackupPath" "ERROR"
        return $false
    }
    
    return $true
}

function Prepare-RestoreEnvironment {
    Write-Log "Preparing restore environment..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace $TargetEnvironment --dry-run=client -o yaml | kubectl apply -f -
    
    # Scale down applications to prevent conflicts
    if (!$DryRun) {
        Write-Log "Scaling down applications..."
        kubectl scale deployment api-deployment --replicas=0 -n $TargetEnvironment
        kubectl scale deployment web-deployment --replicas=0 -n $TargetEnvironment
        
        # Wait for pods to terminate
        Start-Sleep -Seconds 30
    }
    
    return $true
}

function Extract-Backup {
    Write-Log "Extracting backup..."
    
    $extractPath = "$RestoreLocation/extracted"
    New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
    
    # Check if backup is encrypted
    if ($BackupPath.EndsWith(".enc")) {
        Write-Log "Decrypting backup..."
        $decryptedPath = $BackupPath -replace "\.enc$", ""
        gpg --decrypt --output $decryptedPath $BackupPath
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Failed to decrypt backup" "ERROR"
            return $null
        }
        $BackupPath = $decryptedPath
    }
    
    # Extract compressed backup
    if ($BackupPath.EndsWith(".tar.gz")) {
        tar -xzf $BackupPath -C $extractPath
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Failed to extract backup" "ERROR"
            return $null
        }
    } else {
        Copy-Item -Path $BackupPath -Destination $extractPath -Recurse
    }
    
    # Find the backup directory
    $backupDir = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
    if ($backupDir) {
        Write-Log "Backup extracted to: $($backupDir.FullName)"
        return $backupDir.FullName
    }
    
    Write-Log "Could not find backup directory after extraction" "ERROR"
    return $null
}

function Validate-Backup {
    param([string]$BackupDir)
    
    if ($SkipValidation) {
        Write-Log "Skipping backup validation"
        return $true
    }
    
    Write-Log "Validating backup integrity..."
    
    # Check for manifest file
    $manifestPath = "$BackupDir.manifest.json"
    if (!(Test-Path $manifestPath)) {
        Write-Log "Backup manifest not found" "WARNING"
    } else {
        $manifest = Get-Content $manifestPath | ConvertFrom-Json
        Write-Log "Backup manifest found - Type: $($manifest.BackupType), Timestamp: $($manifest.Timestamp)"
    }
    
    # Validate required components based on restore type
    $requiredPaths = @()
    
    switch ($RestoreType) {
        "full" {
            $requiredPaths = @("database", "redis", "application", "files")
        }
        "database-only" {
            $requiredPaths = @("database")
        }
        "application-only" {
            $requiredPaths = @("application")
        }
        "files-only" {
            $requiredPaths = @("files")
        }
    }
    
    foreach ($path in $requiredPaths) {
        $fullPath = Join-Path $BackupDir $path
        if (!(Test-Path $fullPath)) {
            Write-Log "Required backup component missing: $path" "ERROR"
            return $false
        }
    }
    
    Write-Log "Backup validation completed successfully"
    return $true
}

function Restore-Database {
    param([string]$BackupDir)
    
    Write-Log "Starting database restore..."
    
    $dbBackupPath = Join-Path $BackupDir "database"
    if (!(Test-Path $dbBackupPath)) {
        Write-Log "Database backup not found" "ERROR"
        return $false
    }
    
    # Get database credentials
    $dbSecret = kubectl get secret postgres-credentials -n $TargetEnvironment -o json | ConvertFrom-Json
    $dbUser = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($dbSecret.data.username))
    $dbPassword = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($dbSecret.data.password))
    
    $env:PGPASSWORD = $dbPassword
    $dbHost = "postgres-ha-cluster-rw.$TargetEnvironment.svc.cluster.local"
    
    if (!$DryRun) {
        # Drop existing database and recreate
        Write-Log "Recreating database..."
        psql -h $dbHost -U $dbUser -d postgres -c "DROP DATABASE IF EXISTS inventory_system;"
        psql -h $dbHost -U $dbUser -d postgres -c "CREATE DATABASE inventory_system OWNER $dbUser;"
        
        # Restore from primary backup
        $primaryBackup = Get-ChildItem -Path $dbBackupPath -Filter "primary-db-*.sql" | Select-Object -First 1
        if ($primaryBackup) {
            Write-Log "Restoring primary database from: $($primaryBackup.Name)"
            pg_restore -h $dbHost -U $dbUser -d inventory_system --verbose --no-password $primaryBackup.FullName
            
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Database restore completed successfully"
            } else {
                Write-Log "Database restore failed" "ERROR"
                return $false
            }
        } else {
            Write-Log "Primary database backup not found" "ERROR"
            return $false
        }
        
        # Verify database integrity
        Write-Log "Verifying database integrity..."
        $tableCount = psql -h $dbHost -U $dbUser -d inventory_system -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
        Write-Log "Restored $($tableCount.Trim()) tables"
        
    } else {
        Write-Log "[DRY RUN] Would restore database from $dbBackupPath"
    }
    
    return $true
}

function Restore-Redis {
    param([string]$BackupDir)
    
    Write-Log "Starting Redis restore..."
    
    $redisBackupPath = Join-Path $BackupDir "redis"
    if (!(Test-Path $redisBackupPath)) {
        Write-Log "Redis backup not found" "ERROR"
        return $false
    }
    
    if (!$DryRun) {
        # Get Redis pods
        $redisPods = kubectl get pods -n $TargetEnvironment -l app=redis-cluster -o jsonpath='{.items[*].metadata.name}'
        
        # Stop Redis cluster
        Write-Log "Stopping Redis cluster..."
        foreach ($pod in $redisPods.Split(' ')) {
            if ($pod) {
                kubectl exec -n $TargetEnvironment $pod -- redis-cli SHUTDOWN NOSAVE
            }
        }
        
        Start-Sleep -Seconds 10
        
        # Restore Redis data
        $redisBackups = Get-ChildItem -Path $redisBackupPath -Filter "*-dump-*.rdb"
        foreach ($backup in $redisBackups) {
            $podName = $backup.Name -replace "-dump-.*\.rdb$", ""
            Write-Log "Restoring Redis data to pod: $podName"
            kubectl cp $backup.FullName "$TargetEnvironment/$podName:/data/dump.rdb"
        }
        
        # Restart Redis cluster
        Write-Log "Restarting Redis cluster..."
        kubectl rollout restart statefulset/redis-cluster -n $TargetEnvironment
        kubectl rollout status statefulset/redis-cluster -n $TargetEnvironment --timeout=300s
        
    } else {
        Write-Log "[DRY RUN] Would restore Redis from $redisBackupPath"
    }
    
    return $true
}

function Restore-ApplicationState {
    param([string]$BackupDir)
    
    Write-Log "Starting application state restore..."
    
    $appBackupPath = Join-Path $BackupDir "application"
    if (!(Test-Path $appBackupPath)) {
        Write-Log "Application backup not found" "ERROR"
        return $false
    }
    
    if (!$DryRun) {
        # Restore Kubernetes resources
        Write-Log "Restoring Kubernetes resources..."
        
        $resourceFiles = @(
            "k8s-secrets-*.yaml",
            "k8s-configmaps-*.yaml",
            "k8s-pvc-*.yaml",
            "k8s-resources-*.yaml"
        )
        
        foreach ($pattern in $resourceFiles) {
            $file = Get-ChildItem -Path $appBackupPath -Filter $pattern | Select-Object -First 1
            if ($file) {
                Write-Log "Applying $($file.Name)..."
                kubectl apply -f $file.FullName -n $TargetEnvironment
            }
        }
        
        # Wait for PVCs to be bound
        Write-Log "Waiting for persistent volumes to be ready..."
        Start-Sleep -Seconds 30
        
    } else {
        Write-Log "[DRY RUN] Would restore application state from $appBackupPath"
    }
    
    return $true
}

function Restore-FileStorage {
    param([string]$BackupDir)
    
    Write-Log "Starting file storage restore..."
    
    $fileBackupPath = Join-Path $BackupDir "files"
    if (!(Test-Path $fileBackupPath)) {
        Write-Log "File storage backup not found" "ERROR"
        return $false
    }
    
    if (!$DryRun) {
        # Restore uploaded files
        $uploadedFilesBackup = Get-ChildItem -Path $fileBackupPath -Filter "uploaded-files-*.tar.gz" | Select-Object -First 1
        if ($uploadedFilesBackup) {
            Write-Log "Restoring uploaded files..."
            
            # Create temporary pod for file restoration
            kubectl run file-restore-pod --image=alpine --restart=Never -n $TargetEnvironment -- sleep 3600
            kubectl wait --for=condition=Ready pod/file-restore-pod -n $TargetEnvironment --timeout=60s
            
            # Copy and extract files
            kubectl cp $uploadedFilesBackup.FullName "$TargetEnvironment/file-restore-pod:/tmp/files.tar.gz"
            kubectl exec -n $TargetEnvironment file-restore-pod -- tar -xzf /tmp/files.tar.gz -C /mnt/uploads/
            
            # Cleanup
            kubectl delete pod file-restore-pod -n $TargetEnvironment
        }
        
    } else {
        Write-Log "[DRY RUN] Would restore file storage from $fileBackupPath"
    }
    
    return $true
}

function Start-Applications {
    Write-Log "Starting applications..."
    
    if (!$DryRun) {
        # Scale up applications
        kubectl scale deployment api-deployment --replicas=3 -n $TargetEnvironment
        kubectl scale deployment web-deployment --replicas=3 -n $TargetEnvironment
        
        # Wait for deployments to be ready
        kubectl rollout status deployment/api-deployment -n $TargetEnvironment --timeout=300s
        kubectl rollout status deployment/web-deployment -n $TargetEnvironment --timeout=300s
        
        Write-Log "Applications started successfully"
    } else {
        Write-Log "[DRY RUN] Would start applications"
    }
    
    return $true
}

function Verify-Restore {
    Write-Log "Verifying restore..."
    
    if (!$DryRun) {
        # Check application health
        $apiPods = kubectl get pods -n $TargetEnvironment -l app=api -o jsonpath='{.items[*].metadata.name}'
        foreach ($pod in $apiPods.Split(' ')) {
            if ($pod) {
                $health = kubectl exec -n $TargetEnvironment $pod -- curl -s http://localhost:3000/health
                if ($health -match "healthy") {
                    Write-Log "API pod $pod is healthy"
                } else {
                    Write-Log "API pod $pod health check failed" "WARNING"
                }
            }
        }
        
        # Check database connectivity
        $dbTest = kubectl exec -n $TargetEnvironment deployment/api-deployment -- node -e "console.log('DB test')"
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Database connectivity verified"
        } else {
            Write-Log "Database connectivity test failed" "WARNING"
        }
        
    } else {
        Write-Log "[DRY RUN] Would verify restore"
    }
    
    return $true
}

# Main execution
try {
    Write-Log "Starting $RestoreType restore process for $TargetEnvironment..."
    
    if (!(Test-Prerequisites)) {
        Write-Log "Prerequisites check failed" "ERROR"
        exit 1
    }
    
    # Extract and validate backup
    $backupDir = Extract-Backup
    if (!$backupDir -or !(Validate-Backup -BackupDir $backupDir)) {
        Write-Log "Backup validation failed" "ERROR"
        exit 1
    }
    
    # Prepare environment
    if (!(Prepare-RestoreEnvironment)) {
        Write-Log "Environment preparation failed" "ERROR"
        exit 1
    }
    
    # Perform restore based on type
    $success = $true
    
    switch ($RestoreType) {
        "full" {
            $success = $success -and (Restore-Database -BackupDir $backupDir)
            $success = $success -and (Restore-Redis -BackupDir $backupDir)
            $success = $success -and (Restore-ApplicationState -BackupDir $backupDir)
            $success = $success -and (Restore-FileStorage -BackupDir $backupDir)
        }
        "database-only" {
            $success = Restore-Database -BackupDir $backupDir
        }
        "application-only" {
            $success = Restore-ApplicationState -BackupDir $backupDir
        }
        "files-only" {
            $success = Restore-FileStorage -BackupDir $backupDir
        }
    }
    
    if ($success) {
        Start-Applications
        Verify-Restore
        Write-Log "Restore process completed successfully"
    } else {
        Write-Log "Restore process failed" "ERROR"
        exit 1
    }
    
} catch {
    Write-Log "Restore process failed with error: $($_.Exception.Message)" "ERROR"
    exit 1
}