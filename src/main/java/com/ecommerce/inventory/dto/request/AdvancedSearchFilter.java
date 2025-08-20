package com.ecommerce.inventory.dto.request;

import com.ecommerce.inventory.dto.validation.ValidationGroups;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Advanced search filter DTO for complex queries
 */
@Data
public class AdvancedSearchFilter {

    // Text search
    @Size(max = 200, message = "Search term must not exceed 200 characters", groups = ValidationGroups.Search.class)
    private String searchTerm;

    private Boolean exactMatch = false;

    // Category filters
    private List<Long> categoryIds;
    private List<String> categoryNames;
    private Boolean includeSubcategories = true;

    // Supplier filters
    private List<Long> supplierIds;
    private List<String> supplierNames;

    // Price filters
    @DecimalMin(value = "0.0", message = "Minimum price must be non-negative", groups = ValidationGroups.Search.class)
    private BigDecimal minPrice;

    @DecimalMin(value = "0.0", message = "Maximum price must be non-negative", groups = ValidationGroups.Search.class)
    private BigDecimal maxPrice;

    // Stock filters
    @Min(value = 0, message = "Minimum stock must be non-negative", groups = ValidationGroups.Search.class)
    private Integer minStock;

    @Min(value = 0, message = "Maximum stock must be non-negative", groups = ValidationGroups.Search.class)
    private Integer maxStock;

    private Boolean lowStockOnly = false;
    private Boolean outOfStockOnly = false;

    // Status filters
    private Boolean activeOnly;
    private Boolean inactiveOnly;

    // Date filters
    private LocalDateTime createdAfter;
    private LocalDateTime createdBefore;
    private LocalDateTime updatedAfter;
    private LocalDateTime updatedBefore;

    // Sorting
    @Size(max = 50, message = "Sort field must not exceed 50 characters", groups = ValidationGroups.Search.class)
    private String sortBy = "name";

    @Pattern(regexp = "^(ASC|DESC)$", message = "Sort direction must be ASC or DESC", groups = ValidationGroups.Search.class)
    private String sortDirection = "ASC";

    // Pagination
    @Min(value = 0, message = "Page number must be non-negative", groups = ValidationGroups.Search.class)
    private Integer page = 0;

    @Min(value = 1, message = "Page size must be at least 1", groups = ValidationGroups.Search.class)
    @Max(value = 100, message = "Page size cannot exceed 100", groups = ValidationGroups.Search.class)
    private Integer size = 20;

    // Validation methods
    @AssertTrue(message = "Maximum price must be greater than minimum price", groups = ValidationGroups.Search.class)
    public boolean isPriceRangeValid() {
        if (minPrice == null || maxPrice == null) {
            return true;
        }
        return maxPrice.compareTo(minPrice) >= 0;
    }

    @AssertTrue(message = "Maximum stock must be greater than minimum stock", groups = ValidationGroups.Search.class)
    public boolean isStockRangeValid() {
        if (minStock == null || maxStock == null) {
            return true;
        }
        return maxStock >= minStock;
    }

    @AssertTrue(message = "Created date range is invalid", groups = ValidationGroups.Search.class)
    public boolean isCreatedDateRangeValid() {
        if (createdAfter == null || createdBefore == null) {
            return true;
        }
        return createdBefore.isAfter(createdAfter);
    }

    @AssertTrue(message = "Updated date range is invalid", groups = ValidationGroups.Search.class)
    public boolean isUpdatedDateRangeValid() {
        if (updatedAfter == null || updatedBefore == null) {
            return true;
        }
        return updatedBefore.isAfter(updatedAfter);
    }

    @AssertTrue(message = "Cannot filter for both active only and inactive only", groups = ValidationGroups.Search.class)
    public boolean isStatusFilterValid() {
        return !(Boolean.TRUE.equals(activeOnly) && Boolean.TRUE.equals(inactiveOnly));
    }

    @AssertTrue(message = "Cannot filter for both low stock only and out of stock only", groups = ValidationGroups.Search.class)
    public boolean isStockFilterValid() {
        return !(Boolean.TRUE.equals(lowStockOnly) && Boolean.TRUE.equals(outOfStockOnly));
    }
}