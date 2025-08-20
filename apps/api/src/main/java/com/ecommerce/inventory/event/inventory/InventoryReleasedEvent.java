package com.ecommerce.inventory.event.inventory;

/**
 * Event published when allocated inventory is released back to available stock.
 */
public class InventoryReleasedEvent extends InventoryEvent {
    
    private final Integer releasedQuantity;
    private final Integer newAvailableQuantity;
    private final String originalAllocationId;
    private final String releaseReason;
    private final String releaseType;
    
    public InventoryReleasedEvent(Object source, Long productId, String productSku, 
                                String warehouseLocation, Integer releasedQuantity, 
                                Integer newAvailableQuantity, String originalAllocationId, 
                                String releaseReason, String releaseType, String userId) {
        super(source, productId, productSku, warehouseLocation, userId);
        this.releasedQuantity = releasedQuantity;
        this.newAvailableQuantity = newAvailableQuantity;
        this.originalAllocationId = originalAllocationId;
        this.releaseReason = releaseReason;
        this.releaseType = releaseType;
    }
    
    public Integer getReleasedQuantity() {
        return releasedQuantity;
    }
    
    public Integer getNewAvailableQuantity() {
        return newAvailableQuantity;
    }
    
    public String getOriginalAllocationId() {
        return originalAllocationId;
    }
    
    public String getReleaseReason() {
        return releaseReason;
    }
    
    public String getReleaseType() {
        return releaseType;
    }
    
    @Override
    public String toString() {
        return String.format("InventoryReleasedEvent{productId=%d, sku='%s', released=%d, newAvailable=%d, reason='%s', eventId='%s'}", 
                getProductId(), getProductSku(), releasedQuantity, newAvailableQuantity, releaseReason, getEventId());
    }
}