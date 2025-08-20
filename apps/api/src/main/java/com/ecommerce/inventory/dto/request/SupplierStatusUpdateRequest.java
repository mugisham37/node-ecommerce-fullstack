package com.ecommerce.inventory.dto.request;

import com.ecommerce.inventory.entity.SupplierStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO for updating supplier status
 */
@Data
public class SupplierStatusUpdateRequest {

    @NotNull(message = "New status is required")
    private SupplierStatus newStatus;

    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;

    @Size(max = 200, message = "Notes must not exceed 200 characters")
    private String notes;
}