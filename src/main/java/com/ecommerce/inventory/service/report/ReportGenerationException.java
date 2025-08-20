package com.ecommerce.inventory.service.report;

/**
 * Exception thrown when report generation fails
 */
public class ReportGenerationException extends RuntimeException {
    
    private String templateId;
    private String reportId;
    
    public ReportGenerationException(String message) {
        super(message);
    }
    
    public ReportGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public ReportGenerationException(String message, String templateId) {
        super(message);
        this.templateId = templateId;
    }
    
    public ReportGenerationException(String message, String templateId, String reportId) {
        super(message);
        this.templateId = templateId;
        this.reportId = reportId;
    }
    
    public ReportGenerationException(String message, Throwable cause, String templateId) {
        super(message, cause);
        this.templateId = templateId;
    }
    
    public String getTemplateId() {
        return templateId;
    }
    
    public String getReportId() {
        return reportId;
    }
}