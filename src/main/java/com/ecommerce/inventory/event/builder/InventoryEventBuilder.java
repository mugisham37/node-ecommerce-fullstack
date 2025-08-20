package com.ecommerce.inventory.event.builder;

import com.ecommerce.inventory.entity.StockMovementType;
import com.ecommerce.inventory.event.inventory.*;

/**
 * Builder for creating inventory-related events with fluent API.
 */
public class InventoryEventBuilder {
    
    /**
     * Creates a StockUpdatedEvent builder.
     */
    public StockUpdatedEventBuilder stockUpdated() {
        return new StockUpdatedEventBuilder();
    }
    
    /**
     * Creates a LowStockEvent builder.
     */
    public LowStockEventBuilder lowStock() {
        return new LowStockEventBuilder();
    }
    
    /**
     * Creates an InventoryAllocatedEvent builder.
     */
    public InventoryAllocatedEventBuilder inventoryAllocated() {
        return new InventoryAllocatedEventBuilder();
    }
    
    /**
     * Creates an InventoryReleasedEvent builder.
     */
    public InventoryReleasedEventBuilder inventoryReleased() {
        return new InventoryReleasedEventBuilder();
    }
    
    public static class StockUpdatedEventBuilder {
        private Object source;
        private Long productId;
        private String productSku;
        private String warehouseLocation = "MAIN";
        private Integer previousQuantity;
        private Integer newQuantity;
        private StockMovementType movementType;
        private String reason;
        private String referenceId;
        private String referenceType;
        private String userId;
        
        public StockUpdatedEventBuilder source(Object source) {
            this.source = source;
            return this;
        }
        
        public StockUpdatedEventBuilder productId(Long productId) {
            this.productId = productId;
            return this;
        }
        
        public StockUpdatedEventBuilder productSku(String productSku) {
            this.productSku = productSku;
            return this;
        }
        
        public StockUpdatedEventBuilder warehouseLocation(String warehouseLocation) {
            this.warehouseLocation = warehouseLocation;
            return this;
        }
        
        public StockUpdatedEventBuilder previousQuantity(Integer previousQuantity) {
            this.previousQuantity = previousQuantity;
            return this;
        }
        
        public StockUpdatedEventBuilder newQuantity(Integer newQuantity) {
            this.newQuantity = newQuantity;
            return this;
        }
        
        public StockUpdatedEventBuilder movementType(StockMovementType movementType) {
            this.movementType = movementType;
            return this;
        }
        
        public StockUpdatedEventBuilder reason(String reason) {
            this.reason = reason;
            return this;
        }
        
        public StockUpdatedEventBuilder referenceId(String referenceId) {
            this.referenceId = referenceId;
            return this;
        }
        
        public StockUpdatedEventBuilder referenceType(String referenceType) {
            this.referenceType = referenceType;
            return this;
        }
        
        public StockUpdatedEventBuilder userId(String userId) {
            this.userId = userId;
            return this;
        }
        
        public StockUpdatedEvent build() {
            return new StockUpdatedEvent(source, productId, productSku, warehouseLocation,
                                       previousQuantity, newQuantity, movementType, reason,
                                       referenceId, referenceType, userId);
        }
    }
    
    public static class LowStockEventBuilder {
        private Object source;
        private Long productId;
        private String productSku;
        private String warehouseLocation = "MAIN";
        private Integer currentStock;
        private Integer reorderLevel;
        private Integer reorderQuantity;
        private Long supplierId;
        private String supplierName;
        private String userId;
        
        public LowStockEventBuilder source(Object source) {
            this.source = source;
            return this;
        }
        
        public LowStockEventBuilder productId(Long productId) {
            this.productId = productId;
            return this;
        }
        
        public LowStockEventBuilder productSku(String productSku) {
            this.productSku = productSku;
            return this;
        }
        
        public LowStockEventBuilder warehouseLocation(String warehouseLocation) {
            this.warehouseLocation = warehouseLocation;
            return this;
        }
        
        public LowStockEventBuilder currentStock(Integer currentStock) {
            this.currentStock = currentStock;
            return this;
        }
        
        public LowStockEventBuilder reorderLevel(Integer reorderLevel) {
            this.reorderLevel = reorderLevel;
            return this;
        }
        
        public LowStockEventBuilder reorderQuantity(Integer reorderQuantity) {
            this.reorderQuantity = reorderQuantity;
            return this;
        }
        
        public LowStockEventBuilder supplierId(Long supplierId) {
            this.supplierId = supplierId;
            return this;
        }
        
        public LowStockEventBuilder supplierName(String supplierName) {
            this.supplierName = supplierName;
            return this;
        }
        
        public LowStockEventBuilder userId(String userId) {
            this.userId = userId;
            return this;
        }
        
        public LowStockEvent build() {
            return new LowStockEvent(source, productId, productSku, warehouseLocation,
                                   currentStock, reorderLevel, reorderQuantity,
                                   supplierId, supplierName, userId);
        }
    }
    
    public static class InventoryAllocatedEventBuilder {
        private Object source;
        private Long productId;
        private String productSku;
        private String warehouseLocation = "MAIN";
        private Integer allocatedQuantity;
        private Integer remainingAvailable;
        private String allocationReferenceId;
        private String allocationType;
        private String customerInfo;
        private String userId;
        
        public InventoryAllocatedEventBuilder source(Object source) {
            this.source = source;
            return this;
        }
        
        public InventoryAllocatedEventBuilder productId(Long productId) {
            this.productId = productId;
            return this;
        }
        
        public InventoryAllocatedEventBuilder productSku(String productSku) {
            this.productSku = productSku;
            return this;
        }
        
        public InventoryAllocatedEventBuilder warehouseLocation(String warehouseLocation) {
            this.warehouseLocation = warehouseLocation;
            return this;
        }
        
        public InventoryAllocatedEventBuilder allocatedQuantity(Integer allocatedQuantity) {
            this.allocatedQuantity = allocatedQuantity;
            return this;
        }
        
        public InventoryAllocatedEventBuilder remainingAvailable(Integer remainingAvailable) {
            this.remainingAvailable = remainingAvailable;
            return this;
        }
        
        public InventoryAllocatedEventBuilder allocationReferenceId(String allocationReferenceId) {
            this.allocationReferenceId = allocationReferenceId;
            return this;
        }
        
        public InventoryAllocatedEventBuilder allocationType(String allocationType) {
            this.allocationType = allocationType;
            return this;
        }
        
        public InventoryAllocatedEventBuilder customerInfo(String customerInfo) {
            this.customerInfo = customerInfo;
            return this;
        }
        
        public InventoryAllocatedEventBuilder userId(String userId) {
            this.userId = userId;
            return this;
        }
        
        public InventoryAllocatedEvent build() {
            return new InventoryAllocatedEvent(source, productId, productSku, warehouseLocation,
                                             allocatedQuantity, remainingAvailable, allocationReferenceId,
                                             allocationType, customerInfo, userId);
        }
    }
    
    public static class InventoryReleasedEventBuilder {
        private Object source;
        private Long productId;
        private String productSku;
        private String warehouseLocation = "MAIN";
        private Integer releasedQuantity;
        private Integer newAvailableQuantity;
        private String originalAllocationId;
        private String releaseReason;
        private String releaseType;
        private String userId;
        
        public InventoryReleasedEventBuilder source(Object source) {
            this.source = source;
            return this;
        }
        
        public InventoryReleasedEventBuilder productId(Long productId) {
            this.productId = productId;
            return this;
        }
        
        public InventoryReleasedEventBuilder productSku(String productSku) {
            this.productSku = productSku;
            return this;
        }
        
        public InventoryReleasedEventBuilder warehouseLocation(String warehouseLocation) {
            this.warehouseLocation = warehouseLocation;
            return this;
        }
        
        public InventoryReleasedEventBuilder releasedQuantity(Integer releasedQuantity) {
            this.releasedQuantity = releasedQuantity;
            return this;
        }
        
        public InventoryReleasedEventBuilder newAvailableQuantity(Integer newAvailableQuantity) {
            this.newAvailableQuantity = newAvailableQuantity;
            return this;
        }
        
        public InventoryReleasedEventBuilder originalAllocationId(String originalAllocationId) {
            this.originalAllocationId = originalAllocationId;
            return this;
        }
        
        public InventoryReleasedEventBuilder releaseReason(String releaseReason) {
            this.releaseReason = releaseReason;
            return this;
        }
        
        public InventoryReleasedEventBuilder releaseType(String releaseType) {
            this.releaseType = releaseType;
            return this;
        }
        
        public InventoryReleasedEventBuilder userId(String userId) {
            this.userId = userId;
            return this;
        }
        
        public InventoryReleasedEvent build() {
            return new InventoryReleasedEvent(source, productId, productSku, warehouseLocation,
                                            releasedQuantity, newAvailableQuantity, originalAllocationId,
                                            releaseReason, releaseType, userId);
        }
    }
}