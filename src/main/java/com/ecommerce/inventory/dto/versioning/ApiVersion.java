package com.ecommerce.inventory.dto.versioning;

import java.lang.annotation.*;

/**
 * Annotation to specify API version for endpoints
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ApiVersion {
    String value() default "1.0";
}