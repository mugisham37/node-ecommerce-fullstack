package com.ecommerce.inventory.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

/**
 * Validator for ValidPhoneNumber annotation
 */
public class ValidPhoneNumberValidator implements ConstraintValidator<ValidPhoneNumber, String> {

    private static final Pattern PHONE_PATTERN = Pattern.compile(
        "^[+]?[1-9]\\d{1,14}$|^[+]?[(]?[\\d\\s\\-\\(\\)]{10,20}$"
    );
    
    private boolean allowEmpty;

    @Override
    public void initialize(ValidPhoneNumber constraintAnnotation) {
        this.allowEmpty = constraintAnnotation.allowEmpty();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.trim().isEmpty()) {
            return allowEmpty;
        }

        // Remove common formatting characters for validation
        String cleanedValue = value.replaceAll("[\\s\\-\\(\\)]", "");
        
        // Check length
        if (cleanedValue.length() < 10 || cleanedValue.length() > 15) {
            return false;
        }

        // Check pattern
        return PHONE_PATTERN.matcher(value).matches();
    }
}