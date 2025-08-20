package com.ecommerce.inventory.exception;

/**
 * Exception thrown when a requested order is not found in the system.
 */
public class OrderNotFoundException extends BusinessException {
    
    private final Long orderId;
    private final String orderNumber;

    public OrderNotFoundException(Long orderId) {
        super(String.format("Order with ID %d not found", orderId), 
              "ORDER_NOT_FOUND", "ORDER_MANAGEMENT");
        this.orderId = orderId;
        this.orderNumber = null;
        addContext("orderId", orderId);
    }

    public OrderNotFoundException(String orderNumber) {
        super(String.format("Order with number '%s' not found", orderNumber), 
              "ORDER_NOT_FOUND", "ORDER_MANAGEMENT");
        this.orderId = null;
        this.orderNumber = orderNumber;
        addContext("orderNumber", orderNumber);
    }

    public OrderNotFoundException(Long orderId, String orderNumber) {
        super(String.format("Order with ID %d and number '%s' not found", orderId, orderNumber), 
              "ORDER_NOT_FOUND", "ORDER_MANAGEMENT");
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        addContext("orderId", orderId);
        addContext("orderNumber", orderNumber);
    }

    public Long getOrderId() {
        return orderId;
    }

    public String getOrderNumber() {
        return orderNumber;
    }
}