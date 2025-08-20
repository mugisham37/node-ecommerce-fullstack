package com.ecommerce.inventory.event.builder;

import com.ecommerce.inventory.entity.OrderStatus;
import com.ecommerce.inventory.event.order.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Builder for creating order-related events with fluent API.
 */
public class OrderEventBuilder {
    
    /**
     * Creates an OrderCreatedEvent builder.
     */
    public OrderCreatedEventBuilder orderCreated() {
        return new OrderCreatedEventBuilder();
    }
    
    /**
     * Creates an OrderStatusChangedEvent builder.
     */
    public OrderStatusChangedEventBuilder orderStatusChanged() {
        return new OrderStatusChangedEventBuilder();
    }
    
    /**
     * Creates an OrderCancelledEvent builder.
     */
    public OrderCancelledEventBuilder orderCancelled() {
        return new OrderCancelledEventBuilder();
    }
    
    public static class OrderCreatedEventBuilder {
        private Object source;
        private Long orderId;
        private String orderNumber;
        private String customerName;
        private String customerEmail;
        private BigDecimal totalAmount;
        private List<OrderCreatedEvent.OrderItemInfo> orderItems;
        private String shippingAddress;
        private String billingAddress;
        private BigDecimal subtotal;
        private BigDecimal taxAmount;
        private BigDecimal shippingCost;
        private Map<String, Object> metadata;
        private String userId;
        
        public OrderCreatedEventBuilder source(Object source) {
            this.source = source;
            return this;
        }
        
        public OrderCreatedEventBuilder orderId(Long orderId) {
            this.orderId = orderId;
            return this;
        }
        
        public OrderCreatedEventBuilder orderNumber(String orderNumber) {
            this.orderNumber = orderNumber;
            return this;
        }
        
        public OrderCreatedEventBuilder customerName(String customerName) {
            this.customerName = customerName;
            return this;
        }
        
        public OrderCreatedEventBuilder customerEmail(String customerEmail) {
            this.customerEmail = customerEmail;
            return this;
        }
        
        public OrderCreatedEventBuilder totalAmount(BigDecimal totalAmount) {
            this.totalAmount = totalAmount;
            return this;
        }
        
        public OrderCreatedEventBuilder orderItems(List<OrderCreatedEvent.OrderItemInfo> orderItems) {
            this.orderItems = orderItems;
            return this;
        }
        
        public OrderCreatedEventBuilder shippingAddress(String shippingAddress) {
            this.shippingAddress = shippingAddress;
            return this;
        }
        
        public OrderCreatedEventBuilder billingAddress(String billingAddress) {
            this.billingAddress = billingAddress;
            return this;
        }
        
        public OrderCreatedEventBuilder subtotal(BigDecimal subtotal) {
            this.subtotal = subtotal;
            return this;
        }
        
        public OrderCreatedEventBuilder taxAmount(BigDecimal taxAmount) {
            this.taxAmount = taxAmount;
            return this;
        }
        
        public OrderCreatedEventBuilder shippingCost(BigDecimal shippingCost) {
            this.shippingCost = shippingCost;
            return this;
        }
        
        public OrderCreatedEventBuilder metadata(Map<String, Object> metadata) {
            this.metadata = metadata;
            return this;
        }
        
        public OrderCreatedEventBuilder userId(String userId) {
            this.userId = userId;
            return this;
        }
        
        public OrderCreatedEvent build() {
            return new OrderCreatedEvent(source, orderId, orderNumber, customerName, customerEmail,
                                       totalAmount, orderItems, shippingAddress, billingAddress,
                                       subtotal, taxAmount, shippingCost, metadata, userId);
        }
    }
    
    public static class OrderStatusChangedEventBuilder {
        private Object source;
        private Long orderId;
        private String orderNumber;
        private String customerName;
        private String customerEmail;
        private BigDecimal totalAmount;
        private OrderStatus previousStatus;
        private OrderStatus newStatus;
        private String statusChangeReason;
        private String changedByUser;
        private String userId;
        
        public OrderStatusChangedEventBuilder source(Object source) {
            this.source = source;
            return this;
        }
        
        public OrderStatusChangedEventBuilder orderId(Long orderId) {
            this.orderId = orderId;
            return this;
        }
        
        public OrderStatusChangedEventBuilder orderNumber(String orderNumber) {
            this.orderNumber = orderNumber;
            return this;
        }
        
        public OrderStatusChangedEventBuilder customerName(String customerName) {
            this.customerName = customerName;
            return this;
        }
        
        public OrderStatusChangedEventBuilder customerEmail(String customerEmail) {
            this.customerEmail = customerEmail;
            return this;
        }
        
        public OrderStatusChangedEventBuilder totalAmount(BigDecimal totalAmount) {
            this.totalAmount = totalAmount;
            return this;
        }
        
        public OrderStatusChangedEventBuilder previousStatus(OrderStatus previousStatus) {
            this.previousStatus = previousStatus;
            return this;
        }
        
        public OrderStatusChangedEventBuilder newStatus(OrderStatus newStatus) {
            this.newStatus = newStatus;
            return this;
        }
        
        public OrderStatusChangedEventBuilder statusChangeReason(String statusChangeReason) {
            this.statusChangeReason = statusChangeReason;
            return this;
        }
        
        public OrderStatusChangedEventBuilder changedByUser(String changedByUser) {
            this.changedByUser = changedByUser;
            return this;
        }
        
        public OrderStatusChangedEventBuilder userId(String userId) {
            this.userId = userId;
            return this;
        }
        
        public OrderStatusChangedEvent build() {
            return new OrderStatusChangedEvent(source, orderId, orderNumber, customerName, customerEmail,
                                             totalAmount, previousStatus, newStatus, statusChangeReason,
                                             changedByUser, userId);
        }
    }
    
    public static class OrderCancelledEventBuilder {
        private Object source;
        private Long orderId;
        private String orderNumber;
        private String customerName;
        private String customerEmail;
        private BigDecimal totalAmount;
        private String cancellationReason;
        private String cancelledByUser;
        private List<OrderCancelledEvent.InventoryReleaseInfo> inventoryToRelease;
        private boolean refundRequired;
        private BigDecimal refundAmount;
        private String userId;
        
        public OrderCancelledEventBuilder source(Object source) {
            this.source = source;
            return this;
        }
        
        public OrderCancelledEventBuilder orderId(Long orderId) {
            this.orderId = orderId;
            return this;
        }
        
        public OrderCancelledEventBuilder orderNumber(String orderNumber) {
            this.orderNumber = orderNumber;
            return this;
        }
        
        public OrderCancelledEventBuilder customerName(String customerName) {
            this.customerName = customerName;
            return this;
        }
        
        public OrderCancelledEventBuilder customerEmail(String customerEmail) {
            this.customerEmail = customerEmail;
            return this;
        }
        
        public OrderCancelledEventBuilder totalAmount(BigDecimal totalAmount) {
            this.totalAmount = totalAmount;
            return this;
        }
        
        public OrderCancelledEventBuilder cancellationReason(String cancellationReason) {
            this.cancellationReason = cancellationReason;
            return this;
        }
        
        public OrderCancelledEventBuilder cancelledByUser(String cancelledByUser) {
            this.cancelledByUser = cancelledByUser;
            return this;
        }
        
        public OrderCancelledEventBuilder inventoryToRelease(List<OrderCancelledEvent.InventoryReleaseInfo> inventoryToRelease) {
            this.inventoryToRelease = inventoryToRelease;
            return this;
        }
        
        public OrderCancelledEventBuilder refundRequired(boolean refundRequired) {
            this.refundRequired = refundRequired;
            return this;
        }
        
        public OrderCancelledEventBuilder refundAmount(BigDecimal refundAmount) {
            this.refundAmount = refundAmount;
            return this;
        }
        
        public OrderCancelledEventBuilder userId(String userId) {
            this.userId = userId;
            return this;
        }
        
        public OrderCancelledEvent build() {
            return new OrderCancelledEvent(source, orderId, orderNumber, customerName, customerEmail,
                                         totalAmount, cancellationReason, cancelledByUser, inventoryToRelease,
                                         refundRequired, refundAmount, userId);
        }
    }
}