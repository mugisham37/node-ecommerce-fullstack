package com.ecommerce.inventory.event.listener;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Metrics collection for event processing performance and monitoring.
 * Provides comprehensive metrics for event processing success/failure rates and timing.
 */
@Component
public class EventProcessingMetrics {
    
    private final MeterRegistry meterRegistry;
    private final ConcurrentHashMap<String, Counter> successCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Counter> failureCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Timer> processingTimers = new ConcurrentHashMap<>();
    
    public EventProcessingMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    /**
     * Records that an event was processed successfully or failed.
     */
    public void recordEventProcessed(String eventType, boolean success) {
        if (success) {
            getSuccessCounter(eventType).increment();
        } else {
            getFailureCounter(eventType).increment();
        }
    }
    
    /**
     * Records the processing time for an event.
     */
    public void recordProcessingTime(String eventType, Duration duration) {
        getProcessingTimer(eventType).record(duration);
    }
    
    /**
     * Records the processing time for an event using a timer sample.
     */
    public Timer.Sample startTimer(String eventType) {
        return Timer.start(meterRegistry);
    }
    
    /**
     * Stops a timer and records the duration.
     */
    public void stopTimer(Timer.Sample sample, String eventType) {
        sample.stop(getProcessingTimer(eventType));
    }
    
    /**
     * Records retry attempt for an event.
     */
    public void recordRetryAttempt(String eventType) {
        Counter.builder("event.processing.retries")
                .tag("event.type", eventType)
                .register(meterRegistry)
                .increment();
    }
    
    /**
     * Records dead letter queue entry.
     */
    public void recordDeadLetterQueueEntry(String eventType) {
        Counter.builder("event.processing.dead_letter_queue")
                .tag("event.type", eventType)
                .register(meterRegistry)
                .increment();
    }
    
    /**
     * Records async executor queue size.
     */
    public void recordExecutorQueueSize(String executorName, int queueSize) {
        meterRegistry.gauge("event.processing.executor.queue_size", 
                          "executor.name", executorName, queueSize);
    }
    
    /**
     * Records async executor active threads.
     */
    public void recordExecutorActiveThreads(String executorName, int activeThreads) {
        meterRegistry.gauge("event.processing.executor.active_threads", 
                          "executor.name", executorName, activeThreads);
    }
    
    /**
     * Records event listener performance.
     */
    public void recordListenerPerformance(String listenerName, String eventType, Duration processingTime, boolean success) {
        Timer.builder("event.listener.processing_time")
                .tag("listener.name", listenerName)
                .tag("event.type", eventType)
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .record(processingTime);
    }
    
    private Counter getSuccessCounter(String eventType) {
        return successCounters.computeIfAbsent(eventType, type ->
                Counter.builder("event.processing.success")
                        .tag("event.type", type)
                        .register(meterRegistry));
    }
    
    private Counter getFailureCounter(String eventType) {
        return failureCounters.computeIfAbsent(eventType, type ->
                Counter.builder("event.processing.failure")
                        .tag("event.type", type)
                        .register(meterRegistry));
    }
    
    private Timer getProcessingTimer(String eventType) {
        return processingTimers.computeIfAbsent(eventType, type ->
                Timer.builder("event.processing.duration")
                        .tag("event.type", type)
                        .register(meterRegistry));
    }
    
    /**
     * Gets success rate for an event type.
     */
    public double getSuccessRate(String eventType) {
        Counter successCounter = successCounters.get(eventType);
        Counter failureCounter = failureCounters.get(eventType);
        
        if (successCounter == null && failureCounter == null) {
            return 0.0;
        }
        
        double successCount = successCounter != null ? successCounter.count() : 0.0;
        double failureCount = failureCounter != null ? failureCounter.count() : 0.0;
        double totalCount = successCount + failureCount;
        
        return totalCount > 0 ? successCount / totalCount : 0.0;
    }
    
    /**
     * Gets total event count for an event type.
     */
    public double getTotalEventCount(String eventType) {
        Counter successCounter = successCounters.get(eventType);
        Counter failureCounter = failureCounters.get(eventType);
        
        double successCount = successCounter != null ? successCounter.count() : 0.0;
        double failureCount = failureCounter != null ? failureCounter.count() : 0.0;
        
        return successCount + failureCount;
    }
    
    /**
     * Gets average processing time for an event type.
     */
    public double getAverageProcessingTime(String eventType) {
        Timer timer = processingTimers.get(eventType);
        return timer != null ? timer.mean(java.util.concurrent.TimeUnit.MILLISECONDS) : 0.0;
    }
}