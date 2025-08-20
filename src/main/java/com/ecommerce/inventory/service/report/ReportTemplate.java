package com.ecommerce.inventory.service.report;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Report Template interface for flexible report generation
 * Defines the contract for all report templates in the system
 */
public interface ReportTemplate {
    
    /**
     * Get the unique identifier for this report template
     */
    String getTemplateId();
    
    /**
     * Get the display name for this report template
     */
    String getTemplateName();
    
    /**
     * Get the description of what this report generates
     */
    String getDescription();
    
    /**
     * Get the list of required parameters for this report
     */
    List<ReportParameter> getRequiredParameters();
    
    /**
     * Get the list of optional parameters for this report
     */
    List<ReportParameter> getOptionalParameters();
    
    /**
     * Get supported output formats for this report
     */
    List<String> getSupportedFormats();
    
    /**
     * Validate the provided parameters
     */
    void validateParameters(Map<String, Object> parameters);
    
    /**
     * Generate the report data based on provided parameters
     */
    ReportData generateReport(Map<String, Object> parameters);
    
    /**
     * Get the cache key for this report with given parameters
     */
    String getCacheKey(Map<String, Object> parameters);
    
    /**
     * Get the cache TTL in seconds for this report type
     */
    long getCacheTtlSeconds();
    
    /**
     * Check if this report supports real-time data
     */
    boolean supportsRealTimeData();
    
    /**
     * Get the estimated execution time for this report
     */
    long getEstimatedExecutionTimeMs();
}