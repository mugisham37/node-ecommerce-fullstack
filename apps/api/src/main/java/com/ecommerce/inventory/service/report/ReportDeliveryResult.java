package com.ecommerce.inventory.service.report;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Report Delivery Result for tracking delivery outcomes
 */
public class ReportDeliveryResult {
    
    private String reportId;
    private LocalDateTime deliveryTime;
    private String outputFormat;
    private int totalRecipients;
    private List<String> successfulDeliveries;
    private List<String> failedDeliveries;
    private Map<String, String> deliveryErrors;
    private String deliveryStatus; // SUCCESS, PARTIAL_FAILURE, FAILED
    private String errorMessage;
    private long deliveryTimeMs;
    
    // Private constructor for builder
    private ReportDeliveryResult(Builder builder) {
        this.reportId = builder.reportId;
        this.deliveryTime = builder.deliveryTime;
        this.outputFormat = builder.outputFormat;
        this.totalRecipients = builder.totalRecipients;
        this.successfulDeliveries = builder.successfulDeliveries;
        this.failedDeliveries = builder.failedDeliveries;
        this.deliveryErrors = builder.deliveryErrors;
        this.deliveryStatus = builder.deliveryStatus;
        this.errorMessage = builder.errorMessage;
        this.deliveryTimeMs = builder.deliveryTimeMs;
    }
    
    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String reportId;
        private LocalDateTime deliveryTime;
        private String outputFormat;
        private int totalRecipients;
        private List<String> successfulDeliveries;
        private List<String> failedDeliveries;
        private Map<String, String> deliveryErrors;
        private String deliveryStatus;
        private String errorMessage;
        private long deliveryTimeMs;
        
        public Builder reportId(String reportId) {
            this.reportId = reportId;
            return this;
        }
        
        public Builder deliveryTime(LocalDateTime deliveryTime) {
            this.deliveryTime = deliveryTime;
            return this;
        }
        
        public Builder outputFormat(String outputFormat) {
            this.outputFormat = outputFormat;
            return this;
        }
        
        public Builder totalRecipients(int totalRecipients) {
            this.totalRecipients = totalRecipients;
            return this;
        }
        
        public Builder successfulDeliveries(List<String> successfulDeliveries) {
            this.successfulDeliveries = successfulDeliveries;
            return this;
        }
        
        public Builder failedDeliveries(List<String> failedDeliveries) {
            this.failedDeliveries = failedDeliveries;
            return this;
        }
        
        public Builder deliveryErrors(Map<String, String> deliveryErrors) {
            this.deliveryErrors = deliveryErrors;
            return this;
        }
        
        public Builder deliveryStatus(String deliveryStatus) {
            this.deliveryStatus = deliveryStatus;
            return this;
        }
        
        public Builder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            return this;
        }
        
        public Builder deliveryTimeMs(long deliveryTimeMs) {
            this.deliveryTimeMs = deliveryTimeMs;
            return this;
        }
        
        public ReportDeliveryResult build() {
            return new ReportDeliveryResult(this);
        }
    }
    
    // Getters
    public String getReportId() { return reportId; }
    public LocalDateTime getDeliveryTime() { return deliveryTime; }
    public String getOutputFormat() { return outputFormat; }
    public int getTotalRecipients() { return totalRecipients; }
    public List<String> getSuccessfulDeliveries() { return successfulDeliveries; }
    public List<String> getFailedDeliveries() { return failedDeliveries; }
    public Map<String, String> getDeliveryErrors() { return deliveryErrors; }
    public String getDeliveryStatus() { return deliveryStatus; }
    public String getErrorMessage() { return errorMessage; }
    public long getDeliveryTimeMs() { return deliveryTimeMs; }
}