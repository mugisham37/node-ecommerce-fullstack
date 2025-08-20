package com.ecommerce.inventory.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.math.BigDecimal;

/**
 * Validator for ValidPrice annotation with business-specific price validation
 */
public class ValidPriceValidator implements ConstraintValidator<ValidPrice, BigDecimal> {

    private double min;
    private double max;
    private boolean allowZero;

    @Override
    public void initialize(ValidPrice constraintAnnotation) {
        this.min = constraintAnnotation.min();
        this.max = constraintAnnotation.max();
        this.allowZero = constraintAnnotation.allowZero();
    }

    @Override
    public boolean isValid(BigDecimal value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // Let @NotNull handle null validation
        }

        // Check for zero
        if (value.compareTo(BigDecimal.ZERO) == 0) {
            if (!allowZero) {
                addConstraintViolation(context, "Price cannot be zero");
                return false;
            }
            return true;
        }

        // Check for negative values
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            addConstraintViolation(context, "Price cannot be negative");
            return false;
        }

        // Check minimum value
        if (value.compareTo(BigDecimal.valueOf(min)) < 0) {
            addConstraintViolation(context, String.format("Price must be at least %.2f", min));
            return false;
        }

        // Check maximum value
        if (value.compareTo(BigDecimal.valueOf(max)) > 0) {
            addConstraintViolation(context, String.format("Price cannot exceed %.2f", max));
            return false;
        }

        // Check decimal places (max 2)
        if (value.scale() > 2) {
            addConstraintViolation(context, "Price cannot have more than 2 decimal places");
            return false;
        }

        return true;
    }

    private void addConstraintViolation(ConstraintValidatorContext context, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
    }
}