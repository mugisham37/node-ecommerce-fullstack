package com.ecommerce.inventory.dto.validation;

import com.ecommerce.inventory.exception.ValidationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Service for comprehensive validation and input sanitization
 */
@Service
public class ValidationService {

    @Autowired
    private ValidationErrorAggregator validationErrorAggregator;

    @Autowired
    private InputSanitizer inputSanitizer;

    /**
     * Validates an object and throws ValidationException if validation fails
     */
    public <T> void validateAndThrow(T object, Class<?>... groups) {
        ValidationErrorAggregator.ValidationResult result = validationErrorAggregator.validate(object, groups);
        
        if (!result.isValid()) {
            Map<String, String> friendlyMessages = validationErrorAggregator.createUserFriendlyMessages(result);
            throw new ValidationException("Validation failed", friendlyMessages);
        }
    }

    /**
     * Validates an object and returns validation result without throwing exception
     */
    public <T> ValidationErrorAggregator.ValidationResult validate(T object, Class<?>... groups) {
        return validationErrorAggregator.validate(object, groups);
    }

    /**
     * Validates a property and throws ValidationException if validation fails
     */
    public <T> void validatePropertyAndThrow(T object, String propertyName, Class<?>... groups) {
        ValidationErrorAggregator.ValidationResult result = validationErrorAggregator.validateProperty(object, propertyName, groups);
        
        if (!result.isValid()) {
            Map<String, String> friendlyMessages = validationErrorAggregator.createUserFriendlyMessages(result);
            throw new ValidationException("Property validation failed", friendlyMessages);
        }
    }

    /**
     * Validates a value and throws ValidationException if validation fails
     */
    public <T> void validateValueAndThrow(Class<T> beanType, String propertyName, Object value, Class<?>... groups) {
        ValidationErrorAggregator.ValidationResult result = validationErrorAggregator.validateValue(beanType, propertyName, value, groups);
        
        if (!result.isValid()) {
            Map<String, String> friendlyMessages = validationErrorAggregator.createUserFriendlyMessages(result);
            throw new ValidationException("Value validation failed", friendlyMessages);
        }
    }

    /**
     * Sanitizes text input for safe processing
     */
    public String sanitizeText(String input) {
        return inputSanitizer.sanitizeText(input);
    }

    /**
     * Sanitizes HTML input for safe processing
     */
    public String sanitizeHtml(String input) {
        return inputSanitizer.sanitizeHtml(input);
    }

    /**
     * Validates input for security threats and throws ValidationException if unsafe
     */
    public void validateSecurityAndThrow(String input, String fieldName) {
        InputSanitizer.SecurityValidationResult result = inputSanitizer.validateSecurity(input);
        
        if (!result.isValid()) {
            ValidationException ex = new ValidationException("Security validation failed");
            ex.addValidationError(fieldName, result.getErrorMessage());
            throw ex;
        }
    }

    /**
     * Comprehensive validation including security checks
     */
    public <T> void validateWithSecurityAndThrow(T object, Class<?>... groups) {
        // First perform standard validation
        validateAndThrow(object, groups);
        
        // Then perform security validation on string fields
        performSecurityValidation(object);
    }

    private <T> void performSecurityValidation(T object) {
        if (object == null) {
            return;
        }

        // Use reflection to check string fields for security threats
        Class<?> clazz = object.getClass();
        java.lang.reflect.Field[] fields = clazz.getDeclaredFields();

        for (java.lang.reflect.Field field : fields) {
            if (field.getType() == String.class) {
                field.setAccessible(true);
                try {
                    String value = (String) field.get(object);
                    if (value != null) {
                        validateSecurityAndThrow(value, field.getName());
                    }
                } catch (IllegalAccessException e) {
                    // Skip fields that can't be accessed
                }
            }
        }
    }
}