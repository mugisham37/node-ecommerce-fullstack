package com.ecommerce.inventory.dto.validation;

import com.ecommerce.inventory.exception.ValidationException;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Aspect for automatic validation of method parameters
 */
@Aspect
@Component
public class ValidationAspect {

    @Autowired
    private ValidationService validationService;

    /**
     * Annotation to mark methods for automatic validation
     */
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    public @interface ValidateParameters {
        Class<?>[] groups() default {};
        boolean includeSecurityValidation() default true;
    }

    /**
     * Intercept methods annotated with @ValidateParameters and validate their arguments
     */
    @Before("@annotation(validateParameters)")
    public void validateMethodParameters(JoinPoint joinPoint, ValidateParameters validateParameters) {
        Object[] args = joinPoint.getArgs();
        
        for (Object arg : args) {
            if (arg != null) {
                if (validateParameters.includeSecurityValidation()) {
                    validationService.validateWithSecurityAndThrow(arg, validateParameters.groups());
                } else {
                    validationService.validateAndThrow(arg, validateParameters.groups());
                }
            }
        }
    }
}