package com.ecommerce.inventory.config;

import com.ecommerce.inventory.service.CacheService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * Cache Aspect Configuration
 * Provides automatic cache eviction and performance monitoring for cached methods
 */
@Aspect
@Component
public class CacheAspectConfig {

    private static final Logger logger = LoggerFactory.getLogger(CacheAspectConfig.class);

    private final CacheService cacheService;

    public CacheAspectConfig(CacheService cacheService) {
        this.cacheService = cacheService;
    }

    /**
     * Around advice for @Cacheable methods to add performance monitoring
     */
    @Around("@annotation(org.springframework.cache.annotation.Cacheable)")
    public Object aroundCacheableMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Cacheable cacheable = method.getAnnotation(Cacheable.class);
        
        String methodName = method.getDeclaringClass().getSimpleName() + "." + method.getName();
        long startTime = System.currentTimeMillis();
        
        try {
            Object result = joinPoint.proceed();
            long executionTime = System.currentTimeMillis() - startTime;
            
            logger.debug("Cacheable method '{}' executed in {} ms for cache '{}'", 
                       methodName, executionTime, String.join(",", cacheable.value()));
            
            return result;
            
        } catch (Exception e) {
            long executionTime = System.currentTimeMillis() - startTime;
            logger.error("Cacheable method '{}' failed after {} ms for cache '{}': {}", 
                       methodName, executionTime, String.join(",", cacheable.value()), e.getMessage());
            throw e;
        }
    }

    /**
     * Around advice for @CacheEvict methods to add logging and related cache invalidation
     */
    @Around("@annotation(org.springframework.cache.annotation.CacheEvict)")
    public Object aroundCacheEvictMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        CacheEvict cacheEvict = method.getAnnotation(CacheEvict.class);
        
        String methodName = method.getDeclaringClass().getSimpleName() + "." + method.getName();
        
        try {
            Object result = joinPoint.proceed();
            
            // Log cache eviction
            logger.debug("Cache eviction completed for method '{}' on cache '{}'", 
                       methodName, String.join(",", cacheEvict.value()));
            
            // Perform intelligent cache invalidation for related caches
            performIntelligentCacheInvalidation(cacheEvict.value(), joinPoint.getArgs());
            
            return result;
            
        } catch (Exception e) {
            logger.error("Cache eviction failed for method '{}' on cache '{}': {}", 
                       methodName, String.join(",", cacheEvict.value()), e.getMessage());
            throw e;
        }
    }

    /**
     * Perform intelligent cache invalidation based on entity relationships
     */
    private void performIntelligentCacheInvalidation(String[] cacheNames, Object[] args) {
        for (String cacheName : cacheNames) {
            try {
                // Determine entity type from cache name and invalidate related caches
                String entityType = extractEntityTypeFromCacheName(cacheName);
                Object entityId = extractEntityIdFromArgs(args);
                
                if (entityType != null && entityId != null) {
                    cacheService.invalidateRelatedCaches(entityType, entityId);
                    logger.debug("Invalidated related caches for entity type '{}' with ID '{}'", 
                               entityType, entityId);
                }
                
            } catch (Exception e) {
                logger.warn("Failed to perform intelligent cache invalidation for cache '{}': {}", 
                          cacheName, e.getMessage());
            }
        }
    }

    /**
     * Extract entity type from cache name
     */
    private String extractEntityTypeFromCacheName(String cacheName) {
        return switch (cacheName) {
            case "products" -> "product";
            case "categories" -> "category";
            case "suppliers" -> "supplier";
            case "inventory" -> "inventory";
            case "users" -> "user";
            case "orders" -> "order";
            default -> null;
        };
    }

    /**
     * Extract entity ID from method arguments
     */
    private Object extractEntityIdFromArgs(Object[] args) {
        if (args.length > 0) {
            // First argument is often the entity ID
            Object firstArg = args[0];
            if (firstArg instanceof Long || firstArg instanceof String) {
                return firstArg;
            }
            
            // Check if first argument has an ID field
            try {
                if (firstArg != null) {
                    Method getIdMethod = firstArg.getClass().getMethod("getId");
                    return getIdMethod.invoke(firstArg);
                }
            } catch (Exception e) {
                // Ignore reflection errors
            }
        }
        return null;
    }
}