package com.ecommerce.inventory.event.monitoring;

import com.ecommerce.inventory.event.listener.EventProcessingMetrics;
import com.ecommerce.inventory.event.retry.DeadLetterQueueService;
import com.ecommerce.inventory.event.retry.DeadLetterQueueStatistics;
import com.ecommerce.inventory.event.retry.EventRetryService;
import com.ecommerce.inventory.event.retry.RetryStatistics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.util.concurrent.Executor;

/**
 * Service for monitoring event processing performance and health.
 * Provides comprehensive monitoring of event processing metrics and alerts.
 */
@Service
public class EventProcessingMonitoringService {
    
    private static final Logger logger = LoggerFactory.getLogger(EventProcessingMonitoringService.class);
    
    private final EventProcessingMetrics metrics;
    private final EventRetryService retryService;
    private final DeadLetterQueueService deadLetterQueueService;
    private final Executor eventProcessingExecutor;
    private final Executor inventoryEventExecutor;
    private final Executor orderEventExecutor;
    private final Executor notificationEventExecutor;
    
    public EventProcessingMonitoringService(EventProcessingMetrics metrics,
                                          EventRetryService retryService,
                                          DeadLetterQueueService deadLetterQueueService,
                                          @Qualifier("eventProcessingExecutor") Executor eventProcessingExecutor,
                                          @Qualifier("inventoryEventExecutor") Executor inventoryEventExecutor,
                                          @Qualifier("orderEventExecutor") Executor orderEventExecutor,
                                          @Qualifier("notificationEventExecutor") Executor notificationEventExecutor) {
        this.metrics = metrics;
        this.retryService = retryService;
        this.deadLetterQueueService = deadLetterQueueService;
        this.eventProcessingExecutor = eventProcessingExecutor;
        this.inventoryEventExecutor = inventoryEventExecutor;
        this.orderEventExecutor = orderEventExecutor;
        this.notificationEventExecutor = notificationEventExecutor;
    }
    
    /**
     * Monitors event processing health every minute.
     */
    @Scheduled(fixedRate = 60000) // Every minute
    public void monitorEventProcessingHealth() {
        try {
            logger.debug("Starting event processing health monitoring");
            
            // Monitor executor health
            monitorExecutorHealth();
            
            // Monitor retry statistics
            monitorRetryStatistics();
            
            // Monitor dead letter queue
            monitorDeadLetterQueue();
            
            // Check for performance issues
            checkPerformanceIssues();
            
            logger.debug("Completed event processing health monitoring");
            
        } catch (Exception e) {
            logger.error("Error during event processing health monitoring", e);
        }
    }
    
    /**
     * Monitors executor health and queue sizes.
     */
    private void monitorExecutorHealth() {
        monitorExecutor("eventProcessingExecutor", eventProcessingExecutor);
        monitorExecutor("inventoryEventExecutor", inventoryEventExecutor);
        monitorExecutor("orderEventExecutor", orderEventExecutor);
        monitorExecutor("notificationEventExecutor", notificationEventExecutor);
    }
    
    private void monitorExecutor(String executorName, Executor executor) {
        if (executor instanceof ThreadPoolTaskExecutor threadPoolExecutor) {
            int activeCount = threadPoolExecutor.getActiveCount();
            int queueSize = threadPoolExecutor.getQueueSize();
            int poolSize = threadPoolExecutor.getPoolSize();
            int corePoolSize = threadPoolExecutor.getCorePoolSize();
            int maxPoolSize = threadPoolExecutor.getMaxPoolSize();
            
            // Record metrics
            metrics.recordExecutorActiveThreads(executorName, activeCount);
            metrics.recordExecutorQueueSize(executorName, queueSize);
            
            // Log status
            logger.debug("Executor {} - Active: {}, Queue: {}, Pool: {}/{}/{}", 
                        executorName, activeCount, queueSize, poolSize, corePoolSize, maxPoolSize);
            
            // Check for potential issues
            if (queueSize > maxPoolSize * 2) {
                logger.warn("High queue size detected for executor {}: {} items", executorName, queueSize);
            }
            
            if (activeCount == maxPoolSize && queueSize > 0) {
                logger.warn("Executor {} at maximum capacity with queued tasks", executorName);
            }
        }
    }
    
    /**
     * Monitors retry statistics.
     */
    private void monitorRetryStatistics() {
        try {
            RetryStatistics stats = retryService.getRetryStatistics();
            
            logger.debug("Retry Statistics - Total Attempts: {}, Failed Events: {}, Successful Retries: {}, Active Records: {}", 
                        stats.getTotalRetryAttempts(), stats.getTotalFailedEvents(), 
                        stats.getTotalSuccessfulRetries(), stats.getActiveRetryRecords());
            
            // Check for concerning retry rates
            if (stats.getEventFailureRate() > 0.1) { // More than 10% failure rate
                logger.warn("High event failure rate detected: {:.2f}%", stats.getEventFailureRate() * 100);
            }
            
            if (stats.getActiveRetryRecords() > 100) {
                logger.warn("High number of active retry records: {}", stats.getActiveRetryRecords());
            }
            
        } catch (Exception e) {
            logger.error("Error monitoring retry statistics", e);
        }
    }
    
    /**
     * Monitors dead letter queue statistics.
     */
    private void monitorDeadLetterQueue() {
        try {
            DeadLetterQueueStatistics stats = deadLetterQueueService.getStatistics();
            
            logger.debug("Dead Letter Queue Statistics - Total Entries: {}, Event Types: {}", 
                        stats.getTotalEntries(), stats.getEventTypeStats().keySet());
            
            // Alert on dead letter queue growth
            if (stats.getTotalEntries() > 50) {
                logger.warn("High number of dead letter queue entries: {}", stats.getTotalEntries());
            }
            
            // Log event type breakdown
            stats.getEventTypeStats().forEach((eventType, count) -> {
                if (!"total".equals(eventType)) {
                    long eventCount = stats.getCountForEventType(eventType.toString());
                    if (eventCount > 5) {
                        logger.warn("High dead letter queue count for event type {}: {}", eventType, eventCount);
                    }
                }
            });
            
        } catch (Exception e) {
            logger.error("Error monitoring dead letter queue statistics", e);
        }
    }
    
    /**
     * Checks for performance issues in event processing.
     */
    private void checkPerformanceIssues() {
        // Check success rates for different event types
        String[] eventTypes = {
            "StockUpdatedEvent", "LowStockEvent", "OrderCreatedEvent", 
            "OrderStatusChangedEvent", "InventoryAllocatedEvent", "InventoryReleasedEvent"
        };
        
        for (String eventType : eventTypes) {
            double successRate = metrics.getSuccessRate(eventType);
            double totalCount = metrics.getTotalEventCount(eventType);
            double avgProcessingTime = metrics.getAverageProcessingTime(eventType);
            
            if (totalCount > 0) {
                logger.debug("Event Type: {} - Success Rate: {:.2f}%, Total Count: {}, Avg Processing Time: {:.2f}ms", 
                           eventType, successRate * 100, totalCount, avgProcessingTime);
                
                // Alert on low success rates
                if (successRate < 0.95 && totalCount > 10) { // Less than 95% success rate with significant volume
                    logger.warn("Low success rate for event type {}: {:.2f}%", eventType, successRate * 100);
                }
                
                // Alert on slow processing
                if (avgProcessingTime > 5000) { // More than 5 seconds average
                    logger.warn("Slow processing detected for event type {}: {:.2f}ms average", eventType, avgProcessingTime);
                }
            }
        }
    }
    
    /**
     * Generates a comprehensive health report.
     */
    public EventProcessingHealthReport generateHealthReport() {
        try {
            RetryStatistics retryStats = retryService.getRetryStatistics();
            DeadLetterQueueStatistics dlqStats = deadLetterQueueService.getStatistics();
            
            return new EventProcessingHealthReport(
                    System.currentTimeMillis(),
                    getExecutorStatus(),
                    retryStats,
                    dlqStats,
                    calculateOverallHealthScore(retryStats, dlqStats)
            );
            
        } catch (Exception e) {
            logger.error("Error generating health report", e);
            return new EventProcessingHealthReport(
                    System.currentTimeMillis(),
                    "Error generating executor status",
                    new RetryStatistics(0, 0, 0, 0),
                    new DeadLetterQueueStatistics(0, java.util.Map.of()),
                    0.0
            );
        }
    }
    
    private String getExecutorStatus() {
        StringBuilder status = new StringBuilder();
        
        if (eventProcessingExecutor instanceof ThreadPoolTaskExecutor executor) {
            status.append(String.format("EventProcessing: %d/%d active, %d queued; ", 
                         executor.getActiveCount(), executor.getMaxPoolSize(), executor.getQueueSize()));
        }
        
        if (inventoryEventExecutor instanceof ThreadPoolTaskExecutor executor) {
            status.append(String.format("Inventory: %d/%d active, %d queued; ", 
                         executor.getActiveCount(), executor.getMaxPoolSize(), executor.getQueueSize()));
        }
        
        if (orderEventExecutor instanceof ThreadPoolTaskExecutor executor) {
            status.append(String.format("Order: %d/%d active, %d queued; ", 
                         executor.getActiveCount(), executor.getMaxPoolSize(), executor.getQueueSize()));
        }
        
        if (notificationEventExecutor instanceof ThreadPoolTaskExecutor executor) {
            status.append(String.format("Notification: %d/%d active, %d queued", 
                         executor.getActiveCount(), executor.getMaxPoolSize(), executor.getQueueSize()));
        }
        
        return status.toString();
    }
    
    private double calculateOverallHealthScore(RetryStatistics retryStats, DeadLetterQueueStatistics dlqStats) {
        double score = 100.0;
        
        // Deduct points for high failure rate
        score -= retryStats.getEventFailureRate() * 50; // Up to 50 points for failure rate
        
        // Deduct points for dead letter queue entries
        if (dlqStats.getTotalEntries() > 0) {
            score -= Math.min(dlqStats.getTotalEntries() * 2, 30); // Up to 30 points for DLQ entries
        }
        
        // Deduct points for high active retry records
        if (retryStats.getActiveRetryRecords() > 10) {
            score -= Math.min((retryStats.getActiveRetryRecords() - 10) * 0.5, 20); // Up to 20 points
        }
        
        return Math.max(score, 0.0);
    }
    
    /**
     * Cleans up old monitoring data.
     */
    @Scheduled(cron = "0 0 2 * * *") // Daily at 2 AM
    public void cleanupOldData() {
        try {
            logger.info("Starting cleanup of old event processing data");
            
            // Clean up old retry records (older than 7 days)
            retryService.cleanupOldRetryRecords(7);
            
            // Clean up old dead letter queue entries (older than 30 days)
            int cleanedDlqEntries = deadLetterQueueService.clearOldEntries(30);
            
            logger.info("Completed cleanup - Cleaned {} dead letter queue entries", cleanedDlqEntries);
            
        } catch (Exception e) {
            logger.error("Error during cleanup of old event processing data", e);
        }
    }
}