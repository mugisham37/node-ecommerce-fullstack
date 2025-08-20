package com.ecommerce.inventory.logging;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Aspect for automatic performance logging of slow operations
 */
@Aspect
@Component
public class PerformanceLoggingAspect {

    private static final StructuredLogger logger = StructuredLogger.getLogger(PerformanceLoggingAspect.class);

    // Default thresholds in milliseconds
    private static final long DEFAULT_SLOW_OPERATION_THRESHOLD = 1000; // 1 second
    private static final long DEFAULT_SLOW_DATABASE_THRESHOLD = 500;   // 500ms
    private static final long DEFAULT_SLOW_CACHE_THRESHOLD = 100;      // 100ms

    /**
     * Annotation to mark methods for performance logging
     */
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    public @interface LogPerformance {
        String operation() default "";
        long threshold() default DEFAULT_SLOW_OPERATION_THRESHOLD;
        boolean logAllCalls() default false;
    }

    /**
     * Annotation to mark database operations for performance logging
     */
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    public @interface LogDatabasePerformance {
        String queryType() default "";
        long threshold() default DEFAULT_SLOW_DATABASE_THRESHOLD;
    }

    /**
     * Annotation to mark cache operations for performance logging
     */
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    public @interface LogCachePerformance {
        String operation() default "";
        long threshold() default DEFAULT_SLOW_CACHE_THRESHOLD;
    }

    /**
     * Around advice for general performance logging
     */
    @Around("@annotation(logPerformance)")
    public Object logPerformance(ProceedingJoinPoint joinPoint, LogPerformance logPerformance) throws Throwable {
        String operation = logPerformance.operation().isEmpty() ? 
            joinPoint.getSignature().toShortString() : logPerformance.operation();
        
        long startTime = System.currentTimeMillis();
        Object result = null;
        Throwable exception = null;

        try {
            LoggingContext.setOperationContext(operation);
            result = joinPoint.proceed();
            return result;
        } catch (Throwable e) {
            exception = e;
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            
            if (logPerformance.logAllCalls()) {
                logger.logPerformance(operation, duration);
            } else {
                logger.logSlowOperation(operation, duration, logPerformance.threshold());
            }

            if (exception != null) {
                LoggingContext.setErrorContext(exception.getClass().getSimpleName(), null);
                logger.error("Operation {} failed after {} ms", operation, duration, exception);
            }

            LoggingContext.clearOperationContext();
        }
    }

    /**
     * Around advice for database performance logging
     */
    @Around("@annotation(logDatabasePerformance)")
    public Object logDatabasePerformance(ProceedingJoinPoint joinPoint, LogDatabasePerformance logDatabasePerformance) throws Throwable {
        String queryType = logDatabasePerformance.queryType().isEmpty() ? 
            joinPoint.getSignature().toShortString() : logDatabasePerformance.queryType();
        
        long startTime = System.currentTimeMillis();
        Object result = null;
        int recordCount = 0;

        try {
            LoggingContext.setOperationContext("DATABASE_QUERY");
            result = joinPoint.proceed();
            
            // Try to determine record count from result
            if (result instanceof java.util.Collection) {
                recordCount = ((java.util.Collection<?>) result).size();
            } else if (result instanceof org.springframework.data.domain.Page) {
                recordCount = ((org.springframework.data.domain.Page<?>) result).getNumberOfElements();
            } else if (result != null) {
                recordCount = 1;
            }
            
            return result;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            logger.logSlowDatabaseQuery(queryType, duration, recordCount, logDatabasePerformance.threshold());
            LoggingContext.clearOperationContext();
        }
    }

    /**
     * Around advice for cache performance logging
     */
    @Around("@annotation(logCachePerformance)")
    public Object logCachePerformance(ProceedingJoinPoint joinPoint, LogCachePerformance logCachePerformance) throws Throwable {
        String operation = logCachePerformance.operation().isEmpty() ? 
            joinPoint.getSignature().toShortString() : logCachePerformance.operation();
        
        long startTime = System.currentTimeMillis();
        Object result = null;
        boolean cacheHit = false;

        try {
            LoggingContext.setOperationContext("CACHE_OPERATION");
            result = joinPoint.proceed();
            cacheHit = (result != null);
            return result;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            
            if (duration > logCachePerformance.threshold()) {
                logger.logCacheOperation(operation, "unknown", "unknown", cacheHit, duration);
            }
            
            LoggingContext.clearOperationContext();
        }
    }

    /**
     * Around advice for service layer methods
     */
    @Around("execution(* com.ecommerce.inventory.service.*.*(..))")
    public Object logServiceMethods(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();
        long startTime = System.currentTimeMillis();

        try {
            LoggingContext.setOperationContext("SERVICE_CALL");
            Object result = joinPoint.proceed();
            
            long duration = System.currentTimeMillis() - startTime;
            if (duration > DEFAULT_SLOW_OPERATION_THRESHOLD) {
                logger.logSlowOperation(methodName, duration, DEFAULT_SLOW_OPERATION_THRESHOLD);
            }
            
            return result;
        } catch (Throwable e) {
            long duration = System.currentTimeMillis() - startTime;
            LoggingContext.setErrorContext(e.getClass().getSimpleName(), null);
            logger.error("Service method {} failed after {} ms", methodName, duration, e);
            throw e;
        } finally {
            LoggingContext.clearOperationContext();
        }
    }

    /**
     * Around advice for repository layer methods
     */
    @Around("execution(* com.ecommerce.inventory.repository.*.*(..))")
    public Object logRepositoryMethods(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();
        long startTime = System.currentTimeMillis();
        int recordCount = 0;

        try {
            LoggingContext.setOperationContext("REPOSITORY_CALL");
            Object result = joinPoint.proceed();
            
            // Try to determine record count from result
            if (result instanceof java.util.Collection) {
                recordCount = ((java.util.Collection<?>) result).size();
            } else if (result instanceof org.springframework.data.domain.Page) {
                recordCount = ((org.springframework.data.domain.Page<?>) result).getNumberOfElements();
            } else if (result instanceof java.util.Optional) {
                recordCount = ((java.util.Optional<?>) result).isPresent() ? 1 : 0;
            } else if (result != null) {
                recordCount = 1;
            }
            
            long duration = System.currentTimeMillis() - startTime;
            if (duration > DEFAULT_SLOW_DATABASE_THRESHOLD) {
                logger.logSlowDatabaseQuery(methodName, duration, recordCount, DEFAULT_SLOW_DATABASE_THRESHOLD);
            }
            
            return result;
        } catch (Throwable e) {
            long duration = System.currentTimeMillis() - startTime;
            LoggingContext.setErrorContext(e.getClass().getSimpleName(), null);
            logger.error("Repository method {} failed after {} ms", methodName, duration, e);
            throw e;
        } finally {
            LoggingContext.clearOperationContext();
        }
    }

    /**
     * Around advice for controller layer methods
     */
    @Around("execution(* com.ecommerce.inventory.controller.*.*(..))")
    public Object logControllerMethods(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();
        long startTime = System.currentTimeMillis();

        try {
            LoggingContext.setUserContext();
            LoggingContext.setOperationContext("CONTROLLER_CALL");
            
            Object result = joinPoint.proceed();
            
            long duration = System.currentTimeMillis() - startTime;
            if (duration > DEFAULT_SLOW_OPERATION_THRESHOLD) {
                logger.logSlowOperation(methodName, duration, DEFAULT_SLOW_OPERATION_THRESHOLD);
            }
            
            return result;
        } catch (Throwable e) {
            long duration = System.currentTimeMillis() - startTime;
            LoggingContext.setErrorContext(e.getClass().getSimpleName(), null);
            logger.error("Controller method {} failed after {} ms", methodName, duration, e);
            throw e;
        } finally {
            LoggingContext.clearOperationContext();
        }
    }
}