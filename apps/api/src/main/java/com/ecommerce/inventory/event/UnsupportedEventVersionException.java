package com.ecommerce.inventory.event;

/**
 * Exception thrown when an unsupported event version is encountered.
 */
public class UnsupportedEventVersionException extends RuntimeException {
    
    public UnsupportedEventVersionException(String message) {
        super(message);
    }
    
    public UnsupportedEventVersionException(String message, Throwable cause) {
        super(message, cause);
    }
}