package com.ecommerce.inventory.event.inventory;

import com.ecommerce.inventory.event.BaseEvent;

/**
 * Base class for all inventory-related events.
 */
public abstract class InventoryEvent extends BaseEvent {
    
    private final Long productId;
    private final String productSku;
    private final String warehouseLocation;
    
    protected InventoryEvent(Object source, Long productId, String productSku, 
                           String warehouseLocation, String userId) {
        super(source, productId.toString(), userId);
        this.productId = productId;
        this.productSku = productSku;
        this.warehouseLocation = warehouseLocation;
    }
    
    protected InventoryEvent(Object source, Long productId, String productSku, 
                           String warehouseLocation, String userId, String eventVersion) {
        super(source, productId.toString(), userId, eventVersion);
        this.productId = productId;
        this.productSku = productSku;
        this.warehouseLocation = warehouseLocation;
    }
    
    public Long getProductId() {
        return productId;
    }
    
    public String getProductSku() {
        return productSku;
    }
    
    public String getWarehouseLocation() {
        return warehouseLocation;
    }
}