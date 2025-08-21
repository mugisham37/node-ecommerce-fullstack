#!/usr/bin/env pwsh
<#
.SYNOPSIS
    SSL Certificate Generation and Management Script
.DESCRIPTION
    Generates SSL certificates for development, staging, and production environments.
    Supports self-signed certificates for development and Let's Encrypt for production.
.PARAMETER Environment
    Target environment: development, staging, production
.PARAMETER Domain
    Domain name for the certificate
.PARAMETER Renew
    Renew existing certificates
.EXAMPLE
    .\generate-certs.ps1 -Environment development
    .\generate-certs.ps1 -Environment production -Domain "api.example.com"
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment,
    
    [Parameter(Mandatory = $false)]
    [string]$Domain = "localhost",
    
    [Parameter(Mandatory = $false)]
    [switch]$Renew
)

# Configuration
$CertDir = "infrastructure/security/certificates"
$ConfigDir = "config/security/ssl"

# Ensure directories exist
New-Item -ItemType Directory -Path $CertDir -Force | Out-Null
New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null

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

function Test-OpenSSL {
    try {
        $null = Get-Command openssl -ErrorAction Stop
        return $true
    }
    catch {
        Write-Log "OpenSSL not found. Please install OpenSSL first." "ERROR"
        Write-Log "Windows: choco install openssl or download from https://slproweb.com/products/Win32OpenSSL.html" "INFO"
        return $false
    }
}

function New-DevelopmentCertificate {
    param([string]$Domain)
    
    Write-Log "Generating development SSL certificate for $Domain"
    
    $keyFile = "$CertDir/dev-private-key.pem"
    $certFile = "$CertDir/dev-certificate.pem"
    $configFile = "$ConfigDir/dev-openssl.conf"
    
    # Create OpenSSL configuration
    $opensslConfig = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=Development
L=Development
O=Development
OU=Development
CN=$Domain

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $Domain
DNS.2 = *.$Domain
DNS.3 = localhost
DNS.4 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
"@
    
    Set-Content -Path $configFile -Value $opensslConfig
    
    # Generate private key
    & openssl genrsa -out $keyFile 2048
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to generate private key" "ERROR"
        return $false
    }
    
    # Generate certificate
    & openssl req -new -x509 -key $keyFile -out $certFile -days 365 -config $configFile
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to generate certificate" "ERROR"
        return $false
    }
    
    Write-Log "Development certificate generated successfully" "SUCCESS"
    Write-Log "Private Key: $keyFile" "INFO"
    Write-Log "Certificate: $certFile" "INFO"
    
    return $true
}

function New-ProductionCertificate {
    param([string]$Domain)
    
    Write-Log "Setting up Let's Encrypt certificate for $Domain"
    
    # Check if certbot is installed
    try {
        $null = Get-Command certbot -ErrorAction Stop
    }
    catch {
        Write-Log "Certbot not found. Installing via pip..." "WARN"
        try {
            & pip install certbot
            if ($LASTEXITCODE -ne 0) {
                Write-Log "Failed to install certbot. Please install manually." "ERROR"
                return $false
            }
        }
        catch {
            Write-Log "Failed to install certbot. Please install manually." "ERROR"
            return $false
        }
    }
    
    $certbotDir = "$CertDir/letsencrypt"
    New-Item -ItemType Directory -Path $certbotDir -Force | Out-Null
    
    # Generate Let's Encrypt certificate
    $certbotArgs = @(
        "certonly",
        "--standalone",
        "--agree-tos",
        "--no-eff-email",
        "--email", "admin@$Domain",
        "--domains", $Domain,
        "--config-dir", $certbotDir,
        "--work-dir", "$certbotDir/work",
        "--logs-dir", "$certbotDir/logs"
    )
    
    if ($Renew) {
        $certbotArgs = @("renew", "--config-dir", $certbotDir)
    }
    
    & certbot @certbotArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to generate Let's Encrypt certificate" "ERROR"
        return $false
    }
    
    # Copy certificates to standard location
    $letsencryptCertDir = "$certbotDir/live/$Domain"
    if (Test-Path $letsencryptCertDir) {
        Copy-Item "$letsencryptCertDir/privkey.pem" "$CertDir/prod-private-key.pem" -Force
        Copy-Item "$letsencryptCertDir/fullchain.pem" "$CertDir/prod-certificate.pem" -Force
        Copy-Item "$letsencryptCertDir/chain.pem" "$CertDir/prod-chain.pem" -Force
        
        Write-Log "Production certificate generated successfully" "SUCCESS"
        return $true
    }
    else {
        Write-Log "Certificate directory not found: $letsencryptCertDir" "ERROR"
        return $false
    }
}

function New-CertificateRenewalScript {
    $renewalScript = @"
#!/usr/bin/env pwsh
# Automatic certificate renewal script
# Run this script via cron/scheduled task

param([string]`$Domain = "localhost")

`$scriptPath = Split-Path -Parent `$MyInvocation.MyCommand.Path
& "`$scriptPath/generate-certs.ps1" -Environment production -Domain `$Domain -Renew

# Restart services after renewal
if (`$LASTEXITCODE -eq 0) {
    Write-Host "Certificate renewed successfully. Restarting services..."
    
    # Restart Docker containers
    try {
        & docker-compose restart nginx
        & docker-compose restart api
        Write-Host "Services restarted successfully"
    }
    catch {
        Write-Host "Failed to restart services: `$_" -ForegroundColor Red
    }
}
"@
    
    Set-Content -Path "scripts/security/renew-certs.ps1" -Value $renewalScript
    Write-Log "Certificate renewal script created: scripts/security/renew-certs.ps1" "INFO"
}

function New-NginxSSLConfig {
    $nginxConfig = @"
# SSL Configuration for Nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;

# SSL Session Cache
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;

# Security Headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Certificate paths (update based on environment)
ssl_certificate /etc/ssl/certs/certificate.pem;
ssl_certificate_key /etc/ssl/private/private-key.pem;
"@
    
    Set-Content -Path "$ConfigDir/nginx-ssl.conf" -Value $nginxConfig
    Write-Log "Nginx SSL configuration created: $ConfigDir/nginx-ssl.conf" "INFO"
}

function Test-Certificate {
    param([string]$CertFile)
    
    if (-not (Test-Path $CertFile)) {
        Write-Log "Certificate file not found: $CertFile" "ERROR"
        return $false
    }
    
    Write-Log "Testing certificate: $CertFile" "INFO"
    
    # Check certificate validity
    $certInfo = & openssl x509 -in $CertFile -text -noout
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Invalid certificate format" "ERROR"
        return $false
    }
    
    # Check expiration
    $expiryDate = & openssl x509 -in $CertFile -noout -enddate
    Write-Log "Certificate expiry: $expiryDate" "INFO"
    
    return $true
}

# Main execution
Write-Log "Starting SSL certificate generation for $Environment environment"

if (-not (Test-OpenSSL)) {
    exit 1
}

$success = $false

switch ($Environment) {
    "development" {
        $success = New-DevelopmentCertificate -Domain $Domain
    }
    "staging" {
        $success = New-DevelopmentCertificate -Domain $Domain
    }
    "production" {
        $success = New-ProductionCertificate -Domain $Domain
    }
}

if ($success) {
    # Create additional configuration files
    New-CertificateRenewalScript
    New-NginxSSLConfig
    
    # Test generated certificates
    $certFile = switch ($Environment) {
        "development" { "$CertDir/dev-certificate.pem" }
        "staging" { "$CertDir/dev-certificate.pem" }
        "production" { "$CertDir/prod-certificate.pem" }
    }
    
    if (Test-Certificate -CertFile $certFile) {
        Write-Log "Certificate generation completed successfully!" "SUCCESS"
        Write-Log "Next steps:" "INFO"
        Write-Log "1. Update your application configuration to use the generated certificates" "INFO"
        Write-Log "2. For production, set up automatic renewal via cron/scheduled task" "INFO"
        Write-Log "3. Test HTTPS connectivity" "INFO"
    }
}
else {
    Write-Log "Certificate generation failed!" "ERROR"
    exit 1
}