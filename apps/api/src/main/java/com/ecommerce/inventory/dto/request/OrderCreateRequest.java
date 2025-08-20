package com.ecommerce.inventory.dto.request;

import com.ecommerce.inventory.dto.validation.ValidEmail;
import com.ecommerce.inventory.dto.validation.ValidPhoneNumber;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO for creating a new order
 */
@Data
public class OrderCreateRequest {

    @NotBlank(message = "Customer name is required")
    @Size(max = 200, message = "Customer name must not exceed 200 characters")
    private String customerName;

    @ValidEmail(allowEmpty = true)
    private String customerEmail;

    @ValidPhoneNumber
    private String customerPhone;

    @NotBlank(message = "Shipping address is required")
    @Size(max = 1000, message = "Shipping address must not exceed 1000 characters")
    private String shippingAddress;

    @Size(max = 1000, message = "Billing address must not exceed 1000 characters")
    private String billingAddress;

    @DecimalMin(value = "0.0", inclusive = true, message = "Tax amount must be non-negative")
    @Digits(integer = 8, fraction = 2, message = "Tax amount must have at most 8 integer digits and 2 decimal places")
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", inclusive = true, message = "Shipping cost must be non-negative")
    @Digits(integer = 8, fraction = 2, message = "Shipping cost must have at most 8 integer digits and 2 decimal places")
    private BigDecimal shippingCost = BigDecimal.ZERO;

    @NotNull(message = "Order items are required")
    @NotEmpty(message = "Order must have at least one item")
    @Valid
    private List<OrderItemCreateRequest> orderItems;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;

    /**
     * Request DTO for creating order items
     */
    @Data
    public static class OrderItemCreateRequest {

        @NotNull(message = "Product ID is required")
        @Positive(message = "Product ID must be positive")
        private Long productId;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        @DecimalMin(value = "0.01", message = "Unit price must be greater than 0")
        @Digits(integer = 8, fraction = 2, message = "Unit price must have at most 8 integer digits and 2 decimal places")
        private BigDecimal unitPrice; // Optional - will use product selling price if not provided

        @Size(max = 200, message = "Notes must not exceed 200 characters")
        private String notes;
    }
}