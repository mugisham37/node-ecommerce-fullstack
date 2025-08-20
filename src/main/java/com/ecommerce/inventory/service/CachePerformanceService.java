package com.ecommerce.inventory.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Cache Performance Monitoring and Alerting Service
 * Provides comprehensive performance monitoring and alerting for cache operations
 */
@Service
public class CachePerformanceService {

    private static final Logger logger = LoggerFactory.getLogger(CachePerformanceService.class);

    private final CacheService cacheService;
    private final CacheMonitoringService cacheMonitoringService;
    private final MeterRegistry meterRegistry;

    // Performance thresholds
    private static final double LOW_HIT_RATE_THRESHOLD = 0.5; // 50%
    private static final double HIGH_EVICTION_RATE_THRESHOLD = 0.1; // 10%
    private static final long HIGH_LOAD_TIME_THRESHOLD = 1000; // 1 second
    private static final long HIGH_CACHE_SIZE_THRESHOLD = 10000; // 10,000 entries

    // Performance tracking
    private final Map<String, PerformanceMetrics> performanceHistory = new ConcurrentHashMap<>();
    private final AtomicLong alertCount = new AtomicLong(0);

    // Metrics
    private final Counter performanceAlerts;
    private final Timer cacheOperationLatency;

    public CachePerformanceService(CacheService cacheService,
                                 CacheMonitoringService cacheMonitoringService,
                                 MeterRegistry meterRegistry) {
        this.cacheService = cacheService;
        this.cacheMonitoringService = cacheMonitoringService;
        this.meterRegistry = meterRegistry;

        // Initialize metrics
        this.performanceAlerts = Counter.builder("cache.performance.alerts")
                .description("Number of cache performance alerts generated")
                .register(meterRegistry);

        this.cacheOperationLatency = Timer.builder("cache.operation.latency")
                .description("Cache operation latency")
                .register(meterRegistry);
    }

    /**
     * Scheduled performance monitoring and alerting
     */
    @Scheduled(fixedRate = 120000) // Every 2 minutes
    public void monitorCachePerformance() {
        try {
            logger.debug("Starting cache performance monitoring at {}", LocalDateTime.now());

            CacheMonitoringService.CacheMonitoringReport report = cacheMonitoringService.getCacheMonitoringReport();
            
            // Analyze performance for each cache
            for (Map.Entry<String, CacheMonitoringService.CacheMetrics> entry : report.getCacheMetrics().entrySet()) {
                String cacheName = entry.getKey();
                CacheMonitoringService.CacheMetrics metrics = entry.getValue();
                
                analyzeAndAlertCachePerformance(cacheName, metrics);
                updatePerformanceHistory(cacheName, metrics);
            }

            // Generate overall performance summary
            generatePerformanceSummary(report);

        } catch (Exception e) {
            logger.error("Failed to monitor cache performance", e);
        }
    }

    /**
     * Analyze cache performance and generate alerts if needed
     */
    private void analyzeAndAlertCachePerformance(String cacheName, CacheMonitoringService.CacheMetrics metrics) {
        // Check hit rate
        if (metrics.getHitRate() < LOW_HIT_RATE_THRESHOLD) {
            generateAlert(AlertType.LOW_HIT_RATE, cacheName, 
                String.format("Low hit rate: %.2f%% (threshold: %.2f%%)", 
                    metrics.getHitRate() * 100, LOW_HIT_RATE_THRESHOLD * 100));
        }

        // Check eviction rate
        if (metrics.getEvictionRate() > HIGH_EVICTION_RATE_THRESHOLD) {
            generateAlert(AlertType.HIGH_EVICTION_RATE, cacheName,
                String.format("High eviction rate: %.2f%% (threshold: %.2f%%)",
                    metrics.getEvictionRate() * 100, HIGH_EVICTION_RATE_THRESHOLD * 100));
        }

        // Check load time
        if (metrics.getAverageLoadTime() > HIGH_LOAD_TIME_THRESHOLD) {
            generateAlert(AlertType.HIGH_LOAD_TIME, cacheName,
                String.format("High load time: %.0f ms (threshold: %d ms)",
                    metrics.getAverageLoadTime(), HIGH_LOAD_TIME_THRESHOLD));
        }

        // Check cache size
        if (metrics.getSize() > HIGH_CACHE_SIZE_T