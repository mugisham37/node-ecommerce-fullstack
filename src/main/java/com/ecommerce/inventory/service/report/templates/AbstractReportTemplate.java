package com.ecommerce.inventory.service.report.templates;

import com.ecommerce.inventory.service.report.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Abstract base class for report templates
 * Provides common functionality and structure for all report templates
 */
public abstract class AbstractReportTemplate implements ReportTemplate {
    
    protected final Logger logger = LoggerFactory.getLogger(getClass());
    
    protected static final List<String> DEFAULT_FORMATS = Arrays.asList("JSON", "CSV", "EXCEL", "PDF");
    protected static final long DEFAULT_CACHE_TTL = 3600; // 1 hour
    protected static final long DEFAULT_EXECUTION_TIME = 5000; // 5 seconds
    
    @Override
    public List<String> getSupportedFormats() {
        return DEFAULT_FORMATS;
    }
    
    @Override
    public long getCacheTtlSeconds() {
        return DEFAULT_CACHE_TTL;
    }
    
    @Override
    public boolean supportsRealTimeData() {
        return false; // Most reports are not real-time by default
    }
    
    @Override
    public long getEstimatedExecutionTimeMs() {
        return DEFAULT_EXECUTION_TIME;
    }
    
    @Override
    public void validateParameters(Map<String, Object> parameters) {
        // Default validation - can be overridden by subclasses
        for (ReportParameter param : getRequiredParameters()) {
            if (!parameters.containsKey(param.getName()) || parameters.get(param.getName()) == null) {
                throw new IllegalArgumentException("Required parameter missing: " + param.getName());
            }
        }
    }
    
    @Override
    public String getCacheKey(Map<String, Object> parameters) {
        StringBuilder keyBuilder = new StringBuilder();
        keyBuilder.append(getTemplateId()).append(":");
        
        // Sort parameters for consistent cache keys
        parameters.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .forEach(entry -> {
                keyBuilder.append(entry.getKey()).append("=").append(entry.getValue()).append(":");
            });
        
        return keyBuilder.toString();
    }
    
    /**
     * Helper method to create report data with common metadata
     */
    protected ReportData createReportData(String reportName, Map<String, Object> parameters) {
        String reportId = generateReportId();
        
        return ReportData.builder(reportId, getTemplateId(), reportName)
            .parameters(parameters)
            .dataAsOf(LocalDateTime.now());
    }
    
    /**
     * Generate unique report ID
     */
    protected String generateReportId() {
        return getTemplateId() + "-" + System.currentTimeMillis();
    }
    
    /**
     * Helper method to create standard date range parameters
     */
    protected List<ReportParameter> createDateRangeParameters() {
        return Arrays.asList(
            ReportParameter.builder("startDate", "Start Date", ReportParameter.ParameterType.DATETIME)
                .description("Start date for the report period")
                .defaultValue(LocalDateTime.now().minusDays(30)),
            ReportParameter.builder("endDate", "End Date", ReportParameter.ParameterType.DATETIME)
                .description("End date for the report period")
                .defaultValue(LocalDateTime.now())
        );
    }
    
    /**
     * Helper method to create pagination parameters
     */
    protected List<ReportParameter> createPaginationParameters() {
        return Arrays.asList(
            ReportParameter.builder("limit", "Limit", ReportParameter.ParameterType.INTEGER)
                .description("Maximum number of records to return")
                .defaultValue(100)
                .minValue(1)
                .maxValue(1000),
            ReportParameter.builder("offset", "Offset", ReportParameter.ParameterType.INTEGER)
                .description("Number of records to skip")
                .defaultValue(0)
                .minValue(0)
        );
    }
    
    /**
     * Helper method to create sorting parameters
     */
    protected List<ReportParameter> createSortingParameters(List<String> allowedSortFields) {
        return Arrays.asList(
            ReportParameter.builder("sortBy", "Sort By", ReportParameter.ParameterType.ENUM)
                .description("Field to sort by")
                .allowedValues(allowedSortFields)
                .defaultValue(allowedSortFields.get(0)),
            ReportParameter.builder("sortOrder", "Sort Order", ReportParameter.ParameterType.ENUM)
                .description("Sort order (ASC or DESC)")
                .allowedValues(Arrays.asList("ASC", "DESC"))
                .defaultValue("DESC")
        );
    }
}