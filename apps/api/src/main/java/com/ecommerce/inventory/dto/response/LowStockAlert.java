package com.ecommerce.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response DTO for low stock alerts
 */
@Data
@Builder
public class LowStockAlert {

    private Long productId;
    private String productName;
    private String sku;
    
    private Integer currentStock;
    private Integer reorderLevel;
    private Integer reorderQuantity;
    
    private String supplierName;
    private LocalDateTime alertTimestamp;
    
    private String severity; // LOW, CRITICAL, OUT_OF_STOCK
    private String recommendation;
}