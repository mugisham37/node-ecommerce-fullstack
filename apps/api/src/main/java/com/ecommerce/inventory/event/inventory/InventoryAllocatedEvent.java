package com.ecommerce.inventory.event.inventory;

/**
 * Event published when inventory is allocated for an order or reservation.
 */
public class InventoryAllocatedEvent extends InventoryEvent {
    
    private final Integer allocatedQuantity;
    private final Integer remainingAvailable;
    private final String allocationReferenceId;
    private final String allocationType;
    private final String customerInfo;
    
    public InventoryAllocatedEvent(Object source, Long productId, String productSku, 
                                 String warehouseLocation, Integer allocatedQuantity, 
                                 Integer remainingAvailable, String allocationReferenceId, 
                                 String allocationType, String customerInfo, String userId) {
        super(source, productId, productSku, warehouseLocation, userId);
        this.allocatedQuantity = allocatedQuantity;
        this.remainingAvailable = remainingAvailable;
        this.allocationReferenceId = allocationReferenceId;
        this.allocationType = allocationType;
        this.customerInfo = customerInfo;
    }
    
    public Integer getAllocatedQuantity() {
        return allocatedQuantity;
    }
    
    public Integer getRemainingAvailable() {
        return remainingAvailable;
    }
    
    public String getAllocationReferenceId() {
        return allocationReferenceId;
    }
    
    public String getAllocationType() {
        return allocationType;
    }
    
    public String getCustomerInfo() {
        return customerInfo;
    }
    
    @Override
    public String toString() {
        return String.format("InventoryAllocatedEvent{productId=%d, sku='%s', allocated=%d, remaining=%d, refId='%s', type='%s', eventId='%s'}", 
                getProductId(), getProductSku(), allocatedQuantity, remainingAvailable, allocationReferenceId, allocationType, getEventId());
    }
}