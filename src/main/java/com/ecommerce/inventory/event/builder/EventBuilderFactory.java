package com.ecommerce.inventory.event.builder;

import org.springframework.stereotype.Component;

/**
 * Factory for creating event builders.
 * Provides a centralized way to create strongly-typed event builders.
 */
@Component
public class EventBuilderFactory {
    
    /**
     * Creates a builder for inventory events.
     */
    public InventoryEventBuilder inventoryEvent() {
        return new InventoryEventBuilder();
    }
    
    /**
     * Creates a builder for order events.
     */
    public OrderEventBuilder orderEvent() {
        return new OrderEventBuilder();
    }
    
    /**
     * Creates a builder for supplier events.
     */
    public SupplierEventBuilder supplierEvent() {
        return new SupplierEventBuilder();
    }
}