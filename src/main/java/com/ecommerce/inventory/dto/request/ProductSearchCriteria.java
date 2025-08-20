package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO for product search criteria with advanced filtering
 */
@Data
public class ProductSearchCriteria {

    @Size(max = 200, message = "Search term must not exceed 200 characters")
    private String searchTerm;

    private List<Long> categoryIds;

    private List<Long> supplierIds;

    @DecimalMin(value = "0.0", message = "Minimum price must be non-negative")
    private BigDecimal minPrice;

    @DecimalMin(value = "0.0", message = "Maximum price must be non-negative")
    private BigDecimal maxPrice;

    private Boolean active;

    private Boolean lowStock;

    @Size(max = 50, message = "Sort field must not exceed 50 characters")
    private String sortBy = "name";

    private String sortDirection = "ASC";

    @Min(value = 0, message = "Page number must be non-negative")
    private Integer page = 0;

    @Min(value = 1, message = "Page size must be at least 1")
    private Integer size = 20;

    @AssertTrue(message = "Maximum price must be greater than minimum price")
    public boolean isPriceRangeValid() {
        if (minPrice == null || maxPrice == null) {
            return true;
        }
        return maxPrice.compareTo(minPrice) >= 0;
    }
}