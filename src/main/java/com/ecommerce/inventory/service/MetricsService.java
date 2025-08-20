package com.ecommerce.inventory.service;

import com.ecommerce.inventory.metrics.CustomMetricsConfig;
import com.ecommerce.inventory.repository.InventoryRepository;
import com.ecommerce.inventory.repository.OrderRepository;
import com.ecommerce.inventory.repository.ProductRepository;
import com.ecommerce.inventory.repository.UserRepository;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;

/**
 * Service for managing and updating custom metrics
 */
@Service
public class MetricsService {

    private static final Logger logger = LoggerFactory.getLogger(MetricsService.class);

    private final CustomMetricsConfig metricsConfig;
    private final InventoryRepository inventoryRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Autowired
    public MetricsService(CustomMetricsConfig metricsConfig,
                         InventoryRepository inventoryRepository,
                         OrderRepository orderRepository,
                         ProductRepository productRepository,
                         UserRepository userRepository) {
        this.metricsConfig = metricsConfig;
        this.inventoryRepository = inventoryRepository;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    /**
     * Record inventory adjustment metric
     */
    public void recordInventoryAdjustment(Long productId, int oldQuantity, int newQuantity, String reason) {
        Timer.Sample sample = metricsConfig.startInventoryOperationTimer();
        try {
            metricsConfig.incrementInventoryAdjustments();
            
            // Update product-specific stock level
            var product = productRepository.findById(productId);
            if (product.isPresent()) {
                metricsConfig.updateProductStockLevel(product.get().getSku(), newQuantity);
            }
            
            logger.debug("Recorded inventory adjustment for product {}: {} -> {}, reason: {}", 
                        productId, oldQuantity, newQuantity, reason);
        } finally {
            metricsConfig.recordInventoryOperation(sample);
        }
    }

    /**
     * Record stock allocation metric
     */
    public void recordStockAllocation(Long productId, int quantity, String orderId) {
        Timer.Sample sample = metricsConfig.startInventoryOperationTimer();
        try {
            metricsConfig.incrementStockAllocations();
            logger.debug("Recorded stock allocation for product {}: {} units for order {}", 
                        productId, quantity, orderId);
        } finally {
            metricsConfig.recordInventoryOperation(sample);
        }
    }

    /**
     * Record stock release metric
     */
    public void recordStockRelease(Long productId, int quantity, String orderId) {
        Timer.Sample sample = metricsConfig.startInventoryOperationTimer();
        try {
            metricsConfig.incrementStockReleases();
            logger.debug("Recorded stock release for product {}: {} units from order {}", 
                        productId, quantity, orderId);
        } finally {
            metricsConfig.recordInventoryOperation(sample);
        }
    }

    /**
     * Record order creation metric
     */
    public void recordOrderCreation(String orderNumber, BigDecimal orderValue, String categoryName) {
        Timer.Sample sample = metricsConfig.startOrderProcessingTimer();
        try {
            metricsConfig.incrementOrdersCreated();
            metricsConfig.recordOrderValue(orderValue.doubleValue());
            
            if (categoryName != null) {
                metricsConfig.incrementCategoryOrderCount(categoryName);
            }
            
            logger.debug("Recorded order creation: {} with value {}", orderNumber, orderValue);
        } finally {
            metricsConfig.recordOrderProcessing(sample);
        }
    }

    /**
     * Record order cancellation metric
     */
    public void recordOrderCancellation(String orderNumber, String reason) {
        Timer.Sample sample = metricsConfig.startOrderProcessingTimer();
        try {
            metricsConfig.incrementOrdersCancelled();
            logger.debug("Recorded order cancellation: {} reason: {}", orderNumber, reason);
        } finally {
            metricsConfig.recordOrderProcessing(sample);
        }
    }

    /**
     * Record order fulfillment metric
     */
    public void recordOrderFulfillment(String orderNumber, BigDecimal orderValue) {
        Timer.Sample sample = metricsConfig.startOrderProcessingTimer();
        try {
            metricsConfig.incrementOrdersFulfilled();
            logger.debug("Recorded order fulfillment: {} with value {}", orderNumber, orderValue);
        } finally {
            metricsConfig.recordOrderProcessing(sample);
        }
    }

    /**
     * Record low stock alert metric
     */
    public void recordLowStockAlert(Long productId, int currentStock, int reorderLevel) {
        metricsConfig.incrementLowStockAlerts();
        logger.debug("Recorded low stock alert for product {}: current {} below reorder level {}", 
                    productId, currentStock, reorderLevel);
    }

    /**
     * Record cache hit metric
     */
    public void recordCacheHit(String cacheName, String key) {
        Timer.Sample sample = metricsConfig.startCacheOperationTimer();
        try {
            metricsConfig.incrementCacheHits();
            logger.trace("Cache hit for cache {} key {}", cacheName, key);
        } finally {
            metricsConfig.recordCacheOperation(sample);
        }
    }

    /**
     * Record cache miss metric
     */
    public void recordCacheMiss(String cacheName, String key) {
        Timer.Sample sample = metricsConfig.startCacheOperationTimer();
        try {
            metricsConfig.incrementCacheMisses();
            logger.trace("Cache miss for cache {} key {}", cacheName, key);
        } finally {
            metricsConfig.recordCacheOperation(sample);
        }
    }

    /**
     * Record database query metric
     */
    public void recordDatabaseQuery(String queryType, long executionTimeMs) {
        Timer.Sample sample = metricsConfig.startDatabaseQueryTimer();
        try {
            metricsConfig.incrementDatabaseQueries();
            logger.trace("Database query {} executed in {} ms", queryType, executionTimeMs);
        } finally {
            metricsConfig.recordDatabaseQuery(sample);
        }
    }

    /**
     * Record file upload metric
     */
    public void recordFileUpload(String fileName, long fileSizeBytes, long uploadTimeMs) {
        Timer.Sample sample = metricsConfig.startFileUploadTimer();
        try {
            logger.debug("File upload recorded: {} ({} bytes) in {} ms", fileName, fileSizeBytes, uploadTimeMs);
        } finally {
            metricsConfig.recordFileUpload(sample);
        }
    }

    /**
     * Scheduled task to update real-time metrics every minute
     */
    @Scheduled(fixedRate = 60000) // Every minute
    public void updateRealTimeMetrics() {
        CompletableFuture.runAsync(() -> {
            try {
                // Update low stock items count
                int lowStockCount = inventoryRepository.countLowStockItems();
                metricsConfig.updateLowStockItemsCount(lowStockCount);

                // Update pending orders count
                int pendingOrdersCount = orderRepository.countPendingOrders();
                metricsConfig.updatePendingOrdersCount(pendingOrdersCount);

                // Update active users count (users active in last 24 hours)
                int activeUsersCount = userRepository.countActiveUsers(LocalDateTime.now().minusHours(24));
                metricsConfig.updateActiveUsersCount(activeUsersCount);

                // Update total inventory value
                BigDecimal totalValue = inventoryRepository.calculateTotalInventoryValue();
                metricsConfig.updateTotalInventoryValue(totalValue.longValue());

                logger.trace("Updated real-time metrics: lowStock={}, pendingOrders={}, activeUsers={}, totalValue={}", 
                           lowStockCount, pendingOrdersCount, activeUsersCount, totalValue);

            } catch (Exception e) {
                logger.error("Error updating real-time metrics", e);
            }
        });
    }

    /**
     * Scheduled task to update product-specific stock levels every 5 minutes
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    public void updateProductStockMetrics() {
        CompletableFuture.runAsync(() -> {
            try {
                var products = productRepository.findAllActiveProducts();
                for (var product : products) {
                    var inventory = inventoryRepository.findByProductId(product.getId());
                    if (inventory.isPresent()) {
                        metricsConfig.updateProductStockLevel(
                            product.getSku(), 
                            inventory.get().getQuantityOnHand()
                        );
                        metricsConfig.recordInventoryLevel(inventory.get().getQuantityOnHand());
                    }
                }
                
                logger.trace("Updated product stock metrics for {} products", products.size());
                
            } catch (Exception e) {
                logger.error("Error updating product stock metrics", e);
            }
        });
    }

    /**
     * Get current metrics summary
     */
    public MetricsSummary getCurrentMetricsSummary() {
        return MetricsSummary.builder()
                .lowStockItemsCount(metricsConfig.getCurrentLowStockItems().get())
                .inventoryAdjustmentsCount(metricsConfig.getInventoryAdjustmentsCounter().count())
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * DTO for metrics summary
     */
    public static class MetricsSummary {
        private final int lowStockItemsCount;
        private final double inventoryAdjustmentsCount;
        private final LocalDateTime timestamp;

        private MetricsSummary(Builder builder) {
            this.lowStockItemsCount = builder.lowStockItemsCount;
            this.inventoryAdjustmentsCount = builder.inventoryAdjustmentsCount;
            this.timestamp = builder.timestamp;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public int getLowStockItemsCount() { return lowStockItemsCount; }
        public double getInventoryAdjustmentsCount() { return inventoryAdjustmentsCount; }
        public LocalDateTime getTimestamp() { return timestamp; }

        public static class Builder {
            private int lowStockItemsCount;
            private double inventoryAdjustmentsCount;
            private LocalDateTime timestamp;

            public Builder lowStockItemsCount(int lowStockItemsCount) {
                this.lowStockItemsCount = lowStockItemsCount;
                return this;
            }

            public Builder inventoryAdjustmentsCount(double inventoryAdjustmentsCount) {
                this.inventoryAdjustmentsCount = inventoryAdjustmentsCount;
                return this;
            }

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public MetricsSummary build() {
                return new MetricsSummary(this);
            }
        }
    }
}