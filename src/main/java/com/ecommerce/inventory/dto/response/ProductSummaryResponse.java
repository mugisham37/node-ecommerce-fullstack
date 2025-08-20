package com.ecommerce.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Lightweight response DTO for product summary information
 */
@Data
@Builder
public class ProductSummaryResponse {

    private Long id;
    private String name;
    private String sku;
    private String slug;
    
    private Long categoryId;
    private String categoryName;
    
    private Long supplierId;
    private String supplierName;
    
    private BigDecimal sellingPrice;
    private Boolean active;
    
    private Integer currentStock;
    private Boolean lowStock;
}