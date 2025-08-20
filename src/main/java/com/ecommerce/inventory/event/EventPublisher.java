package com.ecommerce.inventory.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

/**
 * Service for publishing domain events with comprehensive logging and error handling.
 * Provides a centralized point for event publishing with monitoring capabilities.
 */
@Service
public class EventPublisher {
    
    private static final Logger logger = LoggerFactory.getLogger(EventPublisher.class);
    
    private final ApplicationEventPublisher applicationEventPublisher;
    private final EventMetricsCollector metricsCollector;
    
    public EventPublisher(ApplicationEventPublisher applicationEventPublisher, 
                         EventMetricsCollector metricsCollector) {
        this.applicationEventPublisher = applicationEventPublisher;
        this.metricsCollector = metricsCollector;
    }
    
    /**
     * Publishes a domain event with comprehensive logging and metrics collection.
     */
    public void publishEvent(BaseEvent event) {
        try {
            logger.debug("Publishing event: {}", event);
            
            // Record event publishing metrics
            metricsCollector.recordEventPublished(event.getEventType(), event.getEventVersion());
            
            // Publish the event
            applicationEventPublisher.publishEvent(event);
            
            logger.info("Successfully published event: {} with ID: {}", 
                       event.getEventType(), event.getEventId());
            
        } catch (Exception e) {
            logger.error("Failed to publish event: {} with ID: {}", 
                        event.getEventType(), event.getEventId(), e);
            
            // Record failure metrics
            metricsCollector.recordEventPublishingFailure(event.getEventType(), e.getClass().getSimpleName());
            
            // Re-throw to allow caller to handle
            throw new EventPublishingException("Failed to publish event: " + event.getEventType(), e);
        }
    }
    
    /**
     * Publishes multiple events in sequence with error handling.
     */
    public void publishEvents(BaseEvent... events) {
        for (BaseEvent event : events) {
            publishEvent(event);
        }
    }
    
    /**
     * Publishes an event asynchronously (fire-and-forget).
     * Use with caution as failures will only be logged.
     */
    public void publishEventAsync(BaseEvent event) {
        try {
            publishEvent(event);
        } catch (Exception e) {
            logger.error("Async event publishing failed for event: {} with ID: {}", 
                        event.getEventType(), event.getEventId(), e);
            // Don't re-throw for async publishing
        }
    }
}