package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Request DTO for updating an existing product
 */
@Data
public class ProductUpdateRequest {

    @Size(max = 200, message = "Product name must not exceed 200 characters")
    private String name;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @Positive(message = "Category ID must be positive")
    private Long categoryId;

    @Positive(message = "Supplier ID must be positive")
    private Long supplierId;

    @DecimalMin(value = "0.01", message = "Cost price must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Cost price must have at most 8 integer digits and 2 decimal places")
    private BigDecimal costPrice;

    @DecimalMin(value = "0.01", message = "Selling price must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Selling price must have at most 8 integer digits and 2 decimal places")
    private BigDecimal sellingPrice;

    @Min(value = 0, message = "Reorder level must be non-negative")
    private Integer reorderLevel;

    @Min(value = 1, message = "Reorder quantity must be positive")
    private Integer reorderQuantity;
}