package com.ecommerce.inventory.dto.request;

import com.ecommerce.inventory.dto.validation.ValidSku;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Request DTO for creating a new product
 */
@Data
public class ProductCreateRequest {

    @NotBlank(message = "Product name is required")
    @Size(max = 200, message = "Product name must not exceed 200 characters")
    private String name;

    @NotBlank(message = "SKU is required")
    @Size(max = 100, message = "SKU must not exceed 100 characters")
    @ValidSku
    private String sku;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @NotNull(message = "Category ID is required")
    @Positive(message = "Category ID must be positive")
    private Long categoryId;

    @NotNull(message = "Supplier ID is required")
    @Positive(message = "Supplier ID must be positive")
    private Long supplierId;

    @NotNull(message = "Cost price is required")
    @DecimalMin(value = "0.01", message = "Cost price must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Cost price must have at most 8 integer digits and 2 decimal places")
    private BigDecimal costPrice;

    @NotNull(message = "Selling price is required")
    @DecimalMin(value = "0.01", message = "Selling price must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Selling price must have at most 8 integer digits and 2 decimal places")
    private BigDecimal sellingPrice;

    @Min(value = 0, message = "Reorder level must be non-negative")
    private Integer reorderLevel = 10;

    @Min(value = 1, message = "Reorder quantity must be positive")
    private Integer reorderQuantity = 50;
}