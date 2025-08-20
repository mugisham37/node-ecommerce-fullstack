package com.ecommerce.inventory.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.util.Map;
import java.util.HashMap;

/**
 * Structured logger for consistent logging with context information
 */
public class StructuredLogger {

    private final Logger logger;
    private final Logger auditLogger;
    private final Logger performanceLogger;

    public StructuredLogger(Class<?> clazz) {
        this.logger = LoggerFactory.getLogger(clazz);
        this.auditLogger = LoggerFactory.getLogger("AUDIT");
        this.performanceLogger = LoggerFactory.getLogger("PERFORMANCE");
    }

    public static StructuredLogger getLogger(Class<?> clazz) {
        return new StructuredLogger(clazz);
    }

    // ========== INFO LOGGING ==========

    public void info(String message) {
        logger.info(message);
    }

    public void info(String message, Object... args) {
        logger.info(message, args);
    }

    public void infoWithContext(String message, Map<String, String> context) {
        withContext(context, () -> logger.info(message));
    }

    // ========== DEBUG LOGGING ==========

    public void debug(String message) {
        logger.debug(message);
    }

    public void debug(String message, Object... args) {
        logger.debug(message, args);
    }

    public void debugWithContext(String message, Map<String, String> context) {
        withContext(context, () -> logger.debug(message));
    }

    // ========== WARN LOGGING ==========

    public void warn(String message) {
        logger.warn(message);
    }

    public void warn(String message, Object... args) {
        logger.warn(message, args);
    }

    public void warn(String message, Throwable throwable) {
        logger.warn(message, throwable);
    }

    public void warnWithContext(String message, Map<String, String> context) {
        withContext(context, () -> logger.warn(message));
    }

    // ========== ERROR LOGGING ==========

    public void error(String message) {
        logger.error(message);
    }

    public void error(String message, Object... args) {
        logger.error(message, args);
    }

    public void error(String message, Throwable throwable) {
        LoggingContext.setErrorContext(throwable.getClass().getSimpleName(), null);
        logger.error(message, throwable);
        LoggingContext.clearOperationContext();
    }

    public void errorWithContext(String message, Throwable throwable, Map<String, String> context) {
        LoggingContext.setErrorContext(throwable.getClass().getSimpleName(), null);
        withContext(context, () -> logger.error(message, throwable));
        LoggingContext.clearOperationContext();
    }

    public void businessError(String message, String errorCode, String operation, Throwable throwable) {
        LoggingContext.setErrorContext(throwable.getClass().getSimpleName(), errorCode);
        LoggingContext.setOperationContext(operation);
        logger.error(message, throwable);
        LoggingContext.clearOperationContext();
    }

    // ========== AUDIT LOGGING ==========

    public void auditSuccess(String action, String resource, String resourceId) {
        LoggingContext.setUserContext();
        LoggingContext.setAuditContext(action, resource, resourceId, null, null, true);
        auditLogger.info("Audit: {} on {} [{}] - SUCCESS", action, resource, resourceId);
        LoggingContext.clearAuditContext();
    }

    public void auditSuccess(String action, String resource, String resourceId, String oldValue, String newValue) {
        LoggingContext.setUserContext();
        LoggingContext.setAuditContext(action, resource, resourceId, oldValue, newValue, true);
        auditLogger.info("Audit: {} on {} [{}] - SUCCESS", action, resource, resourceId);
        LoggingContext.clearAuditContext();
    }

    public void auditFailure(String action, String resource, String resourceId, String reason) {
        LoggingContext.setUserContext();
        LoggingContext.setAuditContext(action, resource, resourceId, null, null, false);
        auditLogger.warn("Audit: {} on {} [{}] - FAILURE: {}", action, resource, resourceId, reason);
        LoggingContext.clearAuditContext();
    }

    public void auditSecurityEvent(String event, String details) {
        LoggingContext.setUserContext();
        LoggingContext.setAuditContext("SECURITY_EVENT", event, null, null, details, true);
        auditLogger.warn("Security Event: {} - {}", event, details);
        LoggingContext.clearAuditContext();
    }

    // ========== PERFORMANCE LOGGING ==========

    public void logPerformance(String operation, long durationMs) {
        LoggingContext.setOperationContext(operation, durationMs);
        performanceLogger.info("Performance: {} completed in {} ms", operation, durationMs);
        LoggingContext.clearOperationContext();
    }

    public void logSlowOperation(String operation, long durationMs, long thresholdMs) {
        if (durationMs > thresholdMs) {
            LoggingContext.setOperationContext(operation, durationMs);
            performanceLogger.warn("Slow Operation: {} took {} ms (threshold: {} ms)", operation, durationMs, thresholdMs);
            LoggingContext.clearOperationContext();
        }
    }

    public void logDatabaseQuery(String queryType, long executionTimeMs, int recordCount) {
        LoggingContext.setQueryContext(queryType, executionTimeMs, recordCount);
        performanceLogger.debug("Database Query: {} executed in {} ms, returned {} records", 
                               queryType, executionTimeMs, recordCount);
        LoggingContext.clearOperationContext();
    }

    public void logSlowDatabaseQuery(String queryType, long executionTimeMs, int recordCount, long thresholdMs) {
        if (executionTimeMs > thresholdMs) {
            LoggingContext.setQueryContext(queryType, executionTimeMs, recordCount);
            performanceLogger.warn("Slow Database Query: {} took {} ms (threshold: {} ms), returned {} records", 
                                  queryType, executionTimeMs, thresholdMs, recordCount);
            LoggingContext.clearOperationContext();
        }
    }

    public void logCacheOperation(String operation, String cacheName, String key, boolean hit, long durationMs) {
        LoggingContext.setCacheContext(hit);
        LoggingContext.setOperationContext(operation, durationMs);
        
        if (hit) {
            performanceLogger.debug("Cache Hit: {} in cache {} for key {} in {} ms", operation, cacheName, key, durationMs);
        } else {
            performanceLogger.debug("Cache Miss: {} in cache {} for key {} in {} ms", operation, cacheName, key, durationMs);
        }
        
        LoggingContext.clearOperationContext();
    }

    // ========== BUSINESS EVENT LOGGING ==========

    public void logBusinessEvent(String event, String details) {
        LoggingContext.setUserContext();
        LoggingContext.setOperationContext(event);
        logger.info("Business Event: {} - {}", event, details);
        LoggingContext.clearOperationContext();
    }

    public void logInventoryChange(String action, String productSku, int oldQuantity, int newQuantity) {
        Map<String, String> context = new HashMap<>();
        context.put("productSku", productSku);
        context.put("oldQuantity", String.valueOf(oldQuantity));
        context.put("newQuantity", String.valueOf(newQuantity));
        
        LoggingContext.setUserContext();
        withContext(context, () -> 
            logger.info("Inventory Change: {} for product {} - {} -> {}", action, productSku, oldQuantity, newQuantity)
        );
    }

    public void logOrderEvent(String event, String orderNumber, String status) {
        Map<String, String> context = new HashMap<>();
        context.put("orderNumber", orderNumber);
        context.put("orderStatus", status);
        
        LoggingContext.setUserContext();
        withContext(context, () -> 
            logger.info("Order Event: {} for order {} - Status: {}", event, orderNumber, status)
        );
    }

    // ========== UTILITY METHODS ==========

    private void withContext(Map<String, String> context, Runnable runnable) {
        Map<String, String> originalContext = MDC.getCopyOfContextMap();
        try {
            if (context != null) {
                context.forEach(MDC::put);
            }
            runnable.run();
        } finally {
            MDC.clear();
            if (originalContext != null) {
                MDC.setContextMap(originalContext);
            }
        }
    }

    public boolean isDebugEnabled() {
        return logger.isDebugEnabled();
    }

    public boolean isInfoEnabled() {
        return logger.isInfoEnabled();
    }

    public boolean isWarnEnabled() {
        return logger.isWarnEnabled();
    }

    public boolean isErrorEnabled() {
        return logger.isErrorEnabled();
    }
}