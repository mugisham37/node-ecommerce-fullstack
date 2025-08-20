package com.ecommerce.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response DTO for inventory information
 */
@Data
@Builder
public class InventoryResponse {

    private Long id;
    private Long productId;
    private String productName;
    private String sku;
    private String warehouseLocation;
    
    private Integer quantityOnHand;
    private Integer quantityAllocated;
    private Integer quantityAvailable;
    
    private Integer reorderLevel;
    private Integer reorderQuantity;
    private Boolean isLowStock;
    
    private LocalDateTime lastCountedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}