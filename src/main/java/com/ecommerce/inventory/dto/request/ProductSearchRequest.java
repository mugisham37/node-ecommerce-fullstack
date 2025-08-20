package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * Request DTO for searching products with filters
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ProductSearchRequest extends PaginationRequest {

    @Size(max = 200, message = "Search term must not exceed 200 characters")
    private String searchTerm;

    private Long categoryId;

    private Long supplierId;

    private BigDecimal minPrice;

    private BigDecimal maxPrice;

    private Boolean active;

    private Boolean lowStock;

    private String sku;

    public ProductSearchRequest() {
        super();
    }

    public ProductSearchRequest(String searchTerm) {
        super();
        this.searchTerm = searchTerm;
    }
}