package com.ecommerce.inventory.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import org.springframework.boot.actuator.autoconfigure.metrics.MeterRegistryCustomizer;
import org.springframework.boot.actuator.health.HealthEndpoint;
import org.springframework.boot.actuator.health.HealthIndicator;
import org.springframework.boot.actuator.info.InfoEndpoint;
import org.springframework.boot.actuator.metrics.MetricsEndpoint;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.actuator.endpoint.annotation.Endpoint;
import org.springframework.boot.actuator.endpoint.annotation.ReadOperation;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.HashMap;
import java.time.LocalDateTime;

/**
 * Comprehensive Spring Boot Actuator configuration for monitoring and observability
 */
@Configuration
public class ActuatorConfig {

    /**
     * Customize the meter registry with application-specific tags and configurations
     */
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> {
            registry.config()
                .commonTags(
                    "application", "inventory-management",
                    "version", "1.0.0",
                    "environment", System.getProperty("spring.profiles.active", "default")
                );
        };
    }

    /**
     * Custom endpoint for business metrics
     */
    @Component
    @Endpoint(id = "business-metrics")
    public static class BusinessMetricsEndpoint {

        private final MeterRegistry meterRegistry;

        public BusinessMetricsEndpoint(MeterRegistry meterRegistry) {
            this.meterRegistry = meterRegistry;
        }

        @ReadOperation
        public Map<String, Object> businessMetrics() {
            Map<String, Object> metrics = new HashMap<>();
            
            // Get inventory-related metrics
            metrics.put("inventory.low_stock_alerts", getCounterValue("inventory.low_stock_alerts"));
            metrics.put("inventory.stock_adjustments", getCounterValue("inventory.stock_adjustments"));
            metrics.put("inventory.allocation_requests", getCounterValue("inventory.allocation_requests"));
            
            // Get order-related metrics
            metrics.put("orders.created", getCounterValue("orders.created"));
            metrics.put("orders.cancelled", getCounterValue("orders.cancelled"));
            metrics.put("orders.fulfilled", getCounterValue("orders.fulfilled"));
            
            // Get system performance metrics
            metrics.put("cache.hit_ratio", getGaugeValue("cache.hit_ratio"));
            metrics.put("database.connection_pool.active", getGaugeValue("database.connection_pool.active"));
            
            metrics.put("timestamp", LocalDateTime.now());
            
            return metrics;
        }

        private double getCounterValue(String counterName) {
            Counter counter = meterRegistry.find(counterName).counter();
            return counter != null ? counter.count() : 0.0;
        }

        private double getGaugeValue(String gaugeName) {
            Gauge gauge = meterRegistry.find(gaugeName).gauge();
            return gauge != null ? gauge.value() : 0.0;
        }
    }

    /**
     * Custom endpoint for system status
     */
    @Component
    @Endpoint(id = "system-status")
    public static class SystemStatusEndpoint {

        @ReadOperation
        public Map<String, Object> systemStatus() {
            Map<String, Object> status = new HashMap<>();
            
            // JVM metrics
            Runtime runtime = Runtime.getRuntime();
            status.put("jvm.memory.total", runtime.totalMemory());
            status.put("jvm.memory.free", runtime.freeMemory());
            status.put("jvm.memory.used", runtime.totalMemory() - runtime.freeMemory());
            status.put("jvm.memory.max", runtime.maxMemory());
            status.put("jvm.processors", runtime.availableProcessors());
            
            // System properties
            status.put("java.version", System.getProperty("java.version"));
            status.put("os.name", System.getProperty("os.name"));
            status.put("os.version", System.getProperty("os.version"));
            
            // Application info
            status.put("spring.profiles.active", System.getProperty("spring.profiles.active", "default"));
            status.put("timestamp", LocalDateTime.now());
            status.put("uptime", System.currentTimeMillis());
            
            return status;
        }
    }
}