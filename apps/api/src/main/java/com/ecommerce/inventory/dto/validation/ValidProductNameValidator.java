package com.ecommerce.inventory.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

/**
 * Validator for ValidProductName annotation
 */
public class ValidProductNameValidator implements ConstraintValidator<ValidProductName, String> {

    private static final Pattern VALID_PRODUCT_NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9\\s\\-_.,()&]+$");
    private static final InputSanitizer inputSanitizer = new InputSanitizer();
    
    private int minLength;
    private int maxLength;

    @Override
    public void initialize(ValidProductName constraintAnnotation) {
        this.minLength = constraintAnnotation.minLength();
        this.maxLength = constraintAnnotation.maxLength();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // Let @NotNull handle null validation
        }

        String trimmedValue = value.trim();

        // Check length
        if (trimmedValue.length() < minLength) {
            addConstraintViolation(context, String.format("Product name must be at least %d characters long", minLength));
            return false;
        }

        if (trimmedValue.length() > maxLength) {
            addConstraintViolation(context, String.format("Product name cannot exceed %d characters", maxLength));
            return false;
        }

        // Check for security threats
        InputSanitizer.SecurityValidationResult securityResult = inputSanitizer.validateSecurity(trimmedValue);
        if (!securityResult.isValid()) {
            addConstraintViolation(context, securityResult.getErrorMessage());
            return false;
        }

        // Check pattern
        if (!VALID_PRODUCT_NAME_PATTERN.matcher(trimmedValue).matches()) {
            addConstraintViolation(context, "Product name contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed");
            return false;
        }

        // Check for consecutive spaces
        if (trimmedValue.contains("  ")) {
            addConstraintViolation(context, "Product name cannot contain consecutive spaces");
            return false;
        }

        return true;
    }

    private void addConstraintViolation(ConstraintValidatorContext context, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
    }
}