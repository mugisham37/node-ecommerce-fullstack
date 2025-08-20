package com.ecommerce.inventory.event.retry;

import com.ecommerce.inventory.event.BaseEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * Service for handling event processing retries with exponential backoff.
 * Provides configurable retry mechanisms for different types of events.
 */
@Service
public class EventRetryService {
    
    private static final Logger logger = LoggerFactory.getLogger(EventRetryService.class);
    
    private final Executor eventProcessingExecutor;
    private final EventRetryRepository retryRepository;
    private final DeadLetterQueueService deadLetterQueueService;
    
    public EventRetryService(@Qualifier("eventProcessingExecutor") Executor eventProcessingExecutor,
                           EventRetryRepository retryRepository,
                           DeadLetterQueueService deadLetterQueueService) {
        this.eventProcessingExecutor = eventProcessingExecutor;
        this.retryRepository = retryRepository;
        this.deadLetterQueueService = deadLetterQueueService;
    }
    
    /**
     * Executes event processing with retry logic.
     */
    public CompletableFuture<Void> executeWithRetry(BaseEvent event, 
                                                   Consumer<BaseEvent> eventProcessor,
                                                   RetryPolicy retryPolicy) {
        return CompletableFuture.runAsync(() -> {
            EventRetryContext context = new EventRetryContext(event, retryPolicy);
            processEventWithRetry(context, eventProcessor);
        }, eventProcessingExecutor);
    }
    
    /**
     * Executes event processing with default retry policy.
     */
    public CompletableFuture<Void> executeWithRetry(BaseEvent event, Consumer<BaseEvent> eventProcessor) {
        RetryPolicy defaultPolicy = RetryPolicy.builder()
                .maxAttempts(3)
                .initialDelayMs(1000)
                .maxDelayMs(30000)
                .backoffMultiplier(2.0)
                .build();
        
        return executeWithRetry(event, eventProcessor, defaultPolicy);
    }
    
    /**
     * Processes event with retry logic and exponential backoff.
     */
    private void processEventWithRetry(EventRetryContext context, Consumer<BaseEvent> eventProcessor) {
        BaseEvent event = context.getEvent();
        RetryPolicy policy = context.getRetryPolicy();
        
        for (int attempt = 1; attempt <= policy.getMaxAttempts(); attempt++) {
            try {
                logger.debug("Processing event {} (attempt {}/{})", 
                           event.getEventId(), attempt, policy.getMaxAttempts());
                
                // Record retry attempt
                retryRepository.recordRetryAttempt(event.getEventId(), attempt, LocalDateTime.now());
                
                // Process the event
                eventProcessor.accept(event);
                
                // Success - remove from retry tracking
                retryRepository.removeRetryRecord(event.getEventId());
                
                logger.info("Successfully processed event {} after {} attempt(s)", 
                           event.getEventId(), attempt);
                return;
                
            } catch (Exception e) {
                logger.warn("Event processing failed for {} (attempt {}/{}): {}", 
                           event.getEventId(), attempt, policy.getMaxAttempts(), e.getMessage());
                
                // Record failure
                retryRepository.recordRetryFailure(event.getEventId(), attempt, e.getMessage(), LocalDateTime.now());
                
                if (attempt == policy.getMaxAttempts()) {
                    // Max attempts reached - send to dead letter queue
                    handleMaxRetriesExceeded(event, e, attempt);
                    return;
                }
                
                // Calculate delay for next attempt
                long delayMs = calculateDelay(attempt, policy);
                
                try {
                    logger.debug("Waiting {}ms before retry attempt {} for event {}", 
                               delayMs, attempt + 1, event.getEventId());
                    TimeUnit.MILLISECONDS.sleep(delayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    logger.error("Retry delay interrupted for event {}", event.getEventId());
                    handleMaxRetriesExceeded(event, ie, attempt);
                    return;
                }
            }
        }
    }
    
    /**
     * Calculates exponential backoff delay.
     */
    private long calculateDelay(int attempt, RetryPolicy policy) {
        long delay = (long) (policy.getInitialDelayMs() * Math.pow(policy.getBackoffMultiplier(), attempt - 1));
        return Math.min(delay, policy.getMaxDelayMs());
    }
    
    /**
     * Handles events that have exceeded maximum retry attempts.
     */
    private void handleMaxRetriesExceeded(BaseEvent event, Exception lastException, int attempts) {
        logger.error("Event {} failed after {} attempts. Sending to dead letter queue. Last error: {}", 
                    event.getEventId(), attempts, lastException.getMessage());
        
        try {
            // Send to dead letter queue
            deadLetterQueueService.sendToDeadLetterQueue(event, lastException, attempts);
            
            // Mark as failed in retry repository
            retryRepository.markAsFailed(event.getEventId(), lastException.getMessage(), LocalDateTime.now());
            
        } catch (Exception dlqException) {
            logger.error("Failed to send event {} to dead letter queue", event.getEventId(), dlqException);
        }
    }
    
    /**
     * Retries a specific event by ID (for manual retry operations).
     */
    public CompletableFuture<Void> retryEvent(String eventId, Consumer<BaseEvent> eventProcessor) {
        return CompletableFuture.runAsync(() -> {
            try {
                EventRetryRecord record = retryRepository.findByEventId(eventId);
                if (record == null) {
                    logger.warn("No retry record found for event ID: {}", eventId);
                    return;
                }
                
                // Reconstruct event from retry record (this would need event serialization)
                // For now, we'll log that manual retry was requested
                logger.info("Manual retry requested for event ID: {}", eventId);
                
            } catch (Exception e) {
                logger.error("Failed to retry event {}", eventId, e);
            }
        }, eventProcessingExecutor);
    }
    
    /**
     * Gets retry statistics for monitoring.
     */
    public RetryStatistics getRetryStatistics() {
        return retryRepository.getRetryStatistics();
    }
    
    /**
     * Cleans up old retry records.
     */
    public void cleanupOldRetryRecords(int daysOld) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysOld);
        int cleaned = retryRepository.deleteOldRecords(cutoffDate);
        logger.info("Cleaned up {} old retry records older than {}", cleaned, cutoffDate);
    }
}