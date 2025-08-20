package com.ecommerce.inventory.event.retry;

import java.util.Map;

/**
 * Statistics about the dead letter queue.
 * Used for monitoring and alerting purposes.
 */
public class DeadLetterQueueStatistics {
    
    private final long totalEntries;
    private final Map<Object, Object> eventTypeStats;
    
    public DeadLetterQueueStatistics(long totalEntries, Map<Object, Object> eventTypeStats) {
        this.totalEntries = totalEntries;
        this.eventTypeStats = eventTypeStats;
    }
    
    public long getTotalEntries() {
        return totalEntries;
    }
    
    public Map<Object, Object> getEventTypeStats() {
        return eventTypeStats;
    }
    
    public long getCountForEventType(String eventType) {
        Object count = eventTypeStats.get(eventType);
        if (count instanceof Number) {
            return ((Number) count).longValue();
        }
        return 0;
    }
    
    @Override
    public String toString() {
        return String.format("DeadLetterQueueStatistics{totalEntries=%d, eventTypeStats=%s}", 
                           totalEntries, eventTypeStats);
    }
}