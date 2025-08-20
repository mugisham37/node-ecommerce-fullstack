package com.ecommerce.inventory.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom validation annotation for user role
 */
@Documented
@Constraint(validatedBy = ValidRoleValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidRole {
    String message() default "Invalid role. Must be ADMIN, MANAGER, or EMPLOYEE";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}