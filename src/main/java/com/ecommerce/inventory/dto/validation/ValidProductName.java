package com.ecommerce.inventory.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom validation annotation for product name validation
 */
@Documented
@Constraint(validatedBy = ValidProductNameValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidProductName {
    String message() default "Product name must be between 2 and 200 characters and contain only valid characters";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    
    int minLength() default 2;
    int maxLength() default 200;
}