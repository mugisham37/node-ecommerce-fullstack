package com.ecommerce.inventory.service.report;

import java.time.LocalDateTime;

/**
 * Report Execution entity for tracking report execution history
 */
public class ReportExecution {
    
    private String executionId;
    private String reportId;
    private LocalDateTime executionTime;
    private String triggerType; // SCHEDULED, MANUAL
    private String status; // RUNNING, SUCCESS, FAILED
    private LocalDateTime completedAt;
    private long executionTimeMs;
    private String errorMessage;
    private ReportDeliveryResult deliveryResult;
    private String executedBy;
    
    // Private constructor for builder
    private ReportExecution(Builder builder) {
        this.executionId = builder.executionId;
        this.reportId = builder.reportId;
        this.executionTime = builder.executionTime;
        this.triggerType = builder.triggerType;
        this.status = builder.status;
        this.completedAt = builder.completedAt;
        this.executionTimeMs = builder.executionTimeMs;
        this.errorMessage = builder.errorMessage;
        this.deliveryResult = builder.deliveryResult;
        this.executedBy = builder.executedBy;
    }
    
    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }
    
    public Builder toBuilder() {
        return new Builder()
            .executionId(this.executionId)
            .reportId(this.reportId)
            .executionTime(this.executionTime)
            .triggerType(this.triggerType)
            .status(this.status)
            .completedAt(this.completedAt)
            .executionTimeMs(this.executionTimeMs)
            .errorMessage(this.errorMessage)
            .deliveryResult(this.deliveryResult)
            .executedBy(this.executedBy);
    }
    
    public static class Builder {
        private String executionId;
        private String reportId;
        private LocalDateTime executionTime;
        private String triggerType;
        private String status;
        private LocalDateTime completedAt;
        private long executionTimeMs;
        private String errorMessage;
        private ReportDeliveryResult deliveryResult;
        private String executedBy;
        
        public Builder executionId(String executionId) {
            this.executionId = executionId;
            return this;
        }
        
        public Builder reportId(String reportId) {
            this.reportId = reportId;
            return this;
        }
        
        public Builder executionTime(LocalDateTime executionTime) {
            this.executionTime = executionTime;
            return this;
        }
        
        public Builder triggerType(String triggerType) {
            this.triggerType = triggerType;
            return this;
        }
        
        public Builder status(String status) {
            this.status = status;
            return this;
        }
        
        public Builder completedAt(LocalDateTime completedAt) {
            this.completedAt = completedAt;
            return this;
        }
        
        public Builder executionTimeMs(long executionTimeMs) {
            this.executionTimeMs = executionTimeMs;
            return this;
        }
        
        public Builder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            return this;
        }
        
        public Builder deliveryResult(ReportDeliveryResult deliveryResult) {
            this.deliveryResult = deliveryResult;
            return this;
        }
        
        public Builder executedBy(String executedBy) {
            this.executedBy = executedBy;
            return this;
        }
        
        public ReportExecution build() {
            return new ReportExecution(this);
        }
    }
    
    // Getters
    public String getExecutionId() { return executionId; }
    public String getReportId() { return reportId; }
    public LocalDateTime getExecutionTime() { return executionTime; }
    public String getTriggerType() { return triggerType; }
    public String getStatus() { return status; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public long getExecutionTimeMs() { return executionTimeMs; }
    public String getErrorMessage() { return errorMessage; }
    public ReportDeliveryResult getDeliveryResult() { return deliveryResult; }
    public String getExecutedBy() { return executedBy; }
}