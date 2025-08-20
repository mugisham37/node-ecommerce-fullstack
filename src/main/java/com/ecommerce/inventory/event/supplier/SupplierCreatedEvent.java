package com.ecommerce.inventory.event.supplier;

import com.ecommerce.inventory.entity.SupplierStatus;

/**
 * Event published when a new supplier is created in the system.
 */
public class SupplierCreatedEvent extends SupplierEvent {
    
    private final String contactPerson;
    private final String phoneNumber;
    private final String address;
    private final Integer paymentTermsDays;
    private final String createdByUser;
    
    public SupplierCreatedEvent(Object source, Long supplierId, String supplierName, 
                              String supplierCode, String contactEmail, String contactPerson, 
                              String phoneNumber, String address, Integer paymentTermsDays, 
                              String createdByUser, String userId) {
        super(source, supplierId, supplierName, supplierCode, SupplierStatus.ACTIVE, contactEmail, userId);
        this.contactPerson = contactPerson;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.paymentTermsDays = paymentTermsDays;
        this.createdByUser = createdByUser;
    }
    
    public String getContactPerson() {
        return contactPerson;
    }
    
    public String getPhoneNumber() {
        return phoneNumber;
    }
    
    public String getAddress() {
        return address;
    }
    
    public Integer getPaymentTermsDays() {
        return paymentTermsDays;
    }
    
    public String getCreatedByUser() {
        return createdByUser;
    }
    
    @Override
    public String toString() {
        return String.format("SupplierCreatedEvent{supplierId=%d, name='%s', code='%s', contact='%s', eventId='%s'}", 
                getSupplierId(), getSupplierName(), getSupplierCode(), contactPerson, getEventId());
    }
}