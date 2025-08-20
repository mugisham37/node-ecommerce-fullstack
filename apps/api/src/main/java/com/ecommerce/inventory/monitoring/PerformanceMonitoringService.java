package com.ecommerce.inventory.monitoring;

import com.ecommerce.inventory.metrics.CustomMetricsConfig;
import com.ecommerce.inventory.logging.StructuredLogger;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for comprehensive performance monitoring with custom dashboards
 */
@Service
public class PerformanceMonitoringService {

    private static final StructuredLogger logger = StructuredLogger.getLogger(PerformanceMonitoringService.class);

    private final MeterRegistry meterRegistry;
    private final CustomMetricsConfig metricsConfig;
    private final AlertingService alertingService;

    // Performance thresholds
    private static final long SLOW_REQUEST_THRESHOLD_MS = 2000;
    private static final long SLOW_DATABASE_QUERY_THRESHOLD_MS = 1000;
    private static final long SLOW_CACHE_OPERATION_THRESHOLD_MS = 100;
    private static final double HIGH_MEMORY_USAGE_THRESHOLD = 85.0;
    private static final double HIGH_CPU_USAGE_THRESHOLD = 80.0;
    private static final int HIGH_ERROR_RATE_THRESHOLD = 10; // errors per minute

    // Performance tracking
    private final Map<String, PerformanceMetrics> operationMetrics = new ConcurrentHashMap<>();
    private final AtomicLong totalRequests = new AtomicLong(0);
    private final AtomicLong totalErrors = new AtomicLong(0);
    private final AtomicLong slowRequests = new AtomicLong(0);

    @Autowired
    public PerformanceMonitoringService(MeterRegistry meterRegistry, 
                                      CustomMetricsConfig metricsConfig,
                                      AlertingService alertingService) {
        this.meterRegistry = meterRegistry;
        this.metricsConfig = metricsConfig;
        this.alertingService = alertingService;
        initializePerformanceMetrics();
    }

    private void initializePerformanceMetrics() {
        // Register custom gauges for performance monitoring
        Gauge.builder("performance.request.total")
                .description("Total number of requests processed")
                .register(meterRegistry, totalRequests, AtomicLong::get);

        Gauge.builder("performance.request.errors")
                .description("Total number of request errors")
                .register(meterRegistry, totalErrors, AtomicLong::get);

        Gauge.builder("performance.request.slow")
                .description("Total number of slow requests")
                .register(meterRegistry, slowRequests, AtomicLong::get);

        Gauge.builder("performance.error_rate")
                .description("Current error rate percentage")
                .register(meterRegistry, this, this::calculateErrorRate);

        Gauge.builder("performance.slow_request_rate")
                .description("Current slow request rate percentage")
                .register(meterRegistry, this, this::calculateSlowRequestRate);
    }

    /**
     * Record request performance metrics
     */
    public void recordRequestPerformance(String operation, long durationMs, boolean success) {
        totalRequests.incrementAndGet();
        
        if (!success) {
            totalErrors.incrementAndGet();
        }
        
        if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
            slowRequests.incrementAndGet();
            logger.logSlowOperation(operation, durationMs, SLOW_REQUEST_THRESHOLD_MS);
        }

        // Update operation-specific metrics
        operationMetrics.computeIfAbsent(operation, k -> new PerformanceMetrics())
                .recordExecution(durationMs, success);

        // Check for performance alerts
        checkPerformanceThresholds(operation, durationMs, success);
    }

    /**
     * Record database query performance
     */
    public void recordDatabaseQueryPerformance(String queryType, long executionTimeMs, int recordCount) {
        logger.logDatabaseQuery(queryType, executionTimeMs, recordCount);
        
        if (executionTimeMs > SLOW_DATABASE_QUERY_THRESHOLD_MS) {
            alertingService.sendAlert(
                AlertType.SLOW_DATABASE_QUERY,
                String.format("Slow database query detected: %s took %d ms", queryType, executionTimeMs),
                AlertSeverity.WARNING
            );
        }
    }

    /**
     * Record cache operation performance
     */
    public void recordCachePerformance(String operation, String cacheName, boolean hit, long durationMs) {
        logger.logCacheOperation(operation, cacheName, "unknown", hit, durationMs);
        
        if (durationMs > SLOW_CACHE_OPERATION_THRESHOLD_MS) {
            alertingService.sendAlert(
                AlertType.SLOW_CACHE_OPERATION,
                String.format("Slow cache operation detected: %s on %s took %d ms", operation, cacheName, durationMs),
                AlertSeverity.WARNING
            );
        }
    }

    /**
     * Get performance dashboard data
     */
    public PerformanceDashboard getPerformanceDashboard() {
        return PerformanceDashboard.builder()
                .timestamp(LocalDateTime.now())
                .totalRequests(totalRequests.get())
                .totalErrors(totalErrors.get())
                .slowRequests(slowRequests.get())
                .errorRate(calculateErrorRate())
                .slowRequestRate(calculateSlowRequestRate())
                .memoryUsage(getMemoryUsagePercentage())
                .operationMetrics(new HashMap<>(operationMetrics))
                .systemMetrics(getSystemMetrics())
                .build();
    }

    /**
     * Get system resource metrics
     */
    public SystemMetrics getSystemMetrics() {
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        long maxMemory = runtime.maxMemory();

        return SystemMetrics.builder()
                .memoryUsed(usedMemory)
                .memoryTotal(totalMemory)
                .memoryMax(maxMemory)
                .memoryUsagePercentage(getMemoryUsagePercentage())
                .availableProcessors(runtime.availableProcessors())
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Scheduled task to monitor system performance
     */
    @Scheduled(fixedRate = 60000) // Every minute
    public void monitorSystemPerformance() {
        double memoryUsage = getMemoryUsagePercentage();
        
        if (memoryUsage > HIGH_MEMORY_USAGE_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.HIGH_MEMORY_USAGE,
                String.format("High memory usage detected: %.2f%%", memoryUsage),
                memoryUsage > 95 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING
            );
        }

        // Check error rate
        double errorRate = calculateErrorRate();
        if (errorRate > HIGH_ERROR_RATE_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.HIGH_ERROR_RATE,
                String.format("High error rate detected: %.2f%%", errorRate),
                errorRate > 20 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING
            );
        }

        logger.logPerformance("SYSTEM_MONITORING", System.currentTimeMillis());
    }

    /**
     * Scheduled task to generate performance reports
     */
    @Scheduled(cron = "0 0 * * * *") // Every hour
    public void generatePerformanceReport() {
        PerformanceDashboard dashboard = getPerformanceDashboard();
        
        logger.info("Performance Report - Requests: {}, Errors: {}, Error Rate: {:.2f}%, Memory Usage: {:.2f}%",
                   dashboard.getTotalRequests(),
                   dashboard.getTotalErrors(),
                   dashboard.getErrorRate(),
                   dashboard.getMemoryUsage());

        // Reset hourly counters for some metrics
        resetHourlyCounters();
    }

    private void checkPerformanceThresholds(String operation, long durationMs, boolean success) {
        if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
            alertingService.sendAlert(
                AlertType.SLOW_REQUEST,
                String.format("Slow request detected: %s took %d ms", operation, durationMs),
                AlertSeverity.WARNING
            );
        }

        if (!success) {
            alertingService.sendAlert(
                AlertType.REQUEST_ERROR,
                String.format("Request error in operation: %s", operation),
                AlertSeverity.WARNING
            );
        }
    }

    private double calculateErrorRate() {
        long total = totalRequests.get();
        if (total == 0) return 0.0;
        return (double) totalErrors.get() / total * 100.0;
    }

    private double calculateSlowRequestRate() {
        long total = totalRequests.get();
        if (total == 0) return 0.0;
        return (double) slowRequests.get() / total * 100.0;
    }

    private double getMemoryUsagePercentage() {
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        return (double) usedMemory / totalMemory * 100.0;
    }

    private void resetHourlyCounters() {
        // Reset some counters for hourly reporting
        operationMetrics.values().forEach(PerformanceMetrics::resetHourlyCounters);
    }

    // ========== INNER CLASSES ==========

    public static class PerformanceMetrics {
        private final AtomicLong totalExecutions = new AtomicLong(0);
        private final AtomicLong totalErrors = new AtomicLong(0);
        private final AtomicLong totalDuration = new AtomicLong(0);
        private final AtomicLong slowExecutions = new AtomicLong(0);

        public void recordExecution(long durationMs, boolean success) {
            totalExecutions.incrementAndGet();
            totalDuration.addAndGet(durationMs);
            
            if (!success) {
                totalErrors.incrementAndGet();
            }
            
            if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
                slowExecutions.incrementAndGet();
            }
        }

        public void resetHourlyCounters() {
            // Keep cumulative counters, reset only rate-based ones if needed
        }

        // Getters
        public long getTotalExecutions() { return totalExecutions.get(); }
        public long getTotalErrors() { return totalErrors.get(); }
        public long getAverageDuration() { 
            long executions = totalExecutions.get();
            return executions > 0 ? totalDuration.get() / executions : 0;
        }
        public double getErrorRate() {
            long executions = totalExecutions.get();
            return executions > 0 ? (double) totalErrors.get() / executions * 100.0 : 0.0;
        }
        public double getSlowExecutionRate() {
            long executions = totalExecutions.get();
            return executions > 0 ? (double) slowExecutions.get() / executions * 100.0 : 0.0;
        }
    }

    public static class PerformanceDashboard {
        private final LocalDateTime timestamp;
        private final long totalRequests;
        private final long totalErrors;
        private final long slowRequests;
        private final double errorRate;
        private final double slowRequestRate;
        private final double memoryUsage;
        private final Map<String, PerformanceMetrics> operationMetrics;
        private final SystemMetrics systemMetrics;

        private PerformanceDashboard(Builder builder) {
            this.timestamp = builder.timestamp;
            this.totalRequests = builder.totalRequests;
            this.totalErrors = builder.totalErrors;
            this.slowRequests = builder.slowRequests;
            this.errorRate = builder.errorRate;
            this.slowRequestRate = builder.slowRequestRate;
            this.memoryUsage = builder.memoryUsage;
            this.operationMetrics = builder.operationMetrics;
            this.systemMetrics = builder.systemMetrics;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public LocalDateTime getTimestamp() { return timestamp; }
        public long getTotalRequests() { return totalRequests; }
        public long getTotalErrors() { return totalErrors; }
        public long getSlowRequests() { return slowRequests; }
        public double getErrorRate() { return errorRate; }
        public double getSlowRequestRate() { return slowRequestRate; }
        public double getMemoryUsage() { return memoryUsage; }
        public Map<String, PerformanceMetrics> getOperationMetrics() { return operationMetrics; }
        public SystemMetrics getSystemMetrics() { return systemMetrics; }

        public static class Builder {
            private LocalDateTime timestamp;
            private long totalRequests;
            private long totalErrors;
            private long slowRequests;
            private double errorRate;
            private double slowRequestRate;
            private double memoryUsage;
            private Map<String, PerformanceMetrics> operationMetrics;
            private SystemMetrics systemMetrics;

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public Builder totalRequests(long totalRequests) {
                this.totalRequests = totalRequests;
                return this;
            }

            public Builder totalErrors(long totalErrors) {
                this.totalErrors = totalErrors;
                return this;
            }

            public Builder slowRequests(long slowRequests) {
                this.slowRequests = slowRequests;
                return this;
            }

            public Builder errorRate(double errorRate) {
                this.errorRate = errorRate;
                return this;
            }

            public Builder slowRequestRate(double slowRequestRate) {
                this.slowRequestRate = slowRequestRate;
                return this;
            }

            public Builder memoryUsage(double memoryUsage) {
                this.memoryUsage = memoryUsage;
                return this;
            }

            public Builder operationMetrics(Map<String, PerformanceMetrics> operationMetrics) {
                this.operationMetrics = operationMetrics;
                return this;
            }

            public Builder systemMetrics(SystemMetrics systemMetrics) {
                this.systemMetrics = systemMetrics;
                return this;
            }

            public PerformanceDashboard build() {
                return new PerformanceDashboard(this);
            }
        }
    }

    public static class SystemMetrics {
        private final long memoryUsed;
        private final long memoryTotal;
        private final long memoryMax;
        private final double memoryUsagePercentage;
        private final int availableProcessors;
        private final LocalDateTime timestamp;

        private SystemMetrics(Builder builder) {
            this.memoryUsed = builder.memoryUsed;
            this.memoryTotal = builder.memoryTotal;
            this.memoryMax = builder.memoryMax;
            this.memoryUsagePercentage = builder.memoryUsagePercentage;
            this.availableProcessors = builder.availableProcessors;
            this.timestamp = builder.timestamp;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public long getMemoryUsed() { return memoryUsed; }
        public long getMemoryTotal() { return memoryTotal; }
        public long getMemoryMax() { return memoryMax; }
        public double getMemoryUsagePercentage() { return memoryUsagePercentage; }
        public int getAvailableProcessors() { return availableProcessors; }
        public LocalDateTime getTimestamp() { return timestamp; }

        public static class Builder {
            private long memoryUsed;
            private long memoryTotal;
            private long memoryMax;
            private double memoryUsagePercentage;
            private int availableProcessors;
            private LocalDateTime timestamp;

            public Builder memoryUsed(long memoryUsed) {
                this.memoryUsed = memoryUsed;
                return this;
            }

            public Builder memoryTotal(long memoryTotal) {
                this.memoryTotal = memoryTotal;
                return this;
            }

            public Builder memoryMax(long memoryMax) {
                this.memoryMax = memoryMax;
                return this;
            }

            public Builder memoryUsagePercentage(double memoryUsagePercentage) {
                this.memoryUsagePercentage = memoryUsagePercentage;
                return this;
            }

            public Builder availableProcessors(int availableProcessors) {
                this.availableProcessors = availableProcessors;
                return this;
            }

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public SystemMetrics build() {
                return new SystemMetrics(this);
            }
        }
    }
}