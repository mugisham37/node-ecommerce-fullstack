package com.ecommerce.inventory.event;

import org.springframework.context.ApplicationEvent;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Base class for all domain events in the system.
 * Provides common event metadata and versioning support.
 */
public abstract class BaseEvent extends ApplicationEvent {
    
    private final String eventId;
    private final LocalDateTime timestamp;
    private final String eventVersion;
    private final String eventType;
    private final String aggregateId;
    private final String userId;
    
    protected BaseEvent(Object source, String aggregateId, String userId) {
        super(source);
        this.eventId = UUID.randomUUID().toString();
        this.timestamp = LocalDateTime.now();
        this.eventVersion = "1.0";
        this.eventType = this.getClass().getSimpleName();
        this.aggregateId = aggregateId;
        this.userId = userId;
    }
    
    protected BaseEvent(Object source, String aggregateId, String userId, String eventVersion) {
        super(source);
        this.eventId = UUID.randomUUID().toString();
        this.timestamp = LocalDateTime.now();
        this.eventVersion = eventVersion;
        this.eventType = this.getClass().getSimpleName();
        this.aggregateId = aggregateId;
        this.userId = userId;
    }
    
    public String getEventId() {
        return eventId;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public String getEventVersion() {
        return eventVersion;
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
    
    @Override
    public String toString() {
        return String.format("%s{eventId='%s', timestamp=%s, version='%s', aggregateId='%s', userId='%s'}", 
                eventType, eventId, timestamp, eventVersion, aggregateId, userId);
    }
}