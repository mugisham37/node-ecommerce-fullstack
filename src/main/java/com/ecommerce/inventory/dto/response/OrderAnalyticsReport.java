package com.ecommerce.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for order analytics reports
 */
@Data
@Builder
public class OrderAnalyticsReport {

    private LocalDateTime reportGeneratedAt;
    private LocalDateTime fromDate;
    private LocalDateTime toDate;
    
    private Integer totalOrders;
    private BigDecimal totalRevenue;
    private BigDecimal averageOrderValue;
    
    private Map<String, Integer> ordersByStatus;
    private Map<String, BigDecimal> revenueByStatus;
    
    private List<TopSellingProduct> topSellingProducts;
    private List<CustomerOrderSummary> topCustomers;
    
    @Data
    @Builder
    public static class TopSellingProduct {
        private Long productId;
        private String productName;
        private String sku;
        private Integer quantitySold;
        private BigDecimal revenue;
        private Integer orderCount;
    }
    
    @Data
    @Builder
    public static class CustomerOrderSummary {
        private String customerEmail;
        private String customerName;
        private Integer orderCount;
        private BigDecimal totalSpent;
        private LocalDateTime lastOrderDate;
    }
}