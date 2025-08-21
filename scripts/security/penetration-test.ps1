#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated penetration testing script for security assessment
.DESCRIPTION
    Performs basic penetration testing including network scanning,
    vulnerability assessment, and security configuration testing
.PARAMETER Target
    Target IP address or hostname to test
.PARAMETER TestType
    Type of test: Network, Web, Database, or Full
.PARAMETER OutputPath
    Path to save test results
.PARAMETER Intensity
    Test intensity level: Low, Medium, High
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Target,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Network", "Web", "Database", "Full")]
    [string]$TestType = "Network",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "./pentest-results-$(Get-Date -Format 'yyyyMMdd-HHmmss')",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Low", "Medium", "High")]
    [string]$Intensity = "Medium"
)

# Initialize test results
$TestResults = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Target = $Target
    TestType = $TestType
    Intensity = $Intensity
    NetworkScan = @{}
    PortScan = @{}
    VulnerabilityAssessment = @{}
    WebApplicationTest = @{}
    DatabaseTest = @{}
    Summary = @{}
    Recommendations = @()
}

Write-Host "🔍 Starting Penetration Test" -ForegroundColor Red
Write-Host "Target: $Target" -ForegroundColor Yellow
Write-Host "Test Type: $TestType" -ForegroundColor Yellow
Write-Host "Intensity: $Intensity" -ForegroundColor Yellow

# Network Discovery and Reconnaissance
function Invoke-NetworkDiscovery {
    param([string]$TargetHost)
    
    Write-Host "🌐 Performing network discovery..." -ForegroundColor Cyan
    
    $networkInfo = @{}
    
    # Ping test
    try {
        $pingResult = Test-Connection -ComputerName $TargetHost -Count 4 -ErrorAction SilentlyContinue
        $networkInfo.PingTest = @{
            Success = $pingResult -ne $null
            ResponseTime = if ($pingResult) { ($pingResult | Measure-Object ResponseTime -Average).Average } else { 0 }
            PacketLoss = if ($pingResult) { (4 - $pingResult.Count) / 4 * 100 } else { 100 }
        }
    } catch {
        $networkInfo.PingTest = @{ Success = $false; Error = $_.Exception.Message }
    }
    
    # DNS Resolution
    try {
        $dnsResult = Resolve-DnsName -Name $TargetHost -ErrorAction SilentlyContinue
        $networkInfo.DNSResolution = @{
            Success = $dnsResult -ne $null
            IPAddresses = if ($dnsResult) { $dnsResult.IPAddress } else { @() }
            RecordTypes = if ($dnsResult) { $dnsResult.Type } else { @() }
        }
    } catch {
        $networkInfo.DNSResolution = @{ Success = $false; Error = $_.Exception.Message }
    }
    
    # Traceroute (simplified)
    try {
        $traceResult = Test-NetConnection -ComputerName $TargetHost -TraceRoute -ErrorAction SilentlyContinue
        $networkInfo.Traceroute = @{
            Success = $traceResult -ne $null
            Hops = if ($traceResult) { $traceResult.TraceRoute.Count } else { 0 }
            Route = if ($traceResult) { $traceResult.TraceRoute } else { @() }
        }
    } catch {
        $networkInfo.Traceroute = @{ Success = $false; Error = $_.Exception.Message }
    }
    
    return $networkInfo
}

# Port Scanning
function Invoke-PortScan {
    param([string]$TargetHost, [string]$ScanIntensity)
    
    Write-Host "🔌 Performing port scan..." -ForegroundColor Cyan
    
    # Define port ranges based on intensity
    $portRanges = @{
        "Low" = @(21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3389)
        "Medium" = @(21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 1433, 3306, 3389, 5432, 8080, 8443)
        "High" = 1..1024
    }
    
    $portsToScan = $portRanges[$ScanIntensity]
    $openPorts = @()
    $closedPorts = @()
    
    foreach ($port in $portsToScan) {
        try {
            $connection = Test-NetConnection -ComputerName $TargetHost -Port $port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
            if ($connection.TcpTestSucceeded) {
                $openPorts += @{
                    Port = $port
                    Service = Get-ServiceName -Port $port
                    State = "Open"
                }
                Write-Host "  ✅ Port $port is open" -ForegroundColor Green
            } else {
                $closedPorts += $port
            }
        } catch {
            $closedPorts += $port
        }
    }
    
    return @{
        OpenPorts = $openPorts
        ClosedPorts = $closedPorts
        TotalScanned = $portsToScan.Count
        ScanDuration = (Get-Date) - $scanStart
    }
}

# Service Detection
function Get-ServiceName {
    param([int]$Port)
    
    $commonPorts = @{
        21 = "FTP"
        22 = "SSH"
        23 = "Telnet"
        25 = "SMTP"
        53 = "DNS"
        80 = "HTTP"
        110 = "POP3"
        135 = "RPC"
        139 = "NetBIOS"
        143 = "IMAP"
        443 = "HTTPS"
        445 = "SMB"
        993 = "IMAPS"
        995 = "POP3S"
        1433 = "SQL Server"
        3306 = "MySQL"
        3389 = "RDP"
        5432 = "PostgreSQL"
        8080 = "HTTP-Alt"
        8443 = "HTTPS-Alt"
    }
    
    return if ($commonPorts.ContainsKey($Port)) { $commonPorts[$Port] } else { "Unknown" }
}

# Vulnerability Assessment
function Invoke-VulnerabilityAssessment {
    param([string]$TargetHost, [array]$OpenPorts)
    
    Write-Host "🔍 Performing vulnerability assessment..." -ForegroundColor Cyan
    
    $vulnerabilities = @()
    
    foreach ($portInfo in $OpenPorts) {
        $port = $portInfo.Port
        $service = $portInfo.Service
        
        # Check for common vulnerabilities based on service
        switch ($service) {
            "FTP" {
                $vulnerabilities += @{
                    Port = $port
                    Service = $service
                    Vulnerability = "Anonymous FTP access may be enabled"
                    Severity = "Medium"
                    Recommendation = "Disable anonymous FTP access and use secure alternatives like SFTP"
                }
            }
            "Telnet" {
                $vulnerabilities += @{
                    Port = $port
                    Service = $service
                    Vulnerability = "Unencrypted protocol - credentials sent in plaintext"
                    Severity = "High"
                    Recommendation = "Replace Telnet with SSH for secure remote access"
                }
            }
            "HTTP" {
                # Test for common web vulnerabilities
                $webVulns = Test-WebVulnerabilities -TargetHost $TargetHost -Port $port
                $vulnerabilities += $webVulns
            }
            "HTTPS" {
                # Test SSL/TLS configuration
                $sslVulns = Test-SSLConfiguration -TargetHost $TargetHost -Port $port
                $vulnerabilities += $sslVulns
            }
            "SMB" {
                $vulnerabilities += @{
                    Port = $port
                    Service = $service
                    Vulnerability = "SMB service exposed - potential for lateral movement"
                    Severity = "Medium"
                    Recommendation = "Restrict SMB access and ensure latest patches are applied"
                }
            }
            "RDP" {
                $vulnerabilities += @{
                    Port = $port
                    Service = $service
                    Vulnerability = "RDP exposed to internet - brute force target"
                    Severity = "High"
                    Recommendation = "Use VPN or restrict RDP access by IP, enable NLA"
                }
            }
        }
    }
    
    return $vulnerabilities
}

# Web Application Testing
function Test-WebVulnerabilities {
    param([string]$TargetHost, [int]$Port)
    
    $webVulns = @()
    $baseUrl = "http://$TargetHost:$Port"
    
    try {
        # Test for directory traversal
        $traversalTest = Invoke-WebRequest -Uri "$baseUrl/../../../etc/passwd" -ErrorAction SilentlyContinue
        if ($traversalTest -and $traversalTest.Content -match "root:") {
            $webVulns += @{
                Port = $Port
                Service = "HTTP"
                Vulnerability = "Directory traversal vulnerability detected"
                Severity = "High"
                Recommendation = "Implement proper input validation and access controls"
            }
        }
        
        # Test for common files
        $commonFiles = @("robots.txt", "sitemap.xml", ".htaccess", "web.config")
        foreach ($file in $commonFiles) {
            try {
                $fileTest = Invoke-WebRequest -Uri "$baseUrl/$file" -ErrorAction SilentlyContinue
                if ($fileTest.StatusCode -eq 200) {
                    $webVulns += @{
                        Port = $Port
                        Service = "HTTP"
                        Vulnerability = "Sensitive file accessible: $file"
                        Severity = "Low"
                        Recommendation = "Review file permissions and restrict access to sensitive files"
                    }
                }
            } catch {
                # File not accessible - this is good
            }
        }
        
        # Test for server information disclosure
        $response = Invoke-WebRequest -Uri $baseUrl -ErrorAction SilentlyContinue
        if ($response.Headers.Server) {
            $webVulns += @{
                Port = $Port
                Service = "HTTP"
                Vulnerability = "Server information disclosure: $($response.Headers.Server)"
                Severity = "Low"
                Recommendation = "Configure server to hide version information"
            }
        }
        
    } catch {
        # Web server not responding or other error
    }
    
    return $webVulns
}

# SSL/TLS Configuration Testing
function Test-SSLConfiguration {
    param([string]$TargetHost, [int]$Port)
    
    $sslVulns = @()
    
    try {
        # Test SSL/TLS connection
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($TargetHost, $Port)
        
        $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream())
        $sslStream.AuthenticateAsClient($TargetHost)
        
        # Check SSL/TLS version
        $sslProtocol = $sslStream.SslProtocol
        if ($sslProtocol -eq "Ssl2" -or $sslProtocol -eq "Ssl3" -or $sslProtocol -eq "Tls") {
            $sslVulns += @{
                Port = $Port
                Service = "HTTPS"
                Vulnerability = "Weak SSL/TLS protocol: $sslProtocol"
                Severity = "High"
                Recommendation = "Disable weak protocols and use TLS 1.2 or higher"
            }
        }
        
        # Check certificate
        $cert = $sslStream.RemoteCertificate
        if ($cert) {
            $certExpiry = [DateTime]::Parse($cert.GetExpirationDateString())
            $daysUntilExpiry = ($certExpiry - (Get-Date)).Days
            
            if ($daysUntilExpiry -lt 30) {
                $sslVulns += @{
                    Port = $Port
                    Service = "HTTPS"
                    Vulnerability = "SSL certificate expires in $daysUntilExpiry days"
                    Severity = if ($daysUntilExpiry -lt 0) { "High" } else { "Medium" }
                    Recommendation = "Renew SSL certificate before expiration"
                }
            }
        }
        
        $sslStream.Close()
        $tcpClient.Close()
        
    } catch {
        $sslVulns += @{
            Port = $Port
            Service = "HTTPS"
            Vulnerability = "SSL/TLS connection failed: $($_.Exception.Message)"
            Severity = "Medium"
            Recommendation = "Review SSL/TLS configuration"
        }
    }
    
    return $sslVulns
}

# Generate Security Recommendations
function Get-SecurityRecommendations {
    param([array]$Vulnerabilities)
    
    $recommendations = @()
    
    # Group vulnerabilities by severity
    $criticalVulns = $Vulnerabilities | Where-Object { $_.Severity -eq "Critical" }
    $highVulns = $Vulnerabilities | Where-Object { $_.Severity -eq "High" }
    $mediumVulns = $Vulnerabilities | Where-Object { $_.Severity -eq "Medium" }
    $lowVulns = $Vulnerabilities | Where-Object { $_.Severity -eq "Low" }
    
    if ($criticalVulns.Count -gt 0) {
        $recommendations += "CRITICAL: Address $($criticalVulns.Count) critical vulnerabilities immediately"
    }
    
    if ($highVulns.Count -gt 0) {
        $recommendations += "HIGH: Remediate $($highVulns.Count) high-severity vulnerabilities within 24-48 hours"
    }
    
    if ($mediumVulns.Count -gt 0) {
        $recommendations += "MEDIUM: Plan remediation for $($mediumVulns.Count) medium-severity vulnerabilities within 1 week"
    }
    
    # Specific recommendations
    $recommendations += "Implement network segmentation to limit attack surface"
    $recommendations += "Enable logging and monitoring for all services"
    $recommendations += "Regular security updates and patch management"
    $recommendations += "Implement multi-factor authentication where possible"
    $recommendations += "Conduct regular security assessments"
    
    return $recommendations
}

# Main Test Execution
try {
    $scanStart = Get-Date
    
    # Network Discovery
    if ($TestType -eq "Network" -or $TestType -eq "Full") {
        $TestResults.NetworkScan = Invoke-NetworkDiscovery -TargetHost $Target
    }
    
    # Port Scanning
    if ($TestType -eq "Network" -or $TestType -eq "Full") {
        $TestResults.PortScan = Invoke-PortScan -TargetHost $Target -ScanIntensity $Intensity
    }
    
    # Vulnerability Assessment
    if ($TestType -eq "Full" -or $TestType -eq "Network") {
        if ($TestResults.PortScan.OpenPorts) {
            $TestResults.VulnerabilityAssessment = Invoke-VulnerabilityAssessment -TargetHost $Target -OpenPorts $TestResults.PortScan.OpenPorts
        }
    }
    
    # Generate recommendations
    if ($TestResults.VulnerabilityAssessment) {
        $TestResults.Recommendations = Get-SecurityRecommendations -Vulnerabilities $TestResults.VulnerabilityAssessment
    }
    
    # Create summary
    $TestResults.Summary = @{
        TotalOpenPorts = if ($TestResults.PortScan.OpenPorts) { $TestResults.PortScan.OpenPorts.Count } else { 0 }
        TotalVulnerabilities = if ($TestResults.VulnerabilityAssessment) { $TestResults.VulnerabilityAssessment.Count } else { 0 }
        CriticalVulns = if ($TestResults.VulnerabilityAssessment) { ($TestResults.VulnerabilityAssessment | Where-Object { $_.Severity -eq "Critical" }).Count } else { 0 }
        HighVulns = if ($TestResults.VulnerabilityAssessment) { ($TestResults.VulnerabilityAssessment | Where-Object { $_.Severity -eq "High" }).Count } else { 0 }
        TestDuration = (Get-Date) - $scanStart
    }
    
    # Save results
    $jsonOutput = $TestResults | ConvertTo-Json -Depth 10
    $jsonOutput | Out-File -FilePath "$OutputPath.json" -Encoding UTF8
    
    # Display summary
    Write-Host "`n📊 Penetration Test Summary:" -ForegroundColor Cyan
    Write-Host "  Target: $Target" -ForegroundColor White
    Write-Host "  Open Ports: $($TestResults.Summary.TotalOpenPorts)" -ForegroundColor White
    Write-Host "  Vulnerabilities Found: $($TestResults.Summary.TotalVulnerabilities)" -ForegroundColor White
    Write-Host "  Critical: $($TestResults.Summary.CriticalVulns)" -ForegroundColor Red
    Write-Host "  High: $($TestResults.Summary.HighVulns)" -ForegroundColor Yellow
    
    if ($TestResults.Recommendations.Count -gt 0) {
        Write-Host "`n🔧 Top Recommendations:" -ForegroundColor Yellow
        $TestResults.Recommendations | Select-Object -First 5 | ForEach-Object {
            Write-Host "  • $_" -ForegroundColor White
        }
    }
    
    Write-Host "`n✅ Penetration test completed. Results saved to: $OutputPath.json" -ForegroundColor Green
    
} catch {
    Write-Error "Penetration test failed: $($_.Exception.Message)"
    exit 1
}

Write-Host "`n⚠️  DISCLAIMER: This tool is for authorized testing only. Ensure you have permission before testing any systems." -ForegroundColor Red