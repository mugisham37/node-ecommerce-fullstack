package com.ecommerce.inventory.event.retry;

import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Repository for tracking event retry attempts and statistics.
 * In a production system, this would be backed by a persistent store.
 */
@Repository
public class EventRetryRepository {
    
    private final ConcurrentHashMap<String, EventRetryRecord> retryRecords = new ConcurrentHashMap<>();
    private final AtomicLong totalRetryAttempts = new AtomicLong(0);
    private final AtomicLong totalFailedEvents = new AtomicLong(0);
    private final AtomicLong totalSuccessfulRetries = new AtomicLong(0);
    
    /**
     * Records a retry attempt for an event.
     */
    public void recordRetryAttempt(String eventId, int attemptNumber, LocalDateTime attemptTime) {
        retryRecords.compute(eventId, (key, existing) -> {
            if (existing == null) {
                existing = new EventRetryRecord(eventId);
            }
            existing.addAttempt(attemptNumber, attemptTime);
            return existing;
        });
        
        totalRetryAttempts.incrementAndGet();
    }
    
    /**
     * Records a retry failure for an event.
     */
    public void recordRetryFailure(String eventId, int attemptNumber, String errorMessage, LocalDateTime failureTime) {
        retryRecords.compute(eventId, (key, existing) -> {
            if (existing == null) {
                existing = new EventRetryRecord(eventId);
            }
            existing.addFailure(attemptNumber, errorMessage, failureTime);
            return existing;
        });
    }
    
    /**
     * Marks an event as finally failed after all retries.
     */
    public void markAsFailed(String eventId, String finalErrorMessage, LocalDateTime failureTime) {
        retryRecords.compute(eventId, (key, existing) -> {
            if (existing == null) {
                existing = new EventRetryRecord(eventId);
            }
            existing.markAsFinallyFailed(finalErrorMessage, failureTime);
            return existing;
        });
        
        totalFailedEvents.incrementAndGet();
    }
    
    /**
     * Removes a retry record (called when event processing succeeds).
     */
    public void removeRetryRecord(String eventId) {
        EventRetryRecord removed = retryRecords.remove(eventId);
        if (removed != null && removed.getAttemptCount() > 1) {
            totalSuccessfulRetries.incrementAndGet();
        }
    }
    
    /**
     * Finds a retry record by event ID.
     */
    public EventRetryRecord findByEventId(String eventId) {
        return retryRecords.get(eventId);
    }
    
    /**
     * Gets current retry statistics.
     */
    public RetryStatistics getRetryStatistics() {
        return new RetryStatistics(
                totalRetryAttempts.get(),
                totalFailedEvents.get(),
                totalSuccessfulRetries.get(),
                retryRecords.size()
        );
    }
    
    /**
     * Deletes old retry records.
     */
    public int deleteOldRecords(LocalDateTime cutoffDate) {
        AtomicInteger deletedCount = new AtomicInteger(0);
        
        retryRecords.entrySet().removeIf(entry -> {
            EventRetryRecord record = entry.getValue();
            if (record.getCreatedAt().isBefore(cutoffDate)) {
                deletedCount.incrementAndGet();
                return true;
            }
            return false;
        });
        
        return deletedCount.get();
    }
    
    /**
     * Gets all active retry records (for monitoring).
     */
    public java.util.Collection<EventRetryRecord> getAllActiveRecords() {
        return retryRecords.values();
    }
    
    /**
     * Clears all retry records (for testing).
     */
    public void clear() {
        retryRecords.clear();
        totalRetryAttempts.set(0);
        totalFailedEvents.set(0);
        totalSuccessfulRetries.set(0);
    }
}