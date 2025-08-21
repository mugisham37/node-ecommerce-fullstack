# Secret Management

This directory contains environment-specific configuration files for managing secrets and sensitive data.

## Files

- `.env.example` - Template file showing all required environment variables
- `.env.development` - Development environment configuration
- `.env.staging` - Staging environment configuration  
- `.env.production` - Production environment configuration (uses environment variable substitution)

## Security Guidelines

### Development
- Use the provided development values for local development
- Never commit real secrets to version control
- Use test/sandbox API keys only

### Staging/Production
- All sensitive values should be injected via environment variables
- Use secret management services (AWS Secrets Manager, Azure Key Vault, etc.)
- Rotate secrets regularly
- Use strong, unique passwords and keys

## Environment Variable Injection

Production and staging configurations use `${VARIABLE_NAME}` syntax to inject secrets from the environment. This allows:

1. **Container orchestration** - Secrets injected via Kubernetes secrets, Docker secrets, etc.
2. **CI/CD pipelines** - Secrets managed in GitHub Actions, GitLab CI, etc.
3. **Cloud services** - Integration with AWS Secrets Manager, Azure Key Vault, etc.

## Usage

```bash
# Load development environment
cp config/secrets/.env.development .env

# Load staging environment (with secret injection)
export DATABASE_PASSWORD="actual-staging-password"
export JWT_SECRET="actual-jwt-secret"
# ... other secrets
cp config/secrets/.env.staging .env

# For production, use your deployment system to inject secrets
```

## Secret Rotation

1. Generate new secrets using `scripts/security/generate-secrets.ps1`
2. Update secrets in your secret management system
3. Deploy with zero-downtime using blue-green deployment
4. Verify all services are using new secrets
5. Revoke old secrets

## Compliance

- All secrets are encrypted at rest
- Access is logged and audited
- Secrets are never logged or exposed in error messages
- Regular security scans are performed