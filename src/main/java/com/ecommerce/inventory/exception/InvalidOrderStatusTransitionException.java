package com.ecommerce.inventory.exception;

import com.ecommerce.inventory.entity.OrderStatus;

/**
 * Exception thrown when an invalid order status transition is attempted
 */
public class InvalidOrderStatusTransitionException extends RuntimeException {
    
    private final OrderStatus currentStatus;
    private final OrderStatus targetStatus;

    public InvalidOrderStatusTransitionException(OrderStatus currentStatus, OrderStatus targetStatus) {
        super(String.format("Invalid order status transition from %s to %s", currentStatus, targetStatus));
        this.currentStatus = currentStatus;
        this.targetStatus = targetStatus;
    }

    public InvalidOrderStatusTransitionException(String message) {
        super(message);
        this.currentStatus = null;
        this.targetStatus = null;
    }

    public OrderStatus getCurrentStatus() {
        return currentStatus;
    }

    public OrderStatus getTargetStatus() {
        return targetStatus;
    }
}