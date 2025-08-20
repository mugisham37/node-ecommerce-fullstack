package com.ecommerce.inventory.service.report;

import java.util.List;

/**
 * Exception thrown when report parameter validation fails
 */
public class ReportParameterValidationException extends RuntimeException {
    
    private List<String> validationErrors;
    
    public ReportParameterValidationException(String message) {
        super(message);
    }
    
    public ReportParameterValidationException(String message, List<String> validationErrors) {
        super(message);
        this.validationErrors = validationErrors;
    }
    
    public ReportParameterValidationException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public ReportParameterValidationException(String message, Throwable cause, List<String> validationErrors) {
        super(message, cause);
        this.validationErrors = validationErrors;
    }
    
    public List<String> getValidationErrors() {
        return validationErrors;
    }
    
    public void setValidationErrors(List<String> validationErrors) {
        this.validationErrors = validationErrors;
    }
}