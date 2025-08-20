package com.ecommerce.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for supplier performance analytics
 */
@Data
@Builder
public class SupplierPerformanceResponse {

    private Long supplierId;
    private String supplierName;
    
    // Product metrics
    private Long totalProducts;
    private Long activeProducts;
    private Long inactiveProducts;
    
    // Order metrics
    private Long totalOrders;
    private Long completedOrders;
    private Long cancelledOrders;
    private BigDecimal totalOrderValue;
    private BigDecimal averageOrderValue;
    
    // Performance metrics
    private Double orderCompletionRate;
    private Double orderCancellationRate;
    private Integer averageDeliveryDays;
    
    // Quality metrics
    private Long totalReturns;
    private Double returnRate;
    private Double qualityScore; // 0-100 scale
    
    // Financial metrics
    private BigDecimal totalPurchaseValue;
    private BigDecimal averagePurchasePrice;
    private BigDecimal totalSavings;
    
    // Time metrics
    private LocalDateTime firstOrderDate;
    private LocalDateTime lastOrderDate;
    private Integer daysSinceLastOrder;
    
    // Status
    private String performanceRating; // EXCELLENT, GOOD, AVERAGE, POOR
    private String recommendations;
}