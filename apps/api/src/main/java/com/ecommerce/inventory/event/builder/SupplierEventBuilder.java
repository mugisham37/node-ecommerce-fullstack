package com.ecommerce.inventory.event.builder;

import com.ecommerce.inventory.entity.SupplierStatus;
import com.ecommerce.inventory.event.supplier.*;

import java.util.List;

/**
 * Builder for creating supplier-related events with fluent API.
 */
public class SupplierEventBuilder {
    
    /**
     * Creates a SupplierCreatedEvent builder.
     */
    public SupplierCreatedEventBuilder supplierCreated() {
        return new SupplierCreatedEventBuilder();
    }
    
    /**
     * Creates a SupplierStatusChangedEvent builder.
     */
    public SupplierStatusChangedEventBuilder supplierStatusChanged() {
        return new SupplierStatusChangedEventBuilder();
    }
    
    public static class SupplierCreatedEventBuilder {
        private Object source;
        private Long supplierId;
        private String supplierName;
        private String supplierCode;
        private String contactEmail;
        private String contactPerson;
        private String phoneNumber;
        private String address;
        private Integer paymentTermsDays;
        private String createdByUser;
        private String userId;
        
        public SupplierCreatedEventBuilder source(Object source) {
            this.source = source;
            return this;
        }
        
        public SupplierCreatedEventBuilder supplierId(Long supplierId) {
            this.supplierId = supplierId;
            return this;
        }
        
        public SupplierCreatedEventBuilder supplierName(String supplierName) {
            this.supplierName = supplierName;
            return this;
        }
        
        public SupplierCreatedEventBuilder supplierCode(String supplierCode) {
            this.supplierCode = supplierCode;
            return this;
        }
        
        public SupplierCreatedEventBuilder contactEmail(String contactEmail) {
            this.contactEmail = contactEmail;
            return this;
        }
        
        public SupplierCreatedEventBuilder contactPerson(String contactPerson) {
            this.contactPerson = contactPerson;
            return this;
        }
        
        public SupplierCreatedEventBuilder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }
        
        public SupplierCreatedEventBuilder address(String address) {
            this.address = address;
            return this;
        }
        
        public SupplierCreatedEventBuilder paymentTermsDays(Integer paymentTermsDays) {
            this.paymentTermsDays = paymentTermsDays;
            return this;
        }
        
        public SupplierCreatedEventBuilder createdByUser(String createdByUser) {
            this.createdByUser = createdByUser;
            return this;
        }
        
        public SupplierCreatedEventBuilder userId(String userId) {
            this.userId = userId;
            return this;
        }
        
        public SupplierCreatedEvent build() {
            return new SupplierCreatedEvent(source, supplierId, supplierName, supplierCode,
                                          contactEmail, contactPerson, phoneNumber, address,
                                          paymentTermsDays, createdByUser, userId);
        }
    }
    
    public static class SupplierStatusChangedEventBuilder {
        private Object source;
        private Long supplierId;
        private String supplierName;
        private String supplierCode;
        private SupplierStatus previousStatus;
        private SupplierStatus newStatus;
        private String contactEmail;
        private String statusChangeReason;
        private String changedByUser;
        private List<Long> affectedProductIds;
        private boolean impactsActiveOrders;
        private String userId;
        
        public SupplierStatusChangedEventBuilder source(Object source) {
            this.source = source;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder supplierId(Long supplierId) {
            this.supplierId = supplierId;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder supplierName(String supplierName) {
            this.supplierName = supplierName;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder supplierCode(String supplierCode) {
            this.supplierCode = supplierCode;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder previousStatus(SupplierStatus previousStatus) {
            this.previousStatus = previousStatus;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder newStatus(SupplierStatus newStatus) {
            this.newStatus = newStatus;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder contactEmail(String contactEmail) {
            this.contactEmail = contactEmail;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder statusChangeReason(String statusChangeReason) {
            this.statusChangeReason = statusChangeReason;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder changedByUser(String changedByUser) {
            this.changedByUser = changedByUser;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder affectedProductIds(List<Long> affectedProductIds) {
            this.affectedProductIds = affectedProductIds;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder impactsActiveOrders(boolean impactsActiveOrders) {
            this.impactsActiveOrders = impactsActiveOrders;
            return this;
        }
        
        public SupplierStatusChangedEventBuilder userId(String userId) {
            this.userId = userId;
            return this;
        }
        
        public SupplierStatusChangedEvent build() {
            return new SupplierStatusChangedEvent(source, supplierId, supplierName, supplierCode,
                                                previousStatus, newStatus, contactEmail, statusChangeReason,
                                                changedByUser, affectedProductIds, impactsActiveOrders, userId);
        }
    }
}