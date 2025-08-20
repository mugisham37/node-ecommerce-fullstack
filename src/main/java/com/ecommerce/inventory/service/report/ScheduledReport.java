package com.ecommerce.inventory.service.report;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Scheduled Report entity for managing automated report generation
 */
public class ScheduledReport {
    
    private String reportId;
    private String reportName;
    private String templateId;
    private String schedule; // HOURLY, DAILY, WEEKLY, MONTHLY, QUARTERLY
    private Map<String, Object> parameters;
    private String outputFormat;
    private List<String> recipients;
    private boolean active;
    private LocalDateTime createdAt;
    private String createdBy;
    private LocalDateTime updatedAt;
    private String updatedBy;
    private LocalDateTime nextRunTime;
    private LocalDateTime lastRunTime;
    private String description;
    private Map<String, Object> metadata;
    
    // Private constructor for builder
    private ScheduledReport(Builder builder) {
        this.reportId = builder.reportId;
        this.reportName = builder.reportName;
        this.templateId = builder.templateId;
        this.schedule = builder.schedule;
        this.parameters = builder.parameters;
        this.outputFormat = builder.outputFormat;
        this.recipients = builder.recipients;
        this.active = builder.active;
        this.createdAt = builder.createdAt;
        this.createdBy = builder.createdBy;
        this.updatedAt = builder.updatedAt;
        this.updatedBy = builder.updatedBy;
        this.nextRunTime = builder.nextRunTime;
        this.lastRunTime = builder.lastRunTime;
        this.description = builder.description;
        this.metadata = builder.metadata;
    }
    
    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }
    
    public Builder toBuilder() {
        return new Builder()
            .reportId(this.reportId)
            .reportName(this.reportName)
            .templateId(this.templateId)
            .schedule(this.schedule)
            .parameters(this.parameters)
            .outputFormat(this.outputFormat)
            .recipients(this.recipients)
            .active(this.active)
            .createdAt(this.createdAt)
            .createdBy(this.createdBy)
            .updatedAt(this.updatedAt)
            .updatedBy(this.updatedBy)
            .nextRunTime(this.nextRunTime)
            .lastRunTime(this.lastRunTime)
            .description(this.description)
            .metadata(this.metadata);
    }
    
    public static class Builder {
        private String reportId;
        private String reportName;
        private String templateId;
        private String schedule;
        private Map<String, Object> parameters;
        private String outputFormat;
        private List<String> recipients;
        private boolean active = true;
        private LocalDateTime createdAt;
        private String createdBy;
        private LocalDateTime updatedAt;
        private String updatedBy;
        private LocalDateTime nextRunTime;
        private LocalDateTime lastRunTime;
        private String description;
        private Map<String, Object> metadata;
        
        public Builder reportId(String reportId) {
            this.reportId = reportId;
            return this;
        }
        
        public Builder reportName(String reportName) {
            this.reportName = reportName;
            return this;
        }
        
        public Builder templateId(String templateId) {
            this.templateId = templateId;
            return this;
        }
        
        public Builder schedule(String schedule) {
            this.schedule = schedule;
            return this;
        }
        
        public Builder parameters(Map<String, Object> parameters) {
            this.parameters = parameters;
            return this;
        }
        
        public Builder outputFormat(String outputFormat) {
            this.outputFormat = outputFormat;
            return this;
        }
        
        public Builder recipients(List<String> recipients) {
            this.recipients = recipients;
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
        
        public Builder createdBy(String createdBy) {
            this.createdBy = createdBy;
            return this;
        }
        
        public Builder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }
        
        public Builder updatedBy(String updatedBy) {
            this.updatedBy = updatedBy;
            return this;
        }
        
        public Builder nextRunTime(LocalDateTime nextRunTime) {
            this.nextRunTime = nextRunTime;
            return this;
        }
        
        public Builder lastRunTime(LocalDateTime lastRunTime) {
            this.lastRunTime = lastRunTime;
            return this;
        }
        
        public Builder description(String description) {
            this.description = description;
            return this;
        }
        
        public Builder metadata(Map<String, Object> metadata) {
            this.metadata = metadata;
            return this;
        }
        
        public ScheduledReport build() {
            return new ScheduledReport(this);
        }
    }
    
    // Getters
    public String getReportId() { return reportId; }
    public String getReportName() { return reportName; }
    public String getTemplateId() { return templateId; }
    public String getSchedule() { return schedule; }
    public Map<String, Object> getParameters() { return parameters; }
    public String getOutputFormat() { return outputFormat; }
    public List<String> getRecipients() { return recipients; }
    public boolean isActive() { return active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getCreatedBy() { return createdBy; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getUpdatedBy() { return updatedBy; }
    public LocalDateTime getNextRunTime() { return nextRunTime; }
    public LocalDateTime getLastRunTime() { return lastRunTime; }
    public String getDescription() { return description; }
    public Map<String, Object> getMetadata() { return metadata; }
}