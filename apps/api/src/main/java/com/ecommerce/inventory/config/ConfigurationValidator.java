package com.ecommerce.inventory.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuration validator to ensure all required environment variables are present
 */
@Component
public class ConfigurationValidator {

    private static final Logger logger = LoggerFactory.getLogger(ConfigurationValidator.class);

    private final Environment environment;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    public ConfigurationValidator(Environment environment) {
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validateConfiguration() {
        logger.info("Validating configuration for profile: {}", activeProfile);

        List<String> missingProperties = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // Validate common required properties
        validateCommonProperties(missingProperties, warnings);

        // Validate profile-specific properties
        switch (activeProfile) {
            case "prod" -> validateProductionProperties(missingProperties, warnings);
            case "staging" -> validateStagingProperties(missingProperties, warnings);
            case "dev" -> validateDevelopmentProperties(missingProperties, warnings);
        }

        // Report validation results
        if (!missingProperties.isEmpty()) {
            logger.error("Missing required configuration properties:");
            missingProperties.forEach(prop -> logger.error("  - {}", prop));
            throw new IllegalStateException("Missing required configuration properties. See logs for details.");
        }

        if (!warnings.isEmpty()) {
            logger.warn("Configuration warnings:");
            warnings.forEach(warning -> logger.warn("  - {}", warning));
        }

        logger.info("Configuration validation completed successfully");
    }

    private void validateCommonProperties(List<String> missing, List<String> warnings) {
        // JWT configuration
        validateRequired("jwt.secret", missing);
        validateMinLength("jwt.secret", 32, warnings);

        // Database configuration
        validateRequired("spring.datasource.url", missing);
        validateRequired("spring.datasource.username", missing);
        validateRequired("spring.datasource.password", missing);

        // Redis configuration
        validateRequired("spring.redis.host", missing);
    }

    private void validateProductionProperties(List<String> missing, List<String> warnings) {
        // Production-specific validations
        validateRequired("DATABASE_URL", missing);
        validateRequired("DATABASE_USERNAME", missing);
        validateRequired("DATABASE_PASSWORD", missing);
        validateRequired("JWT_SECRET", missing);

        // SSL configuration for production
        if (environment.getProperty("server.ssl.enabled", Boolean.class, false)) {
            validateRequired("server.ssl.key-store", missing);
            validateRequired("server.ssl.key-store-password", missing);
        } else {
            warnings.add("SSL is not enabled in production environment");
        }

        // Cloud storage validation
        if (environment.getProperty("file.upload.cloud-storage.enabled", Boolean.class, false)) {
            validateRequired("file.upload.cloud-storage.bucket-name", missing);
            validateRequired("file.upload.cloud-storage.access-key", missing);
            validateRequired("file.upload.cloud-storage.secret-key", missing);
        }

        // CORS validation
        String corsOrigins = environment.getProperty("app.cors.allowed-origins");
        if (corsOrigins == null || corsOrigins.trim().isEmpty()) {
            warnings.add("CORS allowed origins not configured - API will not be accessible from browsers");
        }

        // Monitoring validation
        if (environment.getProperty("app.monitoring.alerts.enabled", Boolean.class, false)) {
            String webhookUrl = environment.getProperty("app.monitoring.alerts.webhook-url");
            String emailRecipients = environment.getProperty("app.monitoring.alerts.email-recipients");
            if ((webhookUrl == null || webhookUrl.trim().isEmpty()) && 
                (emailRecipients == null || emailRecipients.trim().isEmpty())) {
                warnings.add("Alerts are enabled but no webhook URL or email recipients configured");
            }
        }
    }

    private void validateStagingProperties(List<String> missing, List<String> warnings) {
        // Staging-specific validations
        validateRequired("DATABASE_URL", missing);
        validateRequired("JWT_SECRET", missing);

        // Warn about development-like settings in staging
        if (environment.getProperty("logging.level.com.ecommerce.inventory", "INFO").equals("DEBUG")) {
            warnings.add("Debug logging enabled in staging environment");
        }
    }

    private void validateDevelopmentProperties(List<String> missing, List<String> warnings) {
        // Development-specific validations (minimal)
        String jwtSecret = environment.getProperty("jwt.secret");
        if ("mySecretKey123456789012345678901234567890".equals(jwtSecret)) {
            warnings.add("Using default JWT secret in development - change for other environments");
        }
    }

    private void validateRequired(String property, List<String> missing) {
        String value = environment.getProperty(property);
        if (value == null || value.trim().isEmpty()) {
            missing.add(property);
        }
    }

    private void validateMinLength(String property, int minLength, List<String> warnings) {
        String value = environment.getProperty(property);
        if (value != null && value.length() < minLength) {
            warnings.add(String.format("%s should be at least %d characters long", property, minLength));
        }
    }
}