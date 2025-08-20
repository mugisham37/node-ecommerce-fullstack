package com.ecommerce.inventory.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom validation annotation for URL slug validation
 */
@Documented
@Constraint(validatedBy = ValidSlugValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidSlug {
    String message() default "Slug must contain only lowercase letters, numbers, and hyphens";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    
    int minLength() default 2;
    int maxLength() default 100;
    boolean allowEmpty() default false;
}