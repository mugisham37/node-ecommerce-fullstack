package com.ecommerce.inventory.event.listener;

import com.ecommerce.inventory.event.inventory.StockUpdatedEvent;
import com.ecommerce.inventory.event.order.OrderCreatedEvent;
import com.ecommerce.inventory.event.retry.EventRetryService;
import com.ecommerce.inventory.event.retry.RetryStatistics;
import com.ecommerce.inventory.entity.StockMovementType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for event listeners and async processing.
 */
@SpringBootTest
@ActiveProfiles("test")
class EventListenerIntegrationTest {
    
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    
    @Autowired
    private EventRetryService eventRetryService;
    
    @Autowired
    private EventProcessingMetrics metrics;
    
    @Test
    void testStockUpdatedEventProcessing() throws InterruptedException {
        // Given
        StockUpdatedEvent event = new StockUpdatedEvent(
                this, 1L, "SKU123", "MAIN", 100, 80, 
                StockMovementType.SALE, "Sale transaction", "ORDER123", "ORDER", "user123"
        );
        
        // When
        eventPublisher.publishEvent(event);
        
        // Wait for async processing
        TimeUnit.SECONDS.sleep(2);
        
        // Then
        double totalCount = metrics.getTotalEventCount("StockUpdatedEvent");
        assertTrue(totalCount > 0, "Event should have been processed");
        
        double successRate = metrics.getSuccessRate("StockUpdatedEvent");
        assertTrue(successRate > 0, "Event should have been processed successfully");
    }
    
    @Test
    void testOrderCreatedEventProcessing() throws InterruptedException {
        // Given
        OrderCreatedEvent event = new OrderCreatedEvent(
                this, 1L, "ORD123", "John Doe", "customer@example.com", 
                BigDecimal.valueOf(100.00), List.of(), "123 Main St", "123 Main St",
                BigDecimal.valueOf(90.00), BigDecimal.valueOf(10.00), BigDecimal.ZERO,
                java.util.Map.of(), "user123"
        );
        
        // When
        eventPublisher.publishEvent(event);
        
        // Wait for async processing
        TimeUnit.SECONDS.sleep(2);
        
        // Then
        double totalCount = metrics.getTotalEventCount("OrderCreatedEvent");
        assertTrue(totalCount > 0, "Event should have been processed");
    }
    
    @Test
    void testRetryServiceStatistics() {
        // When
        RetryStatistics stats = eventRetryService.getRetryStatistics();
        
        // Then
        assertNotNull(stats);
        assertTrue(stats.getTotalRetryAttempts() >= 0);
        assertTrue(stats.getTotalFailedEvents() >= 0);
        assertTrue(stats.getTotalSuccessfulRetries() >= 0);
        assertTrue(stats.getActiveRetryRecords() >= 0);
    }
    
    @Test
    void testEventProcessingMetrics() {
        // Given
        String eventType = "TestEvent";
        
        // When
        metrics.recordEventProcessed(eventType, true);
        metrics.recordEventProcessed(eventType, false);
        
        // Then
        double totalCount = metrics.getTotalEventCount(eventType);
        assertEquals(2.0, totalCount);
        
        double successRate = metrics.getSuccessRate(eventType);
        assertEquals(0.5, successRate, 0.01);
    }
}