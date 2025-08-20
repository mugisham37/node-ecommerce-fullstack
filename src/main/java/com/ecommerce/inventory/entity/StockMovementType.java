package com.ecommerce.inventory.entity;

/**
 * Stock movement type enumeration for inventory tracking
 */
public enum StockMovementType {
    INBOUND("Stock received into inventory"),
    OUTBOUND("Stock removed from inventory"),
    ADJUSTMENT("Manual inventory adjustment"),
    ALLOCATION("Stock allocated for order"),
    RELEASE("Stock released from allocation"),
    TRANSFER("Stock transferred between locations"),
    TRANSFER_IN("Stock transferred into warehouse"),
    TRANSFER_OUT("Stock transferred out of warehouse"),
    DAMAGED("Stock marked as damaged"),
    EXPIRED("Stock marked as expired"),
    RETURNED("Stock returned from customer"),
    CYCLE_COUNT("Cycle count adjustment");

    private final String description;

    StockMovementType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Check if this movement type increases inventory
     */
    public boolean increasesInventory() {
        return this == INBOUND || this == ADJUSTMENT || this == RELEASE || 
               this == RETURNED || this == CYCLE_COUNT || this == TRANSFER_IN;
    }

    /**
     * Check if this movement type decreases inventory
     */
    public boolean decreasesInventory() {
        return this == OUTBOUND || this == ALLOCATION || this == DAMAGED || 
               this == EXPIRED || this == TRANSFER || this == TRANSFER_OUT;
    }

    /**
     * Check if this movement type requires a reference
     */
    public boolean requiresReference() {
        return this == ALLOCATION || this == RELEASE || this == TRANSFER || 
               this == TRANSFER_IN || this == TRANSFER_OUT || this == RETURNED;
    }

    /**
     * Check if this movement type is an adjustment
     */
    public boolean isAdjustment() {
        return this == ADJUSTMENT || this == CYCLE_COUNT;
    }

    /**
     * Check if this movement type affects allocated quantity
     */
    public boolean affectsAllocatedQuantity() {
        return this == ALLOCATION || this == RELEASE;
    }
}