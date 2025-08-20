package com.ecommerce.inventory.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.stats.CacheStats;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Caffeine Local Cache Configuration
 * Provides high-performance local caching with size and time-based eviction
 */
@Configuration
@ConditionalOnClass(Caffeine.class)
public class CaffeineConfig {

    /**
     * Configure Caffeine cache manager for local caching
     */
    @Bean("caffeineCacheManager")
    public CacheManager caffeineCacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        
        // Configure default Caffeine cache settings
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(10000)                           // Maximum 10,000 entries
                .expireAfterWrite(30, TimeUnit.MINUTES)       // Expire after 30 minutes of write
                .expireAfterAccess(15, TimeUnit.MINUTES)      // Expire after 15 minutes of no access
                .refreshAfterWrite(10, TimeUnit.MINUTES)      // Refresh after 10 minutes
                .recordStats()                                // Enable statistics
                .removalListener((key, value, cause) -> {
                    // Log cache evictions for monitoring
                    if (cause.wasEvicted()) {
                        System.out.println("Cache entry evicted: " + key + " due to " + cause);
                    }
                }));

        // Set cache names that should use Caffeine
        cacheManager.setCacheNames("products-local", "categories-local", "users-local", 
                                 "inventory-local", "suppliers-local", "search-local");
        
        return cacheManager;
    }

    /**
     * Configure specific Caffeine cache for frequently accessed products
     */
    @Bean("productLocalCache")
    public Cache<String, Object> productLocalCache() {
        return Caffeine.newBuilder()
                .maximumSize(5000)                           // Products cache can be larger
                .expireAfterWrite(60, TimeUnit.MINUTES)      // Products change less frequently
                .expireAfterAccess(30, TimeUnit.MINUTES)
                .refreshAfterWrite(20, TimeUnit.MINUTES)
                .recordStats()
                .build();
    }

    /**
     * Configure specific Caffeine cache for inventory data (needs to be fresh)
     */
    @Bean("inventoryLocalCache")
    public Cache<String, Object> inventoryLocalCache() {
        return Caffeine.newBuilder()
                .maximumSize(2000)                           // Smaller cache for inventory
                .expireAfterWrite(5, TimeUnit.MINUTES)       // Very short TTL for inventory
                .expireAfterAccess(2, TimeUnit.MINUTES)      // Quick expiration after access
                .refreshAfterWrite(2, TimeUnit.MINUTES)      // Frequent refresh
                .recordStats()
                .build();
    }

    /**
     * Configure specific Caffeine cache for user sessions and authentication
     */
    @Bean("userSessionCache")
    public Cache<String, Object> userSessionCache() {
        return Caffeine.newBuilder()
                .maximumSize(1000)                           // Reasonable size for user sessions
                .expireAfterWrite(30, TimeUnit.MINUTES)      // Session timeout
                .expireAfterAccess(15, TimeUnit.MINUTES)     // Idle timeout
                .recordStats()
                .build();
    }

    /**
     * Configure specific Caffeine cache for search results
     */
    @Bean("searchResultsCache")
    public Cache<String, Object> searchResultsCache() {
        return Caffeine.newBuilder()
                .maximumSize(1000)                           // Cache search results
                .expireAfterWrite(10, TimeUnit.MINUTES)      // Search results expire quickly
                .expireAfterAccess(5, TimeUnit.MINUTES)      // Quick access expiration
                .recordStats()
                .build();
    }

    /**
     * Configure specific Caffeine cache for category hierarchy (rarely changes)
     */
    @Bean("categoryHierarchyCache")
    public Cache<String, Object> categoryHierarchyCache() {
        return Caffeine.newBuilder()
                .maximumSize(500)                            // Categories are limited
                .expireAfterWrite(4, TimeUnit.HOURS)         // Long TTL for categories
                .expireAfterAccess(2, TimeUnit.HOURS)        // Long access TTL
                .refreshAfterWrite(1, TimeUnit.HOURS)        // Refresh every hour
                .recordStats()
                .build();
    }

    /**
     * Utility method to get cache statistics
     */
    public static CacheStats getCacheStats(Cache<?, ?> cache) {
        return cache.stats();
    }
}