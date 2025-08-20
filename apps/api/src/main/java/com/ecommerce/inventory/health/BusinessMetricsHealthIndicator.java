package com.ecommerce.inventory.health;

import com.ecommerce.inventory.service.InventoryService;
import com.ecommerce.inventory.service.OrderService;
import com.ecommerce.inventory.service.ProductService;
import com.ecommerce.inventory.service.CacheService;
import org.springframework.boot.actuator.health.Health;
import org.springframework.boot.actuator.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Custom health indicator for business-specific metrics and system performance
 */
@Component("business-metrics")
public class BusinessMetricsHealthIndicator implements HealthIndicator {

    private final InventoryService inventoryService;
    private final OrderService orderService;
    private final ProductService productService;
    private final CacheService cacheService;

    @Autowired
    public BusinessMetricsHealthIndicator(InventoryService inventoryService,
                                        OrderService orderService,
                                        ProductService productService,
                                        CacheService cacheService) {
        this.inventoryService = inventoryService;
        this.orderService = orderService;
        this.productService = productService;
        this.cacheService = cacheService;
    }

    @Override
    public Health health() {
        try {
            return checkBusinessMetrics();
        } catch (Exception e) {
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .withDetail("timestamp", LocalDateTime.now())
                    .build();
        }
    }

    private Health checkBusinessMetrics() {
        Map<String, Object> details = new HashMap<>();
        details.put("timestamp", LocalDateTime.now());

        try {
            // Inventory metrics
            var lowStockProducts = inventoryService.findLowStockProducts();
            details.put("inventory.low_stock_count", lowStockProducts.size());
            
            // Get total active products
            var activeProducts = productService.findActiveProducts();
            details.put("inventory.active_products", activeProducts.size());
            
            // Calculate low stock percentage
            if (!activeProducts.isEmpty()) {
                double lowStockPercentage = (double) lowStockProducts.size() / activeProducts.size() * 100;
                details.put("inventory.low_stock_percentage", String.format("%.2f", lowStockPercentage));
                
                // Health status based on low stock percentage
                if (lowStockPercentage > 20) {
                    details.put("inventory.status", "CRITICAL - High low stock percentage");
                } else if (lowStockPercentage > 10) {
                    details.put("inventory.status", "WARNING - Moderate low stock percentage");
                } else {
                    details.put("inventory.status", "HEALTHY");
                }
            }

            // Order processing metrics
            var pendingOrders = orderService.findPendingOrders();
            details.put("orders.pending_count", pendingOrders.size());
            
            // Check for old pending orders (older than 24 hours)
            var oldPendingOrders = orderService.findOldPendingOrders(24);
            details.put("orders.old_pending_count", oldPendingOrders.size());
            
            if (!oldPendingOrders.isEmpty()) {
                details.put("orders.status", "WARNING - Old pending orders detected");
            } else {
                details.put("orders.status", "HEALTHY");
            }

            // Cache performance metrics
            var cacheStats = cacheService.getCacheStatistics();
            details.put("cache.hit_ratio", cacheStats.getHitRatio());
            details.put("cache.miss_ratio", cacheStats.getMissRatio());
            details.put("cache.eviction_count", cacheStats.getEvictionCount());
            
            // Cache health assessment
            if (cacheStats.getHitRatio() < 0.7) {
                details.put("cache.status", "WARNING - Low cache hit ratio");
            } else {
                details.put("cache.status", "HEALTHY");
            }

            // System performance indicators
            Runtime runtime = Runtime.getRuntime();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            long usedMemory = totalMemory - freeMemory;
            double memoryUsagePercentage = (double) usedMemory / totalMemory * 100;
            
            details.put("system.memory_usage_percentage", String.format("%.2f", memoryUsagePercentage));
            
            if (memoryUsagePercentage > 90) {
                details.put("system.memory_status", "CRITICAL - High memory usage");
            } else if (memoryUsagePercentage > 80) {
                details.put("system.memory_status", "WARNING - Moderate memory usage");
            } else {
                details.put("system.memory_status", "HEALTHY");
            }

            // Overall health assessment
            boolean hasWarnings = details.values().stream()
                    .anyMatch(value -> value.toString().contains("WARNING"));
            boolean hasCritical = details.values().stream()
                    .anyMatch(value -> value.toString().contains("CRITICAL"));

            if (hasCritical) {
                return Health.down()
                        .withDetails(details)
                        .withDetail("overall_status", "CRITICAL - Immediate attention required")
                        .build();
            } else if (hasWarnings) {
                return Health.up()
                        .withDetails(details)
                        .withDetail("overall_status", "WARNING - Monitoring recommended")
                        .build();
            } else {
                return Health.up()
                        .withDetails(details)
                        .withDetail("overall_status", "HEALTHY - All systems operational")
                        .build();
            }

        } catch (Exception e) {
            return Health.down()
                    .withDetails(details)
                    .withDetail("error", "Failed to collect business metrics: " + e.getMessage())
                    .build();
        }
    }
}