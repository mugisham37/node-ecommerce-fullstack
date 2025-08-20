package com.ecommerce.inventory.event.retry;

import java.time.LocalDateTime;

/**
 * Represents an entry in the dead letter queue.
 * Contains event information and failure details.
 */
public class DeadLetterQueueEntry {
    
    private final String eventId;
    private final String eventType;
    private final String aggregateId;
    private final String userId;
    private final String serializedEvent;
    private final String lastErrorMessage;
    private final String lastErrorType;
    private final int attemptCount;
    private final LocalDateTime createdAt;
    
    public DeadLetterQueueEntry(String eventId, String eventType, String aggregateId, String userId,
                               String serializedEvent, String lastErrorMessage, String lastErrorType,
                               int attemptCount, LocalDateTime createdAt) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.aggregateId = aggregateId;
        this.userId = userId;
        this.serializedEvent = serializedEvent;
        this.lastErrorMessage = lastErrorMessage;
        this.lastErrorType = lastErrorType;
        this.attemptCount = attemptCount;
        this.createdAt = createdAt;
    }
    
    public String getEventId() {
        return eventId;
    }
    
    public String getEventType() {
        return eventType;
    }
    
    public String getAggregateId() {
        return aggregateId;
    }
    
    public String getUserId() {
        return userId;
    }
    
    public String getSerializedEvent() {
        return serializedEvent;
    }
    
    public String getLastErrorMessage() {
        return lastErrorMessage;
    }
    
    public String getLastErrorType() {
        return lastErrorType;
    }
    
    public int getAttemptCount() {
        return attemptCount;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    @Override
    public String toString() {
        return String.format("DeadLetterQueueEntry{eventId='%s', eventType='%s', aggregateId='%s', " +
                           "userId='%s', lastErrorType='%s', attemptCount=%d, createdAt=%s}", 
                           eventId, eventType, aggregateId, userId, lastErrorType, attemptCount, createdAt);
    }
}