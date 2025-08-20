package com.ecommerce.inventory.event.retry;

/**
 * Statistics about event retry operations.
 * Used for monitoring and alerting purposes.
 */
public class RetryStatistics {
    
    private final long totalRetryAttempts;
    private final long totalFailedEvents;
    private final long totalSuccessfulRetries;
    private final long activeRetryRecords;
    
    public RetryStatistics(long totalRetryAttempts, long totalFailedEvents, 
                          long totalSuccessfulRetries, long activeRetryRecords) {
        this.totalRetryAttempts = totalRetryAttempts;
        this.totalFailedEvents = totalFailedEvents;
        this.totalSuccessfulRetries = totalSuccessfulRetries;
        this.activeRetryRecords = activeRetryRecords;
    }
    
    public long getTotalRetryAttempts() {
        return totalRetryAttempts;
    }
    
    public long getTotalFailedEvents() {
        return totalFailedEvents;
    }
    
    public long getTotalSuccessfulRetries() {
        return totalSuccessfulRetries;
    }
    
    public long getActiveRetryRecords() {
        return activeRetryRecords;
    }
    
    public double getRetrySuccessRate() {
        if (totalRetryAttempts == 0) {
            return 0.0;
        }
        return (double) totalSuccessfulRetries / totalRetryAttempts;
    }
    
    public double getEventFailureRate() {
        long totalEvents = totalSuccessfulRetries + totalFailedEvents;
        if (totalEvents == 0) {
            return 0.0;
        }
        return (double) totalFailedEvents / totalEvents;
    }
    
    @Override
    public String toString() {
        return String.format("RetryStatistics{totalRetryAttempts=%d, totalFailedEvents=%d, " +
                           "totalSuccessfulRetries=%d, activeRetryRecords=%d, retrySuccessRate=%.2f%%, " +
                           "eventFailureRate=%.2f%%}", 
                           totalRetryAttempts, totalFailedEvents, totalSuccessfulRetries, 
                           activeRetryRecords, getRetrySuccessRate() * 100, getEventFailureRate() * 100);
    }
}