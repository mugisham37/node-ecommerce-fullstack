package com.ecommerce.inventory.exception;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Base class for all business-related exceptions in the inventory management system.
 * Provides common functionality for error context and detailed information.
 */
public abstract class BusinessException extends RuntimeException {
    
    private final String errorCode;
    private final String category;
    private final LocalDateTime timestamp;
    private final Map<String, Object> context;

    protected BusinessException(String message, String errorCode, String category) {
        super(message);
        this.errorCode = errorCode;
        this.category = category;
        this.timestamp = LocalDateTime.now();
        this.context = new HashMap<>();
    }

    protected BusinessException(String message, String errorCode, String category, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.category = category;
        this.timestamp = LocalDateTime.now();
        this.context = new HashMap<>();
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getCategory() {
        return category;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public Map<String, Object> getContext() {
        return new HashMap<>(context);
    }

    public void addContext(String key, Object value) {
        this.context.put(key, value);
    }

    public void addContext(Map<String, Object> additionalContext) {
        this.context.putAll(additionalContext);
    }

    @Override
    public String toString() {
        return String.format("%s{errorCode='%s', category='%s', timestamp=%s, message='%s', context=%s}",
                getClass().getSimpleName(), errorCode, category, timestamp, getMessage(), context);
    }
}