package com.ecommerce.inventory.service.report;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Report Data container for generated report results
 */
public class ReportData {
    
    private String reportId;
    private String templateId;
    private String reportName;
    private LocalDateTime generatedAt;
    private LocalDateTime dataAsOf;
    private Map<String, Object> parameters;
    private Map<String, Object> metadata;
    private List<ReportSection> sections;
    private Map<String, Object> summary;
    private long executionTimeMs;
    private boolean fromCache;
    
    public ReportData() {
        this.generatedAt = LocalDateTime.now();
    }
    
    public ReportData(String reportId, String templateId, String reportName) {
        this();
        this.reportId = reportId;
        this.templateId = templateId;
        this.reportName = reportName;
    }
    
    // Builder pattern
    public static ReportData builder(String reportId, String templateId, String reportName) {
        return new ReportData(reportId, templateId, reportName);
    }
    
    public ReportData parameters(Map<String, Object> parameters) {
        this.parameters = parameters;
        return this;
    }
    
    public ReportData metadata(Map<String, Object> metadata) {
        this.metadata = metadata;
        return this;
    }
    
    public ReportData sections(List<ReportSection> sections) {
        this.sections = sections;
        return this;
    }
    
    public ReportData summary(Map<String, Object> summary) {
        this.summary = summary;
        return this;
    }
    
    public ReportData executionTime(long executionTimeMs) {
        this.executionTimeMs = executionTimeMs;
        return this;
    }
    
    public ReportData fromCache(boolean fromCache) {
        this.fromCache = fromCache;
        return this;
    }
    
    public ReportData dataAsOf(LocalDateTime dataAsOf) {
        this.dataAsOf = dataAsOf;
        return this;
    }
    
    // Getters and setters
    public String getReportId() { return reportId; }
    public void setReportId(String reportId) { this.reportId = reportId; }
    
    public String getTemplateId() { return templateId; }
    public void setTemplateId(String templateId) { this.templateId = templateId; }
    
    public String getReportName() { return reportName; }
    public void setReportName(String reportName) { this.reportName = reportName; }
    
    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }
    
    public LocalDateTime getDataAsOf() { return dataAsOf; }
    public void setDataAsOf(LocalDateTime dataAsOf) { this.dataAsOf = dataAsOf; }
    
    public Map<String, Object> getParameters() { return parameters; }
    public void setParameters(Map<String, Object> parameters) { this.parameters = parameters; }
    
    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
    
    public List<ReportSection> getSections() { return sections; }
    public void setSections(List<ReportSection> sections) { this.sections = sections; }
    
    public Map<String, Object> getSummary() { return summary; }
    public void setSummary(Map<String, Object> summary) { this.summary = summary; }
    
    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }
    
    public boolean isFromCache() { return fromCache; }
    public void setFromCache(boolean fromCache) { this.fromCache = fromCache; }
}