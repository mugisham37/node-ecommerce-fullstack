package com.ecommerce.inventory.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

/**
 * Validator for ValidSlug annotation with URL slug validation
 */
public class ValidSlugValidator implements ConstraintValidator<ValidSlug, String> {

    private static final Pattern SLUG_PATTERN = Pattern.compile("^[a-z0-9]+(?:-[a-z0-9]+)*$");
    
    private int minLength;
    private int maxLength;
    private boolean allowEmpty;

    @Override
    public void initialize(ValidSlug constraintAnnotation) {
        this.minLength = constraintAnnotation.minLength();
        this.maxLength = constraintAnnotation.maxLength();
        this.allowEmpty = constraintAnnotation.allowEmpty();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.trim().isEmpty()) {
            return allowEmpty;
        }

        String trimmedValue = value.trim();

        // Check length
        if (trimmedValue.length() < minLength) {
            addConstraintViolation(context, String.format("Slug must be at least %d characters long", minLength));
            return false;
        }

        if (trimmedValue.length() > maxLength) {
            addConstraintViolation(context, String.format("Slug cannot exceed %d characters", maxLength));
            return false;
        }

        // Check pattern
        if (!SLUG_PATTERN.matcher(trimmedValue).matches()) {
            addConstraintViolation(context, "Slug must contain only lowercase letters, numbers, and hyphens");
            return false;
        }

        // Additional checks
        if (trimmedValue.startsWith("-") || trimmedValue.endsWith("-")) {
            addConstraintViolation(context, "Slug cannot start or end with a hyphen");
            return false;
        }

        if (trimmedValue.contains("--")) {
            addConstraintViolation(context, "Slug cannot contain consecutive hyphens");
            return false;
        }

        return true;
    }

    private void addConstraintViolation(ConstraintValidatorContext context, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
    }
}