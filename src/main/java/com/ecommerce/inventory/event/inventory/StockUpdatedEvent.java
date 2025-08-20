package com.ecommerce.inventory.event.inventory;

import com.ecommerce.inventory.entity.StockMovementType;

/**
 * Event published when inventory stock levels are updated.
 * Contains comprehensive context about the stock change.
 */
public class StockUpdatedEvent extends InventoryEvent {
    
    private final Integer previousQuantity;
    private final Integer newQuantity;
    private final Integer quantityChange;
    private final StockMovementType movementType;
    private final String reason;
    private final String referenceId;
    private final String referenceType;
    
    public StockUpdatedEvent(Object source, Long productId, String productSku, 
                           String warehouseLocation, Integer previousQuantity, 
                           Integer newQuantity, StockMovementType movementType, 
                           String reason, String referenceId, String referenceType, 
                           String userId) {
        super(source, productId, productSku, warehouseLocation, userId);
        this.previousQuantity = previousQuantity;
        this.newQuantity = newQuantity;
        this.quantityChange = newQuantity - previousQuantity;
        this.movementType = movementType;
        this.reason = reason;
        this.referenceId = referenceId;
        this.referenceType = referenceType;
    }
    
    public Integer getPreviousQuantity() {
        return previousQuantity;
    }
    
    public Integer getNewQuantity() {
        return newQuantity;
    }
    
    public Integer getQuantityChange() {
        return quantityChange;
    }
    
    public StockMovementType getMovementType() {
        return movementType;
    }
    
    public String getReason() {
        return reason;
    }
    
    public String getReferenceId() {
        return referenceId;
    }
    
    public String getReferenceType() {
        return referenceType;
    }
    
    public boolean isStockIncrease() {
        return quantityChange > 0;
    }
    
    public boolean isStockDecrease() {
        return quantityChange < 0;
    }
    
    @Override
    public String toString() {
        return String.format("StockUpdatedEvent{productId=%d, sku='%s', previousQty=%d, newQty=%d, change=%d, type=%s, reason='%s', eventId='%s'}", 
                getProductId(), getProductSku(), previousQuantity, newQuantity, quantityChange, movementType, reason, getEventId());
    }
}