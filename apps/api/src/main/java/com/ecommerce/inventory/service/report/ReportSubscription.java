package com.ecommerce.inventory.service.report;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Report Subscription entity for managing user subscriptions to reports
 */
public class ReportSubscription {
    
    private String subscriptionId;
    private String reportId;
    private String userEmail;
    private String deliveryMethod; // EMAIL, SMS, WEBHOOK
    private String deliverySchedule; // IMMEDIATE, DAILY, WEEKLY
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Map<String, Object> preferences;
    private LocalDateTime lastDelivery;
    private int deliveryCount;
    
    // Private constructor for builder
    private ReportSubscription(Builder builder) {
        this.subscriptionId = builder.subscriptionId;
        this.reportId = builder.reportId;
        this.userEmail = builder.userEmail;
        this.deliveryMethod = builder.deliveryMethod;
        this.deliverySchedule = builder.deliverySchedule;
        this.active = builder.active;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
        this.preferences = builder.preferences;
        this.lastDelivery = builder.lastDelivery;
        this.deliveryCount = builder.deliveryCount;
    }
    
    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }
    
    public Builder toBuilder() {
        return new Builder()
            .subscriptionId(this.subscriptionId)
            .reportId(this.reportId)
            .userEmail(this.userEmail)
            .deliveryMethod(this.deliveryMethod)
            .deliverySchedule(this.deliverySchedule)
            .active(this.active)
            .createdAt(this.createdAt)
            .updatedAt(this.updatedAt)
            .preferences(this.preferences)
            .lastDelivery(this.lastDelivery)
            .deliveryCount(this.deliveryCount);
    }
    
    public static class Builder {
        private String subscriptionId;
        private String reportId;
        private String userEmail;
        private String deliveryMethod;
        private String deliverySchedule;
        private boolean active = true;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private Map<String, Object> preferences;
        private LocalDateTime lastDelivery;
        private int deliveryCount = 0;
        
        public Builder subscriptionId(String subscriptionId) {
            this.subscriptionId = subscriptionId;
            return this;
        }
        
        public Builder reportId(String reportId) {
            this.reportId = reportId;
            return this;
        }
        
        public Builder userEmail(String userEmail) {
            this.userEmail = userEmail;
            return this;
        }
        
        public Builder deliveryMethod(String deliveryMethod) {
            this.deliveryMethod = deliveryMethod;
            return this;
        }
        
        public Builder deliverySchedule(String deliverySchedule) {
            this.deliverySchedule = deliverySchedule;
            return this;
        }
        
        public Builder active(boolean active) {
            this.active = active;
            return this;
        }
        
        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public Builder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }
        
        public Builder preferences(Map<String, Object> preferences) {
            this.preferences = preferences;
            return this;
        }
        
        public Builder lastDelivery(LocalDateTime lastDelivery) {
            this.lastDelivery = lastDelivery;
            return this;
        }
        
        public Builder deliveryCount(int deliveryCount) {
            this.deliveryCount = deliveryCount;
            return this;
        }
        
        public ReportSubscription build() {
            return new ReportSubscription(this);
        }
    }
    
    // Getters
    public String getSubscriptionId() { return subscriptionId; }
    public String getReportId() { return reportId; }
    public String getUserEmail() { return userEmail; }
    public String getDeliveryMethod() { return deliveryMethod; }
    public String getDeliverySchedule() { return deliverySchedule; }
    public boolean isActive() { return active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Map<String, Object> getPreferences() { return preferences; }
    public LocalDateTime getLastDelivery() { return lastDelivery; }
    public int getDeliveryCount() { return deliveryCount; }
}