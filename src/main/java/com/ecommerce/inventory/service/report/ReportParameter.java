package com.ecommerce.inventory.service.report;

import java.util.List;

/**
 * Report Parameter definition for template-based report generation
 */
public class ReportParameter {
    
    public enum ParameterType {
        STRING, INTEGER, LONG, DECIMAL, BOOLEAN, DATE, DATETIME, 
        ENUM, LIST, OBJECT
    }
    
    private String name;
    private String displayName;
    private String description;
    private ParameterType type;
    private boolean required;
    private Object defaultValue;
    private List<String> allowedValues;
    private String validationPattern;
    private Object minValue;
    private Object maxValue;
    
    public ReportParameter() {}
    
    public ReportParameter(String name, String displayName, ParameterType type, boolean required) {
        this.name = name;
        this.displayName = displayName;
        this.type = type;
        this.required = required;
    }
    
    // Builder pattern for easy construction
    public static ReportParameter builder(String name, String displayName, ParameterType type) {
        return new ReportParameter(name, displayName, type, false);
    }
    
    public ReportParameter required() {
        this.required = true;
        return this;
    }
    
    public ReportParameter defaultValue(Object defaultValue) {
        this.defaultValue = defaultValue;
        return this;
    }
    
    public ReportParameter allowedValues(List<String> allowedValues) {
        this.allowedValues = allowedValues;
        return this;
    }
    
    public ReportParameter validationPattern(String pattern) {
        this.validationPattern = pattern;
        return this;
    }
    
    public ReportParameter minValue(Object minValue) {
        this.minValue = minValue;
        return this;
    }
    
    public ReportParameter maxValue(Object maxValue) {
        this.maxValue = maxValue;
        return this;
    }
    
    public ReportParameter description(String description) {
        this.description = description;
        return this;
    }
    
    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public ParameterType getType() { return type; }
    public void setType(ParameterType type) { this.type = type; }
    
    public boolean isRequired() { return required; }
    public void setRequired(boolean required) { this.required = required; }
    
    public Object getDefaultValue() { return defaultValue; }
    public void setDefaultValue(Object defaultValue) { this.defaultValue = defaultValue; }
    
    public List<String> getAllowedValues() { return allowedValues; }
    public void setAllowedValues(List<String> allowedValues) { this.allowedValues = allowedValues; }
    
    public String getValidationPattern() { return validationPattern; }
    public void setValidationPattern(String validationPattern) { this.validationPattern = validationPattern; }
    
    public Object getMinValue() { return minValue; }
    public void setMinValue(Object minValue) { this.minValue = minValue; }
    
    public Object getMaxValue() { return maxValue; }
    public void setMaxValue(Object maxValue) { this.maxValue = maxValue; }
}