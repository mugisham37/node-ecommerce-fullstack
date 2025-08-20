package com.ecommerce.inventory.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom validation annotation for quantity validation with business rules
 */
@Documented
@Constraint(validatedBy = ValidQuantityValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidQuantity {
    String message() default "Quantity must be a positive integer within valid range";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    
    int min() default 1;
    int max() default 999999;
    boolean allowZero() default false;
}