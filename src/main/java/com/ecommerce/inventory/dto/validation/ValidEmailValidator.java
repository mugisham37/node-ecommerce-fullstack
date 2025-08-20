package com.ecommerce.inventory.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

/**
 * Validator for ValidEmail annotation with enhanced email validation
 */
public class ValidEmailValidator implements ConstraintValidator<ValidEmail, String> {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    );
    
    private boolean allowEmpty;

    @Override
    public void initialize(ValidEmail constraintAnnotation) {
        this.allowEmpty = constraintAnnotation.allowEmpty();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.trim().isEmpty()) {
            return allowEmpty;
        }

        // Check length
        if (value.length() > 255) {
            return false;
        }

        // Check pattern
        if (!EMAIL_PATTERN.matcher(value).matches()) {
            return false;
        }

        // Additional checks
        String[] parts = value.split("@");
        if (parts.length != 2) {
            return false;
        }

        String localPart = parts[0];
        String domainPart = parts[1];

        // Local part checks
        if (localPart.length() > 64 || localPart.startsWith(".") || localPart.endsWith(".") || localPart.contains("..")) {
            return false;
        }

        // Domain part checks
        if (domainPart.length() > 253 || domainPart.startsWith("-") || domainPart.endsWith("-")) {
            return false;
        }

        return true;
    }
}