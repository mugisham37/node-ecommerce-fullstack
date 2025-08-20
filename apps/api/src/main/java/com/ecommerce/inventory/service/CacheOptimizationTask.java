package com.ecommerce.inventory.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Scheduled task for cache warming and optimization processes.
 * Manages cache performance, warming strategies, and optimization operations.
 */
@Component
public class CacheOptimizationTask extends BaseScheduledTask {
    
    private static final Logger logger = LoggerFactory.getLogger(CacheOptimizationTask.class);
    
    @Autowired
    private CacheService cacheService;
    
    @Autowired
    private CacheWarmupService cacheWarmupService;
    
    @Autowired
    private CacheMonitoringService cacheMonitoringService;
    
    @Autowired
    private CachePerformanceService cachePerformanceService;
    
    @Autowired
    private InventoryService inventoryService;
    
    @Autowired
    private ProductService productService;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private CacheManager redisCacheManager;
    
    @Autowired
    private CacheManager caffeineCacheManager;
    
    /**
     * Perform cache warming every day at 6:00 AM before business hours.
     */
    @Scheduled(cron = "0 0 6 * * *", zone = "UTC")
    public void performDailyCacheWarming() {
        executeTask();
    }
    
    /**
     * Perform cache optimization every 4 hours during business hours.
     */
    @Scheduled(cron = "0 0 8-20/4 * * *", zone = "UTC")
    public void performCacheOptimization() {
        getMonitoringService().executeWithMonitoring("cache-optimization", () -> {
            logger.info("Starting cache optimization");
            
            try {
                CacheOptimizationResults results = new CacheOptimizationResults();
                
                // Optimize cache performance
                results.addResult("Performance Optimization", optimizeCachePerformance());
                
                // Clean up expired entries
                results.addResult("Expired Entry Cleanup", cleanupExpiredEntries());
                
                // Optimize memory usage
                results.addResult("Memory Optimization", optimizeMemoryUsage());
                
                logger.info("Cache optimization completed: {} operations performed", results.getTotalOperations());
                
            } catch (Exception e) {
                logger.error("Cache optimization failed", e);
                throw e;
            }
        });
    }
    
    /**
     * Perform comprehensive cache analysis every Sunday at 7:00 AM.
     */
    @Scheduled(cron = "0 0 7 * * SUN", zone = "UTC")
    public void performWeeklyCacheAnalysis() {
        getMonitoringService().executeWithMonitoring("weekly-cache-analysis", () -> {
            logger.info("Starting weekly cache analysis");
            
            try {
                String analysisReport = generateCacheAnalysisReport();
                notificationService.sendSystemAlert("Weekly Cache Analysis Report", analysisReport);
                
                logger.info("Weekly cache analysis completed and report sent");
                
            } catch (Exception e) {
                logger.error("Weekly cache analysis failed", e);
                throw e;
            }
        });
    }
    
    @Override
    protected String getTaskName() {
        return "cache-warming-optimization";
    }
    
    @Override
    protected String getTaskDescription() {
        return "Perform cache warming, optimization, and performance tuning operations";
    }
    
    @Override
    protected void doExecute() {
        logger.info("Starting daily cache warming and optimization");
        
        try {
            CacheOptimizationResults results = new CacheOptimizationResults();
            
            // Warm up critical caches
            results.addResult("Cache Warming", performCacheWarming());
            
            // Optimize cache configuration
            results.addResult("Configuration Optimization", optimizeCacheConfiguration());
            
            // Monitor cache health
            results.addResult("Health Monitoring", monitorCacheHealth());
            
            // Generate optimization report
            String optimizationReport = generateOptimizationReport(results);
            logger.info("Cache optimization completed: {}", optimizationReport);
            
            // Send notification if significant issues found
            if (results.hasSignificantIssues()) {
                notificationService.sendSystemAlert("Cache Optimization Alert", optimizationReport);
            }
            
        } catch (Exception e) {
            logger.error("Cache warming and optimization failed", e);
            throw e;
        }
    }
    
    /**
     * Perform cache warming operations.
     */
    private CacheOptimizationResult performCacheWarming() {
        logger.info("Performing cache warming");
        
        try {
            int warmedCaches = 0;
            List<String> warmedCacheNames = new ArrayList<>();
            
            // Warm up product cache
            try {
                cacheWarmupService.warmupProductCache();
                warmedCaches++;
                warmedCacheNames.add("products");
                logger.debug("Product cache warmed up successfully");
            } catch (Exception e) {
                logger.warn("Failed to warm up product cache", e);
            }
            
            // Warm up inventory cache
            try {
                cacheWarmupService.warmupInventoryCache();
                warmedCaches++;
                warmedCacheNames.add("inventory");
                logger.debug("Inventory cache warmed up successfully");
            } catch (Exception e) {
                logger.warn("Failed to warm up inventory cache", e);
            }
            
            // Warm up category cache
            try {
                cacheWarmupService.warmupCategoryCache();
                warmedCaches++;
                warmedCacheNames.add("categories");
                logger.debug("Category cache warmed up successfully");
            } catch (Exception e) {
                logger.warn("Failed to warm up category cache", e);
            }
            
            // Warm up supplier cache
            try {
                cacheWarmupService.warmupSupplierCache();
                warmedCaches++;
                warmedCacheNames.add("suppliers");
                logger.debug("Supplier cache warmed up successfully");
            } catch (Exception e) {
                logger.warn("Failed to warm up supplier cache", e);
            }
            
            logger.info("Cache warming completed: {} caches warmed", warmedCaches);
            
            return new CacheOptimizationResult(
                    warmedCaches,
                    warmedCaches,
                    "Warmed up " + warmedCaches + " caches: " + String.join(", ", warmedCacheNames)
            );
            
        } catch (Exception e) {
            logger.error("Failed to perform cache warming", e);
            return new CacheOptimizationResult(0, 0, "Failed: " + e.getMessage());
        }
    }
    
    /**
     * Optimize cache performance.
     */
    private CacheOptimizationResult optimizeCachePerformance() {
        logger.info("Optimizing cache performance");
        
        try {
            int optimizedCaches = 0;
            List<String> optimizations = new ArrayList<>();
            
            // Check cache hit rates and optimize
            Collection<String> cacheNames = redisCacheManager.getCacheNames();
            
            for (String cacheName : cacheNames) {
                try {
                    // Get cache statistics
                    double hitRate = cachePerformanceService.getCacheHitRate(cacheName);
                    
                    if (hitRate < 0.8) { // Less than 80% hit rate
                        // Perform optimization
                        cacheService.optimizeCacheConfiguration(cacheName);
                        optimizedCaches++;
                        optimizations.add(cacheName + " (hit rate: " + String.format("%.1f", hitRate * 100) + "%)");
                        
                        logger.debug("Optimized cache: {} (hit rate was {:.1f}%)", cacheName, hitRate * 100);
                    }
                    
                } catch (Exception e) {
                    logger.warn("Failed to optimize cache: {}", cacheName, e);
                }
            }
            
            logger.info("Cache performance optimization completed: {} caches optimized", optimizedCaches);
            
            return new CacheOptimizationResult(
                    cacheNames.size(),
                    optimizedCaches,
                    "Optimized " + optimizedCaches + " caches: " + String.join(", ", optimizations)
            );
            
        } catch (Exception e) {
            logger.error("Failed to optimize cache performance", e);
            return new CacheOptimizationResult(0, 0, "Failed: " + e.getMessage());
        }
    }
    
    /**
     * Clean up expired cache entries.
     */
    private CacheOptimizationResult cleanupExpiredEntries() {
        logger.info("Cleaning up expired cache entries");
        
        try {
            int cleanedCaches = 0;
            int totalEntriesRemoved = 0;
            
            // Clean up Redis cache
            try {
                int redisEntriesRemoved = cacheService.cleanupExpiredEntries("redis");
                totalEntriesRemoved += redisEntriesRemoved;
                cleanedCaches++;
                logger.debug("Cleaned up {} expired entries from Redis cache", redisEntriesRemoved);
            } catch (Exception e) {
                logger.warn("Failed to cleanup Redis cache", e);
            }
            
            // Clean up Caffeine cache
            try {
                int caffeineEntriesRemoved = cacheService.cleanupExpiredEntries("caffeine");
                totalEntriesRemoved += caffeineEntriesRemoved;
                cleanedCaches++;
                logger.debug("Cleaned up {} expired entries from Caffeine cache", caffeineEntriesRemoved);
            } catch (Exception e) {
                logger.warn("Failed to cleanup Caffeine cache", e);
            }
            
            logger.info("Cache cleanup completed: {} entries removed from {} caches", totalEntriesRemoved, cleanedCaches);
            
            return new CacheOptimizationResult(
                    cleanedCaches,
                    cleanedCaches,
                    "Cleaned up " + totalEntriesRemoved + " expired entries from " + cleanedCaches + " caches"
            );
            
        } catch (Exception e) {
            logger.error("Failed to cleanup expired cache entries", e);
            return new CacheOptimizationResult(0, 0, "Failed: " + e.getMessage());
        }
    }
    
    /**
     * Optimize memory usage.
     */
    private CacheOptimizationResult optimizeMemoryUsage() {
        logger.info("Optimizing cache memory usage");
        
        try {
            int optimizedCaches = 0;
            List<String> optimizations = new ArrayList<>();
            
            // Check memory usage and optimize
            Collection<String> cacheNames = caffeineCacheManager.getCacheNames();
            
            for (String cacheName : cacheNames) {
                try {
                    long memoryUsage = cacheMonitoringService.getCacheMemoryUsage(cacheName);
                    long maxMemory = cacheMonitoringService.getMaxCacheMemory(cacheName);
                    
                    if (memoryUsage > maxMemory * 0.9) { // Over 90% memory usage
                        // Perform memory optimization
                        cacheService.optimizeMemoryUsage(cacheName);
                        optimizedCaches++;
                        optimizations.add(cacheName + " (usage: " + (memoryUsage * 100 / maxMemory) + "%)");
                        
                        logger.debug("Optimized memory usage for cache: {} (was {}% full)", 
                                   cacheName, memoryUsage * 100 / maxMemory);
                    }
                    
                } catch (Exception e) {
                    logger.warn("Failed to optimize memory usage for cache: {}", cacheName, e);
                }
            }
            
            logger.info("Memory optimization completed: {} caches optimized", optimizedCaches);
            
            return new CacheOptimizationResult(
                    cacheNames.size(),
                    optimizedCaches,
                    "Optimized memory usage for " + optimizedCaches + " caches: " + String.join(", ", optimizations)
            );
            
        } catch (Exception e) {
            logger.error("Failed to optimize memory usage", e);
            return new CacheOptimizationResult(0, 0, "Failed: " + e.getMessage());
        }
    }
    
    /**
     * Optimize cache configuration.
     */
    private CacheOptimizationResult optimizeCacheConfiguration() {
        logger.info("Optimizing cache configuration");
        
        try {
            int optimizedConfigs = 0;
            List<String> optimizations = new ArrayList<>();
            
            // Optimize TTL settings based on usage patterns
            optimizedConfigs += cacheService.optimizeTTLSettings();
            optimizations.add("TTL settings");
            
            // Optimize eviction policies
            optimizedConfigs += cacheService.optimizeEvictionPolicies();
            optimizations.add("eviction policies");
            
            // Optimize cache sizes
            optimizedConfigs += cacheService.optimizeCacheSizes();
            optimizations.add("cache sizes");
            
            logger.info("Cache configuration optimization completed: {} configurations optimized", optimizedConfigs);
            
            return new CacheOptimizationResult(
                    optimizedConfigs,
                    optimizedConfigs,
                    "Optimized " + optimizedConfigs + " configurations: " + String.join(", ", optimizations)
            );
            
        } catch (Exception e) {
            logger.error("Failed to optimize cache configuration", e);
            return new CacheOptimizationResult(0, 0, "Failed: " + e.getMessage());
        }
    }
    
    /**
     * Monitor cache health.
     */
    private CacheOptimizationResult monitorCacheHealth() {
        logger.info("Monitoring cache health");
        
        try {
            int healthyCache = 0;
            int totalCaches = 0;
            List<String> issues = new ArrayList<>();
            
            // Check Redis cache health
            totalCaches++;
            if (cacheMonitoringService.isRedisHealthy()) {
                healthyCache++;
            } else {
                issues.add("Redis cache unhealthy");
            }
            
            // Check Caffeine cache health
            totalCaches++;
            if (cacheMonitoringService.isCaffeineHealthy()) {
                healthyCache++;
            } else {
                issues.add("Caffeine cache unhealthy");
            }
            
            logger.info("Cache health monitoring completed: {}/{} caches healthy", healthyCache, totalCaches);
            
            return new CacheOptimizationResult(
                    totalCaches,
                    healthyCache,
                    healthyCache == totalCaches ? "All caches healthy" : "Issues found: " + String.join(", ", issues)
            );
            
        } catch (Exception e) {
            logger.error("Failed to monitor cache health", e);
            return new CacheOptimizationResult(0, 0, "Failed: " + e.getMessage());
        }
    }
    
    /**
     * Generate cache analysis report.
     */
    private String generateCacheAnalysisReport() {
        StringBuilder report = new StringBuilder();
        
        report.append("=== WEEKLY CACHE ANALYSIS REPORT ===\n");
        report.append("Generated: ").append(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)).append("\n\n");
        
        // Cache performance metrics
        report.append("CACHE PERFORMANCE METRICS:\n");
        Collection<String> cacheNames = redisCacheManager.getCacheNames();
        
        for (String cacheName : cacheNames) {
            try {
                double hitRate = cachePerformanceService.getCacheHitRate(cacheName);
                long memoryUsage = cacheMonitoringService.getCacheMemoryUsage(cacheName);
                
                report.append("- ").append(cacheName).append(":\n");
                report.append("  Hit Rate: ").append(String.format("%.1f", hitRate * 100)).append("%\n");
                report.append("  Memory Usage: ").append(memoryUsage / 1024 / 1024).append(" MB\n");
                
            } catch (Exception e) {
                report.append("- ").append(cacheName).append(": Error retrieving metrics\n");
            }
        }
        
        report.append("\nCACHE HEALTH STATUS:\n");
        report.append("- Redis Cache: ").append(cacheMonitoringService.isRedisHealthy() ? "Healthy" : "Unhealthy").append("\n");
        report.append("- Caffeine Cache: ").append(cacheMonitoringService.isCaffeineHealthy() ? "Healthy" : "Unhealthy").append("\n");
        
        report.append("\nRECOMMendations:\n");
        report.append("- Continue monitoring cache performance metrics\n");
        report.append("- Optimize caches with hit rates below 80%\n");
        report.append("- Review memory usage for high-utilization caches\n");
        report.append("- Consider adjusting TTL settings based on usage patterns\n");
        
        return report.toString();
    }
    
    /**
     * Generate optimization report.
     */
    private String generateOptimizationReport(CacheOptimizationResults results) {
        StringBuilder report = new StringBuilder();
        
        report.append("Cache optimization completed with ").append(results.getTotalOperations()).append(" operations:\n");
        
        results.getResults().forEach((operation, result) -> {
            report.append("- ").append(operation).append(": ")
                  .append(result.getItemsOptimized()).append("/").append(result.getItemsProcessed())
                  .append(" (").append(result.getDetails()).append(")\n");
        });
        
        return report.toString();
    }
    
    /**
     * Results of a single cache optimization operation.
     */
    private static class CacheOptimizationResult {
        private final int itemsProcessed;
        private final int itemsOptimized;
        private final String details;
        
        public CacheOptimizationResult(int itemsProcessed, int itemsOptimized, String details) {
            this.itemsProcessed = itemsProcessed;
            this.itemsOptimized = itemsOptimized;
            this.details = details;
        }
        
        // Getters
        public int getItemsProcessed() { return itemsProcessed; }
        public int getItemsOptimized() { return itemsOptimized; }
        public String getDetails() { return details; }
    }
    
    /**
     * Aggregated results of all cache optimization operations.
     */
    private static class CacheOptimizationResults {
        private final java.util.Map<String, CacheOptimizationResult> results = new java.util.HashMap<>();
        
        public void addResult(String operation, CacheOptimizationResult result) {
            results.put(operation, result);
        }
        
        public java.util.Map<String, CacheOptimizationResult> getResults() {
            return results;
        }
        
        public int getTotalOperations() {
            return results.size();
        }
        
        public boolean hasSignificantIssues() {
            return results.values().stream()
                    .anyMatch(result -> result.getDetails().contains("Failed") || 
                                      result.getDetails().contains("unhealthy"));
        }
    }
}