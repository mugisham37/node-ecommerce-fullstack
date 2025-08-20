package com.ecommerce.inventory.monitoring;

import com.ecommerce.inventory.logging.StructuredLogger;
import com.ecommerce.inventory.service.InventoryService;
import com.ecommerce.inventory.service.OrderService;
import com.ecommerce.inventory.service.ProductService;
import com.ecommerce.inventory.repository.InventoryRepository;
import com.ecommerce.inventory.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.Map;
import java.util.HashMap;

/**
 * Service for monitoring business-specific metrics including inventory levels and order processing
 */
@Service
public class BusinessMetricMonitoringService {

    private static final StructuredLogger logger = StructuredLogger.getLogger(BusinessMetricMonitoringService.class);

    private final InventoryService inventoryService;
    private final OrderService orderService;
    private final ProductService productService;
    private final InventoryRepository inventoryRepository;
    private final OrderRepository orderRepository;
    private final AlertingService alertingService;

    // Business metric thresholds
    private static final double LOW_STOCK_CRITICAL_THRESHOLD = 20.0; // 20% of products low stock
    private static final double LOW_STOCK_WARNING_THRESHOLD = 10.0;  // 10% of products low stock
    private static final int OLD_PENDING_ORDERS_THRESHOLD = 24;      // Orders pending for 24+ hours
    private static final double ORDER_FAILURE_RATE_THRESHOLD = 5.0;  // 5% order failure rate
    private static final BigDecimal INVENTORY_VALUE_DROP_THRESHOLD = new BigDecimal("10000"); // $10k drop

    // Previous values for trend analysis
    private BigDecimal previousInventoryValue = BigDecimal.ZERO;
    private int previousLowStockCount = 0;
    private int previousPendingOrderCount = 0;

    @Autowired
    public BusinessMetricMonitoringService(InventoryService inventoryService,
                                         OrderService orderService,
                                         ProductService productService,
                                         InventoryRepository inventoryRepository,
                                         OrderRepository orderRepository,
                                         AlertingService alertingService) {
        this.inventoryService = inventoryService;
        this.orderService = orderService;
        this.productService = productService;
        this.inventoryRepository = inventoryRepository;
        this.orderRepository = orderRepository;
        this.alertingService = alertingService;
    }

    /**
     * Get comprehensive business metrics
     */
    public BusinessMetrics getBusinessMetrics() {
        return BusinessMetrics.builder()
                .timestamp(LocalDateTime.now())
                .inventoryMetrics(getInventoryMetrics())
                .orderMetrics(getOrderMetrics())
                .productMetrics(getProductMetrics())
                .build();
    }

    /**
     * Get inventory-specific business metrics
     */
    public InventoryBusinessMetrics getInventoryMetrics() {
        try {
            var lowStockProducts = inventoryService.findLowStockProducts();
            var activeProducts = productService.findActiveProducts();
            BigDecimal totalInventoryValue = inventoryRepository.calculateTotalInventoryValue();
            
            int lowStockCount = lowStockProducts.size();
            int totalActiveProducts = activeProducts.size();
            double lowStockPercentage = totalActiveProducts > 0 ? 
                (double) lowStockCount / totalActiveProducts * 100.0 : 0.0;

            return InventoryBusinessMetrics.builder()
                    .totalActiveProducts(totalActiveProducts)
                    .lowStockProductCount(lowStockCount)
                    .lowStockPercentage(lowStockPercentage)
                    .totalInventoryValue(totalInventoryValue)
                    .inventoryValueChange(totalInventoryValue.subtract(previousInventoryValue))
                    .build();
        } catch (Exception e) {
            logger.error("Error getting inventory metrics", e);
            return InventoryBusinessMetrics.builder()
                    .totalActiveProducts(0)
                    .lowStockProductCount(0)
                    .lowStockPercentage(0.0)
                    .totalInventoryValue(BigDecimal.ZERO)
                    .inventoryValueChange(BigDecimal.ZERO)
                    .build();
        }
    }

    /**
     * Get order-specific business metrics
     */
    public OrderBusinessMetrics getOrderMetrics() {
        try {
            var pendingOrders = orderService.findPendingOrders();
            var oldPendingOrders = orderService.findOldPendingOrders(OLD_PENDING_ORDERS_THRESHOLD);
            
            int pendingOrderCount = pendingOrders.size();
            int oldPendingOrderCount = oldPendingOrders.size();
            
            // Calculate order processing rate (orders processed in last hour)
            // This would require additional repository methods for time-based queries
            
            return OrderBusinessMetrics.builder()
                    .pendingOrderCount(pendingOrderCount)
                    .oldPendingOrderCount(oldPendingOrderCount)
                    .pendingOrderChange(pendingOrderCount - previousPendingOrderCount)
                    .build();
        } catch (Exception e) {
            logger.error("Error getting order metrics", e);
            return OrderBusinessMetrics.builder()
                    .pendingOrderCount(0)
                    .oldPendingOrderCount(0)
                    .pendingOrderChange(0)
                    .build();
        }
    }

    /**
     * Get product-specific business metrics
     */
    public ProductBusinessMetrics getProductMetrics() {
        try {
            var activeProducts = productService.findActiveProducts();
            
            return ProductBusinessMetrics.builder()
                    .totalActiveProducts(activeProducts.size())
                    .build();
        } catch (Exception e) {
            logger.error("Error getting product metrics", e);
            return ProductBusinessMetrics.builder()
                    .totalActiveProducts(0)
                    .build();
        }
    }

    /**
     * Scheduled monitoring task for business metrics (every 5 minutes)
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    public void monitorBusinessMetrics() {
        try {
            BusinessMetrics metrics = getBusinessMetrics();
            
            // Check inventory thresholds
            checkInventoryThresholds(metrics.getInventoryMetrics());
            
            // Check order processing thresholds
            checkOrderThresholds(metrics.getOrderMetrics());
            
            // Update previous values for trend analysis
            updatePreviousValues(metrics);
            
            // Log business metrics
            logBusinessMetrics(metrics);
            
        } catch (Exception e) {
            logger.error("Error during business metrics monitoring", e);
        }
    }

    /**
     * Scheduled task for detailed business reporting (every hour)
     */
    @Scheduled(cron = "0 0 * * * *") // Every hour
    public void generateBusinessMetricsReport() {
        BusinessMetrics metrics = getBusinessMetrics();
        
        logger.info("Business Metrics Report - Low Stock: {}% ({} products), Pending Orders: {}, Inventory Value: ${}",
                   String.format("%.2f", metrics.getInventoryMetrics().getLowStockPercentage()),
                   metrics.getInventoryMetrics().getLowStockProductCount(),
                   metrics.getOrderMetrics().getPendingOrderCount(),
                   metrics.getInventoryMetrics().getTotalInventoryValue());
    }

    private void checkInventoryThresholds(InventoryBusinessMetrics inventoryMetrics) {
        double lowStockPercentage = inventoryMetrics.getLowStockPercentage();
        
        if (lowStockPercentage > LOW_STOCK_CRITICAL_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.LOW_STOCK_CRITICAL,
                String.format("Critical low stock situation: %.2f%% of products are low stock (%d products)",
                             lowStockPercentage, inventoryMetrics.getLowStockProductCount()),
                AlertSeverity.CRITICAL
            );
        } else if (lowStockPercentage > LOW_STOCK_WARNING_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.LOW_STOCK_CRITICAL,
                String.format("Warning: %.2f%% of products are low stock (%d products)",
                             lowStockPercentage, inventoryMetrics.getLowStockProductCount()),
                AlertSeverity.WARNING
            );
        }

        // Check for significant inventory value drops
        BigDecimal valueChange = inventoryMetrics.getInventoryValueChange();
        if (valueChange.compareTo(INVENTORY_VALUE_DROP_THRESHOLD.negate()) < 0) {
            alertingService.sendAlert(
                AlertType.BUSINESS_RULE_VIOLATION,
                String.format("Significant inventory value drop: $%s", valueChange.abs()),
                AlertSeverity.WARNING
            );
        }
    }

    private void checkOrderThresholds(OrderBusinessMetrics orderMetrics) {
        int oldPendingOrders = orderMetrics.getOldPendingOrderCount();
        
        if (oldPendingOrders > 0) {
            AlertSeverity severity = oldPendingOrders > 10 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
            alertingService.sendAlert(
                AlertType.BUSINESS_RULE_VIOLATION,
                String.format("%d orders have been pending for more than %d hours",
                             oldPendingOrders, OLD_PENDING_ORDERS_THRESHOLD),
                severity
            );
        }

        // Check for sudden increase in pending orders
        int pendingOrderChange = orderMetrics.getPendingOrderChange();
        if (pendingOrderChange > 20) { // More than 20 new pending orders
            alertingService.sendAlert(
                AlertType.BUSINESS_RULE_VIOLATION,
                String.format("Sudden increase in pending orders: +%d orders", pendingOrderChange),
                AlertSeverity.WARNING
            );
        }
    }

    private void updatePreviousValues(BusinessMetrics metrics) {
        previousInventoryValue = metrics.getInventoryMetrics().getTotalInventoryValue();
        previousLowStockCount = metrics.getInventoryMetrics().getLowStockProductCount();
        previousPendingOrderCount = metrics.getOrderMetrics().getPendingOrderCount();
    }

    private void logBusinessMetrics(BusinessMetrics metrics) {
        Map<String, String> context = new HashMap<>();
        context.put("lowStockPercentage", String.format("%.2f", metrics.getInventoryMetrics().getLowStockPercentage()));
        context.put("pendingOrders", String.valueOf(metrics.getOrderMetrics().getPendingOrderCount()));
        context.put("inventoryValue", metrics.getInventoryMetrics().getTotalInventoryValue().toString());
        
        logger.debugWithContext("Business metrics collected", context);
    }

    // ========== INNER CLASSES ==========

    public static class BusinessMetrics {
        private final LocalDateTime timestamp;
        private final InventoryBusinessMetrics inventoryMetrics;
        private final OrderBusinessMetrics orderMetrics;
        private final ProductBusinessMetrics productMetrics;

        private BusinessMetrics(Builder builder) {
            this.timestamp = builder.timestamp;
            this.inventoryMetrics = builder.inventoryMetrics;
            this.orderMetrics = builder.orderMetrics;
            this.productMetrics = builder.productMetrics;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public LocalDateTime getTimestamp() { return timestamp; }
        public InventoryBusinessMetrics getInventoryMetrics() { return inventoryMetrics; }
        public OrderBusinessMetrics getOrderMetrics() { return orderMetrics; }
        public ProductBusinessMetrics getProductMetrics() { return productMetrics; }

        public static class Builder {
            private LocalDateTime timestamp;
            private InventoryBusinessMetrics inventoryMetrics;
            private OrderBusinessMetrics orderMetrics;
            private ProductBusinessMetrics productMetrics;

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public Builder inventoryMetrics(InventoryBusinessMetrics inventoryMetrics) {
                this.inventoryMetrics = inventoryMetrics;
                return this;
            }

            public Builder orderMetrics(OrderBusinessMetrics orderMetrics) {
                this.orderMetrics = orderMetrics;
                return this;
            }

            public Builder productMetrics(ProductBusinessMetrics productMetrics) {
                this.productMetrics = productMetrics;
                return this;
            }

            public BusinessMetrics build() {
                return new BusinessMetrics(this);
            }
        }
    }

    public static class InventoryBusinessMetrics {
        private final int totalActiveProducts;
        private final int lowStockProductCount;
        private final double lowStockPercentage;
        private final BigDecimal totalInventoryValue;
        private final BigDecimal inventoryValueChange;

        private InventoryBusinessMetrics(Builder builder) {
            this.totalActiveProducts = builder.totalActiveProducts;
            this.lowStockProductCount = builder.lowStockProductCount;
            this.lowStockPercentage = builder.lowStockPercentage;
            this.totalInventoryValue = builder.totalInventoryValue;
            this.inventoryValueChange = builder.inventoryValueChange;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public int getTotalActiveProducts() { return totalActiveProducts; }
        public int getLowStockProductCount() { return lowStockProductCount; }
        public double getLowStockPercentage() { return lowStockPercentage; }
        public BigDecimal getTotalInventoryValue() { return totalInventoryValue; }
        public BigDecimal getInventoryValueChange() { return inventoryValueChange; }

        public static class Builder {
            private int totalActiveProducts;
            private int lowStockProductCount;
            private double lowStockPercentage;
            private BigDecimal totalInventoryValue;
            private BigDecimal inventoryValueChange;

            public Builder totalActiveProducts(int totalActiveProducts) {
                this.totalActiveProducts = totalActiveProducts;
                return this;
            }

            public Builder lowStockProductCount(int lowStockProductCount) {
                this.lowStockProductCount = lowStockProductCount;
                return this;
            }

            public Builder lowStockPercentage(double lowStockPercentage) {
                this.lowStockPercentage = lowStockPercentage;
                return this;
            }

            public Builder totalInventoryValue(BigDecimal totalInventoryValue) {
                this.totalInventoryValue = totalInventoryValue;
                return this;
            }

            public Builder inventoryValueChange(BigDecimal inventoryValueChange) {
                this.inventoryValueChange = inventoryValueChange;
                return this;
            }

            public InventoryBusinessMetrics build() {
                return new InventoryBusinessMetrics(this);
            }
        }
    }

    public static class OrderBusinessMetrics {
        private final int pendingOrderCount;
        private final int oldPendingOrderCount;
        private final int pendingOrderChange;

        private OrderBusinessMetrics(Builder builder) {
            this.pendingOrderCount = builder.pendingOrderCount;
            this.oldPendingOrderCount = builder.oldPendingOrderCount;
            this.pendingOrderChange = builder.pendingOrderChange;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public int getPendingOrderCount() { return pendingOrderCount; }
        public int getOldPendingOrderCount() { return oldPendingOrderCount; }
        public int getPendingOrderChange() { return pendingOrderChange; }

        public static class Builder {
            private int pendingOrderCount;
            private int oldPendingOrderCount;
            private int pendingOrderChange;

            public Builder pendingOrderCount(int pendingOrderCount) {
                this.pendingOrderCount = pendingOrderCount;
                return this;
            }

            public Builder oldPendingOrderCount(int oldPendingOrderCount) {
                this.oldPendingOrderCount = oldPendingOrderCount;
                return this;
            }

            public Builder pendingOrderChange(int pendingOrderChange) {
                this.pendingOrderChange = pendingOrderChange;
                return this;
            }

            public OrderBusinessMetrics build() {
                return new OrderBusinessMetrics(this);
            }
        }
    }

    public static class ProductBusinessMetrics {
        private final int totalActiveProducts;

        private ProductBusinessMetrics(Builder builder) {
            this.totalActiveProducts = builder.totalActiveProducts;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public int getTotalActiveProducts() { return totalActiveProducts; }

        public static class Builder {
            private int totalActiveProducts;

            public Builder totalActiveProducts(int totalActiveProducts) {
                this.totalActiveProducts = totalActiveProducts;
                return this;
            }

            public ProductBusinessMetrics build() {
                return new ProductBusinessMetrics(this);
            }
        }
    }
}