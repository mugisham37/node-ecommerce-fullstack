package com.ecommerce.inventory.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validator for SafeInput annotation that prevents injection attacks
 */
public class SafeInputValidator implements ConstraintValidator<SafeInput, String> {

    private static final InputSanitizer inputSanitizer = new InputSanitizer();
    
    private boolean allowHtml;
    private boolean allowEmpty;

    @Override
    public void initialize(SafeInput constraintAnnotation) {
        this.allowHtml = constraintAnnotation.allowHtml();
        this.allowEmpty = constraintAnnotation.allowEmpty();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.trim().isEmpty()) {
            return allowEmpty;
        }

        // Perform security validation
        InputSanitizer.SecurityValidationResult result = inputSanitizer.validateSecurity(value);
        
        if (!result.isValid()) {
            addConstraintViolation(context, result.getErrorMessage());
            return false;
        }

        // If HTML is not allowed, check for HTML content
        if (!allowHtml && value.contains("<") && value.contains(">")) {
            addConstraintViolation(context, "HTML content is not allowed in this field");
            return false;
        }

        return true;
    }

    private void addConstraintViolation(ConstraintValidatorContext context, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
    }
}