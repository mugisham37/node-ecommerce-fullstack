package com.ecommerce.inventory.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom validation annotation for price validation with business rules
 */
@Documented
@Constraint(validatedBy = ValidPriceValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPrice {
    String message() default "Price must be positive and within valid range";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    
    double min() default 0.01;
    double max() default 999999.99;
    boolean allowZero() default false;
}