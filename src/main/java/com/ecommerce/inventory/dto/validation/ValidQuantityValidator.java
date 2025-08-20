package com.ecommerce.inventory.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validator for ValidQuantity annotation with business-specific quantity validation
 */
public class ValidQuantityValidator implements ConstraintValidator<ValidQuantity, Integer> {

    private int min;
    private int max;
    private boolean allowZero;

    @Override
    public void initialize(ValidQuantity constraintAnnotation) {
        this.min = constraintAnnotation.min();
        this.max = constraintAnnotation.max();
        this.allowZero = constraintAnnotation.allowZero();
    }

    @Override
    public boolean isValid(Integer value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // Let @NotNull handle null validation
        }

        // Check for zero
        if (value == 0) {
            if (!allowZero) {
                addConstraintViolation(context, "Quantity cannot be zero");
                return false;
            }
            return true;
        }

        // Check for negative values
        if (value < 0) {
            addConstraintViolation(context, "Quantity cannot be negative");
            return false;
        }

        // Check minimum value
        if (value < min) {
            addConstraintViolation(context, String.format("Quantity must be at least %d", min));
            return false;
        }

        // Check maximum value
        if (value > max) {
            addConstraintViolation(context, String.format("Quantity cannot exceed %d", max));
            return false;
        }

        return true;
    }

    private void addConstraintViolation(ConstraintValidatorContext context, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
    }
}