#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Generate secure secrets and keys for the application
.DESCRIPTION
    Generates cryptographically secure secrets, API keys, and certificates
    for different environments with proper entropy and complexity.
.PARAMETER Environment
    Target environment: development, staging, production
.PARAMETER SecretType
    Type of secret to generate: all, jwt, encryption, api-keys, passwords
.PARAMETER Length
    Length of generated secrets (default: 32)
.EXAMPLE
    .\generate-secrets.ps1 -Environment development
    .\generate-secrets.ps1 -SecretType jwt -Length 64
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("all", "jwt", "encryption", "api-keys", "passwords")]
    [string]$SecretType = "all",
    
    [Parameter(Mandatory = $false)]
    [int]$Length = 32
)

# Import required modules
Add-Type -AssemblyName System.Security

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

function New-SecureSecret {
    param(
        [int]$Length = 32,
        [string]$CharacterSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-="
    )
    
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $bytes = New-Object byte[] $Length
    $rng.GetBytes($bytes)
    
    $secret = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $secret += $CharacterSet[$bytes[$i] % $CharacterSet.Length]
    }
    
    $rng.Dispose()
    return $secret
}

function New-Base64Secret {
    param([int]$Length = 32)
    
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $bytes = New-Object byte[] $Length
    $rng.GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
    $rng.Dispose()
    return $secret
}

function New-HexSecret {
    param([int]$Length = 32)
    
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $bytes = New-Object byte[] ($Length / 2)
    $rng.GetBytes($bytes)
    $secret = [BitConverter]::ToString($bytes) -replace '-', ''
    $rng.Dispose()
    return $secret.ToLower()
}

function New-JWTSecrets {
    Write-Log "Generating JWT secrets..." "INFO"
    
    $secrets = @{
        JWT_SECRET = New-Base64Secret -Length 64
        JWT_REFRESH_SECRET = New-Base64Secret -Length 64
        JWT_SIGNING_KEY = New-HexSecret -Length 64
    }
    
    return $secrets
}

function New-EncryptionKeys {
    Write-Log "Generating encryption keys..." "INFO"
    
    $secrets = @{
        ENCRYPTION_KEY = New-HexSecret -Length 64  # 32 bytes = 256 bits
        HASH_SALT = New-Base64Secret -Length 32
        SESSION_SECRET = New-SecureSecret -Length 64
        COOKIE_SECRET = New-SecureSecret -Length 32
    }
    
    return $secrets
}

function New-APIKeys {
    Write-Log "Generating API keys..." "INFO"
    
    $secrets = @{
        API_KEY = "ak_" + (New-HexSecret -Length 32)
        WEBHOOK_SECRET = "whsec_" + (New-Base64Secret -Length 32)
        RATE_LIMIT_SECRET = New-HexSecret -Length 32
        CSRF_SECRET = New-Base64Secret -Length 32
    }
    
    return $secrets
}

function New-DatabasePasswords {
    Write-Log "Generating database passwords..." "INFO"
    
    # Use alphanumeric + safe special chars for database passwords
    $dbCharSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    
    $secrets = @{
        DATABASE_PASSWORD = New-SecureSecret -Length 24 -CharacterSet $dbCharSet
        REDIS_PASSWORD = New-SecureSecret -Length 24 -CharacterSet $dbCharSet
        ADMIN_PASSWORD = New-SecureSecret -Length 32 -CharacterSet $dbCharSet
    }
    
    return $secrets
}

function Export-Secrets {
    param(
        [hashtable]$Secrets,
        [string]$Environment
    )
    
    $outputDir = "config/secrets/generated"
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $filename = "$outputDir/secrets-$Environment-$timestamp.env"
    
    $content = @"
# Generated secrets for $Environment environment
# Generated on: $(Get-Date)
# WARNING: Keep these secrets secure and never commit to version control

"@
    
    foreach ($key in $Secrets.Keys | Sort-Object) {
        $content += "`n$key=$($Secrets[$key])"
    }
    
    Set-Content -Path $filename -Value $content
    
    # Set restrictive permissions (Windows)
    try {
        $acl = Get-Acl $filename
        $acl.SetAccessRuleProtection($true, $false)
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
            "FullControl",
            "Allow"
        )
        $acl.SetAccessRule($accessRule)
        Set-Acl -Path $filename -AclObject $acl
        Write-Log "Set restrictive permissions on secrets file" "INFO"
    }
    catch {
        Write-Log "Could not set file permissions: $_" "WARN"
    }
    
    Write-Log "Secrets exported to: $filename" "SUCCESS"
    return $filename
}

function New-KeyPair {
    Write-Log "Generating RSA key pair..." "INFO"
    
    try {
        $rsa = [System.Security.Cryptography.RSA]::Create(4096)
        
        $privateKey = [Convert]::ToBase64String($rsa.ExportRSAPrivateKey())
        $publicKey = [Convert]::ToBase64String($rsa.ExportRSAPublicKey())
        
        $rsa.Dispose()
        
        return @{
            PRIVATE_KEY = $privateKey
            PUBLIC_KEY = $publicKey
        }
    }
    catch {
        Write-Log "Failed to generate RSA key pair: $_" "ERROR"
        return @{}
    }
}

function Test-SecretStrength {
    param([string]$Secret)
    
    $score = 0
    $feedback = @()
    
    # Length check
    if ($Secret.Length -ge 32) { $score += 2 }
    elseif ($Secret.Length -ge 16) { $score += 1 }
    else { $feedback += "Secret should be at least 16 characters long" }
    
    # Character variety
    if ($Secret -cmatch '[A-Z]') { $score += 1 }
    if ($Secret -cmatch '[a-z]') { $score += 1 }
    if ($Secret -cmatch '[0-9]') { $score += 1 }
    if ($Secret -cmatch '[^A-Za-z0-9]') { $score += 1 }
    
    # Entropy check (simplified)
    $uniqueChars = ($Secret.ToCharArray() | Sort-Object -Unique).Count
    if ($uniqueChars -ge ($Secret.Length * 0.7)) { $score += 1 }
    
    $strength = switch ($score) {
        { $_ -ge 6 } { "Strong" }
        { $_ -ge 4 } { "Medium" }
        default { "Weak" }
    }
    
    return @{
        Score = $score
        Strength = $strength
        Feedback = $feedback
    }
}

function Show-SecretSummary {
    param([hashtable]$AllSecrets)
    
    Write-Log "=== Secret Generation Summary ===" "INFO"
    Write-Log "Environment: $Environment" "INFO"
    Write-Log "Total secrets generated: $($AllSecrets.Count)" "INFO"
    
    foreach ($key in $AllSecrets.Keys | Sort-Object) {
        $strength = Test-SecretStrength -Secret $AllSecrets[$key]
        $maskedSecret = $AllSecrets[$key].Substring(0, [Math]::Min(8, $AllSecrets[$key].Length)) + "..."
        Write-Log "$key : $maskedSecret [$($strength.Strength)]" "INFO"
    }
}

# Main execution
Write-Log "Starting secret generation for $Environment environment" "INFO"

$allSecrets = @{}

# Generate secrets based on type
switch ($SecretType) {
    "all" {
        $allSecrets += New-JWTSecrets
        $allSecrets += New-EncryptionKeys
        $allSecrets += New-APIKeys
        $allSecrets += New-DatabasePasswords
        $allSecrets += New-KeyPair
    }
    "jwt" {
        $allSecrets += New-JWTSecrets
    }
    "encryption" {
        $allSecrets += New-EncryptionKeys
    }
    "api-keys" {
        $allSecrets += New-APIKeys
    }
    "passwords" {
        $allSecrets += New-DatabasePasswords
    }
}

if ($allSecrets.Count -gt 0) {
    # Export secrets
    $secretsFile = Export-Secrets -Secrets $allSecrets -Environment $Environment
    
    # Show summary
    Show-SecretSummary -AllSecrets $allSecrets
    
    Write-Log "Secret generation completed successfully!" "SUCCESS"
    Write-Log "Next steps:" "INFO"
    Write-Log "1. Review the generated secrets file: $secretsFile" "INFO"
    Write-Log "2. Copy secrets to your environment configuration" "INFO"
    Write-Log "3. Delete the generated file after copying secrets" "INFO"
    Write-Log "4. Never commit secrets to version control" "INFO"
    
    if ($Environment -eq "production") {
        Write-Log "PRODUCTION ENVIRONMENT DETECTED!" "WARN"
        Write-Log "- Store secrets in a secure secret management system" "WARN"
        Write-Log "- Use environment variable injection" "WARN"
        Write-Log "- Enable secret rotation" "WARN"
        Write-Log "- Audit secret access regularly" "WARN"
    }
}
else {
    Write-Log "No secrets were generated!" "ERROR"
    exit 1
}