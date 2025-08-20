package com.ecommerce.inventory.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom validation annotation for order status
 */
@Documented
@Constraint(validatedBy = ValidOrderStatusValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidOrderStatus {
    String message() default "Invalid order status";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}