package com.ecommerce.inventory.event.order;

import com.ecommerce.inventory.entity.OrderStatus;

import java.math.BigDecimal;

/**
 * Event published when an order's status changes.
 * Contains information about the status transition and context.
 */
public class OrderStatusChangedEvent extends OrderEvent {
    
    private final OrderStatus previousStatus;
    private final OrderStatus newStatus;
    private final String statusChangeReason;
    private final String changedByUser;
    private final boolean requiresInventoryUpdate;
    
    public OrderStatusChangedEvent(Object source, Long orderId, String orderNumber, 
                                 String customerName, String customerEmail, 
                                 BigDecimal totalAmount, OrderStatus previousStatus, 
                                 OrderStatus newStatus, String statusChangeReason, 
                                 String changedByUser, String userId) {
        super(source, orderId, orderNumber, customerName, customerEmail, 
              newStatus, totalAmount, userId);
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.statusChangeReason = statusChangeReason;
        this.changedByUser = changedByUser;
        this.requiresInventoryUpdate = determineInventoryUpdateRequired(previousStatus, newStatus);
    }
    
    public OrderStatus getPreviousStatus() {
        return previousStatus;
    }
    
    public OrderStatus getNewStatus() {
        return newStatus;
    }
    
    public String getStatusChangeReason() {
        return statusChangeReason;
    }
    
    public String getChangedByUser() {
        return changedByUser;
    }
    
    public boolean requiresInventoryUpdate() {
        return requiresInventoryUpdate;
    }
    
    public boolean isOrderCancelled() {
        return newStatus == OrderStatus.CANCELLED;
    }
    
    public boolean isOrderCompleted() {
        return newStatus == OrderStatus.COMPLETED;
    }
    
    public boolean isOrderConfirmed() {
        return newStatus == OrderStatus.CONFIRMED;
    }
    
    private boolean determineInventoryUpdateRequired(OrderStatus previous, OrderStatus current) {
        // Inventory updates are required for certain status transitions
        return (previous == OrderStatus.PENDING && current == OrderStatus.CONFIRMED) ||
               (current == OrderStatus.CANCELLED) ||
               (current == OrderStatus.COMPLETED);
    }
    
    @Override
    public String toString() {
        return String.format("OrderStatusChangedEvent{orderId=%d, orderNumber='%s', %s -> %s, reason='%s', eventId='%s'}", 
                getOrderId(), getOrderNumber(), previousStatus, newStatus, statusChangeReason, getEventId());
    }
}