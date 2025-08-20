package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO for cancelling an order
 */
@Data
public class OrderCancellationRequest {

    @NotBlank(message = "Cancellation reason is required")
    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;

    @Size(max = 200, message = "Notes must not exceed 200 characters")
    private String notes;

    private Boolean refundRequested = false;
}