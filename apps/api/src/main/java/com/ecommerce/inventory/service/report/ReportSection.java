package com.ecommerce.inventory.service.report;

import java.util.List;
import java.util.Map;

/**
 * Report Section represents a logical section within a report
 */
public class ReportSection {
    
    public enum SectionType {
        SUMMARY, TABLE, CHART, METRICS, TEXT, LIST, GRID
    }
    
    private String sectionId;
    private String title;
    private String description;
    private SectionType type;
    private Map<String, Object> data;
    private List<ReportColumn> columns;
    private Map<String, Object> chartConfig;
    private Map<String, Object> formatting;
    private int order;
    
    public ReportSection() {}
    
    public ReportSection(String sectionId, String title, SectionType type) {
        this.sectionId = sectionId;
        this.title = title;
        this.type = type;
    }
    
    // Builder pattern
    public static ReportSection builder(String sectionId, String title, SectionType type) {
        return new ReportSection(sectionId, title, type);
    }
    
    public ReportSection description(String description) {
        this.description = description;
        return this;
    }
    
    public ReportSection data(Map<String, Object> data) {
        this.data = data;
        return this;
    }
    
    public ReportSection columns(List<ReportColumn> columns) {
        this.columns = columns;
        return this;
    }
    
    public ReportSection chartConfig(Map<String, Object> chartConfig) {
        this.chartConfig = chartConfig;
        return this;
    }
    
    public ReportSection formatting(Map<String, Object> formatting) {
        this.formatting = formatting;
        return this;
    }
    
    public ReportSection order(int order) {
        this.order = order;
        return this;
    }
    
    // Getters and setters
    public String getSectionId() { return sectionId; }
    public void setSectionId(String sectionId) { this.sectionId = sectionId; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public SectionType getType() { return type; }
    public void setType(SectionType type) { this.type = type; }
    
    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }
    
    public List<ReportColumn> getColumns() { return columns; }
    public void setColumns(List<ReportColumn> columns) { this.columns = columns; }
    
    public Map<String, Object> getChartConfig() { return chartConfig; }
    public void setChartConfig(Map<String, Object> chartConfig) { this.chartConfig = chartConfig; }
    
    public Map<String, Object> getFormatting() { return formatting; }
    public void setFormatting(Map<String, Object> formatting) { this.formatting = formatting; }
    
    public int getOrder() { return order; }
    public void setOrder(int order) { this.order = order; }
}