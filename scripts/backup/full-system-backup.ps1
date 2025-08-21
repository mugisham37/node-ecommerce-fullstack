#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Complete system backup for disaster recovery
.DESCRIPTION
    Performs comprehensive backup of all system components including databases, applications, configurations, and user data
.PARAMETER Schedule
    Backup schedule: daily, weekly, monthly
.PARAMETER Retention
    Retention period in days
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("daily", "weekly", "monthly")]
    [string]$Schedule,
    
    [int]$Retention = 30,
    [string]$BackupRoot = "./backups/full-system",
    [switch]$Compress = $true,
    [switch]$Encrypt = $true,
    [switch]$UploadToCloud = $true
)

# Configuration
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "full-system-$Schedule-$timestamp"
$backupPath = "$BackupRoot/$backupName"
$logFile = "$BackupRoot/logs/full-backup-$timestamp.log"

# Ensure directories exist
New-Item -ItemType Directory -Path "$BackupRoot/logs" -Force | Out-Null
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

function Backup-SystemConfiguration {
    Write-Log "Backing up system configuration..."
    
    $configPath = "$backupPath/system-config"
    New-Item -ItemType Directory -Path $configPath -Force | Out-Null
    
    # Backup Kubernetes configurations
    kubectl get all --all-namespaces -o yaml > "$configPath/k8s-all-resources.yaml"
    kubectl get secrets --all-namespaces -o yaml > "$configPath/k8s-secrets.yaml"
    kubectl get configmaps --all-namespaces -o yaml > "$configPath/k8s-configmaps.yaml"
    kubectl get pv,pvc --all-namespaces -o yaml > "$configPath/k8s-storage.yaml"
    kubectl get ingress --all-namespaces -o yaml > "$configPath/k8s-ingress.yaml"
    
    # Backup infrastructure configurations
    Copy-Item -Path "./infrastructure" -Destination "$configPath/infrastructure" -Recurse
    Copy-Item -Path "./config" -Destination "$configPath/config" -Recurse
    Copy-Item -Path "./scripts" -Destination "$configPath/scripts" -Recurse
    
    # Backup application configurations
    Copy-Item -Path "./docker-compose*.yml" -Destination $configPath
    Copy-Item -Path "./package.json" -Destination $configPath
    Copy-Item -Path "./turbo.json" -Destination $configPath
    Copy-Item -Path "./tsconfig.json" -Destination $configPath
    
    Write-Log "System configuration backup completed"
}

function Backup-ApplicationCode {
    Write-Log "Backing up application code..."
    
    $codePath = "$backupPath/application-code"
    New-Item -ItemType Directory -Path $codePath -Force | Out-Null
    
    # Backup source code (excluding node_modules and build artifacts)
    $excludePatterns = @(
        "node_modules",
        ".next",
        "dist",
        "build",
        ".git",
        "*.log",
        "coverage",
        ".nyc_output"
    )
    
    $robocopyArgs = @(
        ".",
        $codePath,
        "/E",
        "/XD"
    ) + $excludePatterns
    
    robocopy @robocopyArgs
    
    # Create code manifest
    $manifest = @{
        BackupDate = Get-Date -Format "o"
        GitCommit = (git rev-parse HEAD 2>$null)
        GitBranch = (git branch --show-current 2>$null)
        PackageVersions = @{}
    }
    
    # Get package versions
    if (Test-Path "./package.json") {
        $packageJson = Get-Content "./package.json" | ConvertFrom-Json
        $manifest.PackageVersions = $packageJson.dependencies
    }
    
    $manifest | ConvertTo-Json -Depth 3 | Out-File "$codePath/backup-manifest.json"
    
    Write-Log "Application code backup completed"
}

function Backup-Databases {
    Write-Log "Backing up all databases..."
    
    $dbPath = "$backupPath/databases"
    New-Item -ItemType Directory -Path $dbPath -Force | Out-Null
    
    # PostgreSQL backup
    Write-Log "Backing up PostgreSQL databases..."
    $pgBackupPath = "$dbPath/postgresql"
    New-Item -ItemType Directory -Path $pgBackupPath -Force | Out-Null
    
    # Get all databases
    $databases = kubectl exec -n production deployment/api-deployment -- psql $env:DATABASE_URL -t -c "SELECT datname FROM pg_database WHERE datistemplate = false;"
    
    foreach ($db in $databases.Split("`n")) {
        $dbName = $db.Trim()
        if ($dbName -and $dbName -ne "postgres") {
            Write-Log "Backing up database: $dbName"
            kubectl exec -n production deployment/api-deployment -- pg_dump $dbName --format=custom --file="/tmp/$dbName-$timestamp.backup"
            kubectl cp "production/$(kubectl get pods -n production -l app=api -o jsonpath='{.items[0].metadata.name}'):/tmp/$dbName-$timestamp.backup" "$pgBackupPath/$dbName-$timestamp.backup"
        }
    }
    
    # Redis backup
    Write-Log "Backing up Redis data..."
    $redisBackupPath = "$dbPath/redis"
    New-Item -ItemType Directory -Path $redisBackupPath -Force | Out-Null
    
    $redisPods = kubectl get pods -n production -l app=redis-cluster -o jsonpath='{.items[*].metadata.name}'
    foreach ($pod in $redisPods.Split(' ')) {
        if ($pod) {
            kubectl exec -n production $pod -- redis-cli BGSAVE
            Start-Sleep -Seconds 10
            kubectl cp "production/$pod:/data/dump.rdb" "$redisBackupPath/$pod-dump-$timestamp.rdb"
        }
    }
    
    Write-Log "Database backup completed"
}

function Backup-FileStorage {
    Write-Log "Backing up file storage..."
    
    $filesPath = "$backupPath/file-storage"
    New-Item -ItemType Directory -Path $filesPath -Force | Out-Null
    
    # Backup persistent volumes
    $pvcs = kubectl get pvc -n production -o jsonpath='{.items[*].metadata.name}'
    foreach ($pvc in $pvcs.Split(' ')) {
        if ($pvc) {
            Write-Log "Backing up PVC: $pvc"
            kubectl run backup-pod-$pvc --image=alpine --restart=Never -n production --overrides="{
                `"spec`": {
                    `"containers`": [{
                        `"name`": `"backup`",
                        `"image`": `"alpine`",
                        `"command`": [`"sleep`", `"3600`"],
                        `"volumeMounts`": [{
                            `"name`": `"data`",
                            `"mountPath`": `"/data`"
                        }]
                    }],
                    `"volumes`": [{
                        `"name`": `"data`",
                        `"persistentVolumeClaim`": {
                            `"claimName`": `"$pvc`"
                        }
                    }]
                }
            }"
            
            kubectl wait --for=condition=Ready pod/backup-pod-$pvc -n production --timeout=60s
            kubectl exec -n production backup-pod-$pvc -- tar czf "/tmp/$pvc-$timestamp.tar.gz" -C /data .
            kubectl cp "production/backup-pod-$pvc:/tmp/$pvc-$timestamp.tar.gz" "$filesPath/$pvc-$timestamp.tar.gz"
            kubectl delete pod backup-pod-$pvc -n production
        }
    }
    
    # Backup S3/Cloud storage if applicable
    if ($env:AWS_ACCESS_KEY_ID) {
        Write-Log "Backing up S3 storage..."
        aws s3 sync s3://your-app-files-bucket "$filesPath/s3-backup" --delete
    }
    
    Write-Log "File storage backup completed"
}

function Backup-Monitoring {
    Write-Log "Backing up monitoring data..."
    
    $monitoringPath = "$backupPath/monitoring"
    New-Item -ItemType Directory -Path $monitoringPath -Force | Out-Null
    
    # Backup Prometheus data
    if (kubectl get pods -n monitoring -l app=prometheus 2>$null) {
        Write-Log "Backing up Prometheus data..."
        kubectl exec -n monitoring deployment/prometheus -- tar czf "/tmp/prometheus-$timestamp.tar.gz" -C /prometheus .
        kubectl cp "monitoring/$(kubectl get pods -n monitoring -l app=prometheus -o jsonpath='{.items[0].metadata.name}'):/tmp/prometheus-$timestamp.tar.gz" "$monitoringPath/prometheus-$timestamp.tar.gz"
    }
    
    # Backup Grafana dashboards
    if (kubectl get pods -n monitoring -l app=grafana 2>$null) {
        Write-Log "Backing up Grafana dashboards..."
        kubectl exec -n monitoring deployment/grafana -- tar czf "/tmp/grafana-$timestamp.tar.gz" -C /var/lib/grafana .
        kubectl cp "monitoring/$(kubectl get pods -n monitoring -l app=grafana -o jsonpath='{.items[0].metadata.name}'):/tmp/grafana-$timestamp.tar.gz" "$monitoringPath/grafana-$timestamp.tar.gz"
    }
    
    # Export recent logs
    Write-Log "Exporting recent application logs..."
    kubectl logs -n production -l app=api --since=24h > "$monitoringPath/api-logs-24h.log"
    kubectl logs -n production -l app=web --since=24h > "$monitoringPath/web-logs-24h.log"
    
    Write-Log "Monitoring data backup completed"
}

function Create-BackupManifest {
    Write-Log "Creating backup manifest..."
    
    $manifest = @{
        BackupName = $backupName
        BackupType = "full-system"
        Schedule = $Schedule
        Timestamp = $timestamp
        BackupPath = $backupPath
        Components = @{
            SystemConfiguration = $true
            ApplicationCode = $true
            Databases = $true
            FileStorage = $true
            Monitoring = $true
        }
        Metadata = @{
            KubernetesVersion = (kubectl version --client -o json | ConvertFrom-Json).clientVersion.gitVersion
            BackupSize = (Get-ChildItem -Path $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum
            FileCount = (Get-ChildItem -Path $backupPath -Recurse -File).Count
            GitCommit = (git rev-parse HEAD 2>$null)
            GitBranch = (git branch --show-current 2>$null)
        }
        Retention = @{
            RetentionDays = $Retention
            ExpiryDate = (Get-Date).AddDays($Retention).ToString("o")
        }
    }
    
    $manifestPath = "$backupPath.manifest.json"
    $manifest | ConvertTo-Json -Depth 4 | Out-File -FilePath $manifestPath -Encoding UTF8
    
    Write-Log "Backup manifest created: $manifestPath"
    return $manifest
}

function Compress-Backup {
    if ($Compress) {
        Write-Log "Compressing backup..."
        $archivePath = "$backupPath.tar.gz"
        
        tar -czf $archivePath -C $BackupRoot $backupName
        
        if ($LASTEXITCODE -eq 0) {
            $originalSize = (Get-ChildItem -Path $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum
            $compressedSize = (Get-Item $archivePath).Length
            $compressionRatio = [math]::Round((1 - ($compressedSize / $originalSize)) * 100, 2)
            
            Write-Log "Backup compressed successfully"
            Write-Log "Original size: $([math]::Round($originalSize / 1MB, 2)) MB"
            Write-Log "Compressed size: $([math]::Round($compressedSize / 1MB, 2)) MB"
            Write-Log "Compression ratio: $compressionRatio%"
            
            Remove-Item -Path $backupPath -Recurse -Force
            return $archivePath
        } else {
            Write-Log "Backup compression failed" "ERROR"
            return $backupPath
        }
    }
    return $backupPath
}

function Encrypt-Backup {
    param([string]$BackupPath)
    
    if ($Encrypt) {
        Write-Log "Encrypting backup..."
        $encryptedPath = "$BackupPath.enc"
        
        # Use GPG for encryption
        gpg --cipher-algo AES256 --compress-algo 1 --symmetric --output $encryptedPath $BackupPath
        
        if ($LASTEXITCODE -eq 0) {
            Remove-Item -Path $BackupPath -Force
            Write-Log "Backup encrypted successfully: $encryptedPath"
            return $encryptedPath
        } else {
            Write-Log "Backup encryption failed" "ERROR"
            return $BackupPath
        }
    }
    return $BackupPath
}

function Upload-ToCloud {
    param([string]$BackupPath)
    
    if ($UploadToCloud) {
        Write-Log "Uploading backup to cloud storage..."
        
        $fileName = Split-Path $BackupPath -Leaf
        
        # Upload to multiple cloud providers for redundancy
        $uploadSuccess = $false
        
        # AWS S3
        if ($env:AWS_ACCESS_KEY_ID) {
            try {
                aws s3 cp $BackupPath "s3://your-backup-bucket/full-system-backups/$fileName" --storage-class GLACIER
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Backup uploaded to AWS S3 successfully"
                    $uploadSuccess = $true
                }
            } catch {
                Write-Log "AWS S3 upload failed: $($_.Exception.Message)" "WARNING"
            }
        }
        
        # Azure Blob Storage
        if ($env:AZURE_STORAGE_CONNECTION_STRING) {
            try {
                az storage blob upload --file $BackupPath --container-name backups --name "full-system-backups/$fileName"
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Backup uploaded to Azure Blob Storage successfully"
                    $uploadSuccess = $true
                }
            } catch {
                Write-Log "Azure Blob Storage upload failed: $($_.Exception.Message)" "WARNING"
            }
        }
        
        # Google Cloud Storage
        if ($env:GOOGLE_APPLICATION_CREDENTIALS) {
            try {
                gsutil cp $BackupPath "gs://your-backup-bucket/full-system-backups/$fileName"
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Backup uploaded to Google Cloud Storage successfully"
                    $uploadSuccess = $true
                }
            } catch {
                Write-Log "Google Cloud Storage upload failed: $($_.Exception.Message)" "WARNING"
            }
        }
        
        if (!$uploadSuccess) {
            Write-Log "All cloud uploads failed" "ERROR"
        }
    }
}

function Cleanup-OldBackups {
    Write-Log "Cleaning up old backups..."
    
    $cutoffDate = (Get-Date).AddDays(-$Retention)
    $oldBackups = Get-ChildItem -Path $BackupRoot -Filter "*full-system-*" | Where-Object { $_.CreationTime -lt $cutoffDate }
    
    foreach ($backup in $oldBackups) {
        Write-Log "Removing old backup: $($backup.Name)"
        Remove-Item -Path $backup.FullName -Force
    }
    
    Write-Log "Cleanup completed - removed $($oldBackups.Count) old backups"
}

function Send-BackupNotification {
    param([hashtable]$Manifest, [bool]$Success)
    
    $status = if ($Success) { "SUCCESS" } else { "FAILED" }
    $color = if ($Success) { "good" } else { "danger" }
    
    $message = @{
        text = "Full System Backup $status"
        attachments = @(
            @{
                color = $color
                fields = @(
                    @{ title = "Backup Name"; value = $Manifest.BackupName; short = $true }
                    @{ title = "Schedule"; value = $Manifest.Schedule; short = $true }
                    @{ title = "Size"; value = "$([math]::Round($Manifest.Metadata.BackupSize / 1GB, 2)) GB"; short = $true }
                    @{ title = "Files"; value = $Manifest.Metadata.FileCount; short = $true }
                    @{ title = "Timestamp"; value = $Manifest.Timestamp; short = $false }
                )
            }
        )
    } | ConvertTo-Json -Depth 3
    
    # Send to Slack
    if ($env:SLACK_WEBHOOK_URL) {
        try {
            Invoke-RestMethod -Uri $env:SLACK_WEBHOOK_URL -Method Post -Body $message -ContentType "application/json"
            Write-Log "Backup notification sent to Slack"
        } catch {
            Write-Log "Failed to send Slack notification: $($_.Exception.Message)" "WARNING"
        }
    }
    
    # Send email notification
    if ($env:SMTP_SERVER) {
        try {
            $emailBody = "Full system backup $status`n`nBackup: $($Manifest.BackupName)`nSize: $([math]::Round($Manifest.Metadata.BackupSize / 1GB, 2)) GB`nFiles: $($Manifest.Metadata.FileCount)"
            Send-MailMessage -SmtpServer $env:SMTP_SERVER -From $env:SMTP_FROM -To $env:SMTP_TO -Subject "Full System Backup $status" -Body $emailBody
            Write-Log "Backup notification sent via email"
        } catch {
            Write-Log "Failed to send email notification: $($_.Exception.Message)" "WARNING"
        }
    }
}

# Main execution
try {
    Write-Log "Starting full system backup - Schedule: $Schedule"
    
    # Perform all backup components
    Backup-SystemConfiguration
    Backup-ApplicationCode
    Backup-Databases
    Backup-FileStorage
    Backup-Monitoring
    
    # Create manifest
    $manifest = Create-BackupManifest
    
    # Compress and encrypt
    $finalBackupPath = Compress-Backup
    $finalBackupPath = Encrypt-Backup -BackupPath $finalBackupPath
    
    # Upload to cloud
    Upload-ToCloud -BackupPath $finalBackupPath
    
    # Cleanup old backups
    Cleanup-OldBackups
    
    Write-Log "Full system backup completed successfully"
    Write-Log "Final backup location: $finalBackupPath"
    
    # Send success notification
    Send-BackupNotification -Manifest $manifest -Success $true
    
} catch {
    Write-Log "Full system backup failed: $($_.Exception.Message)" "ERROR"
    
    # Send failure notification
    if ($manifest) {
        Send-BackupNotification -Manifest $manifest -Success $false
    }
    
    exit 1
}