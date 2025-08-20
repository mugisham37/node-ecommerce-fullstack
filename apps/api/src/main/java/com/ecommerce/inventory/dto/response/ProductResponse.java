package com.ecommerce.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for product information
 */
@Data
@Builder
public class ProductResponse {

    private Long id;
    private String name;
    private String slug;
    private String sku;
    private String description;
    
    private Long categoryId;
    private String categoryName;
    
    private Long supplierId;
    private String supplierName;
    
    private BigDecimal costPrice;
    private BigDecimal sellingPrice;
    private BigDecimal profitMargin;
    
    private Integer reorderLevel;
    private Integer reorderQuantity;
    
    private Boolean active;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}