package com.ecommerce.inventory.event.retry;

import com.ecommerce.inventory.event.BaseEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for EventRetryService.
 */
@ExtendWith(MockitoExtension.class)
class EventRetryServiceTest {
    
    @Mock
    private Executor executor;
    
    @Mock
    private EventRetryRepository retryRepository;
    
    @Mock
    private DeadLetterQueueService deadLetterQueueService;
    
    private EventRetryService eventRetryService;
    
    @BeforeEach
    void setUp() {
        // Use direct execution for testing
        doAnswer(invocation -> {
            Runnable runnable = invocation.getArgument(0);
            runnable.run();
            return null;
        }).when(executor).execute(any(Runnable.class));
        
        eventRetryService = new EventRetryService(executor, retryRepository, deadLetterQueueService);
    }
    
    @Test
    void testSuccessfulEventProcessing() {
        // Given
        TestEvent event = new TestEvent();
        AtomicInteger callCount = new AtomicInteger(0);
        Consumer<BaseEvent> processor = e -> callCount.incrementAndGet();
        
        // When
        CompletableFuture<Void> future = eventRetryService.executeWithRetry(event, processor);
        
        // Then
        assertDoesNotThrow(() -> future.get());
        assertEquals(1, callCount.get());
        verify(retryRepository).recordRetryAttempt(eq(event.getEventId()), eq(1), any());
        verify(retryRepository).removeRetryRecord(event.getEventId());
    }
    
    @Test
    void testEventProcessingWithRetries() {
        // Given
        TestEvent event = new TestEvent();
        AtomicInteger callCount = new AtomicInteger(0);
        Consumer<BaseEvent> processor = e -> {
            callCount.incrementAndGet();
            if (callCount.get() < 3) {
                throw new RuntimeException("Simulated failure");
            }
        };
        
        // When
        CompletableFuture<Void> future = eventRetryService.executeWithRetry(event, processor);
        
        // Then
        assertDoesNotThrow(() -> future.get());
        assertEquals(3, callCount.get());
        verify(retryRepository, times(3)).recordRetryAttempt(eq(event.getEventId()), anyInt(), any());
        verify(retryRepository, times(2)).recordRetryFailure(eq(event.getEventId()), anyInt(), anyString(), any());
        verify(retryRepository).removeRetryRecord(event.getEventId());
    }
    
    @Test
    void testEventProcessingMaxRetriesExceeded() {
        // Given
        TestEvent event = new TestEvent();
        Consumer<BaseEvent> processor = e -> {
            throw new RuntimeException("Always fails");
        };
        
        RetryPolicy policy = RetryPolicy.builder()
                .maxAttempts(2)
                .initialDelayMs(10)
                .build();
        
        // When
        CompletableFuture<Void> future = eventRetryService.executeWithRetry(event, processor, policy);
        
        // Then
        assertDoesNotThrow(() -> future.get());
        verify(retryRepository, times(2)).recordRetryAttempt(eq(event.getEventId()), anyInt(), any());
        verify(retryRepository, times(2)).recordRetryFailure(eq(event.getEventId()), anyInt(), anyString(), any());
        verify(deadLetterQueueService).sendToDeadLetterQueue(eq(event), any(RuntimeException.class), eq(2));
        verify(retryRepository).markAsFailed(eq(event.getEventId()), anyString(), any());
    }
    
    @Test
    void testRetryPolicyBuilder() {
        // When
        RetryPolicy policy = RetryPolicy.builder()
                .maxAttempts(5)
                .initialDelayMs(500)
                .maxDelayMs(10000)
                .backoffMultiplier(1.5)
                .jitterEnabled(false)
                .build();
        
        // Then
        assertEquals(5, policy.getMaxAttempts());
        assertEquals(500, policy.getInitialDelayMs());
        assertEquals(10000, policy.getMaxDelayMs());
        assertEquals(1.5, policy.getBackoffMultiplier());
        assertFalse(policy.isJitterEnabled());
    }
    
    @Test
    void testRetryPolicyValidation() {
        // Test invalid max attempts
        assertThrows(IllegalArgumentException.class, () ->
                RetryPolicy.builder().maxAttempts(0).build());
        
        // Test invalid initial delay
        assertThrows(IllegalArgumentException.class, () ->
                RetryPolicy.builder().initialDelayMs(-1).build());
        
        // Test invalid backoff multiplier
        assertThrows(IllegalArgumentException.class, () ->
                RetryPolicy.builder().backoffMultiplier(0.5).build());
    }
    
    @Test
    void testRetryStatistics() {
        // When
        RetryStatistics stats = eventRetryService.getRetryStatistics();
        
        // Then
        assertNotNull(stats);
        verify(retryRepository).getRetryStatistics();
    }
    
    private static class TestEvent extends BaseEvent {
        public TestEvent() {
            super("test", "aggregate123", "user123");
        }
    }
}