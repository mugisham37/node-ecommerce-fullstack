package com.ecommerce.inventory.event.inventory;

/**
 * Event published when inventory levels fall below the reorder point.
 * Triggers automated alerts and reorder recommendations.
 */
public class LowStockEvent extends InventoryEvent {
    
    private final Integer currentStock;
    private final Integer reorderLevel;
    private final Integer reorderQuantity;
    private final Integer stockDeficit;
    private final Long supplierId;
    private final String supplierName;
    private final boolean criticalLevel;
    
    public LowStockEvent(Object source, Long productId, String productSku, 
                        String warehouseLocation, Integer currentStock, 
                        Integer reorderLevel, Integer reorderQuantity, 
                        Long supplierId, String supplierName, String userId) {
        super(source, productId, productSku, warehouseLocation, userId);
        this.currentStock = currentStock;
        this.reorderLevel = reorderLevel;
        this.reorderQuantity = reorderQuantity;
        this.stockDeficit = Math.max(0, reorderLevel - currentStock);
        this.supplierId = supplierId;
        this.supplierName = supplierName;
        this.criticalLevel = currentStock <= (reorderLevel * 0.5); // Critical if below 50% of reorder level
    }
    
    public Integer getCurrentStock() {
        return currentStock;
    }
    
    public Integer getReorderLevel() {
        return reorderLevel;
    }
    
    public Integer getReorderQuantity() {
        return reorderQuantity;
    }
    
    public Integer getStockDeficit() {
        return stockDeficit;
    }
    
    public Long getSupplierId() {
        return supplierId;
    }
    
    public String getSupplierName() {
        return supplierName;
    }
    
    public boolean isCriticalLevel() {
        return criticalLevel;
    }
    
    public boolean isOutOfStock() {
        return currentStock <= 0;
    }
    
    @Override
    public String toString() {
        return String.format("LowStockEvent{productId=%d, sku='%s', currentStock=%d, reorderLevel=%d, deficit=%d, critical=%s, eventId='%s'}", 
                getProductId(), getProductSku(), currentStock, reorderLevel, stockDeficit, criticalLevel, getEventId());
    }
}