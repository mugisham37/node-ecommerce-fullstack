package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for partial order fulfillment operations
 */
public class PartialFulfillmentRequest {
    
    @NotNull(message = "Quantity shipped is required")
    @Min(value = 1, message = "Quantity shipped must be at least 1")
    private Integer quantityShipped;
    
    @NotBlank(message = "Tracking number is required")
    @Size(max = 100, message = "Tracking number must not exceed 100 characters")
    private String trackingNumber;
    
    @NotBlank(message = "Shipping carrier is required")
    @Size(max = 50, message = "Shipping carrier must not exceed 50 characters")
    private String shippingCarrier;
    
    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;

    // Constructors
    public PartialFulfillmentRequest() {}

    public PartialFulfillmentRequest(Integer quantityShipped, String trackingNumber, String shippingCarrier, String notes) {
        this.quantityShipped = quantityShipped;
        this.trackingNumber = trackingNumber;
        this.shippingCarrier = shippingCarrier;
        this.notes = notes;
    }

    // Getters and Setters
    public Integer getQuantityShipped() {
        return quantityShipped;
    }

    public void setQuantityShipped(Integer quantityShipped) {
        this.quantityShipped = quantityShipped;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public String getShippingCarrier() {
        return shippingCarrier;
    }

    public void setShippingCarrier(String shippingCarrier) {
        this.shippingCarrier = shippingCarrier;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}