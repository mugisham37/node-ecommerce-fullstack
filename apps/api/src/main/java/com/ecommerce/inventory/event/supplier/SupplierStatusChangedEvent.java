package com.ecommerce.inventory.event.supplier;

import com.ecommerce.inventory.entity.SupplierStatus;

import java.util.List;

/**
 * Event published when a supplier's status changes.
 * Contains information about affected products and business impact.
 */
public class SupplierStatusChangedEvent extends SupplierEvent {
    
    private final SupplierStatus previousStatus;
    private final SupplierStatus newStatus;
    private final String statusChangeReason;
    private final String changedByUser;
    private final List<Long> affectedProductIds;
    private final boolean impactsActiveOrders;
    
    public SupplierStatusChangedEvent(Object source, Long supplierId, String supplierName, 
                                    String supplierCode, SupplierStatus previousStatus, 
                                    SupplierStatus newStatus, String contactEmail, 
                                    String statusChangeReason, String changedByUser, 
                                    List<Long> affectedProductIds, boolean impactsActiveOrders, 
                                    String userId) {
        super(source, supplierId, supplierName, supplierCode, newStatus, contactEmail, userId);
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.statusChangeReason = statusChangeReason;
        this.changedByUser = changedByUser;
        this.affectedProductIds = affectedProductIds;
        this.impactsActiveOrders = impactsActiveOrders;
    }
    
    public SupplierStatus getPreviousStatus() {
        return previousStatus;
    }
    
    public SupplierStatus getNewStatus() {
        return newStatus;
    }
    
    public String getStatusChangeReason() {
        return statusChangeReason;
    }
    
    public String getChangedByUser() {
        return changedByUser;
    }
    
    public List<Long> getAffectedProductIds() {
        return affectedProductIds;
    }
    
    public boolean impactsActiveOrders() {
        return impactsActiveOrders;
    }
    
    public boolean isSupplierActivated() {
        return newStatus == SupplierStatus.ACTIVE;
    }
    
    public boolean isSupplierDeactivated() {
        return newStatus == SupplierStatus.INACTIVE;
    }
    
    public boolean isSupplierSuspended() {
        return newStatus == SupplierStatus.SUSPENDED;
    }
    
    public int getAffectedProductCount() {
        return affectedProductIds != null ? affectedProductIds.size() : 0;
    }
    
    @Override
    public String toString() {
        return String.format("SupplierStatusChangedEvent{supplierId=%d, name='%s', %s -> %s, affectedProducts=%d, reason='%s', eventId='%s'}", 
                getSupplierId(), getSupplierName(), previousStatus, newStatus, getAffectedProductCount(), statusChangeReason, getEventId());
    }
}