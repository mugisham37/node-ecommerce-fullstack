package com.ecommerce.inventory.service.report;

import java.util.List;
import java.util.Map;

/**
 * Request object for creating or updating scheduled reports
 */
public class ScheduledReportRequest {
    
    private String reportName;
    private String templateId;
    private String schedule;
    private Map<String, Object> parameters;
    private String outputFormat;
    private List<String> recipients;
    private String description;
    private Map<String, Object> metadata;
    
    public ScheduledReportRequest() {}
    
    public ScheduledReportRequest(String reportName, String templateId, String schedule, 
                                Map<String, Object> parameters, String outputFormat, List<String> recipients) {
        this.reportName = reportName;
        this.templateId = templateId;
        this.schedule = schedule;
        this.parameters = parameters;
        this.outputFormat = outputFormat;
        this.recipients = recipients;
    }
    
    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String reportName;
        private String templateId;
        private String schedule;
        private Map<String, Object> parameters;
        private String outputFormat;
        private List<String> recipients;
        private String description;
        private Map<String, Object> metadata;
        
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
        
        public Builder description(String description) {
            this.description = description;
            return this;
        }
        
        public Builder metadata(Map<String, Object> metadata) {
            this.metadata = metadata;
            return this;
        }
        
        public ScheduledReportRequest build() {
            ScheduledReportRequest request = new ScheduledReportRequest();
            request.reportName = this.reportName;
            request.templateId = this.templateId;
            request.schedule = this.schedule;
            request.parameters = this.parameters;
            request.outputFormat = this.outputFormat;
            request.recipients = this.recipients;
            request.description = this.description;
            request.metadata = this.metadata;
            return request;
        }
    }
    
    // Getters and setters
    public String getReportName() { return reportName; }
    public void setReportName(String reportName) { this.reportName = reportName; }
    
    public String getTemplateId() { return templateId; }
    public void setTemplateId(String templateId) { this.templateId = templateId; }
    
    public String getSchedule() { return schedule; }
    public void setSchedule(String schedule) { this.schedule = schedule; }
    
    public Map<String, Object> getParameters() { return parameters; }
    public void setParameters(Map<String, Object> parameters) { this.parameters = parameters; }
    
    public String getOutputFormat() { return outputFormat; }
    public void setOutputFormat(String outputFormat) { this.outputFormat = outputFormat; }
    
    public List<String> getRecipients() { return recipients; }
    public void setRecipients(List<String> recipients) { this.recipients = recipients; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}