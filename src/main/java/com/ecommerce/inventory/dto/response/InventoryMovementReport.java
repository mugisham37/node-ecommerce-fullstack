package com.ecommerce.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for inventory movement reports
 */
@Data
@Builder
public class InventoryMovementReport {

    private LocalDateTime reportGeneratedAt;
    private LocalDateTime fromDate;
    private LocalDateTime toDate;
    
    private Integer totalMovements;
    private Integer totalProductsAffected;
    
    private List<StockMovementResponse> movements;
    private List<ProductMovementSummary> productSummaries;
    
    @Data
    @Builder
    public static class ProductMovementSummary {
        private Long productId;
        private String productName;
        private String sku;
        private Integer totalInbound;
        private Integer totalOutbound;
        private Integer netMovement;
        private Integer currentStock;
    }
}