package com.ecommerce.inventory.service;

import com.ecommerce.inventory.config.RedisConfig;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.stats.CacheStats;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Multi-Level Cache Service
 * Provides intelligent cache management with fallback mechanisms between local and distributed caches
 */
@Service
public class CacheService {

    private static final Logger logger = LoggerFactory.getLogger(CacheService.class);

    private final CacheManager redisCacheManager;
    private final CacheManager caffeineCacheManager;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisConfig.RedisKeyNamingStrategy keyNamingStrategy;
    
    // Named Caffeine caches
    private final Cache<String, Object> productLocalCache;
    private final Cache<String, Object> inventoryLocalCache;
    private final Cache<String, Object> userSessionCache;
    private final Cache<String, Object> searchResultsCache;
    private final Cache<String, Object> categoryHierarchyCache;

    // Metrics
    private final Counter cacheHits;
    private final Counter cacheMisses;
    private final Counter cacheErrors;
    private final Timer cacheOperationTimer;
    
    // Cache relationship tracking for intelligent invalidation
    private final Map<String, Set<String>> cacheRelationships = new ConcurrentHashMap<>();

    public CacheService(CacheManager redisCacheManager,
                       CacheManager caffeineCacheManager,
                       RedisTemplate<String, Object> redisTemplate,
                       RedisConfig.RedisKeyNamingStrategy keyNamingStrategy,
                       Cache<String, Object> productLocalCache,
                       Cache<String, Object> inventoryLocalCache,
                       Cache<String, Object> userSessionCache,
                       Cache<String, Object> searchResultsCache,
                       Cache<String, Object> categoryHierarchyCache,
                       MeterRegistry meterRegistry) {
        
        this.redisCacheManager = redisCacheManager;
        this.caffeineCacheManager = caffeineCacheManager;
        this.redisTemplate = redisTemplate;
        this.keyNamingStrategy = keyNamingStrategy;
        this.productLocalCache = productLocalCache;
        this.inventoryLocalCache = inventoryLocalCache;
        this.userSessionCache = userSessionCache;
        this.searchResultsCache = searchResultsCache;
        this.categoryHierarchyCache = categoryHierarchyCache;

        // Initialize metrics
        this.cacheHits = Counter.builder("cache.hits")
                .description("Number of cache hits")
                .register(meterRegistry);
        
        this.cacheMisses = Counter.builder("cache.misses")
                .description("Number of cache misses")
                .register(meterRegistry);
        
        this.cacheErrors = Counter.builder("cache.errors")
                .description("Number of cache operation errors")
                .register(meterRegistry);
        
        this.cacheOperationTimer = Timer.builder("cache.operation.duration")
                .description("Cache operation execution time")
                .register(meterRegistry);

        // Initialize cache relationships
        initializeCacheRelationships();
    }

    /**
     * Get value from multi-level cache with fallback mechanism
     */
    public <T> Optional<T> get(String cacheName, String key, Class<T> type) {
        Timer.Sample sample = Timer.start();
        
        try {
            // Try local cache first (fastest)
            Optional<T> localResult = getFromLocalCache(cacheName, key, type);
            if (localResult.isPresent()) {
                cacheHits.increment("level", "local");
                logger.debug("Cache hit in local cache: {}:{}", cacheName, key);
                return localResult;
            }

            // Try Redis cache (distributed)
            Optional<T> redisResult = getFromRedisCache(cacheName, key, type);
            if (redisResult.isPresent()) {
                cacheHits.increment("level", "redis");
                logger.debug("Cache hit in Redis cache: {}:{}", cacheName, key);
                
                // Populate local cache for next access
                putInLocalCache(cacheName, key, redisResult.get());
                return redisResult;
            }

            cacheMisses.increment();
            logger.debug("Cache miss for: {}:{}", cacheName, key);
            return Optional.empty();
            
        } catch (Exception e) {
            logger.error("Cache get operation failed for {}:{}", cacheName, key, e);
            cacheErrors.increment();
            return Optional.empty();
        } finally {
            sample.stop(cacheOperationTimer);
        }
    }

    /**
     * Get value with fallback to data source
     */
    public <T> T getOrLoad(String cacheName, String key, Class<T> type, Supplier<T> dataLoader) {
        Optional<T> cached = get(cacheName, key, type);
        
        if (cached.isPresent()) {
            return cached.get();
        }

        // Load from data source
        T value = dataLoader.get();
        if (value != null) {
            put(cacheName, key, value);
        }
        
        return value;
    }

    /**
     * Put value in both local and Redis cache
     */
    public void put(String cacheName, String key, Object value) {
        Timer.Sample sample = Timer.start();
        
        try {
            // Put in both caches
            CompletableFuture<Void> localPut = CompletableFuture.runAsync(() -> 
                putInLocalCache(cacheName, key, value));
            
            CompletableFuture<Void> redisPut = CompletableFuture.runAsync(() -> 
                putInRedisCache(cacheName, key, value));
            
            // Wait for both operations to complete
            CompletableFuture.allOf(localPut, redisPut).join();
            
            logger.debug("Cache put completed for: {}:{}", cacheName, key);
            
        } catch (Exception e) {
            logger.error("Cache put operation failed for {}:{}", cacheName, key, e);
            cacheErrors.increment();
        } finally {
            sample.stop(cacheOperationTimer);
        }
    }

    /**
     * Evict key from all cache levels
     */
    public void evict(String cacheName, String key) {
        Timer.Sample sample = Timer.start();
        
        try {
            // Evict from both caches
            evictFromLocalCache(cacheName, key);
            evictFromRedisCache(cacheName, key);
            
            logger.debug("Cache eviction completed for: {}:{}", cacheName, key);
            
        } catch (Exception e) {
            logger.error("Cache eviction failed for {}:{}", cacheName, key, e);
            cacheErrors.increment();
        } finally {
            sample.stop(cacheOperationTimer);
        }
    }

    /**
     * Intelligent cache invalidation based on entity relationships
     */
    public void invalidateRelatedCaches(String entityType, Object entityId) {
        Set<String> relatedCaches = cacheRelationships.get(entityType);
        
        if (relatedCaches != null) {
            for (String cacheName : relatedCaches) {
                try {
                    clearCache(cacheName);
                    logger.debug("Invalidated related cache: {} for entity: {}:{}", 
                               cacheName, entityType, entityId);
                } catch (Exception e) {
                    logger.error("Failed to invalidate related cache: {} for entity: {}:{}", 
                               cacheName, entityType, entityId, e);
                    cacheErrors.increment();
                }
            }
        }
    }

    /**
     * Clear entire cache
     */
    public void clearCache(String cacheName) {
        try {
            // Clear local cache
            org.springframework.cache.Cache localCache = caffeineCacheManager.getCache(cacheName + "-local");
            if (localCache != null) {
                localCache.clear();
            }

            // Clear Redis cache
            org.springframework.cache.Cache redisCache = redisCacheManager.getCache(cacheName);
            if (redisCache != null) {
                redisCache.clear();
            }

            logger.debug("Cache cleared: {}", cacheName);
            
        } catch (Exception e) {
            logger.error("Failed to clear cache: {}", cacheName, e);
            cacheErrors.increment();
        }
    }

    /**
     * Get comprehensive cache statistics
     */
    public CacheStatistics getCacheStatistics() {
        Map<String, CacheStats> localStats = new HashMap<>();
        
        // Collect local cache statistics
        localStats.put("products", productLocalCache.stats());
        localStats.put("inventory", inventoryLocalCache.stats());
        localStats.put("users", userSessionCache.stats());
        localStats.put("search", searchResultsCache.stats());
        localStats.put("categories", categoryHierarchyCache.stats());

        return CacheStatistics.builder()
                .localCacheStats(localStats)
                .totalHits(cacheHits.count())
                .totalMisses(cacheMisses.count())
                .totalErrors(cacheErrors.count())
                .timestamp(LocalDateTime.now())
                .build();
    }

    // Private helper methods

    @SuppressWarnings("unchecked")
    private <T> Optional<T> getFromLocalCache(String cacheName, String key, Class<T> type) {
        try {
            Cache<String, Object> cache = getLocalCacheByName(cacheName);
            if (cache != null) {
                Object value = cache.getIfPresent(key);
                if (value != null && type.isInstance(value)) {
                    return Optional.of((T) value);
                }
            }
        } catch (Exception e) {
            logger.warn("Local cache get failed for {}:{}", cacheName, key, e);
        }
        return Optional.empty();
    }

    @SuppressWarnings("unchecked")
    private <T> Optional<T> getFromRedisCache(String cacheName, String key, Class<T> type) {
        try {
            org.springframework.cache.Cache cache = redisCacheManager.getCache(cacheName);
            if (cache != null) {
                org.springframework.cache.Cache.ValueWrapper wrapper = cache.get(key);
                if (wrapper != null && wrapper.get() != null && type.isInstance(wrapper.get())) {
                    return Optional.of((T) wrapper.get());
                }
            }
        } catch (Exception e) {
            logger.warn("Redis cache get failed for {}:{}", cacheName, key, e);
        }
        return Optional.empty();
    }

    private void putInLocalCache(String cacheName, String key, Object value) {
        try {
            Cache<String, Object> cache = getLocalCacheByName(cacheName);
            if (cache != null) {
                cache.put(key, value);
            }
        } catch (Exception e) {
            logger.warn("Local cache put failed for {}:{}", cacheName, key, e);
        }
    }

    private void putInRedisCache(String cacheName, String key, Object value) {
        try {
            org.springframework.cache.Cache cache = redisCacheManager.getCache(cacheName);
            if (cache != null) {
                cache.put(key, value);
            }
        } catch (Exception e) {
            logger.warn("Redis cache put failed for {}:{}", cacheName, key, e);
        }
    }

    private void evictFromLocalCache(String cacheName, String key) {
        try {
            Cache<String, Object> cache = getLocalCacheByName(cacheName);
            if (cache != null) {
                cache.invalidate(key);
            }
        } catch (Exception e) {
            logger.warn("Local cache eviction failed for {}:{}", cacheName, key, e);
        }
    }

    private void evictFromRedisCache(String cacheName, String key) {
        try {
            org.springframework.cache.Cache cache = redisCacheManager.getCache(cacheName);
            if (cache != null) {
                cache.evict(key);
            }
        } catch (Exception e) {
            logger.warn("Redis cache eviction failed for {}:{}", cacheName, key, e);
        }
    }

    private Cache<String, Object> getLocalCacheByName(String cacheName) {
        return switch (cacheName) {
            case "products" -> productLocalCache;
            case "inventory" -> inventoryLocalCache;
            case "users" -> userSessionCache;
            case "search" -> searchResultsCache;
            case "categories" -> categoryHierarchyCache;
            default -> null;
        };
    }

    private void initializeCacheRelationships() {
        // Product changes affect inventory, search, and category caches
        cacheRelationships.put("product", Set.of("products", "inventory", "search", "categories"));
        
        // Inventory changes affect product and search caches
        cacheRelationships.put("inventory", Set.of("products", "inventory", "search"));
        
        // Category changes affect product and search caches
        cacheRelationships.put("category", Set.of("products", "categories", "search"));
        
        // User changes affect user cache
        cacheRelationships.put("user", Set.of("users"));
        
        // Order changes affect inventory and product caches
        cacheRelationships.put("order", Set.of("inventory", "products"));
        
        // Supplier changes affect product cache
        cacheRelationships.put("supplier", Set.of("products", "suppliers"));
    }

    /**
     * Evict inventory cache for a specific product
     */
    public void evictInventoryCache(Long productId) {
        evict("inventory", "product:" + productId);
        evict("inventory", "consolidated:" + productId);
        evict("inventory", "product-locations:" + productId);
    }

    /**
     * Evict product cache
     */
    public void evictProductCache() {
        clearCache("products");
    }

    /**
     * Cache statistics data class
     */
    public static class CacheStatistics {
        private final Map<String, CacheStats> localCacheStats;
        private final double totalHits;
        private final double totalMisses;
        private final double totalErrors;
        private final LocalDateTime timestamp;

        private CacheStatistics(Builder builder) {
            this.localCacheStats = builder.localCacheStats;
            this.totalHits = builder.totalHits;
            this.totalMisses = builder.totalMisses;
            this.totalErrors = builder.totalErrors;
            this.timestamp = builder.timestamp;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public Map<String, CacheStats> getLocalCacheStats() { return localCacheStats; }
        public double getTotalHits() { return totalHits; }
        public double getTotalMisses() { return totalMisses; }
        public double getTotalErrors() { return totalErrors; }
        public LocalDateTime getTimestamp() { return timestamp; }

        public static class Builder {
            private Map<String, CacheStats> localCacheStats;
            private double totalHits;
            private double totalMisses;
            private double totalErrors;
            private LocalDateTime timestamp;

            public Builder localCacheStats(Map<String, CacheStats> localCacheStats) {
                this.localCacheStats = localCacheStats;
                return this;
            }

            public Builder totalHits(double totalHits) {
                this.totalHits = totalHits;
                return this;
            }

            public Builder totalMisses(double totalMisses) {
                this.totalMisses = totalMisses;
                return this;
            }

            public Builder totalErrors(double totalErrors) {
                this.totalErrors = totalErrors;
                return this;
            }

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public CacheStatistics build() {
                return new CacheStatistics(this);
            }
        }
    }
}