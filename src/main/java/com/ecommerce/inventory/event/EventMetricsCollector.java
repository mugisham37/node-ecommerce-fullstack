package com.ecommerce.inventory.event;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Collects metrics for event publishing and processing.
 * Provides insights into event system performance and reliability.
 */
@Component
public class EventMetricsCollector {
    
    private final MeterRegistry meterRegistry;
    private final ConcurrentMap<String, Counter> publishedCounters = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Counter> failureCounters = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Timer> processingTimers = new ConcurrentHashMap<>();
    
    public EventMetricsCollector(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    /**
     * Records that an event was published.
     */
    public void recordEventPublished(String eventType, String eventVersion) {
        String key = eventType + "_" + eventVersion;
        publishedCounters.computeIfAbsent(key, k -> 
            Counter.builder("events.published")
                .tag("event.type", eventType)
                .tag("event.version", eventVersion)
                .description("Number of events published")
                .register(meterRegistry)
        ).increment();
    }
    
    /**
     * Records that event publishing failed.
     */
    public void recordEventPublishingFailure(String eventType, String errorType) {
        String key = eventType + "_" + errorType;
        failureCounters.computeIfAbsent(key, k -> 
            Counter.builder("events.publishing.failures")
                .tag("event.type", eventType)
                .tag("error.type", errorType)
                .description("Number of event publishing failures")
                .register(meterRegistry)
        ).increment();
    }
    
    /**
     * Records event processing time.
     */
    public Timer.Sample startEventProcessingTimer(String eventType) {
        Timer timer = processingTimers.computeIfAbsent(eventType, k -> 
            Timer.builder("events.processing.duration")
                .tag("event.type", eventType)
                .description("Event processing duration")
                .register(meterRegistry)
        );
        return Timer.start(meterRegistry);
    }
    
    /**
     * Stops the event processing timer.
     */
    public void stopEventProcessingTimer(Timer.Sample sample, String eventType) {
        Timer timer = processingTimers.get(eventType);
        if (timer != null && sample != null) {
            sample.stop(timer);
        }
    }
    
    /**
     * Records that event processing failed.
     */
    public void recordEventProcessingFailure(String eventType, String errorType) {
        String key = eventType + "_processing_" + errorType;
        failureCounters.computeIfAbsent(key, k -> 
            Counter.builder("events.processing.failures")
                .tag("event.type", eventType)
                .tag("error.type", errorType)
                .description("Number of event processing failures")
                .register(meterRegistry)
        ).increment();
    }
}