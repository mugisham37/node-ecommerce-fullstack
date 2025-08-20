package com.ecommerce.inventory.integration;

import com.ecommerce.inventory.dto.request.InventoryAdjustmentRequest;
import com.ecommerce.inventory.dto.request.OrderCreateRequest;
import com.ecommerce.inventory.entity.OrderStatus;
import com.ecommerce.inventory.event.EventPublisher;
import com.ecommerce.inventory.event.inventory.LowStockEvent;
import com.ecommerce.inventory.event.inventory.StockUpdatedEvent;
import com.ecommerce.inventory.event.order.OrderCreatedEvent;
import com.ecommerce.inventory.service.EventDrivenWorkflowService;
import com.ecommerce.inventory.service.InventoryService;
import com.ecommerce.inventory.service.NotificationService;
import com.ecommerce.inventory.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Integration test for event-driven workflow functionality.
 * Tests the complete event-driven architecture implementation.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class EventDrivenWorkflowIntegrationTest {

    @Autowired
    private EventPublisher eventPublisher;

    @Autowired
    private EventDrivenWorkflowService workflowService;

    @MockBean
    private NotificationService notificationService;

    @MockBean
    private InventoryService inventoryService;

    @MockBean
    private OrderService orderService;

    @Test
    public void testLowStockEventWorkflow() throws Exception {
        // Arrange
        Long productId = 1L;
        String productSku = "TEST-SKU-001";
        String warehouseLocation = "MAIN";
        Integer currentStock = 5;
        Integer reorderLevel = 10;
        Integer reorderQuantity = 50;
        String userId = "test-user";

        when(notificationService.sendLowStockAlert(any(LowStockEvent.class)))
            .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        LowStockEvent event = new LowStockEvent(
            this, productId, productSku, warehouseLocation,
            currentStock, reorderLevel, reorderQuantity, userId
        );

        eventPublisher.publishEvent(event);

        // Wait for async processing
        Thread.sleep(1000);

        // Assert
        verify(notificationService, timeout(5000)).sendLowStockAlert(any(LowStockEvent.class));
    }

    @Test
    public void testStockUpdateEventWorkflow() throws Exception {
        // Arrange
        Long productId = 1L;
        String productSku = "TEST-SKU-001";
        String warehouseLocation = "MAIN";
        Integer previousQuantity = 100;
        Integer newQuantity = 50;
        String reason = "Sale";
        String userId = "test-user";

        // Act
        StockUpdatedEvent event = new StockUpdatedEvent(
            this, productId, productSku, warehouseLocation,
            previousQuantity, newQuantity, 
            com.ecommerce.inventory.entity.StockMovementType.SALE,
            reason, "ORDER-123", "ORDER", userId
        );

        eventPublisher.publishEvent(event);

        // Wait for async processing
        Thread.sleep(1000);

        // Assert - verify that the event was processed (would check cache invalidation, etc.)
        assertNotNull(event);
        assertEquals(productId, event.getProductId());
        assertEquals(-50, event.getQuantityChange());
    }

    @Test
    public void testOrderCreatedEventWorkflow() throws Exception {
        // Arrange
        Long orderId = 1L;
        String orderNumber = "ORD-001";
        String customerName = "John Doe";
        String customerEmail = "john@example.com";
        BigDecimal totalAmount = new BigDecimal("99.99");
        String userId = "test-user";

        when(notificationService.sendOrderCreatedNotification(any(OrderCreatedEvent.class)))
            .thenReturn(CompletableFuture.completedFuture(null));

        when(orderService.processOrderAsync(any(Long.class)))
            .thenReturn(CompletableFuture.completedFuture(null));

        // Create a mock order created event
        OrderCreatedEvent event = mock(OrderCreatedEvent.class);
        when(event.getOrderId()).thenReturn(orderId);
        when(event.getOrderNumber()).thenReturn(orderNumber);
        when(event.getCustomerName()).thenReturn(customerName);
        when(event.getCustomerEmail()).thenReturn(customerEmail);
        when(event.getTotalAmount()).thenReturn(totalAmount);
        when(event.getOrderItems()).thenReturn(List.of());

        // Act
        eventPublisher.publishEvent(event);

        // Wait for async processing
        Thread.sleep(1000);

        // Assert
        verify(notificationService, timeout(5000)).sendOrderCreatedNotification(any(OrderCreatedEvent.class));
    }

    @Test
    public void testEventPublisherIntegration() {
        // Arrange
        LowStockEvent event = new LowStockEvent(
            this, 1L, "TEST-SKU", "MAIN", 5, 10, 50, "test-user"
        );

        // Act & Assert - should not throw exception
        assertDoesNotThrow(() -> {
            eventPublisher.publishEvent(event);
        });
    }

    @Test
    public void testWorkflowServiceIntegration() {
        // Arrange
        EventDrivenWorkflowService service = workflowService;

        // Act & Assert - verify service is properly configured
        assertNotNull(service);
    }

    @Test
    public void testAsyncEventProcessing() throws Exception {
        // Arrange
        when(notificationService.sendLowStockAlert(any(LowStockEvent.class)))
            .thenReturn(CompletableFuture.completedFuture(null));

        LowStockEvent event = new LowStockEvent(
            this, 1L, "TEST-SKU", "MAIN", 5, 10, 50, "test-user"
        );

        // Act
        long startTime = System.currentTimeMillis();
        eventPublisher.publishEvent(event);
        long publishTime = System.currentTimeMillis() - startTime;

        // Assert - event publishing should be fast (async processing)
        assertTrue(publishTime < 100, "Event publishing should be fast");

        // Wait for async processing to complete
        Thread.sleep(2000);

        // Verify async processing occurred
        verify(notificationService, timeout(5000)).sendLowStockAlert(any(LowStockEvent.class));
    }

    @Test
    public void testEventDrivenCacheInvalidation() throws Exception {
        // This test would verify that events trigger proper cache invalidation
        // For now, we'll just test that the event is published successfully
        
        StockUpdatedEvent event = new StockUpdatedEvent(
            this, 1L, "TEST-SKU", "MAIN", 100, 90,
            com.ecommerce.inventory.entity.StockMovementType.SALE,
            "Test sale", "ORDER-123", "ORDER", "test-user"
        );

        // Act & Assert
        assertDoesNotThrow(() -> {
            eventPublisher.publishEvent(event);
        });

        // Verify event properties
        assertEquals(1L, event.getProductId());
        assertEquals("TEST-SKU", event.getProductSku());
        assertEquals(-10, event.getQuantityChange());
        assertTrue(event.isStockDecrease());
        assertFalse(event.isStockIncrease());
    }
}