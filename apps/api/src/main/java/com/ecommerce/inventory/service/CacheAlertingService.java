package com.ecommerce.inventory.service;

import com.github.benmanes.caffeine.cache.stats.CacheStats;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Cache Performance Monitoring and Alerting Service
 * Monitors cache performance metrics and generates alerts for performance issues
 */
@Service
public class CacheAlertingService {

    private static final Logger logger = LoggerFactory.getLogger(CacheAlertingService.class);

    private final CacheService cacheService;
    private final ApplicationEventPublisher eventPublisher;
    private final MeterRegistry meterRegistry;

    // Configuration thresholds
    @Value("${cache.alerting.hit-ratio.threshold:0.8}")
    private double hitRatioThreshold;

    @Value("${cache.alerting.error-rate.threshold:0.05}")
    private double errorRateThreshold;

    @Value("${cache.alerting.response-time.threshold:100}")
    private long responseTimeThreshold;

    @Value("${cache.alerting.enabled:true}")
    private boolean alertingEnabled;

    // Metrics tracking
    private final AtomicLong totalCacheOperations = new AtomicLong(0);
    private final AtomicLong totalCacheErrors = new AtomicLong(0);
    private final Map<String, CachePerformanceMetrics> cacheMetrics = new HashMap<>();

    // Alert counters
    private final Counter lowHitRatioAlerts;
    private final Counter highErrorRateAlerts;
    private final Counter slowResponseAlerts;

    public CacheAlertingService(CacheService cacheService,
                               ApplicationEventPublisher eventPublisher,
                               MeterRegistry meterRegistry) {
        this.cacheService = cacheService;
        this.eventPublisher = eventPublisher;
        this.meterRegistry = meterRegistry;

        // Initialize metrics
        this.lowHitRatioAlerts = Counter.builder("cache.alerts.low_hit_ratio")
                .description("Number of low hit ratio alerts")
                .register(meterRegistry);

        this.highErrorRateAlerts = Counter.builder("cache.alerts.high_error_rate")
                .description("Number of high error rate alerts")
                .register(meterRegistry);

        this.slowResponseAlerts = Counter.builder("cache.alerts.slow_response")
                .description("Number of slow response alerts")
                .register(meterRegistry);

        // Register gauges for real-time monitoring
        Gauge.builder("cache.performance.hit_ratio")
                .description("Overall cache hit ratio")
                .register(meterRegistry, this, CacheAlertingService::calculateOverallHitRatio);

        Gauge.builder("cache.performance.error_rate")
                .description("Overall cache error rate")
                .register(meterRegistry, this, CacheAlertingService::calculateOverallErrorRate);
    }

    /**
     * Monitor cache performance and generate alerts
     */
    @Scheduled(fixedRate = 60000) // Every minute
    public void monitorCachePerformance() {
        if (!alertingEnabled) {
            return;
        }

        try {
            logger.debug("Starting cache performance monitoring");

            CacheService.CacheStatistics stats = cacheService.getCacheStatistics();
            
            // Check overall performance metrics
            checkHitRatioThreshold(stats);
            checkErrorRateThreshold(stats);
            checkResponseTimeThreshold();

            // Check individual cache performance
            checkIndividualCachePerformance(stats);

            logger.debug("Cache performance monitoring completed");

        } catch (Exception e) {
            logger.error("Error during cache performance monitoring", e);
        }
    }

    /**
     * Check cache hit ratio threshold
     */
    private void checkHitRatioThreshold(CacheService.CacheStatistics stats) {
        double overallHitRatio = calculateHitRatio(stats.getTotalHits(), stats.getTotalMisses());
        
        if (overallHitRatio < hitRatioThreshold) {
            logger.warn("Cache hit ratio below threshold: {} < {}", overallHitRatio, hitRatioThreshold);
            
            lowHitRatioAlerts.increment();
            
            CachePerformanceAlert alert = CachePerformanceAlert.builder()
                    .alertType(AlertType.LOW_HIT_RATIO)
                    .severity(AlertSeverity.WARNING)
                    .message(String.format("Cache hit ratio is below threshold: %.2f%% < %.2f%%", 
                            overallHitRatio * 100, hitRatioThreshold * 100))
                    .currentValue(overallHitRatio)
                    .threshold(hitRatioThreshold)
                    .timestamp(LocalDateTime.now())
                    .build();

            publishAlert(alert);
        }
    }

    /**
     * Check cache error rate threshold
     */
    private void checkErrorRateThreshold(CacheService.CacheStatistics stats) {
        double errorRate = calculateOverallErrorRate();
        
        if (errorRate > errorRateThreshold) {
            logger.warn("Cache error rate above threshold: {} > {}", errorRate, errorRateThreshold);
            
            highErrorRateAlerts.increment();
            
            CachePerformanceAlert alert = CachePerformanceAlert.builder()
                    .alertType(AlertType.HIGH_ERROR_RATE)
                    .severity(AlertSeverity.CRITICAL)
                    .message(String.format("Cache error rate is above threshold: %.2f%% > %.2f%%", 
                            errorRate * 100, errorRateThreshold * 100))
                    .currentValue(errorRate)
                    .threshold(errorRateThreshold)
                    .timestamp(LocalDateTime.now())
                    .build();

            publishAlert(alert);
        }
    }

    /**
     * Check response time threshold
     */
    private void checkResponseTimeThreshold() {
        Timer cacheTimer = meterRegistry.find("cache.operation.duration").timer();
        
        if (cacheTimer != null) {
            double avgResponseTime = cacheTimer.mean(java.util.concurrent.TimeUnit.MILLISECONDS);
            
            if (avgResponseTime > responseTimeThreshold) {
                logger.warn("Cache response time above threshold: {}ms > {}ms", avgResponseTime, responseTimeThreshold);
                
                slowResponseAlerts.increment();
                
                CachePerformanceAlert alert = CachePerformanceAlert.builder()
                        .alertType(AlertType.SLOW_RESPONSE)
                        .severity(AlertSeverity.WARNING)
                        .message(String.format("Cache response time is above threshold: %.2fms > %dms", 
                                avgResponseTime, responseTimeThreshold))
                        .currentValue(avgResponseTime)
                        .threshold((double) responseTimeThreshold)
                        .timestamp(LocalDateTime.now())
                        .build();

                publishAlert(alert);
            }
        }
    }

    /**
     * Check individual cache performance
     */
    private void checkIndividualCachePerformance(CacheService.CacheStatistics stats) {
        Map<String, CacheStats> localStats = stats.getLocalCacheStats();
        
        for (Map.Entry<String, CacheStats> entry : localStats.entrySet()) {
            String cacheName = entry.getKey();
            CacheStats cacheStats = entry.getValue();
            
            double hitRatio = calculateHitRatio(cacheStats.hitCount(), cacheStats.missCount());
            
            if (hitRatio < hitRatioThreshold) {
                logger.warn("Cache '{}' hit ratio below threshold: {} < {}", cacheName, hitRatio, hitRatioThreshold);
                
                CachePerformanceAlert alert = CachePerformanceAlert.builder()
                        .alertType(AlertType.LOW_HIT_RATIO)
                        .severity(AlertSeverity.WARNING)
                        .cacheName(cacheName)
                        .message(String.format("Cache '%s' hit ratio is below threshold: %.2f%% < %.2f%%", 
                                cacheName, hitRatio * 100, hitRatioThreshold * 100))
                        .currentValue(hitRatio)
                        .threshold(hitRatioThreshold)
                        .timestamp(LocalDateTime.now())
                        .build();

                publishAlert(alert);
            }
        }
    }

    /**
     * Publish cache performance alert
     */
    private void publishAlert(CachePerformanceAlert alert) {
        try {
            eventPublisher.publishEvent(alert);
            logger.info("Published cache performance alert: {}", alert.getMessage());
        } catch (Exception e) {
            logger.error("Failed to publish cache performance alert", e);
        }
    }

    /**
     * Calculate hit ratio
     */
    private double calculateHitRatio(long hits, long misses) {
        long total = hits + misses;
        return total > 0 ? (double) hits / total : 0.0;
    }

    /**
     * Calculate overall hit ratio
     */
    private double calculateOverallHitRatio() {
        try {
            CacheService.CacheStatistics stats = cacheService.getCacheStatistics();
            return calculateHitRatio((long) stats.getTotalHits(), (long) stats.getTotalMisses());
        } catch (Exception e) {
            logger.warn("Failed to calculate overall hit ratio", e);
            return 0.0;
        }
    }

    /**
     * Calculate overall error rate
     */
    private double calculateOverallErrorRate() {
        long operations = totalCacheOperations.get();
        long errors = totalCacheErrors.get();
        return operations > 0 ? (double) errors / operations : 0.0;
    }

    /**
     * Record cache operation
     */
    public void recordCacheOperation(boolean success) {
        totalCacheOperations.incrementAndGet();
        if (!success) {
            totalCacheErrors.incrementAndGet();
        }
    }

    /**
     * Get cache performance summary
     */
    public CachePerformanceSummary getPerformanceSummary() {
        CacheService.CacheStatistics stats = cacheService.getCacheStatistics();
        
        return CachePerformanceSummary.builder()
                .overallHitRatio(calculateOverallHitRatio())
                .overallErrorRate(calculateOverallErrorRate())
                .totalOperations(totalCacheOperations.get())
                .totalErrors(totalCacheErrors.get())
                .alertCounts(Map.of(
                    "lowHitRatio", (long) lowHitRatioAlerts.count(),
                    "highErrorRate", (long) highErrorRateAlerts.count(),
                    "slowResponse", (long) slowResponseAlerts.count()
                ))
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Cache Performance Alert class
     */
    public static class CachePerformanceAlert {
        private final AlertType alertType;
        private final AlertSeverity severity;
        private final String cacheName;
        private final String message;
        private final double currentValue;
        private final double threshold;
        private final LocalDateTime timestamp;

        private CachePerformanceAlert(Builder builder) {
            this.alertType = builder.alertType;
            this.severity = builder.severity;
            this.cacheName = builder.cacheName;
            this.message = builder.message;
            this.currentValue = builder.currentValue;
            this.threshold = builder.threshold;
            this.timestamp = builder.timestamp;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public AlertType getAlertType() { return alertType; }
        public AlertSeverity getSeverity() { return severity; }
        public String getCacheName() { return cacheName; }
        public String getMessage() { return message; }
        public double getCurrentValue() { return currentValue; }
        public double getThreshold() { return threshold; }
        public LocalDateTime getTimestamp() { return timestamp; }

        public static class Builder {
            private AlertType alertType;
            private AlertSeverity severity;
            private String cacheName;
            private String message;
            private double currentValue;
            private double threshold;
            private LocalDateTime timestamp;

            public Builder alertType(AlertType alertType) {
                this.alertType = alertType;
                return this;
            }

            public Builder severity(AlertSeverity severity) {
                this.severity = severity;
                return this;
            }

            public Builder cacheName(String cacheName) {
                this.cacheName = cacheName;
                return this;
            }

            public Builder message(String message) {
                this.message = message;
                return this;
            }

            public Builder currentValue(double currentValue) {
                this.currentValue = currentValue;
                return this;
            }

            public Builder threshold(double threshold) {
                this.threshold = threshold;
                return this;
            }

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public CachePerformanceAlert build() {
                return new CachePerformanceAlert(this);
            }
        }
    }

    /**
     * Cache Performance Summary class
     */
    public static class CachePerformanceSummary {
        private final double overallHitRatio;
        private final double overallErrorRate;
        private final long totalOperations;
        private final long totalErrors;
        private final Map<String, Long> alertCounts;
        private final LocalDateTime timestamp;

        private CachePerformanceSummary(Builder builder) {
            this.overallHitRatio = builder.overallHitRatio;
            this.overallErrorRate = builder.overallErrorRate;
            this.totalOperations = builder.totalOperations;
            this.totalErrors = builder.totalErrors;
            this.alertCounts = builder.alertCounts;
            this.timestamp = builder.timestamp;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public double getOverallHitRatio() { return overallHitRatio; }
        public double getOverallErrorRate() { return overallErrorRate; }
        public long getTotalOperations() { return totalOperations; }
        public long getTotalErrors() { return totalErrors; }
        public Map<String, Long> getAlertCounts() { return alertCounts; }
        public LocalDateTime getTimestamp() { return timestamp; }

        public static class Builder {
            private double overallHitRatio;
            private double overallErrorRate;
            private long totalOperations;
            private long totalErrors;
            private Map<String, Long> alertCounts;
            private LocalDateTime timestamp;

            public Builder overallHitRatio(double overallHitRatio) {
                this.overallHitRatio = overallHitRatio;
                return this;
            }

            public Builder overallErrorRate(double overallErrorRate) {
                this.overallErrorRate = overallErrorRate;
                return this;
            }

            public Builder totalOperations(long totalOperations) {
                this.totalOperations = totalOperations;
                return this;
            }

            public Builder totalErrors(long totalErrors) {
                this.totalErrors = totalErrors;
                return this;
            }

            public Builder alertCounts(Map<String, Long> alertCounts) {
                this.alertCounts = alertCounts;
                return this;
            }

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public CachePerformanceSummary build() {
                return new CachePerformanceSummary(this);
            }
        }
    }

    /**
     * Cache performance metrics tracking
     */
    private static class CachePerformanceMetrics {
        private long hits;
        private long misses;
        private long errors;
        private double avgResponseTime;
        private LocalDateTime lastUpdated;

        // Getters and setters
        public long getHits() { return hits; }
        public void setHits(long hits) { this.hits = hits; }
        public long getMisses() { return misses; }
        public void setMisses(long misses) { this.misses = misses; }
        public long getErrors() { return errors; }
        public void setErrors(long errors) { this.errors = errors; }
        public double getAvgResponseTime() { return avgResponseTime; }
        public void setAvgResponseTime(double avgResponseTime) { this.avgResponseTime = avgResponseTime; }
        public LocalDateTime getLastUpdated() { return lastUpdated; }
        public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    }

    /**
     * Alert types
     */
    public enum AlertType {
        LOW_HIT_RATIO,
        HIGH_ERROR_RATE,
        SLOW_RESPONSE,
        CACHE_UNAVAILABLE
    }

    /**
     * Alert severity levels
     */
    public enum AlertSeverity {
        INFO,
        WARNING,
        CRITICAL
    }
}