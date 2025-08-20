package com.ecommerce.inventory.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.stats.CacheStats;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Cache Monitoring Service
 * Provides comprehensive monitoring and alerting for cache performance
 */
@Service
public class CacheMonitoringService {

    private static final Logger logger = LoggerFactory.getLogger(CacheMonitoringService.class);

    private final CacheService cacheService;
    private final CacheManager redisCacheManager;
    private final CacheManager caffeineCacheManager;
    private final MeterRegistry meterRegistry;

    // Named Caffeine caches for monitoring
    private final Cache<String, Object> productLocalCache;
    private final Cache<String, Object> inventoryLocalCache;
    private final Cache<String, Object> userSessionCache;
    private final Cache<String, Object> searchResultsCache;
    private final Cache<String, Object> categoryHierarchyCache;

    // Monitoring metrics
    private final AtomicLong totalCacheSize = new AtomicLong(0);
    private final AtomicLong totalHitRate = new AtomicLong(0);
    private final Map<String, CacheMetrics> cacheMetricsMap = new HashMap<>();

    public CacheMonitoringService(CacheService cacheService,
                                CacheManager redisCacheManager,
                                CacheManager caffeineCacheManager,
                                Cache<String, Object> productLocalCache,
                                Cache<String, Object> inventoryLocalCache,
                                Cache<String, Object> userSessionCache,
                                Cache<String, Object> searchResultsCache,
                                Cache<String, Object> categoryHierarchyCache,
                                MeterRegistry meterRegistry) {
        
        this.cacheService = cacheService;
        this.redisCacheManager = redisCacheManager;
        this.caffeineCacheManager = caffeineCacheManager;
        this.productLocalCache = productLocalCache;
        this.inventoryLocalCache = inventoryLocalCache;
        this.userSessionCache = userSessionCache;
        this.searchResultsCache = searchResultsCache;
        this.categoryHierarchyCache = categoryHierarchyCache;
        this.meterRegistry = meterRegistry;

        // Register gauges for monitoring
        registerCacheGauges();
    }

    /**
     * Scheduled task to collect cache metrics and perform monitoring
     */
    @Scheduled(fixedRate = 60000) // Every minute
    public void collectCacheMetrics() {
        try {
            logger.debug("Collecting cache metrics at {}", LocalDateTime.now());

            // Collect metrics for each cache
            collectCacheMetrics("products", productLocalCache);
            collectCacheMetrics("inventory", inventoryLocalCache);
            collectCacheMetrics("users", userSessionCache);
            collectCacheMetrics("search", searchResultsCache);
            collectCacheMetrics("categories", categoryHierarchyCache);

            // Calculate overall metrics
            calculateOverallMetrics();

            // Check for performance issues
            checkCachePerformance();

        } catch (Exception e) {
            logger.error("Failed to collect cache metrics", e);
        }
    }

    /**
     * Scheduled task to perform cache maintenance and optimization
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    public void performCacheMaintenance() {
        try {
            logger.debug("Performing cache maintenance at {}", LocalDateTime.now());

            // Clean up expired entries (Caffeine handles this automatically, but we can log it)
            logCacheStatistics();

            // Check for memory pressure and suggest optimizations
            checkMemoryPressure();

        } catch (Exception e) {
            logger.error("Failed to perform cache maintenance", e);
        }
    }

    /**
     * Get comprehensive cache monitoring report
     */
    public CacheMonitoringReport getCacheMonitoringReport() {
        Map<String, CacheMetrics> currentMetrics = new HashMap<>(cacheMetricsMap);
        
        return CacheMonitoringReport.builder()
                .cacheMetrics(currentMetrics)
                .totalCacheSize(totalCacheSize.get())
                .overallHitRate(calculateOverallHitRate())
                .timestamp(LocalDateTime.now())
                .recommendations(generateRecommendations())
                .build();
    }

    /**
     * Check cache performance and generate alerts if needed
     */
    private void checkCachePerformance() {
        for (Map.Entry<String, CacheMetrics> entry : cacheMetricsMap.entrySet()) {
            String cacheName = entry.getKey();
            CacheMetrics metrics = entry.getValue();

            // Check hit rate
            if (metrics.getHitRate() < 0.5) { // Less than 50% hit rate
                logger.warn("Low cache hit rate detected for cache '{}': {:.2f}%", 
                          cacheName, metrics.getHitRate() * 100);
            }

            // Check eviction rate
            if (metrics.getEvictionRate() > 0.1) { // More than 10% eviction rate
                logger.warn("High cache eviction rate detected for cache '{}': {:.2f}%", 
                          cacheName, metrics.getEvictionRate() * 100);
            }

            // Check load time
            if (metrics.getAverageLoadTime() > 1000) { // More than 1 second
                logger.warn("Slow cache load time detected for cache '{}': {} ms", 
                          cacheName, metrics.getAverageLoadTime());
            }
        }
    }

    /**
     * Check for memory pressure and suggest optimizations
     */
    private void checkMemoryPressure() {
        long totalSize = totalCacheSize.get();
        
        // If total cache size is very large, suggest optimization
        if (totalSize > 50000) { // More than 50,000 entries across all caches
            logger.warn("High cache memory usage detected. Total entries: {}. Consider optimizing cache sizes.", totalSize);
        }

        // Check individual cache sizes
        for (Map.Entry<String, CacheMetrics> entry : cacheMetricsMap.entrySet()) {
            String cacheName = entry.getKey();
            CacheMetrics metrics = entry.getValue();

            if (metrics.getSize() > 10000) { // Individual cache too large
                logger.warn("Large cache size detected for '{}': {} entries", cacheName, metrics.getSize());
            }
        }
    }

    /**
     * Collect metrics for a specific cache
     */
    private void collectCacheMetrics(String cacheName, Cache<String, Object> cache) {
        CacheStats stats = cache.stats();
        
        CacheMetrics metrics = CacheMetrics.builder()
                .cacheName(cacheName)
                .size(cache.estimatedSize())
                .hitCount(stats.hitCount())
                .missCount(stats.missCount())
                .hitRate(stats.hitRate())
                .evictionCount(stats.evictionCount())
                .evictionRate(calculateEvictionRate(stats))
                .averageLoadTime(stats.averageLoadPenalty() / 1_000_000) // Convert to milliseconds
                .timestamp(LocalDateTime.now())
                .build();

        cacheMetricsMap.put(cacheName, metrics);
    }

    /**
     * Calculate overall cache metrics
     */
    private void calculateOverallMetrics() {
        long totalSize = cacheMetricsMap.values().stream()
                .mapToLong(CacheMetrics::getSize)
                .sum();
        
        totalCacheSize.set(totalSize);
    }

    /**
     * Calculate overall hit rate across all caches
     */
    private double calculateOverallHitRate() {
        long totalHits = cacheMetricsMap.values().stream()
                .mapToLong(CacheMetrics::getHitCount)
                .sum();
        
        long totalRequests = cacheMetricsMap.values().stream()
                .mapToLong(m -> m.getHitCount() + m.getMissCount())
                .sum();

        return totalRequests > 0 ? (double) totalHits / totalRequests : 0.0;
    }

    /**
     * Calculate eviction rate for cache stats
     */
    private double calculateEvictionRate(CacheStats stats) {
        long totalRequests = stats.hitCount() + stats.missCount();
        return totalRequests > 0 ? (double) stats.evictionCount() / totalRequests : 0.0;
    }

    /**
     * Log cache statistics for monitoring
     */
    private void logCacheStatistics() {
        for (Map.Entry<String, CacheMetrics> entry : cacheMetricsMap.entrySet()) {
            CacheMetrics metrics = entry.getValue();
            logger.info("Cache '{}' - Size: {}, Hit Rate: {:.2f}%, Evictions: {}", 
                      metrics.getCacheName(), 
                      metrics.getSize(), 
                      metrics.getHitRate() * 100, 
                      metrics.getEvictionCount());
        }
    }

    /**
     * Generate performance recommendations
     */
    private Map<String, String> generateRecommendations() {
        Map<String, String> recommendations = new HashMap<>();

        for (Map.Entry<String, CacheMetrics> entry : cacheMetricsMap.entrySet()) {
            String cacheName = entry.getKey();
            CacheMetrics metrics = entry.getValue();

            if (metrics.getHitRate() < 0.5) {
                recommendations.put(cacheName + "_hit_rate", 
                    "Consider increasing cache size or TTL to improve hit rate");
            }

            if (metrics.getEvictionRate() > 0.1) {
                recommendations.put(cacheName + "_eviction_rate", 
                    "High eviction rate - consider increasing cache size");
            }

            if (metrics.getAverageLoadTime() > 1000) {
                recommendations.put(cacheName + "_load_time", 
                    "Slow cache loading - optimize data source queries");
            }
        }

        return recommendations;
    }

    /**
     * Register Micrometer gauges for cache monitoring
     */
    private void registerCacheGauges() {
        // Total cache size gauge
        Gauge.builder("cache.size.total")
                .description("Total number of entries across all caches")
                .register(meterRegistry, this, CacheMonitoringService::getTotalCacheSize);

        // Overall hit rate gauge
        Gauge.builder("cache.hit.rate.overall")
                .description("Overall cache hit rate across all caches")
                .register(meterRegistry, this, CacheMonitoringService::getOverallHitRate);

        // Individual cache size gauges
        registerIndividualCacheGauges("products", productLocalCache);
        registerIndividualCacheGauges("inventory", inventoryLocalCache);
        registerIndividualCacheGauges("users", userSessionCache);
        registerIndividualCacheGauges("search", searchResultsCache);
        registerIndividualCacheGauges("categories", categoryHierarchyCache);
    }

    /**
     * Register gauges for individual caches
     */
    private void registerIndividualCacheGauges(String cacheName, Cache<String, Object> cache) {
        Gauge.builder("cache.size")
                .description("Cache size")
                .tag("cache", cacheName)
                .register(meterRegistry, cache, Cache::estimatedSize);

        Gauge.builder("cache.hit.rate")
                .description("Cache hit rate")
                .tag("cache", cacheName)
                .register(meterRegistry, cache, c -> c.stats().hitRate());
    }

    // Getter methods for metrics
    public double getTotalCacheSize() {
        return totalCacheSize.get();
    }

    public double getOverallHitRate() {
        return calculateOverallHitRate();
    }

    /**
     * Cache metrics data class
     */
    public static class CacheMetrics {
        private final String cacheName;
        private final long size;
        private final long hitCount;
        private final long missCount;
        private final double hitRate;
        private final long evictionCount;
        private final double evictionRate;
        private final double averageLoadTime;
        private final LocalDateTime timestamp;

        private CacheMetrics(Builder builder) {
            this.cacheName = builder.cacheName;
            this.size = builder.size;
            this.hitCount = builder.hitCount;
            this.missCount = builder.missCount;
            this.hitRate = builder.hitRate;
            this.evictionCount = builder.evictionCount;
            this.evictionRate = builder.evictionRate;
            this.averageLoadTime = builder.averageLoadTime;
            this.timestamp = builder.timestamp;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public String getCacheName() { return cacheName; }
        public long getSize() { return size; }
        public long getHitCount() { return hitCount; }
        public long getMissCount() { return missCount; }
        public double getHitRate() { return hitRate; }
        public long getEvictionCount() { return evictionCount; }
        public double getEvictionRate() { return evictionRate; }
        public double getAverageLoadTime() { return averageLoadTime; }
        public LocalDateTime getTimestamp() { return timestamp; }

        public static class Builder {
            private String cacheName;
            private long size;
            private long hitCount;
            private long missCount;
            private double hitRate;
            private long evictionCount;
            private double evictionRate;
            private double averageLoadTime;
            private LocalDateTime timestamp;

            public Builder cacheName(String cacheName) {
                this.cacheName = cacheName;
                return this;
            }

            public Builder size(long size) {
                this.size = size;
                return this;
            }

            public Builder hitCount(long hitCount) {
                this.hitCount = hitCount;
                return this;
            }

            public Builder missCount(long missCount) {
                this.missCount = missCount;
                return this;
            }

            public Builder hitRate(double hitRate) {
                this.hitRate = hitRate;
                return this;
            }

            public Builder evictionCount(long evictionCount) {
                this.evictionCount = evictionCount;
                return this;
            }

            public Builder evictionRate(double evictionRate) {
                this.evictionRate = evictionRate;
                return this;
            }

            public Builder averageLoadTime(double averageLoadTime) {
                this.averageLoadTime = averageLoadTime;
                return this;
            }

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public CacheMetrics build() {
                return new CacheMetrics(this);
            }
        }
    }

    /**
     * Cache monitoring report data class
     */
    public static class CacheMonitoringReport {
        private final Map<String, CacheMetrics> cacheMetrics;
        private final long totalCacheSize;
        private final double overallHitRate;
        private final LocalDateTime timestamp;
        private final Map<String, String> recommendations;

        private CacheMonitoringReport(Builder builder) {
            this.cacheMetrics = builder.cacheMetrics;
            this.totalCacheSize = builder.totalCacheSize;
            this.overallHitRate = builder.overallHitRate;
            this.timestamp = builder.timestamp;
            this.recommendations = builder.recommendations;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public Map<String, CacheMetrics> getCacheMetrics() { return cacheMetrics; }
        public long getTotalCacheSize() { return totalCacheSize; }
        public double getOverallHitRate() { return overallHitRate; }
        public LocalDateTime getTimestamp() { return timestamp; }
        public Map<String, String> getRecommendations() { return recommendations; }

        public static class Builder {
            private Map<String, CacheMetrics> cacheMetrics;
            private long totalCacheSize;
            private double overallHitRate;
            private LocalDateTime timestamp;
            private Map<String, String> recommendations;

            public Builder cacheMetrics(Map<String, CacheMetrics> cacheMetrics) {
                this.cacheMetrics = cacheMetrics;
                return this;
            }

            public Builder totalCacheSize(long totalCacheSize) {
                this.totalCacheSize = totalCacheSize;
                return this;
            }

            public Builder overallHitRate(double overallHitRate) {
                this.overallHitRate = overallHitRate;
                return this;
            }

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public Builder recommendations(Map<String, String> recommendations) {
                this.recommendations = recommendations;
                return this;
            }

            public CacheMonitoringReport build() {
                return new CacheMonitoringReport(this);
            }
        }
    }
}