package com.ecommerce.inventory.event.order;

import com.ecommerce.inventory.entity.OrderStatus;

import java.math.BigDecimal;
import java.util.List;

/**
 * Event published when an order is cancelled.
 * Contains information needed for inventory release and refund processing.
 */
public class OrderCancelledEvent extends OrderEvent {
    
    private final String cancellationReason;
    private final String cancelledByUser;
    private final List<InventoryReleaseInfo> inventoryToRelease;
    private final boolean refundRequired;
    private final BigDecimal refundAmount;
    
    public OrderCancelledEvent(Object source, Long orderId, String orderNumber, 
                             String customerName, String customerEmail, 
                             BigDecimal totalAmount, String cancellationReason, 
                             String cancelledByUser, List<InventoryReleaseInfo> inventoryToRelease, 
                             boolean refundRequired, BigDecimal refundAmount, String userId) {
        super(source, orderId, orderNumber, customerName, customerEmail, 
              OrderStatus.CANCELLED, totalAmount, userId);
        this.cancellationReason = cancellationReason;
        this.cancelledByUser = cancelledByUser;
        this.inventoryToRelease = inventoryToRelease;
        this.refundRequired = refundRequired;
        this.refundAmount = refundAmount;
    }
    
    public String getCancellationReason() {
        return cancellationReason;
    }
    
    public String getCancelledByUser() {
        return cancelledByUser;
    }
    
    public List<InventoryReleaseInfo> getInventoryToRelease() {
        return inventoryToRelease;
    }
    
    public boolean isRefundRequired() {
        return refundRequired;
    }
    
    public BigDecimal getRefundAmount() {
        return refundAmount;
    }
    
    public int getTotalItemsToRelease() {
        return inventoryToRelease.stream().mapToInt(InventoryReleaseInfo::getQuantity).sum();
    }
    
    @Override
    public String toString() {
        return String.format("OrderCancelledEvent{orderId=%d, orderNumber='%s', reason='%s', itemsToRelease=%d, refund=%s, eventId='%s'}", 
                getOrderId(), getOrderNumber(), cancellationReason, getTotalItemsToRelease(), refundAmount, getEventId());
    }
    
    /**
     * Nested class to represent inventory release information.
     */
    public static class InventoryReleaseInfo {
        private final Long productId;
        private final String productSku;
        private final Integer quantity;
        private final String warehouseLocation;
        
        public InventoryReleaseInfo(Long productId, String productSku, Integer quantity, String warehouseLocation) {
            this.productId = productId;
            this.productSku = productSku;
            this.quantity = quantity;
            this.warehouseLocation = warehouseLocation;
        }
        
        public Long getProductId() {
            return productId;
        }
        
        public String getProductSku() {
            return productSku;
        }
        
        public Integer getQuantity() {
            return quantity;
        }
        
        public String getWarehouseLocation() {
            return warehouseLocation;
        }
    }
}