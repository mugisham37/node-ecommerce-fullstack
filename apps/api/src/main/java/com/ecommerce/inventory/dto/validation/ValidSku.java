package com.ecommerce.inventory.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom validation annotation for SKU format
 */
@Documented
@Constraint(validatedBy = ValidSkuValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidSku {
    String message() default "SKU must contain only uppercase letters, numbers, and hyphens";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}