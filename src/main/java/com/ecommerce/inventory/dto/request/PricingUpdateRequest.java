package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Request DTO for updating product pricing
 */
@Data
public class PricingUpdateRequest {

    @NotNull(message = "Cost price is required")
    @DecimalMin(value = "0.01", message = "Cost price must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Cost price must have at most 8 integer digits and 2 decimal places")
    private BigDecimal costPrice;

    @NotNull(message = "Selling price is required")
    @DecimalMin(value = "0.01", message = "Selling price must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Selling price must have at most 8 integer digits and 2 decimal places")
    private BigDecimal sellingPrice;

    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;

    @AssertTrue(message = "Selling price must be greater than or equal to cost price")
    public boolean isSellingPriceValid() {
        if (costPrice == null || sellingPrice == null) {
            return true; // Let other validations handle null values
        }
        return sellingPrice.compareTo(costPrice) >= 0;
    }
}