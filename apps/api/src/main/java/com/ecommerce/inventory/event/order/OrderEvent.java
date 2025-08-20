package com.ecommerce.inventory.event.order;

import com.ecommerce.inventory.event.BaseEvent;
import com.ecommerce.inventory.entity.OrderStatus;

import java.math.BigDecimal;

/**
 * Base class for all order-related events.
 */
public abstract class OrderEvent extends BaseEvent {
    
    private final Long orderId;
    private final String orderNumber;
    private final String customerName;
    private final String customerEmail;
    private final OrderStatus orderStatus;
    private final BigDecimal totalAmount;
    
    protected OrderEvent(Object source, Long orderId, String orderNumber, 
                        String customerName, String customerEmail, 
                        OrderStatus orderStatus, BigDecimal totalAmount, String userId) {
        super(source, orderId.toString(), userId);
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.orderStatus = orderStatus;
        this.totalAmount = totalAmount;
    }
    
    protected OrderEvent(Object source, Long orderId, String orderNumber, 
                        String customerName, String customerEmail, 
                        OrderStatus orderStatus, BigDecimal totalAmount, 
                        String userId, String eventVersion) {
        super(source, orderId.toString(), userId, eventVersion);
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.orderStatus = orderStatus;
        this.totalAmount = totalAmount;
    }
    
    public Long getOrderId() {
        return orderId;
    }
    
    public String getOrderNumber() {
        return orderNumber;
    }
    
    public String getCustomerName() {
        return customerName;
    }
    
    public String getCustomerEmail() {
        return customerEmail;
    }
    
    public OrderStatus getOrderStatus() {
        return orderStatus;
    }
    
    public BigDecimal getTotalAmount() {
        return totalAmount;
    }
}