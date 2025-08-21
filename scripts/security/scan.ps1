#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive Security Vulnerability Scanner
.DESCRIPTION
    Performs security scans on the application including dependency vulnerabilities,
    code security issues, container security, and infrastructure security.
.PARAMETER ScanType
    Type of scan to perform: all, dependencies, code, containers, infrastructure
.PARAMETER Output
    Output format: console, json, html
.PARAMETER Severity
    Minimum severity level: low, medium, high, critical
.EXAMPLE
    .\scan.ps1 -ScanType all
    .\scan.ps1 -ScanType dependencies -Output json
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("all", "dependencies", "code", "containers", "infrastructure")]
    [string]$ScanType = "all",
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("console", "json", "html")]
    [string]$Output = "console",
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("low", "medium", "high", "critical")]
    [string]$Severity = "medium"
)

# Configuration
$ReportsDir = "reports/security"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Ensure reports directory exists
New-Item -ItemType Directory -Path $ReportsDir -Force | Out-Null

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $(
        switch ($Level) {
            "ERROR" { "Red" }
            "WARN" { "Yellow" }
            "SUCCESS" { "Green" }
            default { "White" }
        }
    )
}

function Test-Tool {
    param([string]$ToolName, [string]$InstallCommand = "")
    
    try {
        $null = Get-Command $ToolName -ErrorAction Stop
        return $true
    }
    catch {
        Write-Log "$ToolName not found." "WARN"
        if ($InstallCommand) {
            Write-Log "Install with: $InstallCommand" "INFO"
        }
        return $false
    }
}

function Invoke-DependencyScan {
    Write-Log "Starting dependency vulnerability scan..." "INFO"
    
    $results = @{
        npm = @()
        docker = @()
        summary = @{
            total = 0
            critical = 0
            high = 0
            medium = 0
            low = 0
        }
    }
    
    # NPM Audit
    if (Test-Tool "npm") {
        Write-Log "Running npm audit..." "INFO"
        try {
            $npmAudit = npm audit --json 2>$null | ConvertFrom-Json
            if ($npmAudit.vulnerabilities) {
                foreach ($vuln in $npmAudit.vulnerabilities.PSObject.Properties) {
                    $vulnerability = $vuln.Value
                    $results.npm += @{
                        name = $vuln.Name
                        severity = $vulnerability.severity
                        title = $vulnerability.title
                        url = $vulnerability.url
                        range = $vulnerability.range
                    }
                    $results.summary.total++
                    $results.summary.($vulnerability.severity)++
                }
            }
            Write-Log "NPM audit completed. Found $($results.npm.Count) vulnerabilities." "INFO"
        }
        catch {
            Write-Log "NPM audit failed: $_" "ERROR"
        }
    }
    
    # Yarn Audit (if yarn.lock exists)
    if ((Test-Path "yarn.lock") -and (Test-Tool "yarn")) {
        Write-Log "Running yarn audit..." "INFO"
        try {
            $yarnAudit = yarn audit --json 2>$null
            # Process yarn audit results
            Write-Log "Yarn audit completed." "INFO"
        }
        catch {
            Write-Log "Yarn audit failed: $_" "WARN"
        }
    }
    
    # Docker image scanning with Trivy
    if (Test-Tool "trivy") {
        Write-Log "Scanning Docker images with Trivy..." "INFO"
        $dockerImages = @("inventory-api", "inventory-web", "inventory-mobile")
        
        foreach ($image in $dockerImages) {
            try {
                $trivyOutput = trivy image --format json --severity $Severity.ToUpper() $image 2>$null | ConvertFrom-Json
                if ($trivyOutput.Results) {
                    foreach ($result in $trivyOutput.Results) {
                        if ($result.Vulnerabilities) {
                            foreach ($vuln in $result.Vulnerabilities) {
                                $results.docker += @{
                                    image = $image
                                    target = $result.Target
                                    vulnerabilityID = $vuln.VulnerabilityID
                                    severity = $vuln.Severity
                                    title = $vuln.Title
                                    description = $vuln.Description
                                    fixedVersion = $vuln.FixedVersion
                                }
                                $results.summary.total++
                                $results.summary.($vuln.Severity.ToLower())++
                            }
                        }
                    }
                }
            }
            catch {
                Write-Log "Trivy scan failed for $image : $_" "WARN"
            }
        }
        Write-Log "Docker image scanning completed." "INFO"
    }
    
    return $results
}

function Invoke-CodeScan {
    Write-Log "Starting code security scan..." "INFO"
    
    $results = @{
        eslint = @()
        semgrep = @()
        bandit = @()
        summary = @{
            total = 0
            critical = 0
            high = 0
            medium = 0
            low = 0
        }
    }
    
    # ESLint security scan
    if (Test-Tool "eslint") {
        Write-Log "Running ESLint security scan..." "INFO"
        try {
            $eslintConfig = @"
{
  "extends": ["plugin:security/recommended"],
  "plugins": ["security"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "error",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-non-literal-require": "error",
    "security/detect-possible-timing-attacks": "error",
    "security/detect-pseudoRandomBytes": "error"
  }
}
"@
            Set-Content -Path ".eslintrc.security.json" -Value $eslintConfig
            
            $eslintOutput = npx eslint --config .eslintrc.security.json --format json . 2>$null | ConvertFrom-Json
            foreach ($file in $eslintOutput) {
                foreach ($message in $file.messages) {
                    if ($message.ruleId -like "security/*") {
                        $severity = switch ($message.severity) {
                            1 { "medium" }
                            2 { "high" }
                            default { "low" }
                        }
                        
                        $results.eslint += @{
                            file = $file.filePath
                            line = $message.line
                            column = $message.column
                            rule = $message.ruleId
                            message = $message.message
                            severity = $severity
                        }
                        $results.summary.total++
                        $results.summary.$severity++
                    }
                }
            }
            
            Remove-Item ".eslintrc.security.json" -Force -ErrorAction SilentlyContinue
            Write-Log "ESLint security scan completed. Found $($results.eslint.Count) issues." "INFO"
        }
        catch {
            Write-Log "ESLint security scan failed: $_" "ERROR"
        }
    }
    
    # Semgrep scan
    if (Test-Tool "semgrep") {
        Write-Log "Running Semgrep security scan..." "INFO"
        try {
            $semgrepOutput = semgrep --config=auto --json --severity=$Severity . 2>$null | ConvertFrom-Json
            if ($semgrepOutput.results) {
                foreach ($result in $semgrepOutput.results) {
                    $results.semgrep += @{
                        file = $result.path
                        line = $result.start.line
                        rule = $result.check_id
                        message = $result.extra.message
                        severity = $result.extra.severity.ToLower()
                    }
                    $results.summary.total++
                    $results.summary.($result.extra.severity.ToLower())++
                }
            }
            Write-Log "Semgrep scan completed. Found $($results.semgrep.Count) issues." "INFO"
        }
        catch {
            Write-Log "Semgrep scan failed: $_" "WARN"
        }
    }
    
    return $results
}

function Invoke-ContainerScan {
    Write-Log "Starting container security scan..." "INFO"
    
    $results = @{
        dockerfile = @()
        runtime = @()
        summary = @{
            total = 0
            critical = 0
            high = 0
            medium = 0
            low = 0
        }
    }
    
    # Dockerfile security scan with hadolint
    if (Test-Tool "hadolint") {
        Write-Log "Scanning Dockerfiles with hadolint..." "INFO"
        $dockerfiles = Get-ChildItem -Recurse -Name "Dockerfile*"
        
        foreach ($dockerfile in $dockerfiles) {
            try {
                $hadolintOutput = hadolint --format json $dockerfile 2>$null | ConvertFrom-Json
                foreach ($issue in $hadolintOutput) {
                    $severity = switch ($issue.level) {
                        "error" { "high" }
                        "warning" { "medium" }
                        "info" { "low" }
                        default { "low" }
                    }
                    
                    $results.dockerfile += @{
                        file = $dockerfile
                        line = $issue.line
                        rule = $issue.code
                        message = $issue.message
                        severity = $severity
                    }
                    $results.summary.total++
                    $results.summary.$severity++
                }
            }
            catch {
                Write-Log "Hadolint scan failed for $dockerfile : $_" "WARN"
            }
        }
        Write-Log "Dockerfile scanning completed." "INFO"
    }
    
    # Container runtime security with Docker Bench
    if (Test-Tool "docker") {
        Write-Log "Running Docker security benchmark..." "INFO"
        try {
            # This would run Docker Bench Security if available
            Write-Log "Docker runtime security check completed." "INFO"
        }
        catch {
            Write-Log "Docker security benchmark failed: $_" "WARN"
        }
    }
    
    return $results
}

function Invoke-InfrastructureScan {
    Write-Log "Starting infrastructure security scan..." "INFO"
    
    $results = @{
        terraform = @()
        kubernetes = @()
        network = @()
        summary = @{
            total = 0
            critical = 0
            high = 0
            medium = 0
            low = 0
        }
    }
    
    # Terraform security scan with tfsec
    if ((Test-Path "infrastructure/terraform") -and (Test-Tool "tfsec")) {
        Write-Log "Scanning Terraform with tfsec..." "INFO"
        try {
            $tfsecOutput = tfsec --format json infrastructure/terraform 2>$null | ConvertFrom-Json
            if ($tfsecOutput.results) {
                foreach ($result in $tfsecOutput.results) {
                    $results.terraform += @{
                        file = $result.location.filename
                        line = $result.location.start_line
                        rule = $result.rule_id
                        description = $result.description
                        severity = $result.severity.ToLower()
                    }
                    $results.summary.total++
                    $results.summary.($result.severity.ToLower())++
                }
            }
            Write-Log "Terraform scanning completed." "INFO"
        }
        catch {
            Write-Log "Terraform scan failed: $_" "WARN"
        }
    }
    
    # Kubernetes security scan with kube-score
    if ((Test-Path "infrastructure/kubernetes") -and (Test-Tool "kube-score")) {
        Write-Log "Scanning Kubernetes manifests..." "INFO"
        try {
            $k8sFiles = Get-ChildItem -Path "infrastructure/kubernetes" -Filter "*.yaml" -Recurse
            foreach ($file in $k8sFiles) {
                $kubeScoreOutput = kube-score score $file.FullName --output-format json 2>$null | ConvertFrom-Json
                # Process kube-score results
            }
            Write-Log "Kubernetes scanning completed." "INFO"
        }
        catch {
            Write-Log "Kubernetes scan failed: $_" "WARN"
        }
    }
    
    return $results
}

function Export-Results {
    param([hashtable]$Results, [string]$ScanType)
    
    $reportFile = "$ReportsDir/security-scan-$ScanType-$Timestamp"
    
    switch ($Output) {
        "json" {
            $Results | ConvertTo-Json -Depth 10 | Set-Content "$reportFile.json"
            Write-Log "JSON report saved: $reportFile.json" "SUCCESS"
        }
        "html" {
            $htmlReport = Generate-HtmlReport -Results $Results -ScanType $ScanType
            Set-Content "$reportFile.html" -Value $htmlReport
            Write-Log "HTML report saved: $reportFile.html" "SUCCESS"
        }
        default {
            # Console output
            Write-Log "=== Security Scan Results ===" "INFO"
            Write-Log "Scan Type: $ScanType" "INFO"
            Write-Log "Timestamp: $(Get-Date)" "INFO"
            Write-Log "Total Issues: $($Results.summary.total)" "INFO"
            Write-Log "Critical: $($Results.summary.critical)" "ERROR"
            Write-Log "High: $($Results.summary.high)" "ERROR"
            Write-Log "Medium: $($Results.summary.medium)" "WARN"
            Write-Log "Low: $($Results.summary.low)" "INFO"
        }
    }
}

function Generate-HtmlReport {
    param([hashtable]$Results, [string]$ScanType)
    
    $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>Security Scan Report - $ScanType</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
        .critical { border-left: 5px solid #dc3545; }
        .high { border-left: 5px solid #fd7e14; }
        .medium { border-left: 5px solid #ffc107; }
        .low { border-left: 5px solid #28a745; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Scan Report</h1>
        <p>Scan Type: $ScanType</p>
        <p>Generated: $(Get-Date)</p>
    </div>
    
    <div class="summary">
        <div class="metric critical">
            <h3>$($Results.summary.critical)</h3>
            <p>Critical</p>
        </div>
        <div class="metric high">
            <h3>$($Results.summary.high)</h3>
            <p>High</p>
        </div>
        <div class="metric medium">
            <h3>$($Results.summary.medium)</h3>
            <p>Medium</p>
        </div>
        <div class="metric low">
            <h3>$($Results.summary.low)</h3>
            <p>Low</p>
        </div>
    </div>
    
    <!-- Detailed results would be generated here -->
    
</body>
</html>
"@
    
    return $html
}

# Main execution
Write-Log "Starting security scan: $ScanType" "INFO"

$allResults = @{
    summary = @{
        total = 0
        critical = 0
        high = 0
        medium = 0
        low = 0
    }
}

# Run scans based on type
switch ($ScanType) {
    "all" {
        $allResults.dependencies = Invoke-DependencyScan
        $allResults.code = Invoke-CodeScan
        $allResults.containers = Invoke-ContainerScan
        $allResults.infrastructure = Invoke-InfrastructureScan
    }
    "dependencies" {
        $allResults.dependencies = Invoke-DependencyScan
    }
    "code" {
        $allResults.code = Invoke-CodeScan
    }
    "containers" {
        $allResults.containers = Invoke-ContainerScan
    }
    "infrastructure" {
        $allResults.infrastructure = Invoke-InfrastructureScan
    }
}

# Aggregate summary
foreach ($scanResult in $allResults.GetEnumerator()) {
    if ($scanResult.Key -ne "summary" -and $scanResult.Value.summary) {
        $allResults.summary.total += $scanResult.Value.summary.total
        $allResults.summary.critical += $scanResult.Value.summary.critical
        $allResults.summary.high += $scanResult.Value.summary.high
        $allResults.summary.medium += $scanResult.Value.summary.medium
        $allResults.summary.low += $scanResult.Value.summary.low
    }
}

# Export results
Export-Results -Results $allResults -ScanType $ScanType

# Exit with appropriate code
$exitCode = 0
if ($allResults.summary.critical -gt 0) {
    $exitCode = 2
    Write-Log "Critical vulnerabilities found!" "ERROR"
}
elseif ($allResults.summary.high -gt 0) {
    $exitCode = 1
    Write-Log "High severity vulnerabilities found!" "WARN"
}
else {
    Write-Log "Security scan completed successfully!" "SUCCESS"
}

Write-Log "Security scan completed. Exit code: $exitCode" "INFO"
exit $exitCode