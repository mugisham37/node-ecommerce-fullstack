package com.ecommerce.inventory.entity;

/**
 * Supplier status enumeration for supplier lifecycle management
 */
public enum SupplierStatus {
    ACTIVE("Active - Available for new orders"),
    INACTIVE("Inactive - Not available for new orders"),
    SUSPENDED("Suspended - Temporarily unavailable due to issues");

    private final String description;

    SupplierStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Check if this status allows new orders
     */
    public boolean allowsNewOrders() {
        return this == ACTIVE;
    }

    /**
     * Check if this status is active
     */
    public boolean isActive() {
        return this == ACTIVE;
    }
}