package com.ecommerce.inventory.event.retry;

import com.ecommerce.inventory.event.BaseEvent;

import java.time.LocalDateTime;

/**
 * Context information for event retry processing.
 * Tracks retry attempts and timing information.
 */
public class EventRetryContext {
    
    private final BaseEvent event;
    private final RetryPolicy retryPolicy;
    private final LocalDateTime createdAt;
    private int currentAttempt;
    private LocalDateTime lastAttemptAt;
    private Exception lastException;
    
    public EventRetryContext(BaseEvent event, RetryPolicy retryPolicy) {
        this.event = event;
        this.retryPolicy = retryPolicy;
        this.createdAt = LocalDateTime.now();
        this.currentAttempt = 0;
    }
    
    public BaseEvent getEvent() {
        return event;
    }
    
    public RetryPolicy getRetryPolicy() {
        return retryPolicy;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public int getCurrentAttempt() {
        return currentAttempt;
    }
    
    public void incrementAttempt() {
        this.currentAttempt++;
        this.lastAttemptAt = LocalDateTime.now();
    }
    
    public LocalDateTime getLastAttemptAt() {
        return lastAttemptAt;
    }
    
    public Exception getLastException() {
        return lastException;
    }
    
    public void setLastException(Exception lastException) {
        this.lastException = lastException;
    }
    
    public boolean hasMoreAttempts() {
        return currentAttempt < retryPolicy.getMaxAttempts();
    }
    
    public boolean isFirstAttempt() {
        return currentAttempt == 1;
    }
    
    public boolean isLastAttempt() {
        return currentAttempt == retryPolicy.getMaxAttempts();
    }
    
    @Override
    public String toString() {
        return String.format("EventRetryContext{eventId='%s', eventType='%s', attempt=%d/%d, createdAt=%s}", 
                           event.getEventId(), event.getEventType(), currentAttempt, 
                           retryPolicy.getMaxAttempts(), createdAt);
    }
}