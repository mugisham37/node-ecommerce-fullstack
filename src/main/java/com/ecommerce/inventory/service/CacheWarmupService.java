package com.ecommerce.inventory.service;

import com.ecommerce.inventory.entity.Category;
import com.ecommerce.inventory.entity.Product;
import com.ecommerce.inventory.entity.Supplier;
import com.ecommerce.inventory.repository.CategoryRepository;
import com.ecommerce.inventory.repository.ProductRepository;
import com.ecommerce.inventory.repository.SupplierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Cache Warmup Service
 * Preloads frequently accessed data into cache during application startup
 */
@Service
public class CacheWarmupService {

    private static final Logger logger = LoggerFactory.getLogger(CacheWarmupService.class);

    private final CacheService cacheService;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;

    public CacheWarmupService(CacheService cacheService,
                            ProductRepository productRepository,
                            CategoryRepository categoryRepository,
                            SupplierRepository supplierRepository) {
        this.cacheService = cacheService;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.supplierRepository = supplierRepository;
    }

    /**
     * Warm up caches when application is ready
     */
    @EventListener(ApplicationReadyEvent.class)
    @Async("cacheWarmupExecutor")
    public void warmupCaches() {
        logger.info("Starting cache warmup process at {}", LocalDateTime.now());
        
        try {
            // Warm up caches in parallel
            CompletableFuture<Void> productWarmup = warmupProductCache();
            CompletableFuture<Void> categoryWarmup = warmupCategoryCache();
            CompletableFuture<Void> supplierWarmup = warmupSupplierCache();

            // Wait for all warmup tasks to complete
            CompletableFuture.allOf(productWarmup, categoryWarmup, supplierWarmup)
                    .thenRun(() -> {
                        logger.info("Cache warmup completed successfully at {}", LocalDateTime.now());
                    })
                    .exceptionally(throwable -> {
                        logger.error("Cache warmup failed", throwable);
                        return null;
                    });

        } catch (Exception e) {
            logger.error("Failed to start cache warmup process", e);
        }
    }

    /**
     * Warm up product cache with frequently accessed products
     */
    @Async
    public CompletableFuture<Void> warmupProductCache() {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Warming up product cache...");
                
                // Load active products (most frequently accessed)
                List<Product> activeProducts = productRepository.findActiveProducts();
                for (Product product : activeProducts) {
                    cacheService.put("products", "product:" + product.getId(), product);
                    cacheService.put("products", "sku:" + product.getSku(), product);
                }

                // Load products by category (for category browsing)
                List<Category> categories = categoryRepository.findAll();
                for (Category category : categories) {
                    List<Product> categoryProducts = productRepository.findByCategoryId(category.getId());
                    cacheService.put("products", "category:" + category.getId(), categoryProducts);
                }

                logger.debug("Product cache warmup completed. Loaded {} products", activeProducts.size());
                
            } catch (Exception e) {
                logger.error("Failed to warm up product cache", e);
                throw new RuntimeException("Product cache warmup failed", e);
            }
        });
    }

    /**
     * Warm up category cache with category hierarchy
     */
    @Async
    public CompletableFuture<Void> warmupCategoryCache() {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Warming up category cache...");
                
                // Load all categories
                List<Category> categories = categoryRepository.findAll();
                for (Category category : categories) {
                    cacheService.put("categories", "category:" + category.getId(), category);
                    cacheService.put("categories", "slug:" + category.getSlug(), category);
                }

                // Load category hierarchy (root categories)
                List<Category> rootCategories = categoryRepository.findRootCategories();
                cacheService.put("categories", "root", rootCategories);

                // Load category hierarchy for each parent
                for (Category parent : rootCategories) {
                    List<Category> children = categoryRepository.findByParentId(parent.getId());
                    cacheService.put("categories", "children:" + parent.getId(), children);
                }

                logger.debug("Category cache warmup completed. Loaded {} categories", categories.size());
                
            } catch (Exception e) {
                logger.error("Failed to warm up category cache", e);
                throw new RuntimeException("Category cache warmup failed", e);
            }
        });
    }

    /**
     * Warm up supplier cache with active suppliers
     */
    @Async
    public CompletableFuture<Void> warmupSupplierCache() {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Warming up supplier cache...");
                
                // Load active suppliers
                List<Supplier> activeSuppliers = supplierRepository.findActiveSuppliers();
                for (Supplier supplier : activeSuppliers) {
                    cacheService.put("suppliers", "supplier:" + supplier.getId(), supplier);
                }

                logger.debug("Supplier cache warmup completed. Loaded {} suppliers", activeSuppliers.size());
                
            } catch (Exception e) {
                logger.error("Failed to warm up supplier cache", e);
                throw new RuntimeException("Supplier cache warmup failed", e);
            }
        });
    }

    /**
     * Manual cache warmup trigger (for administrative purposes)
     */
    public void triggerManualWarmup() {
        logger.info("Manual cache warmup triggered at {}", LocalDateTime.now());
        warmupCaches();
    }

    /**
     * Warm up specific cache by name
     */
    public CompletableFuture<Void> warmupSpecificCache(String cacheName) {
        return switch (cacheName.toLowerCase()) {
            case "products" -> warmupProductCache();
            case "categories" -> warmupCategoryCache();
            case "suppliers" -> warmupSupplierCache();
            default -> {
                logger.warn("Unknown cache name for warmup: {}", cacheName);
                yield CompletableFuture.completedFuture(null);
            }
        };
    }
}