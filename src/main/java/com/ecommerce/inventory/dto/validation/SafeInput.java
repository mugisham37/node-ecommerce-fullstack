package com.ecommerce.inventory.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom validation annotation for safe input validation (prevents injection attacks)
 */
@Documented
@Constraint(validatedBy = SafeInputValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface SafeInput {
    String message() default "Input contains potentially dangerous content";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    
    boolean allowHtml() default false;
    boolean allowEmpty() default true;
}