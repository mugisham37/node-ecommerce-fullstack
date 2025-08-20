package com.ecommerce.inventory.event.supplier;

import com.ecommerce.inventory.event.BaseEvent;
import com.ecommerce.inventory.entity.SupplierStatus;

/**
 * Base class for all supplier-related events.
 */
public abstract class SupplierEvent extends BaseEvent {
    
    private final Long supplierId;
    private final String supplierName;
    private final String supplierCode;
    private final SupplierStatus supplierStatus;
    private final String contactEmail;
    
    protected SupplierEvent(Object source, Long supplierId, String supplierName, 
                          String supplierCode, SupplierStatus supplierStatus, 
                          String contactEmail, String userId) {
        super(source, supplierId.toString(), userId);
        this.supplierId = supplierId;
        this.supplierName = supplierName;
        this.supplierCode = supplierCode;
        this.supplierStatus = supplierStatus;
        this.contactEmail = contactEmail;
    }
    
    protected SupplierEvent(Object source, Long supplierId, String supplierName, 
                          String supplierCode, SupplierStatus supplierStatus, 
                          String contactEmail, String userId, String eventVersion) {
        super(source, supplierId.toString(), userId, eventVersion);
        this.supplierId = supplierId;
        this.supplierName = supplierName;
        this.supplierCode = supplierCode;
        this.supplierStatus = supplierStatus;
        this.contactEmail = contactEmail;
    }
    
    public Long getSupplierId() {
        return supplierId;
    }
    
    public String getSupplierName() {
        return supplierName;
    }
    
    public String getSupplierCode() {
        return supplierCode;
    }
    
    public SupplierStatus getSupplierStatus() {
        return supplierStatus;
    }
    
    public String getContactEmail() {
        return contactEmail;
    }
}