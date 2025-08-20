package com.ecommerce.inventory.service;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Cache Eviction Service using AOP
 * Automatically handles cache invalidation for data modification operations
 */
@Aspect
@Component
public class CacheEvictionService {

    private static final Logger logger = LoggerFactory.getLogger(CacheEvictionService.class);

    @Autowired
    private CacheService cacheService;

    /**
     * Handle cache eviction after product operations
     */
    @AfterReturning("execution(* com.ecommerce.inventory.repository.ProductRepository.save(..))")
    public void evictProductCaches(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            if (args.length > 0 && args[0] instanceof com.ecommerce.inventory.entity.Product) {
                com.ecommerce.inventory.entity.Product product = (com.ecommerce.inventory.entity.Product) args[0];
                
                logger.debug("Evicting product caches for product ID: {}", product.getId());
                
                // Evict specific product caches
                cacheService.evict("products", "product:" + product.getId());
                cacheService.evict("products", "sku:" + product.getSku());
                
                // Evict category-related caches
                if (product.getCategory() != null) {
                    cacheService.evict("products", "category:" + product.getCategory().getId());
                }
                
                // Evict supplier-related caches
                if (product.getSupplier() != null) {
                    cacheService.evict("products", "supplier:" + product.getSupplier().getId());
                }
                
                // Clear search caches
                cacheService.clearCache("search");
                
                logger.debug("Product cache eviction completed for product ID: {}", product.getId());
            }
        } catch (Exception e) {
            logger.error("Error during product cache eviction", e);
        }
    }

    /**
     * Handle cache eviction after inventory operations
     */
    @AfterReturning("execution(* com.ecommerce.inventory.repository.InventoryRepository.save(..))")
    public void evictInventoryCaches(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            if (args.length > 0 && args[0] instanceof com.ecommerce.inventory.entity.Inventory) {
                com.ecommerce.inventory.entity.Inventory inventory = (com.ecommerce.inventory.entity.Inventory) args[0];
                
                logger.debug("Evicting inventory caches for inventory ID: {}", inventory.getId());
                
                // Evict specific inventory caches
                cacheService.evict("inventory", "product:" + inventory.getProduct().getId());
                cacheService.evict("inventory", "sku:" + inventory.getProduct().getSku());
                
                // Evict low stock cache
                cacheService.evict("inventory", "low-stock-products");
                cacheService.evict("inventory", "low-stock-alerts");
                
                // Evict total value cache
                cacheService.evict("inventory", "total-value");
                
                logger.debug("Inventory cache eviction completed for inventory ID: {}", inventory.getId());
            }
        } catch (Exception e) {
            logger.error("Error during inventory cache eviction", e);
        }
    }

    /**
     * Handle cache eviction after user operations
     */
    @AfterReturning("execution(* com.ecommerce.inventory.repository.UserRepository.save(..))")
    public void evictUserCaches(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            if (args.length > 0 && args[0] instanceof com.ecommerce.inventory.entity.User) {
                com.ecommerce.inventory.entity.User user = (com.ecommerce.inventory.entity.User) args[0];
                
                logger.debug("Evicting user caches for user ID: {}", user.getId());
                
                // Evict specific user caches
                cacheService.evict("users", "user:" + user.getId());
                cacheService.evict("users", "email:" + user.getEmail());
                
                // Clear all user list caches
                cacheService.clearCache("users");
                
                logger.debug("User cache eviction completed for user ID: {}", user.getId());
            }
        } catch (Exception e) {
            logger.error("Error during user cache eviction", e);
        }
    }

    /**
     * Handle cache eviction after category operations
     */
    @AfterReturning("execution(* com.ecommerce.inventory.repository.CategoryRepository.save(..))")
    public void evictCategoryCaches(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            if (args.length > 0 && args[0] instanceof com.ecommerce.inventory.entity.Category) {
                com.ecommerce.inventory.entity.Category category = (com.ecommerce.inventory.entity.Category) args[0];
                
                logger.debug("Evicting category caches for category ID: {}", category.getId());
                
                // Evict specific category caches
                cacheService.evict("categories", "category:" + category.getId());
                cacheService.evict("categories", "slug:" + category.getSlug());
                
                // Evict hierarchy caches
                cacheService.evict("categories", "root");
                if (category.getParent() != null) {
                    cacheService.evict("categories", "children:" + category.getParent().getId());
                }
                
                // Evict product caches that depend on this category
                cacheService.evict("products", "category:" + category.getId());
                
                // Clear search caches
                cacheService.clearCache("search");
                
                logger.debug("Category cache eviction completed for category ID: {}", category.getId());
            }
        } catch (Exception e) {
            logger.error("Error during category cache eviction", e);
        }
    }

    /**
     * Handle cache eviction after supplier operations
     */
    @AfterReturning("execution(* com.ecommerce.inventory.repository.SupplierRepository.save(..))")
    public void evictSupplierCaches(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            if (args.length > 0 && args[0] instanceof com.ecommerce.inventory.entity.Supplier) {
                com.ecommerce.inventory.entity.Supplier supplier = (com.ecommerce.inventory.entity.Supplier) args[0];
                
                logger.debug("Evicting supplier caches for supplier ID: {}", supplier.getId());
                
                // Evict specific supplier caches
                cacheService.evict("suppliers", "supplier:" + supplier.getId());
                
                // Evict product caches that depend on this supplier
                cacheService.evict("products", "supplier:" + supplier.getId());
                
                logger.debug("Supplier cache eviction completed for supplier ID: {}", supplier.getId());
            }
        } catch (Exception e) {
            logger.error("Error during supplier cache eviction", e);
        }
    }

    /**
     * Handle cache eviction after order operations
     */
    @AfterReturning("execution(* com.ecommerce.inventory.repository.OrderRepository.save(..))")
    public void evictOrderCaches(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            if (args.length > 0 && args[0] instanceof com.ecommerce.inventory.entity.Order) {
                com.ecommerce.inventory.entity.Order order = (com.ecommerce.inventory.entity.Order) args[0];
                
                logger.debug("Evicting order-related caches for order ID: {}", order.getId());
                
                // Evict inventory caches (orders affect inventory allocation)
                cacheService.clearCache("inventory");
                
                // Evict product caches (low stock status might change)
                cacheService.evict("inventory", "low-stock-products");
                cacheService.evict("inventory", "low-stock-alerts");
                
                logger.debug("Order cache eviction completed for order ID: {}", order.getId());
            }
        } catch (Exception e) {
            logger.error("Error during order cache eviction", e);
        }
    }
}