package com.ecommerce.inventory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

/**
 * Request DTO for order fulfillment with partial shipment support
 */
@Data
public class OrderFulfillmentRequest {

    @NotNull(message = "Fulfillment items are required")
    @NotEmpty(message = "At least one fulfillment item is required")
    @Valid
    private List<FulfillmentItem> fulfillmentItems;

    @Size(max = 100, message = "Tracking number must not exceed 100 characters")
    private String trackingNumber;

    @Size(max = 100, message = "Carrier must not exceed 100 characters")
    private String carrier;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;

    /**
     * Individual fulfillment item
     */
    @Data
    public static class FulfillmentItem {

        @NotNull(message = "Order item ID is required")
        @Positive(message = "Order item ID must be positive")
        private Long orderItemId;

        @NotNull(message = "Fulfilled quantity is required")
        @Min(value = 1, message = "Fulfilled quantity must be at least 1")
        private Integer fulfilledQuantity;

        @Size(max = 100, message = "Warehouse location must not exceed 100 characters")
        private String warehouseLocation = "MAIN";

        @Size(max = 200, message = "Notes must not exceed 200 characters")
        private String notes;
    }
}