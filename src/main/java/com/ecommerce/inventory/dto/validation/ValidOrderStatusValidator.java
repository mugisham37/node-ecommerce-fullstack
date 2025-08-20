package com.ecommerce.inventory.dto.validation;

import com.ecommerce.inventory.entity.OrderStatus;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validator for ValidOrderStatus annotation
 */
public class ValidOrderStatusValidator implements ConstraintValidator<ValidOrderStatus, String> {

    @Override
    public void initialize(ValidOrderStatus constraintAnnotation) {
        // No initialization needed
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // Let @NotNull handle null validation
        }

        try {
            OrderStatus.valueOf(value.toUpperCase());
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}