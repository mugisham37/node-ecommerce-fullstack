package com.ecommerce.inventory.event.retry;

import com.ecommerce.inventory.event.BaseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Service for handling events that have failed all retry attempts.
 * Stores failed events for manual inspection and potential reprocessing.
 */
@Service
public class DeadLetterQueueService {
    
    private static final Logger logger = LoggerFactory.getLogger(DeadLetterQueueService.class);
    private static final String DLQ_KEY_PREFIX = "dlq:event:";
    private static final String DLQ_LIST_KEY = "dlq:events";
    private static final String DLQ_STATS_KEY = "dlq:stats";
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    
    public DeadLetterQueueService(RedisTemplate<String, Object> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }
    
    /**
     * Sends a failed event to the dead letter queue.
     */
    public void sendToDeadLetterQueue(BaseEvent event, Exception lastException, int attemptCount) {
        try {
            DeadLetterQueueEntry entry = new DeadLetterQueueEntry(
                    event.getEventId(),
                    event.getEventType(),
                    event.getAggregateId(),
                    event.getUserId(),
                    serializeEvent(event),
                    lastException.getMessage(),
                    lastException.getClass().getSimpleName(),
                    attemptCount,
                    LocalDateTime.now()
            );
            
            // Store the entry
            String entryKey = DLQ_KEY_PREFIX + event.getEventId();
            redisTemplate.opsForValue().set(entryKey, entry, 30, TimeUnit.DAYS);
            
            // Add to the list for easy retrieval
            redisTemplate.opsForList().leftPush(DLQ_LIST_KEY, event.getEventId());
            
            // Update statistics
            updateDeadLetterQueueStats(event.getEventType());
            
            logger.error("Event {} sent to dead letter queue after {} attempts. Error: {}", 
                        event.getEventId(), attemptCount, lastException.getMessage());
            
        } catch (Exception e) {
            logger.error("Failed to send event {} to dead letter queue", event.getEventId(), e);
        }
    }
    
    /**
     * Retrieves a dead letter queue entry by event ID.
     */
    public DeadLetterQueueEntry getDeadLetterQueueEntry(String eventId) {
        try {
            String entryKey = DLQ_KEY_PREFIX + eventId;
            return (DeadLetterQueueEntry) redisTemplate.opsForValue().get(entryKey);
        } catch (Exception e) {
            logger.error("Failed to retrieve dead letter queue entry for event {}", eventId, e);
            return null;
        }
    }
    
    /**
     * Gets all event IDs in the dead letter queue.
     */
    public List<String> getAllDeadLetterQueueEventIds() {
        try {
            return redisTemplate.opsForList().range(DLQ_LIST_KEY, 0, -1)
                    .stream()
                    .map(Object::toString)
                    .toList();
        } catch (Exception e) {
            logger.error("Failed to retrieve dead letter queue event IDs", e);
            return List.of();
        }
    }
    
    /**
     * Gets dead letter queue entries with pagination.
     */
    public List<DeadLetterQueueEntry> getDeadLetterQueueEntries(int offset, int limit) {
        try {
            List<String> eventIds = redisTemplate.opsForList().range(DLQ_LIST_KEY, offset, offset + limit - 1)
                    .stream()
                    .map(Object::toString)
                    .toList();
            
            return eventIds.stream()
                    .map(this::getDeadLetterQueueEntry)
                    .filter(entry -> entry != null)
                    .toList();
                    
        } catch (Exception e) {
            logger.error("Failed to retrieve dead letter queue entries", e);
            return List.of();
        }
    }
    
    /**
     * Removes an event from the dead letter queue.
     */
    public boolean removeFromDeadLetterQueue(String eventId) {
        try {
            String entryKey = DLQ_KEY_PREFIX + eventId;
            
            // Remove the entry
            Boolean deleted = redisTemplate.delete(entryKey);
            
            // Remove from the list
            redisTemplate.opsForList().remove(DLQ_LIST_KEY, 1, eventId);
            
            logger.info("Removed event {} from dead letter queue", eventId);
            return Boolean.TRUE.equals(deleted);
            
        } catch (Exception e) {
            logger.error("Failed to remove event {} from dead letter queue", eventId, e);
            return false;
        }
    }
    
    /**
     * Gets dead letter queue statistics.
     */
    public DeadLetterQueueStatistics getStatistics() {
        try {
            Long totalCount = redisTemplate.opsForList().size(DLQ_LIST_KEY);
            
            // Get type-specific counts from stats hash
            var typeStats = redisTemplate.opsForHash().entries(DLQ_STATS_KEY);
            
            return new DeadLetterQueueStatistics(
                    totalCount != null ? totalCount : 0,
                    typeStats
            );
            
        } catch (Exception e) {
            logger.error("Failed to retrieve dead letter queue statistics", e);
            return new DeadLetterQueueStatistics(0, java.util.Map.of());
        }
    }
    
    /**
     * Clears old entries from the dead letter queue.
     */
    public int clearOldEntries(int daysOld) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysOld);
        int clearedCount = 0;
        
        try {
            List<String> eventIds = getAllDeadLetterQueueEventIds();
            
            for (String eventId : eventIds) {
                DeadLetterQueueEntry entry = getDeadLetterQueueEntry(eventId);
                if (entry != null && entry.getCreatedAt().isBefore(cutoffDate)) {
                    if (removeFromDeadLetterQueue(eventId)) {
                        clearedCount++;
                    }
                }
            }
            
            logger.info("Cleared {} old dead letter queue entries older than {}", clearedCount, cutoffDate);
            
        } catch (Exception e) {
            logger.error("Failed to clear old dead letter queue entries", e);
        }
        
        return clearedCount;
    }
    
    /**
     * Serializes an event for storage.
     */
    private String serializeEvent(BaseEvent event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            logger.warn("Failed to serialize event {}, storing minimal info", event.getEventId(), e);
            return String.format("{\"eventId\":\"%s\",\"eventType\":\"%s\",\"error\":\"Serialization failed\"}", 
                               event.getEventId(), event.getEventType());
        }
    }
    
    /**
     * Updates dead letter queue statistics.
     */
    private void updateDeadLetterQueueStats(String eventType) {
        try {
            redisTemplate.opsForHash().increment(DLQ_STATS_KEY, eventType, 1);
            redisTemplate.opsForHash().increment(DLQ_STATS_KEY, "total", 1);
        } catch (Exception e) {
            logger.warn("Failed to update dead letter queue statistics", e);
        }
    }
}