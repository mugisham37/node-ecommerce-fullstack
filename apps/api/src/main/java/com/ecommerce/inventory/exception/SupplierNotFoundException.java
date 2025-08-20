package com.ecommerce.inventory.exception;

/**
 * Exception thrown when a requested supplier is not found in the system.
 */
public class SupplierNotFoundException extends BusinessException {
    
    private final Long supplierId;
    private final String supplierName;

    public SupplierNotFoundException(Long supplierId) {
        super(String.format("Supplier with ID %d not found", supplierId), 
              "SUPPLIER_NOT_FOUND", "SUPPLIER_MANAGEMENT");
        this.supplierId = supplierId;
        this.supplierName = null;
        addContext("supplierId", supplierId);
    }

    public SupplierNotFoundException(String supplierName) {
        super(String.format("Supplier with name '%s' not found", supplierName), 
              "SUPPLIER_NOT_FOUND", "SUPPLIER_MANAGEMENT");
        this.supplierId = null;
        this.supplierName = supplierName;
        addContext("supplierName", supplierName);
    }

    public Long getSupplierId() {
        return supplierId;
    }

    public String getSupplierName() {
        return supplierName;
    }
}