package com.ecommerce.inventory.logging;

import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.ecommerce.inventory.security.UserPrincipal;

import java.util.Map;
import java.util.HashMap;

/**
 * Utility class for managing logging context and MDC values
 */
public class LoggingContext {

    // MDC Keys
    public static final String CORRELATION_ID = "correlationId";
    public static final String REQUEST_ID = "requestId";
    public static final String USER_ID = "userId";
    public static final String USER_ROLE = "userRole";
    public static final String SESSION_ID = "sessionId";
    public static final String OPERATION = "operation";
    public static final String DURATION = "duration";
    public static final String HTTP_METHOD = "httpMethod";
    public static final String HTTP_URL = "httpUrl";
    public static final String HTTP_STATUS = "httpStatus";
    public static final String CLIENT_IP = "clientIp";
    public static final String USER_AGENT = "userAgent";
    public static final String ERROR_TYPE = "errorType";
    public static final String ERROR_CODE = "errorCode";
    public static final String ACTION = "action";
    public static final String RESOURCE = "resource";
    public static final String RESOURCE_ID = "resourceId";
    public static final String OLD_VALUE = "oldValue";
    public static final String NEW_VALUE = "newValue";
    public static final String SUCCESS = "success";
    public static final String QUERY_TYPE = "queryType";
    public static final String QUERY_EXECUTION_TIME = "queryExecutionTime";
    public static final String CACHE_HIT = "cacheHit";
    public static final String RECORD_COUNT = "recordCount";

    /**
     * Set user context in MDC from current authentication
     */
    public static void setUserContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            MDC.put(USER_ID, userPrincipal.getId().toString());
            MDC.put(USER_ROLE, userPrincipal.getRole().name());
        }
    }

    /**
     * Set user context in MDC with specific user details
     */
    public static void setUserContext(Long userId, String userRole) {
        if (userId != null) {
            MDC.put(USER_ID, userId.toString());
        }
        if (userRole != null) {
            MDC.put(USER_ROLE, userRole);
        }
    }

    /**
     * Set operation context in MDC
     */
    public static void setOperationContext(String operation) {
        if (operation != null) {
            MDC.put(OPERATION, operation);
        }
    }

    /**
     * Set operation context with duration
     */
    public static void setOperationContext(String operation, long durationMs) {
        if (operation != null) {
            MDC.put(OPERATION, operation);
        }
        MDC.put(DURATION, String.valueOf(durationMs));
    }

    /**
     * Set error context in MDC
     */
    public static void setErrorContext(String errorType, String errorCode) {
        if (errorType != null) {
            MDC.put(ERROR_TYPE, errorType);
        }
        if (errorCode != null) {
            MDC.put(ERROR_CODE, errorCode);
        }
    }

    /**
     * Set audit context in MDC
     */
    public static void setAuditContext(String action, String resource, String resourceId, 
                                     String oldValue, String newValue, boolean success) {
        if (action != null) {
            MDC.put(ACTION, action);
        }
        if (resource != null) {
            MDC.put(RESOURCE, resource);
        }
        if (resourceId != null) {
            MDC.put(RESOURCE_ID, resourceId);
        }
        if (oldValue != null) {
            MDC.put(OLD_VALUE, oldValue);
        }
        if (newValue != null) {
            MDC.put(NEW_VALUE, newValue);
        }
        MDC.put(SUCCESS, String.valueOf(success));
    }

    /**
     * Set database query context in MDC
     */
    public static void setQueryContext(String queryType, long executionTimeMs, int recordCount) {
        if (queryType != null) {
            MDC.put(QUERY_TYPE, queryType);
        }
        MDC.put(QUERY_EXECUTION_TIME, String.valueOf(executionTimeMs));
        MDC.put(RECORD_COUNT, String.valueOf(recordCount));
    }

    /**
     * Set cache context in MDC
     */
    public static void setCacheContext(boolean cacheHit) {
        MDC.put(CACHE_HIT, String.valueOf(cacheHit));
    }

    /**
     * Set HTTP response status in MDC
     */
    public static void setHttpStatus(int status) {
        MDC.put(HTTP_STATUS, String.valueOf(status));
    }

    /**
     * Get current correlation ID
     */
    public static String getCorrelationId() {
        return MDC.get(CORRELATION_ID);
    }

    /**
     * Get current request ID
     */
    public static String getRequestId() {
        return MDC.get(REQUEST_ID);
    }

    /**
     * Get current user ID
     */
    public static String getUserId() {
        return MDC.get(USER_ID);
    }

    /**
     * Clear specific MDC key
     */
    public static void clear(String key) {
        MDC.remove(key);
    }

    /**
     * Clear operation-specific context
     */
    public static void clearOperationContext() {
        MDC.remove(OPERATION);
        MDC.remove(DURATION);
        MDC.remove(ERROR_TYPE);
        MDC.remove(ERROR_CODE);
        MDC.remove(QUERY_TYPE);
        MDC.remove(QUERY_EXECUTION_TIME);
        MDC.remove(CACHE_HIT);
        MDC.remove(RECORD_COUNT);
    }

    /**
     * Clear audit context
     */
    public static void clearAuditContext() {
        MDC.remove(ACTION);
        MDC.remove(RESOURCE);
        MDC.remove(RESOURCE_ID);
        MDC.remove(OLD_VALUE);
        MDC.remove(NEW_VALUE);
        MDC.remove(SUCCESS);
    }

    /**
     * Get all current MDC values as a map
     */
    public static Map<String, String> getCurrentContext() {
        Map<String, String> contextMap = MDC.getCopyOfContextMap();
        return contextMap != null ? contextMap : new HashMap<>();
    }

    /**
     * Execute a runnable with additional MDC context
     */
    public static void withContext(Map<String, String> additionalContext, Runnable runnable) {
        Map<String, String> originalContext = MDC.getCopyOfContextMap();
        try {
            if (additionalContext != null) {
                additionalContext.forEach(MDC::put);
            }
            runnable.run();
        } finally {
            MDC.clear();
            if (originalContext != null) {
                MDC.setContextMap(originalContext);
            }
        }
    }

    /**
     * Execute a runnable with operation context
     */
    public static void withOperation(String operation, Runnable runnable) {
        long startTime = System.currentTimeMillis();
        setOperationContext(operation);
        try {
            runnable.run();
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            setOperationContext(operation, duration);
            clearOperationContext();
        }
    }
}