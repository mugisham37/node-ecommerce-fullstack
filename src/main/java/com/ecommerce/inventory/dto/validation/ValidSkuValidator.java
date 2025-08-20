package com.ecommerce.inventory.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

/**
 * Validator for ValidSku annotation
 */
public class ValidSkuValidator implements ConstraintValidator<ValidSku, String> {

    private static final Pattern SKU_PATTERN = Pattern.compile("^[A-Z0-9-]+$");

    @Override
    public void initialize(ValidSku constraintAnnotation) {
        // No initialization needed
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // Let @NotNull handle null validation
        }

        return SKU_PATTERN.matcher(value).matches();
    }
}