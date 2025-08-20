package com.ecommerce.inventory.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Min;
import java.time.Duration;
import java.util.List;

/**
 * Application configuration properties for external configuration management
 */
@ConfigurationProperties(prefix = "app")
@Validated
public record ApplicationProperties(
    @Valid @NotNull CorsProperties cors,
    @Valid @NotNull RateLimitingProperties rateLimiting,
    @Valid @NotNull MonitoringProperties monitoring,
    @Valid @NotNull BusinessProperties business
) {

    /**
     * CORS configuration properties
     */
    public record CorsProperties(
        List<String> allowedOrigins,
        List<String> allowedMethods,
        List<String> allowedHeaders,
        boolean allowCredentials,
        @Positive long maxAge
    ) {}

    /**
     * Rate limiting configuration properties
     */
    public record RateLimitingProperties(
        boolean enabled,
        @Positive int requestsPerMinute,
        @Positive int burstCapacity
    ) {}

    /**
     * Monitoring configuration properties
     */
    public record MonitoringProperties(
        @Valid @NotNull MetricsProperties metrics,
        @Valid @NotNull AlertsProperties alerts
    ) {

        /**
         * Metrics configuration
         */
        public record MetricsProperties(
            boolean enabled,
            @NotNull Duration exportInterval
        ) {}

        /**
         * Alerts configuration
         */
        public record AlertsProperties(
            boolean enabled,
            String webhookUrl,
            List<String> emailRecipients
        ) {}
    }

    /**
     * Business logic configuration properties
     */
    public record BusinessProperties(
        @Valid @NotNull InventoryProperties inventory,
        @Valid @NotNull OrdersProperties orders,
        @Valid @NotNull ReportsProperties reports
    ) {

        /**
         * Inventory management configuration
         */
        public record InventoryProperties(
            @NotNull Duration lowStockCheckInterval,
            @Min(1) int reorderAlertThreshold
        ) {}

        /**
         * Order processing configuration
         */
        public record OrdersProperties(
            @NotNull Duration autoCancelTimeout,
            @NotNull Duration processingTimeout
        ) {}

        /**
         * Reports configuration
         */
        public record ReportsProperties(
            @NotNull Duration generationTimeout,
            @Min(1) int retentionDays
        ) {}
    }
}