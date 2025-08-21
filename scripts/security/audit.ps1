#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive security audit script for production environment
.DESCRIPTION
    Performs automated security audits including system configuration,
    access controls, vulnerability scanning, and compliance checks
.PARAMETER AuditType
    Type of audit to perform: Full, Quick, Compliance, or Vulnerability
.PARAMETER OutputFormat
    Output format: JSON, HTML, or CSV
.PARAMETER ReportPath
    Path to save the audit report
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Full", "Quick", "Compliance", "Vulnerability")]
    [string]$AuditType = "Full",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("JSON", "HTML", "CSV")]
    [string]$OutputFormat = "JSON",
    
    [Parameter(Mandatory=$false)]
    [string]$ReportPath = "./security-audit-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

# Initialize audit results
$AuditResults = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    AuditType = $AuditType
    SystemInfo = @{}
    SecurityChecks = @{}
    ComplianceChecks = @{}
    VulnerabilityChecks = @{}
    Recommendations = @()
    Summary = @{}
}

Write-Host "🔒 Starting Security Audit - Type: $AuditType" -ForegroundColor Green

# System Information Collection
function Get-SystemInfo {
    Write-Host "📊 Collecting system information..." -ForegroundColor Yellow
    
    return @{
        Hostname = $env:COMPUTERNAME
        OS = (Get-WmiObject -Class Win32_OperatingSystem).Caption
        OSVersion = (Get-WmiObject -Class Win32_OperatingSystem).Version
        LastBootTime = (Get-WmiObject -Class Win32_OperatingSystem).LastBootUpTime
        TotalMemory = [math]::Round((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
        CPUInfo = (Get-WmiObject -Class Win32_Processor).Name
        NetworkAdapters = (Get-NetAdapter | Where-Object {$_.Status -eq "Up"}).Name
        InstalledSoftware = (Get-WmiObject -Class Win32_Product | Measure-Object).Count
    }
}

# Security Configuration Checks
function Test-SecurityConfiguration {
    Write-Host "🛡️ Checking security configuration..." -ForegroundColor Yellow
    
    $checks = @{}
    
    # Windows Firewall Status
    try {
        $firewallProfiles = Get-NetFirewallProfile
        $checks.FirewallStatus = @{
            Domain = ($firewallProfiles | Where-Object {$_.Name -eq "Domain"}).Enabled
            Private = ($firewallProfiles | Where-Object {$_.Name -eq "Private"}).Enabled
            Public = ($firewallProfiles | Where-Object {$_.Name -eq "Public"}).Enabled
        }
    } catch {
        $checks.FirewallStatus = "Error: $($_.Exception.Message)"
    }
    
    # Windows Defender Status
    try {
        $defenderStatus = Get-MpComputerStatus
        $checks.WindowsDefender = @{
            AntivirusEnabled = $defenderStatus.AntivirusEnabled
            RealTimeProtectionEnabled = $defenderStatus.RealTimeProtectionEnabled
            LastQuickScan = $defenderStatus.QuickScanStartTime
            LastFullScan = $defenderStatus.FullScanStartTime
        }
    } catch {
        $checks.WindowsDefender = "Error: $($_.Exception.Message)"
    }
    
    # User Account Control
    try {
        $uacStatus = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA"
        $checks.UACEnabled = $uacStatus.EnableLUA -eq 1
    } catch {
        $checks.UACEnabled = "Error: $($_.Exception.Message)"
    }
    
    # Password Policy
    try {
        $passwordPolicy = net accounts
        $checks.PasswordPolicy = $passwordPolicy -join "`n"
    } catch {
        $checks.PasswordPolicy = "Error: $($_.Exception.Message)"
    }
    
    # Service Status
    $criticalServices = @("Winmgmt", "EventLog", "Themes", "AudioSrv")
    $checks.CriticalServices = @{}
    foreach ($service in $criticalServices) {
        try {
            $serviceStatus = Get-Service -Name $service -ErrorAction SilentlyContinue
            $checks.CriticalServices[$service] = if ($serviceStatus) { $serviceStatus.Status } else { "Not Found" }
        } catch {
            $checks.CriticalServices[$service] = "Error"
        }
    }
    
    return $checks
}

# Access Control Audit
function Test-AccessControls {
    Write-Host "🔐 Auditing access controls..." -ForegroundColor Yellow
    
    $accessChecks = @{}
    
    # Local Users and Groups
    try {
        $localUsers = Get-LocalUser | Select-Object Name, Enabled, LastLogon, PasswordRequired
        $accessChecks.LocalUsers = $localUsers
        
        $adminUsers = Get-LocalGroupMember -Group "Administrators" | Select-Object Name, ObjectClass
        $accessChecks.AdminUsers = $adminUsers
    } catch {
        $accessChecks.UserAccounts = "Error: $($_.Exception.Message)"
    }
    
    # Shared Folders
    try {
        $shares = Get-SmbShare | Where-Object {$_.Name -ne "IPC$" -and $_.Name -ne "ADMIN$" -and $_.Name -notlike "*$"}
        $accessChecks.SharedFolders = $shares | Select-Object Name, Path, Description
    } catch {
        $accessChecks.SharedFolders = "Error: $($_.Exception.Message)"
    }
    
    # Registry Permissions (sample check)
    try {
        $regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
        $regAcl = Get-Acl -Path $regPath
        $accessChecks.RegistryPermissions = @{
            Path = $regPath
            Owner = $regAcl.Owner
            AccessRules = $regAcl.AccessToString
        }
    } catch {
        $accessChecks.RegistryPermissions = "Error: $($_.Exception.Message)"
    }
    
    return $accessChecks
}

# Vulnerability Scanning
function Test-Vulnerabilities {
    Write-Host "🔍 Scanning for vulnerabilities..." -ForegroundColor Yellow
    
    $vulnChecks = @{}
    
    # Windows Updates
    try {
        if (Get-Module -ListAvailable -Name PSWindowsUpdate) {
            Import-Module PSWindowsUpdate
            $updates = Get-WUList
            $vulnChecks.WindowsUpdates = @{
                PendingUpdates = $updates.Count
                CriticalUpdates = ($updates | Where-Object {$_.MsrcSeverity -eq "Critical"}).Count
                SecurityUpdates = ($updates | Where-Object {$_.Categories -like "*Security*"}).Count
            }
        } else {
            $vulnChecks.WindowsUpdates = "PSWindowsUpdate module not available"
        }
    } catch {
        $vulnChecks.WindowsUpdates = "Error: $($_.Exception.Message)"
    }
    
    # Installed Software Versions
    try {
        $software = Get-WmiObject -Class Win32_Product | Select-Object Name, Version, InstallDate
        $vulnChecks.InstalledSoftware = $software | Sort-Object Name
    } catch {
        $vulnChecks.InstalledSoftware = "Error: $($_.Exception.Message)"
    }
    
    # Network Ports
    try {
        $openPorts = Get-NetTCPConnection | Where-Object {$_.State -eq "Listen"} | 
                     Select-Object LocalAddress, LocalPort, OwningProcess | 
                     Sort-Object LocalPort
        $vulnChecks.OpenPorts = $openPorts
    } catch {
        $vulnChecks.OpenPorts = "Error: $($_.Exception.Message)"
    }
    
    return $vulnChecks
}

# Compliance Checks
function Test-Compliance {
    Write-Host "📋 Running compliance checks..." -ForegroundColor Yellow
    
    $complianceChecks = @{}
    
    # Audit Policy
    try {
        $auditPolicy = auditpol /get /category:*
        $complianceChecks.AuditPolicy = $auditPolicy -join "`n"
    } catch {
        $complianceChecks.AuditPolicy = "Error: $($_.Exception.Message)"
    }
    
    # Event Log Configuration
    try {
        $eventLogs = Get-WinEvent -ListLog * | Where-Object {$_.IsEnabled -eq $true} | 
                     Select-Object LogName, MaximumSizeInBytes, RecordCount
        $complianceChecks.EventLogs = $eventLogs
    } catch {
        $complianceChecks.EventLogs = "Error: $($_.Exception.Message)"
    }
    
    # Security Settings
    try {
        $securitySettings = @{
            LockoutThreshold = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\RemoteAccess\Parameters\AccountLockout" -Name "MaxDenials" -ErrorAction SilentlyContinue).MaxDenials
            PasswordAge = (net accounts | Select-String "Maximum password age").ToString()
            MinPasswordLength = (net accounts | Select-String "Minimum password length").ToString()
        }
        $complianceChecks.SecuritySettings = $securitySettings
    } catch {
        $complianceChecks.SecuritySettings = "Error: $($_.Exception.Message)"
    }
    
    return $complianceChecks
}

# Generate Recommendations
function Get-SecurityRecommendations {
    $recommendations = @()
    
    # Check firewall status
    if ($AuditResults.SecurityChecks.FirewallStatus) {
        $fw = $AuditResults.SecurityChecks.FirewallStatus
        if (-not $fw.Domain -or -not $fw.Private -or -not $fw.Public) {
            $recommendations += "Enable Windows Firewall for all profiles (Domain, Private, Public)"
        }
    }
    
    # Check Windows Defender
    if ($AuditResults.SecurityChecks.WindowsDefender) {
        $wd = $AuditResults.SecurityChecks.WindowsDefender
        if (-not $wd.AntivirusEnabled) {
            $recommendations += "Enable Windows Defender Antivirus"
        }
        if (-not $wd.RealTimeProtectionEnabled) {
            $recommendations += "Enable Windows Defender Real-Time Protection"
        }
    }
    
    # Check UAC
    if ($AuditResults.SecurityChecks.UACEnabled -eq $false) {
        $recommendations += "Enable User Account Control (UAC)"
    }
    
    # Check for pending updates
    if ($AuditResults.VulnerabilityChecks.WindowsUpdates -and 
        $AuditResults.VulnerabilityChecks.WindowsUpdates.PendingUpdates -gt 0) {
        $recommendations += "Install pending Windows updates ($($AuditResults.VulnerabilityChecks.WindowsUpdates.PendingUpdates) available)"
    }
    
    # Check for excessive admin users
    if ($AuditResults.SecurityChecks.AdminUsers -and 
        $AuditResults.SecurityChecks.AdminUsers.Count -gt 3) {
        $recommendations += "Review administrator accounts - consider reducing privileged access"
    }
    
    return $recommendations
}

# Main Audit Execution
try {
    # Collect system information
    $AuditResults.SystemInfo = Get-SystemInfo
    
    # Run security checks based on audit type
    switch ($AuditType) {
        "Full" {
            $AuditResults.SecurityChecks = Test-SecurityConfiguration
            $AuditResults.SecurityChecks += Test-AccessControls
            $AuditResults.VulnerabilityChecks = Test-Vulnerabilities
            $AuditResults.ComplianceChecks = Test-Compliance
        }
        "Quick" {
            $AuditResults.SecurityChecks = Test-SecurityConfiguration
        }
        "Compliance" {
            $AuditResults.ComplianceChecks = Test-Compliance
        }
        "Vulnerability" {
            $AuditResults.VulnerabilityChecks = Test-Vulnerabilities
        }
    }
    
    # Generate recommendations
    $AuditResults.Recommendations = Get-SecurityRecommendations
    
    # Create summary
    $AuditResults.Summary = @{
        TotalChecks = ($AuditResults.SecurityChecks.Count + $AuditResults.ComplianceChecks.Count + $AuditResults.VulnerabilityChecks.Count)
        RecommendationCount = $AuditResults.Recommendations.Count
        AuditDuration = (Get-Date) - [datetime]$AuditResults.Timestamp
    }
    
    # Output results
    switch ($OutputFormat) {
        "JSON" {
            $jsonOutput = $AuditResults | ConvertTo-Json -Depth 10
            $jsonOutput | Out-File -FilePath "$ReportPath.json" -Encoding UTF8
            Write-Host "✅ Audit completed. Report saved to: $ReportPath.json" -ForegroundColor Green
        }
        "HTML" {
            # Create HTML report
            $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Security Audit Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 10px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .recommendation { background-color: #fff3cd; padding: 10px; margin: 5px 0; border-radius: 3px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Audit Report</h1>
        <p>Generated: $($AuditResults.Timestamp)</p>
        <p>Audit Type: $($AuditResults.AuditType)</p>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <p>Total Checks: $($AuditResults.Summary.TotalChecks)</p>
        <p>Recommendations: $($AuditResults.Summary.RecommendationCount)</p>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        $(foreach ($rec in $AuditResults.Recommendations) { "<div class='recommendation'>$rec</div>" })
    </div>
</body>
</html>
"@
            $htmlContent | Out-File -FilePath "$ReportPath.html" -Encoding UTF8
            Write-Host "✅ Audit completed. Report saved to: $ReportPath.html" -ForegroundColor Green
        }
        "CSV" {
            # Create CSV report (simplified)
            $csvData = @()
            foreach ($rec in $AuditResults.Recommendations) {
                $csvData += [PSCustomObject]@{
                    Timestamp = $AuditResults.Timestamp
                    Type = "Recommendation"
                    Description = $rec
                }
            }
            $csvData | Export-Csv -Path "$ReportPath.csv" -NoTypeInformation
            Write-Host "✅ Audit completed. Report saved to: $ReportPath.csv" -ForegroundColor Green
        }
    }
    
    # Display summary
    Write-Host "`n📊 Audit Summary:" -ForegroundColor Cyan
    Write-Host "  Total Checks: $($AuditResults.Summary.TotalChecks)" -ForegroundColor White
    Write-Host "  Recommendations: $($AuditResults.Summary.RecommendationCount)" -ForegroundColor White
    
    if ($AuditResults.Recommendations.Count -gt 0) {
        Write-Host "`n⚠️  Top Recommendations:" -ForegroundColor Yellow
        $AuditResults.Recommendations | Select-Object -First 5 | ForEach-Object {
            Write-Host "  • $_" -ForegroundColor White
        }
    }
    
} catch {
    Write-Error "Audit failed: $($_.Exception.Message)"
    exit 1
}

Write-Host "`n🔒 Security audit completed successfully!" -ForegroundColor Green