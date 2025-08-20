package com.ecommerce.inventory.dto.request;

import com.ecommerce.inventory.entity.OrderStatus;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Request DTO for updating an existing order
 */
@Data
public class OrderUpdateRequest {

    @Size(max = 200, message = "Customer name must not exceed 200 characters")
    private String customerName;

    @Email(message = "Customer email should be valid")
    @Size(max = 255, message = "Customer email must not exceed 255 characters")
    private String customerEmail;

    @Size(max = 20, message = "Customer phone must not exceed 20 characters")
    private String customerPhone;

    @Size(max = 1000, message = "Shipping address must not exceed 1000 characters")
    private String shippingAddress;

    @Size(max = 1000, message = "Billing address must not exceed 1000 characters")
    private String billingAddress;

    @DecimalMin(value = "0.0", inclusive = true, message = "Tax amount must be non-negative")
    @Digits(integer = 8, fraction = 2, message = "Tax amount must have at most 8 integer digits and 2 decimal places")
    private BigDecimal taxAmount;

    @DecimalMin(value = "0.0", inclusive = true, message = "Shipping cost must be non-negative")
    @Digits(integer = 8, fraction = 2, message = "Shipping cost must have at most 8 integer digits and 2 decimal places")
    private BigDecimal shippingCost;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;
}