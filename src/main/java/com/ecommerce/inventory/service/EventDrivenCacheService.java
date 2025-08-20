package com.ecommerce.inventory.service;

import com.ecommerce.inventory.event.inventory.InventoryAllocatedEvent;
import com.ecommerce.inventory.event.inventory.InventoryReleasedEvent;
import com.ecommerce.inventory.event.inventory.StockUpdatedEvent;
import com.ecommerce.inventory.event.order.OrderCreatedEvent;
import com.ecommerce.inventory.event.order.OrderStatusChangedEvent;
import com.ecommerce.inventory.event.supplier.SupplierStatusChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.CompletableFuture;

/**
 * Event-driven cache invalidation service.
 * Automatically invalidates relevant caches based on domain events.
 */
@Service
public class EventDrivenCacheService {

    private static final Logger logger = LoggerFactory.getLogger(EventDrivenCacheService.class);

    @Autowired
    private CacheService cacheService;

    /**
     * Handle stock updated events with intelligent cache invalidation
     */
    @EventListener
    @Async("cacheEventExecutor")
    public CompletableFuture<Void> handleStockUpdated(StockUpdatedEvent event) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Processing cache invalidation for stock updated event - Product: {}", event.getProductId());

                // Invalidate product-specific caches
                invalidateProductCaches(event.getProductId(), event.getProductSku());

                // Invalidate inventory caches
                invalidateInventoryCaches(event.getProductId(), event.getWarehouseLocation());

                // Invalidate search caches if stock level affects availability
                if (event.getNewQuantity() == 0 || event.getPreviousQuantity() == 0) {
                    invalidateSearchCaches();
                }

                // Invalidate low stock alerts cache
                cacheService.evict("inventory", "low-stock-alerts");

                // Invalidate consolidated inventory cache
                cacheService.evict("inventory", "consolidated:" + event.getProductId());

                logger.debug("Cache invalidation completed for stock updated event - Product: {}", event.getProductId());

            } catch (Exception e) {
                logger.error("Failed to process cache invalidation for stock updated event - Product: {}", 
                           event.getProductId(), e);
                throw new RuntimeException("Cache invalidation failed", e);
            }
        });
    }

    /**
     * Handle inventory allocation events
     */
    @EventListener
    @Async("cacheEventExecutor")
    public CompletableFuture<Void> handleInventoryAllocated(InventoryAllocatedEvent event) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Processing cache invalidation for inventory allocated event - Product: {}", event.getProductId());

                // Invalidate inventory caches
                invalidateInventoryCaches(event.getProductId(), event.getWarehouseLocation());

                // Invalidate product availability caches
                cacheService.evict("products", "product:" + event.getProductId());
                cacheService.evict("inventory", "sku:" + event.getProductSku());

                // Invalidate consolidated inventory
                cacheService.evict("inventory", "consolidated:" + event.getProductId());

                logger.debug("Cache invalidation completed for inventory allocated event - Product: {}", event.getProductId());

            } catch (Exception e) {
                logger.error("Failed to process cache invalidation for inventory allocated event - Product: {}", 
                           event.getProductId(), e);
                throw new RuntimeException("Cache invalidation failed", e);
            }
        });
    }

    /**
     * Handle inventory release events
     */
    @EventListener
    @Async("cacheEventExecutor")
    public CompletableFuture<Void> handleInventoryReleased(InventoryReleasedEvent event) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Processing cache invalidation for inventory released event - Product: {}", event.getProductId());

                // Invalidate inventory caches
                invalidateInventoryCaches(event.getProductId(), event.getWarehouseLocation());

                // Invalidate product availability caches
                cacheService.evict("products", "product:" + event.getProductId());
                cacheService.evict("inventory", "sku:" + event.getProductSku());

                // Invalidate consolidated inventory
                cacheService.evict("inventory", "consolidated:" + event.getProductId());

                // Invalidate search caches as product may become available again
                invalidateSearchCaches();

                logger.debug("Cache invalidation completed for inventory released event - Product: {}", event.getProductId());

            } catch (Exception e) {
                logger.error("Failed to process cache invalidation for inventory released event - Product: {}", 
                           event.getProductId(), e);
                throw new RuntimeException("Cache invalidation failed", e);
            }
        });
    }

    /**
     * Handle order created events
     */
    @EventListener
    @Async("cacheEventExecutor")
    public CompletableFuture<Void> handleOrderCreated(OrderCreatedEvent event) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Processing cache invalidation for order created event - Order: {}", event.getOrderId());

                // Invalidate order caches
                cacheService.evict("orders", "order:" + event.getOrderId());
                cacheService.clearCache("order-summaries");

                // Invalidate recent orders cache
                cacheService.evict("order-summaries", "recent:10");
                cacheService.evict("order-summaries", "recent:20");
                cacheService.evict("order-summaries", "recent:50");

                // Invalidate customer order caches
                if (event.getCustomerEmail() != null) {
                    invalidateCustomerOrderCaches(event.getCustomerEmail());
                }

                // Invalidate inventory caches for ordered products
                event.getOrderItems().forEach(item -> {
                    invalidateInventoryCaches(item.getProductId(), "MAIN");
                    cacheService.evict("inventory", "sku:" + item.getProductSku());
                });

                logger.debug("Cache invalidation completed for order created event - Order: {}", event.getOrderId());

            } catch (Exception e) {
                logger.error("Failed to process cache invalidation for order created event - Order: {}", 
                           event.getOrderId(), e);
                throw new RuntimeException("Cache invalidation failed", e);
            }
        });
    }

    /**
     * Handle order status change events
     */
    @EventListener
    @Async("cacheEventExecutor")
    public CompletableFuture<Void> handleOrderStatusChanged(OrderStatusChangedEvent event) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Processing cache invalidation for order status changed event - Order: {}", event.getOrderId());

                // Invalidate order caches
                cacheService.evict("orders", "order:" + event.getOrderId());
                cacheService.evict("orders", "order-number:" + event.getOrderNumber());
                cacheService.clearCache("order-summaries");

                // Invalidate status-specific caches
                invalidateOrderStatusCaches(event.getPreviousStatus());
                invalidateOrderStatusCaches(event.getNewStatus());

                // Invalidate customer order caches
                if (event.getCustomerEmail() != null) {
                    invalidateCustomerOrderCaches(event.getCustomerEmail());
                }

                // If order is cancelled, invalidate inventory caches as stock may be released
                if (event.getNewStatus().name().equals("CANCELLED")) {
                    // This would require order details to invalidate specific product caches
                    // For now, we'll invalidate general inventory caches
                    cacheService.clearCache("inventory");
                }

                logger.debug("Cache invalidation completed for order status changed event - Order: {}", event.getOrderId());

            } catch (Exception e) {
                logger.error("Failed to process cache invalidation for order status changed event - Order: {}", 
                           event.getOrderId(), e);
                throw new RuntimeException("Cache invalidation failed", e);
            }
        });
    }

    /**
     * Handle supplier status change events
     */
    @EventListener
    @Async("cacheEventExecutor")
    public CompletableFuture<Void> handleSupplierStatusChanged(SupplierStatusChangedEvent event) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Processing cache invalidation for supplier status changed event - Supplier: {}", event.getSupplierId());

                // Invalidate supplier caches
                cacheService.evict("suppliers", "supplier:" + event.getSupplierId());
                cacheService.clearCache("suppliers");

                // Invalidate product caches for products from this supplier
                // This would require querying products by supplier, for now clear all product caches
                cacheService.clearCache("products");
                cacheService.clearCache("search");

                logger.debug("Cache invalidation completed for supplier status changed event - Supplier: {}", event.getSupplierId());

            } catch (Exception e) {
                logger.error("Failed to process cache invalidation for supplier status changed event - Supplier: {}", 
                           event.getSupplierId(), e);
                throw new RuntimeException("Cache invalidation failed", e);
            }
        });
    }

    /**
     * Bulk cache invalidation for product-related changes
     */
    public CompletableFuture<Void> invalidateProductRelatedCaches(Long productId, String productSku) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Performing bulk cache invalidation for product: {} ({})", productId, productSku);

                // Product caches
                invalidateProductCaches(productId, productSku);

                // Inventory caches
                invalidateInventoryCaches(productId, null);

                // Search caches
                invalidateSearchCaches();

                // Category caches (if product categorization changed)
                cacheService.clearCache("categories");

                logger.debug("Bulk cache invalidation completed for product: {}", productId);

            } catch (Exception e) {
                logger.error("Failed to perform bulk cache invalidation for product: {}", productId, e);
                throw new RuntimeException("Bulk cache invalidation failed", e);
            }
        });
    }

    /**
     * Scheduled cache warming after invalidation
     */
    public CompletableFuture<Void> warmCachesAfterInvalidation(Set<String> invalidatedCaches) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.debug("Starting cache warming for invalidated caches: {}", invalidatedCaches);

                // Warm up critical caches
                if (invalidatedCaches.contains("products")) {
                    // Warm up popular products cache
                    // This would typically involve pre-loading frequently accessed products
                }

                if (invalidatedCaches.contains("inventory")) {
                    // Warm up low stock alerts cache
                    // This would involve pre-calculating low stock products
                }

                if (invalidatedCaches.contains("search")) {
                    // Warm up popular search results
                    // This would involve pre-loading common search queries
                }

                logger.debug("Cache warming completed for caches: {}", invalidatedCaches);

            } catch (Exception e) {
                logger.error("Failed to warm caches after invalidation: {}", invalidatedCaches, e);
                // Don't throw exception as cache warming is not critical
            }
        });
    }

    // Private helper methods

    private void invalidateProductCaches(Long productId, String productSku) {
        cacheService.evict("products", "product:" + productId);
        if (productSku != null) {
            cacheService.evict("products", "sku:" + productSku);
        }
        cacheService.clearCache("products");
    }

    private void invalidateInventoryCaches(Long productId, String warehouseLocation) {
        cacheService.evict("inventory", "product:" + productId);
        if (warehouseLocation != null) {
            cacheService.evict("inventory", "product:" + productId + ":warehouse:" + warehouseLocation);
        }
        cacheService.evict("inventory", "product-locations:" + productId);
        cacheService.evict("inventory", "consolidated:" + productId);
    }

    private void invalidateSearchCaches() {
        cacheService.clearCache("search");
    }

    private void invalidateCustomerOrderCaches(String customerEmail) {
        // Invalidate paginated customer order caches
        for (int page = 0; page < 10; page++) { // Clear first 10 pages
            for (int size : new int[]{10, 20, 50}) {
                cacheService.evict("orders", "customer:" + customerEmail + ":" + page + ":" + size);
            }
        }
    }

    private void invalidateOrderStatusCaches(Object status) {
        // Invalidate status-filtered order caches
        for (int page = 0; page < 10; page++) { // Clear first 10 pages
            for (int size : new int[]{10, 20, 50}) {
                cacheService.evict("order-summaries", "filtered:" + status + "::" + page + ":" + size);
            }
        }
    }
}