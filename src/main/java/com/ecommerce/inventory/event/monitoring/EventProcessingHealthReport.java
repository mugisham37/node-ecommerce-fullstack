package com.ecommerce.inventory.event.monitoring;

import com.ecommerce.inventory.event.retry.DeadLetterQueueStatistics;
import com.ecommerce.inventory.event.retry.RetryStatistics;

/**
 * Health report for event processing system.
 * Provides comprehensive status information for monitoring and alerting.
 */
public class EventProcessingHealthReport {
    
    private final long timestamp;
    private final String executorStatus;
    private final RetryStatistics retryStatistics;
    private final DeadLetterQueueStatistics deadLetterQueueStatistics;
    private final double overallHealthScore;
    
    public EventProcessingHealthReport(long timestamp, String executorStatus, 
                                     RetryStatistics retryStatistics,
                                     DeadLetterQueueStatistics deadLetterQueueStatistics,
                                     double overallHealthScore) {
        this.timestamp = timestamp;
        this.executorStatus = executorStatus;
        this.retryStatistics = retryStatistics;
        this.deadLetterQueueStatistics = deadLetterQueueStatistics;
        this.overallHealthScore = overallHealthScore;
    }
    
    public long getTimestamp() {
        return timestamp;
    }
    
    public String getExecutorStatus() {
        return executorStatus;
    }
    
    public RetryStatistics getRetryStatistics() {
        return retryStatistics;
    }
    
    public DeadLetterQueueStatistics getDeadLetterQueueStatistics() {
        return deadLetterQueueStatistics;
    }
    
    public double getOverallHealthScore() {
        return overallHealthScore;
    }
    
    public HealthStatus getHealthStatus() {
        if (overallHealthScore >= 90) {
            return HealthStatus.HEALTHY;
        } else if (overallHealthScore >= 70) {
            return HealthStatus.WARNING;
        } else {
            return HealthStatus.CRITICAL;
        }
    }
    
    @Override
    public String toString() {
        return String.format("EventProcessingHealthReport{timestamp=%d, healthScore=%.1f, status=%s, " +
                           "executorStatus='%s', retryStats=%s, dlqStats=%s}", 
                           timestamp, overallHealthScore, getHealthStatus(), executorStatus, 
                           retryStatistics, deadLetterQueueStatistics);
    }
    
    public enum HealthStatus {
        HEALTHY, WARNING, CRITICAL
    }
}