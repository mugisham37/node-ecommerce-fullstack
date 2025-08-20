package com.ecommerce.inventory.dto.request;

import com.ecommerce.inventory.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO for updating order status
 */
@Data
public class OrderStatusUpdateRequest {

    @NotNull(message = "New status is required")
    private OrderStatus newStatus;

    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;

    @Size(max = 200, message = "Notes must not exceed 200 characters")
    private String notes;
}