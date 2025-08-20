package com.ecommerce.inventory.dto.versioning;

import java.lang.annotation.*;

/**
 * Annotation to specify backward compatibility for API versions
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ApiVersionCompatibility {
    
    /**
     * Minimum supported version
     */
    String minVersion() default "1.0";
    
    /**
     * Maximum supported version
     */
    String maxVersion() default "999.0";
    
    /**
     * Deprecated since version
     */
    String deprecatedSince() default "";
    
    /**
     * Will be removed in version
     */
    String removedIn() default "";
    
    /**
     * Replacement endpoint or method
     */
    String replacement() default "";
}