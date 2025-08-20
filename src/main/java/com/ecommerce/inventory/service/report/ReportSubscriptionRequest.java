package com.ecommerce.inventory.service.report;

import java.util.Map;

/**
 * Request object for creating or updating report subscriptions
 */
public class ReportSubscriptionRequest {
    
    private String reportId;
    private String userEmail;
    private String deliveryMethod;
    private String deliverySchedule;
    private Map<String, Object> preferences;
    
    public ReportSubscriptionRequest() {}
    
    public ReportSubscriptionRequest(String reportId, String userEmail, String deliveryMethod, String deliverySchedule) {
        this.reportId = reportId;
        this.userEmail = userEmail;
        this.deliveryMethod = deliveryMethod;
        this.deliverySchedule = deliverySchedule;
    }
    
    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String reportId;
        private String userEmail;
        private String deliveryMethod;
        private String deliverySchedule;
        private Map<String, Object> preferences;
        
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
        
        public Builder preferences(Map<String, Object> preferences) {
            this.preferences = preferences;
            return this;
        }
        
        public ReportSubscriptionRequest build() {
            ReportSubscriptionRequest request = new ReportSubscriptionRequest();
            request.reportId = this.reportId;
            request.userEmail = this.userEmail;
            request.deliveryMethod = this.deliveryMethod;
            request.deliverySchedule = this.deliverySchedule;
            request.preferences = this.preferences;
            return request;
        }
    }
    
    // Getters and setters
    public String getReportId() { return reportId; }
    public void setReportId(String reportId) { this.reportId = reportId; }
    
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    
    public String getDeliveryMethod() { return deliveryMethod; }
    public void setDeliveryMethod(String deliveryMethod) { this.deliveryMethod = deliveryMethod; }
    
    public String getDeliverySchedule() { return deliverySchedule; }
    public void setDeliverySchedule(String deliverySchedule) { this.deliverySchedule = deliverySchedule; }
    
    public Map<String, Object> getPreferences() { return preferences; }
    public void setPreferences(Map<String, Object> preferences) { this.preferences = preferences; }
}