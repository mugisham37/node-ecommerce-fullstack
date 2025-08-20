package com.ecommerce.inventory.exception;

/**
 * Exception thrown when a requested product is not found in the system.
 */
public class ProductNotFoundException extends BusinessException {
    
    private final Long productId;
    private final String sku;

    public ProductNotFoundException(Long productId) {
        super(String.format("Product with ID %d not found", productId), 
              "PRODUCT_NOT_FOUND", "PRODUCT_MANAGEMENT");
        this.productId = productId;
        this.sku = null;
        addContext("productId", productId);
    }

    public ProductNotFoundException(String sku) {
        super(String.format("Product with SKU '%s' not found", sku), 
              "PRODUCT_NOT_FOUND", "PRODUCT_MANAGEMENT");
        this.productId = null;
        this.sku = sku;
        addContext("sku", sku);
    }

    public ProductNotFoundException(Long productId, String sku) {
        super(String.format("Product with ID %d and SKU '%s' not found", productId, sku), 
              "PRODUCT_NOT_FOUND", "PRODUCT_MANAGEMENT");
        this.productId = productId;
        this.sku = sku;
        addContext("productId", productId);
        addContext("sku", sku);
    }

    public Long getProductId() {
        return productId;
    }

    public String getSku() {
        return sku;
    }
}