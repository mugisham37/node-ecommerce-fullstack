package com.ecommerce.inventory.exception;

/**
 * Exception thrown when inventory operations fail due to business rules or constraints.
 */
public class InventoryOperationException extends BusinessException {
    
    private final Long productId;
    private final String operation;
    private final Integer requestedQuantity;
    private final Integer currentQuantity;

    public InventoryOperationException(String message, Long productId, String operation) {
        super(message, "INVENTORY_OPERATION_FAILED", "INVENTORY_MANAGEMENT");
        this.productId = productId;
        this.operation = operation;
        this.requestedQuantity = null;
        this.currentQuantity = null;
        addContext("productId", productId);
        addContext("operation", operation);
    }

    public InventoryOperationException(String message, Long productId, String operation, 
                                     Integer requestedQuantity, Integer currentQuantity) {
        super(message, "INVENTORY_OPERATION_FAILED", "INVENTORY_MANAGEMENT");
        this.productId = productId;
        this.operation = operation;
        this.requestedQuantity = requestedQuantity;
        this.currentQuantity = currentQuantity;
        addContext("productId", productId);
        addContext("operation", operation);
        addContext("requestedQuantity", requestedQuantity);
        addContext("currentQuantity", currentQuantity);
    }

    public static InventoryOperationException allocationFailed(Long productId, Integer requested, Integer available) {
        return new InventoryOperationException(
            String.format("Cannot allocate %d units for product %d. Only %d available", 
                         requested, productId, available),
            productId, "ALLOCATION", requested, available
        );
    }

    public static InventoryOperationException releaseFailed(Long productId, Integer requested, Integer allocated) {
        return new InventoryOperationException(
            String.format("Cannot release %d units for product %d. Only %d allocated", 
                         requested, productId, allocated),
            productId, "RELEASE", requested, allocated
        );
    }

    public static InventoryOperationException adjustmentFailed(Long productId, String reason) {
        InventoryOperationException ex = new InventoryOperationException(
            String.format("Inventory adjustment failed for product %d: %s", productId, reason),
            productId, "ADJUSTMENT"
        );
        ex.addContext("reason", reason);
        return ex;
    }

    public Long getProductId() {
        return productId;
    }

    public String getOperation() {
        return operation;
    }

    public Integer getRequestedQuantity() {
        return requestedQuantity;
    }

    public Integer getCurrentQuantity() {
        return currentQuantity;
    }
}