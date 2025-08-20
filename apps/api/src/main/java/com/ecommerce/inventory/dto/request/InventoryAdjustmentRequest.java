package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Request DTO for inventory adjustments
 */
@Data
public class InventoryAdjustmentRequest {

    @NotNull(message = "New quantity is required")
    @Min(value = 0, message = "Quantity must be non-negative")
    private Integer newQuantity;

    @NotBlank(message = "Reason is required")
    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;

    @Size(max = 100, message = "Reference must not exceed 100 characters")
    private String reference;
}