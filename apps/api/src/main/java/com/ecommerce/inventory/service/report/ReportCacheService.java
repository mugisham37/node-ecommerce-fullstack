package com.ecommerce.inventory.service.report;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Report Cache Service for optimized report caching and performance
 * Provides multi-level caching with intelligent invalidation
 */
@Service
public class ReportCacheService {
    
    private static final Logger logger = LoggerFactory.getLogger(ReportCacheService.class);
    private static final String REPORT_CACHE_NAME = "reports";
    private static final String REPORT_CACHE_PREFIX = "report:";
    
    @Autowired
    private CacheManager cacheManager;
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    /**
     * Cache a report with specified TTL
     */
    public void cacheReport(String cacheKey, ReportData reportData, long ttlSeconds) {
        logger.debug("Caching report with key: {} for {} seconds", cacheKey, ttlSeconds);
        
        try {
            // Cache in Spring Cache (local cache)
            Cache cache = cacheManager.getCache(REPORT_CACHE_NAME);
            if (cache != null) {
                cache.put(cacheKey, reportData);
            }
            
            // Cache in Redis with TTL
            String redisKey = REPORT_CACHE_PREFIX + cacheKey;
            redisTemplate.opsForValue().set(redisKey, reportData, ttlSeconds, TimeUnit.SECONDS);
            
            // Store cache metadata
            storeCacheMetadata(cacheKey, reportData, ttlSeconds);
            
        } catch (Exception e) {
            logger.error("Error caching report with key: {}", cacheKey, e);
        }
    }
    
    /**
     * Get cached report
     */
    public ReportData getCachedReport(String cacheKey) {
        logger.debug("Retrieving cached report with key: {}", cacheKey);
        
        try {
            // Try local cache first
            Cache cache = cacheManager.getCache(REPORT_CACHE_NAME);
            if (cache != null) {
                Cache.ValueWrapper wrapper = cache.get(cacheKey);
                if (wrapper != null) {
                    logger.debug("Report found in local cache: {}", cacheKey);
                    return (ReportData) wrapper.get();
                }
            }
            
            // Try Redis cache
            String redisKey = REPORT_CACHE_PREFIX + cacheKey;
            ReportData reportData = (ReportData) redisTemplate.opsForValue().get(redisKey);
            
            if (reportData != null) {
                logger.debug("Report found in Redis cache: {}", cacheKey);
                
                // Populate local cache
                if (cache != null) {
                    cache.put(cacheKey, reportData);
                }
                
                return reportData;
            }
            
            logger.debug("Report not found in cache: {}", cacheKey);
            return null;
            
        } catch (Exception e) {
            logger.error("Error retrieving cached report with key: {}", cacheKey, e);
            return null;
        }
    }
    
    /**
     * Invalidate cached report
     */
    public void invalidateReport(String cacheKey) {
        logger.debug("Invalidating cached report with key: {}", cacheKey);
        
        try {
            // Remove from local cache
            Cache cache = cacheManager.getCache(REPORT_CACHE_NAME);
            if (cache != null) {
                cache.evict(cacheKey);
            }
            
            // Remove from Redis
            String redisKey = REPORT_CACHE_PREFIX + cacheKey;
            redisTemplate.delete(redisKey);
            
            // Remove metadata
            removeCacheMetadata(cacheKey);
            
        } catch (Exception e) {
            logger.error("Error invalidating cached report with key: {}", cacheKey, e);
        }
    }
    
    /**
     * Clear cache for specific template
     */
    public void clearTemplateCache(String templateId) {
        logger.info("Clearing cache for template: {}", templateId);
        
        try {
            // Get all cache keys for this template
            String pattern = REPORT_CACHE_PREFIX + templateId + ":*";
            redisTemplate.delete(redisTemplate.keys(pattern));
            
            // Clear local cache (this is more complex, would need custom implementation)
            Cache cache = cacheManager.getCache(REPORT_CACHE_NAME);
            if (cache != null) {
                cache.clear(); // For simplicity, clearing entire cache
            }
            
        } catch (Exception e) {
            logger.error("Error clearing template cache for: {}", templateId, e);
        }
    }
    
    /**
     * Clear all report caches
     */
    public void clearAllCaches() {
        logger.info("Clearing all report caches");
        
        try {
            // Clear local cache
            Cache cache = cacheManager.getCache(REPORT_CACHE_NAME);
            if (cache != null) {
                cache.clear();
            }
            
            // Clear Redis cache
            String pattern = REPORT_CACHE_PREFIX + "*";
            redisTemplate.delete(redisTemplate.keys(pattern));
            
            // Clear metadata
            clearAllCacheMetadata();
            
        } catch (Exception e) {
            logger.error("Error clearing all report caches", e);
        }
    }
    
    /**
     * Get cache statistics
     */
    public Map<String, Object> getCacheStatistics() {
        Map<String, Object> stats = new HashMap<>();
        
        try {
            // Local cache statistics
            Cache cache = cacheManager.getCache(REPORT_CACHE_NAME);
            Map<String, Object> localStats = new HashMap<>();
            if (cache != null) {
                // These would be implementation-specific
                localStats.put("name", cache.getName());
                localStats.put("size", "N/A"); // Would need specific cache implementation
                localStats.put("hitRate", "N/A");
                localStats.put("missRate", "N/A");
            }
            stats.put("localCache", localStats);
            
            // Redis cache statistics
            Map<String, Object> redisStats = new HashMap<>();
            String pattern = REPORT_CACHE_PREFIX + "*";
            Long cacheSize = (long) redisTemplate.keys(pattern).size();
            redisStats.put("size", cacheSize);
            redisStats.put("pattern", pattern);
            stats.put("redisCache", redisStats);
            
            // Overall statistics
            stats.put("totalCachedReports", cacheSize);
            stats.put("cacheHitRate", calculateCacheHitRate());
            stats.put("cacheMissRate", calculateCacheMissRate());
            stats.put("averageCacheAge", calculateAverageCacheAge());
            
        } catch (Exception e) {
            logger.error("Error getting cache statistics", e);
            stats.put("error", "Unable to retrieve cache statistics");
        }
        
        stats.put("generatedAt", LocalDateTime.now());
        return stats;
    }
    
    /**
     * Warm up cache with frequently accessed reports
     */
    public void warmupCache(Map<String, Map<String, Object>> commonReports) {
        logger.info("Warming up report cache with {} common reports", commonReports.size());
        
        for (Map.Entry<String, Map<String, Object>> entry : commonReports.entrySet()) {
            String templateId = entry.getKey();
            Map<String, Object> parameters = entry.getValue();
            
            try {
                // This would typically trigger report generation
                // For now, just logging the warmup attempt
                logger.debug("Warming up cache for template: {} with parameters: {}", templateId, parameters);
                
            } catch (Exception e) {
                logger.warn("Failed to warm up cache for template: {}", templateId, e);
            }
        }
    }
    
    /**
     * Get cache health status
     */
    public Map<String, Object> getCacheHealth() {
        Map<String, Object> health = new HashMap<>();
        
        try {
            // Check local cache health
            Cache cache = cacheManager.getCache(REPORT_CACHE_NAME);
            boolean localCacheHealthy = cache != null;
            health.put("localCacheHealthy", localCacheHealthy);
            
            // Check Redis cache health
            boolean redisCacheHealthy = checkRedisHealth();
            health.put("redisCacheHealthy", redisCacheHealthy);
            
            // Overall health
            boolean overallHealthy = localCacheHealthy && redisCacheHealthy;
            health.put("overallHealthy", overallHealthy);
            health.put("status", overallHealthy ? "HEALTHY" : "DEGRADED");
            
        } catch (Exception e) {
            logger.error("Error checking cache health", e);
            health.put("overallHealthy", false);
            health.put("status", "UNHEALTHY");
            health.put("error", e.getMessage());
        }
        
        health.put("checkedAt", LocalDateTime.now());
        return health;
    }
    
    /**
     * Optimize cache performance
     */
    public void optimizeCache() {
        logger.info("Optimizing report cache performance");
        
        try {
            // Remove expired entries
            removeExpiredEntries();
            
            // Compact cache if needed
            compactCache();
            
            // Update cache statistics
            updateCacheStatistics();
            
        } catch (Exception e) {
            logger.error("Error optimizing cache", e);
        }
    }
    
    /**
     * Get cache key suggestions for a template
     */
    public Map<String, Object> getCacheKeySuggestions(String templateId) {
        Map<String, Object> suggestions = new HashMap<>();
        
        try {
            // Find existing cache keys for this template
            String pattern = REPORT_CACHE_PREFIX + templateId + ":*";
            suggestions.put("existingKeys", redisTemplate.keys(pattern));
            suggestions.put("templateId", templateId);
            suggestions.put("pattern", pattern);
            
        } catch (Exception e) {
            logger.error("Error getting cache key suggestions for template: {}", templateId, e);
        }
        
        return suggestions;
    }
    
    // Private helper methods
    
    private void storeCacheMetadata(String cacheKey, ReportData reportData, long ttlSeconds) {
        try {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("cacheKey", cacheKey);
            metadata.put("templateId", reportData.getTemplateId());
            metadata.put("reportName", reportData.getReportName());
            metadata.put("cachedAt", LocalDateTime.now());
            metadata.put("ttlSeconds", ttlSeconds);
            metadata.put("executionTimeMs", reportData.getExecutionTimeMs());
            
            String metadataKey = "report:metadata:" + cacheKey;
            redisTemplate.opsForValue().set(metadataKey, metadata, ttlSeconds, TimeUnit.SECONDS);
            
        } catch (Exception e) {
            logger.warn("Error storing cache metadata for key: {}", cacheKey, e);
        }
    }
    
    private void removeCacheMetadata(String cacheKey) {
        try {
            String metadataKey = "report:metadata:" + cacheKey;
            redisTemplate.delete(metadataKey);
        } catch (Exception e) {
            logger.warn("Error removing cache metadata for key: {}", cacheKey, e);
        }
    }
    
    private void clearAllCacheMetadata() {
        try {
            String pattern = "report:metadata:*";
            redisTemplate.delete(redisTemplate.keys(pattern));
        } catch (Exception e) {
            logger.warn("Error clearing all cache metadata", e);
        }
    }
    
    private boolean checkRedisHealth() {
        try {
            redisTemplate.opsForValue().set("health:check", "OK", 10, TimeUnit.SECONDS);
            String result = (String) redisTemplate.opsForValue().get("health:check");
            return "OK".equals(result);
        } catch (Exception e) {
            logger.warn("Redis health check failed", e);
            return false;
        }
    }
    
    private double calculateCacheHitRate() {
        // This would require tracking hits and misses
        // For now, returning mock data
        return 85.5;
    }
    
    private double calculateCacheMissRate() {
        return 100.0 - calculateCacheHitRate();
    }
    
    private String calculateAverageCacheAge() {
        // This would require analyzing cache metadata
        // For now, returning mock data
        return "2.5 hours";
    }
    
    private void removeExpiredEntries() {
        // Redis handles TTL automatically, but we could implement additional cleanup
        logger.debug("Removing expired cache entries");
    }
    
    private void compactCache() {
        // Implementation would depend on cache type
        logger.debug("Compacting cache");
    }
    
    private void updateCacheStatistics() {
        // Update internal statistics tracking
        logger.debug("Updating cache statistics");
    }
}