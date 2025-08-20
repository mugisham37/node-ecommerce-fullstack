package com.ecommerce.inventory.event.order;

import com.ecommerce.inventory.entity.OrderStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Event published when a new order is created.
 * Contains comprehensive order information for downstream processing.
 */
public class OrderCreatedEvent extends OrderEvent {
    
    private final List<OrderItemInfo> orderItems;
    private final String shippingAddress;
    private final String billingAddress;
    private final BigDecimal subtotal;
    private final BigDecimal taxAmount;
    private final BigDecimal shippingCost;
    private final Map<String, Object> metadata;
    
    public OrderCreatedEvent(Object source, Long orderId, String orderNumber, 
                           String customerName, String customerEmail, 
                           BigDecimal totalAmount, List<OrderItemInfo> orderItems, 
                           String shippingAddress, String billingAddress, 
                           BigDecimal subtotal, BigDecimal taxAmount, 
                           BigDecimal shippingCost, Map<String, Object> metadata, 
                           String userId) {
        super(source, orderId, orderNumber, customerName, customerEmail, 
              OrderStatus.PENDING, totalAmount, userId);
        this.orderItems = orderItems;
        this.shippingAddress = shippingAddress;
        this.billingAddress = billingAddress;
        this.subtotal = subtotal;
        this.taxAmount = taxAmount;
        this.shippingCost = shippingCost;
        this.metadata = metadata;
    }
    
    public List<OrderItemInfo> getOrderItems() {
        return orderItems;
    }
    
    public String getShippingAddress() {
        return shippingAddress;
    }
    
    public String getBillingAddress() {
        return billingAddress;
    }
    
    public BigDecimal getSubtotal() {
        return subtotal;
    }
    
    public BigDecimal getTaxAmount() {
        return taxAmount;
    }
    
    public BigDecimal getShippingCost() {
        return shippingCost;
    }
    
    public Map<String, Object> getMetadata() {
        return metadata;
    }
    
    public int getTotalItemCount() {
        return orderItems.stream().mapToInt(OrderItemInfo::getQuantity).sum();
    }
    
    @Override
    public String toString() {
        return String.format("OrderCreatedEvent{orderId=%d, orderNumber='%s', customer='%s', itemCount=%d, total=%s, eventId='%s'}", 
                getOrderId(), getOrderNumber(), getCustomerName(), getTotalItemCount(), getTotalAmount(), getEventId());
    }
    
    /**
     * Nested class to represent order item information in the event.
     */
    public static class OrderItemInfo {
        private final Long productId;
        private final String productSku;
        private final String productName;
        private final Integer quantity;
        private final BigDecimal unitPrice;
        private final BigDecimal totalPrice;
        
        public OrderItemInfo(Long productId, String productSku, String productName, 
                           Integer quantity, BigDecimal unitPrice, BigDecimal totalPrice) {
            this.productId = productId;
            this.productSku = productSku;
            this.productName = productName;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
            this.totalPrice = totalPrice;
        }
        
        public Long getProductId() {
            return productId;
        }
        
        public String getProductSku() {
            return productSku;
        }
        
        public String getProductName() {
            return productName;
        }
        
        public Integer getQuantity() {
            return quantity;
        }
        
        public BigDecimal getUnitPrice() {
            return unitPrice;
        }
        
        public BigDecimal getTotalPrice() {
            return totalPrice;
        }
    }
}