package com.ecommerce.inventory.exception;

import java.util.HashMap;
import java.util.Map;

/**
 * Exception thrown when business validation rules are violated.
 * Provides detailed validation error information for client consumption.
 */
public class ValidationException extends BusinessException {
    
    private final Map<String, String> validationErrors;

    public ValidationException(String message) {
        super(message, "VALIDATION_ERROR", "VALIDATION");
        this.validationErrors = new HashMap<>();
    }

    public ValidationException(String message, Map<String, String> validationErrors) {
        super(message, "VALIDATION_ERROR", "VALIDATION");
        this.validationErrors = new HashMap<>(validationErrors);
        addContext("validationErrors", validationErrors);
        addContext("errorCount", validationErrors.size());
    }

    public ValidationException(String field, String error) {
        super("Validation failed for field: " + field, "VALIDATION_ERROR", "VALIDATION");
        this.validationErrors = new HashMap<>();
        this.validationErrors.put(field, error);
        addContext("field", field);
        addContext("error", error);
    }

    public Map<String, String> getValidationErrors() {
        return new HashMap<>(validationErrors);
    }

    public void addValidationError(String field, String error) {
        this.validationErrors.put(field, error);
        addContext("validationErrors", validationErrors);
        addContext("errorCount", validationErrors.size());
    }

    public boolean hasValidationErrors() {
        return !validationErrors.isEmpty();
    }
}