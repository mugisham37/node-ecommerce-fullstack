package com.ecommerce.inventory.entity;

/**
 * Order status enumeration for order lifecycle management
 */
public enum OrderStatus {
    PENDING("Order created and awaiting confirmation"),
    CONFIRMED("Order confirmed and ready for processing"),
    PROCESSING("Order is being processed"),
    SHIPPED("Order has been shipped"),
    PARTIALLY_SHIPPED("Order has been partially shipped"),
    DELIVERED("Order has been delivered"),
    CANCELLED("Order has been cancelled"),
    RETURNED("Order has been returned");

    private final String description;

    OrderStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Check if order can be cancelled
     */
    public boolean canBeCancelled() {
        return this == PENDING || this == CONFIRMED;
    }

    /**
     * Check if order can be modified
     */
    public boolean canBeModified() {
        return this == PENDING;
    }

    /**
     * Check if order is in a final state
     */
    public boolean isFinalState() {
        return this == DELIVERED || this == CANCELLED || this == RETURNED;
    }

    /**
     * Check if order is active (not cancelled or returned)
     */
    public boolean isActive() {
        return this != CANCELLED && this != RETURNED;
    }

    /**
     * Get valid next statuses from current status
     */
    public OrderStatus[] getValidNextStatuses() {
        switch (this) {
            case PENDING:
                return new OrderStatus[]{CONFIRMED, CANCELLED};
            case CONFIRMED:
                return new OrderStatus[]{PROCESSING, CANCELLED};
            case PROCESSING:
                return new OrderStatus[]{SHIPPED, PARTIALLY_SHIPPED, CANCELLED};
            case SHIPPED:
                return new OrderStatus[]{DELIVERED, RETURNED};
            case PARTIALLY_SHIPPED:
                return new OrderStatus[]{SHIPPED, DELIVERED, RETURNED, CANCELLED};
            case DELIVERED:
                return new OrderStatus[]{RETURNED};
            case CANCELLED:
            case RETURNED:
            default:
                return new OrderStatus[]{};
        }
    }

    /**
     * Check if transition to new status is valid
     */
    public boolean canTransitionTo(OrderStatus newStatus) {
        OrderStatus[] validStatuses = getValidNextStatuses();
        for (OrderStatus status : validStatuses) {
            if (status == newStatus) {
                return true;
            }
        }
        return false;
    }
}