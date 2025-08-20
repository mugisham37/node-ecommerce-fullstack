package com.ecommerce.inventory.event.listener;

import com.ecommerce.inventory.event.inventory.*;
import com.ecommerce.inventory.event.order.OrderCreatedEvent;
import com.ecommerce.inventory.event.order.OrderCancelledEvent;
import com.ecommerce.inventory.event.retry.EventRetryService;
import com.ecommerce.inventory.event.retry.RetryPolicy;
import com.ecommerce.inventory.service.CacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

/**
 * Event listener for inventory-related events.
 * Handles cross-domain communication and inventory-specific processing.
 */
@Component
public class InventoryEventListener {
    
    private static final Logger logger = LoggerFactory.getLogger(InventoryEventListener.class);
    
    private final CacheService cacheService;
    private final EventRetryService eventRetryService;
    private final Executor inventoryEventExecutor;
    private final EventProcessingMetrics metrics;
    
    public InventoryEventListener(CacheService cacheService,
                                EventRetryService eventRetryService,
                                @Qualifier("inventoryEventExecutor") Executor inventoryEventExecutor,
                                EventProcessingMetrics metrics) {
        this.cacheService = cacheService;
        this.eventRetryService = eventRetryService;
        this.inventoryEventExecutor = inventoryEventExecutor;
        this.metrics = metrics;
    }
    
    /**
     * Handles stock updated events with cache invalidation.
     */
    @EventListener
    @Async("inventoryEventExecutor")
    public CompletableFuture<Void> handleStockUpdated(StockUpdatedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processStockUpdated, RetryPolicy.criticalEventPolicy());
    }
    
    private void processStockUpdated(StockUpdatedEvent event) {
        logger.info("Processing stock updated event for product {} - Previous: {}, New: {}, Movement: {}", 
                   event.getProductId(), event.getPreviousQuantity(), event.getNewQuantity(), event.getMovementType());
        
        try {
            // Invalidate product and inventory caches
            cacheService.evictInventoryCache(event.getProductId());
            cacheService.evictProductCache();
            
            // Check if stock level is now low (reorder level would be checked by service layer)
            if (event.getNewQuantity() <= 10) { // Default reorder level for demo
                logger.warn("Low stock detected for product {} - Current: {}", 
                           event.getProductId(), event.getNewQuantity());
                // Low stock event will be published by the service layer
            }
            
            metrics.recordEventProcessed(event.getEventType(), true);
            logger.debug("Successfully processed stock updated event for product {}", event.getProductId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed(event.getEventType(), false);
            logger.error("Failed to process stock updated event for product {}", event.getProductId(), e);
            throw e;
        }
    }
    
    /**
     * Handles low stock events with alerting.
     */
    @EventListener
    @Async("inventoryEventExecutor")
    public CompletableFuture<Void> handleLowStock(LowStockEvent event) {
        return eventRetryService.executeWithRetry(event, this::processLowStock, RetryPolicy.criticalEventPolicy());
    }
    
    private void processLowStock(LowStockEvent event) {
        logger.warn("Processing low stock event for product {} - Current: {}, Reorder Level: {}", 
                   event.getProductId(), event.getCurrentStock(), event.getReorderLevel());
        
        try {
            // Generate purchase recommendations
            // Send alerts to managers
            // Update analytics
            
            metrics.recordEventProcessed(event.getEventType(), true);
            logger.info("Successfully processed low stock event for product {}", event.getProductId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed(event.getEventType(), false);
            logger.error("Failed to process low stock event for product {}", event.getProductId(), e);
            throw e;
        }
    }
    
    /**
     * Handles inventory allocation events.
     */
    @EventListener
    @Async("inventoryEventExecutor")
    public CompletableFuture<Void> handleInventoryAllocated(InventoryAllocatedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processInventoryAllocated, RetryPolicy.criticalEventPolicy());
    }
    
    private void processInventoryAllocated(InventoryAllocatedEvent event) {
        logger.info("Processing inventory allocated event for product {} - Quantity: {}, Reference: {}", 
                   event.getProductId(), event.getQuantity(), event.getReferenceId());
        
        try {
            // Update cache with new allocation
            cacheService.evictInventoryCache(event.getProductId());
            
            // Update analytics
            // Check if allocation brings stock below reorder level
            
            metrics.recordEventProcessed(event.getEventType(), true);
            logger.debug("Successfully processed inventory allocated event for product {}", event.getProductId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed(event.getEventType(), false);
            logger.error("Failed to process inventory allocated event for product {}", event.getProductId(), e);
            throw e;
        }
    }
    
    /**
     * Handles inventory release events.
     */
    @EventListener
    @Async("inventoryEventExecutor")
    public CompletableFuture<Void> handleInventoryReleased(InventoryReleasedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processInventoryReleased, RetryPolicy.criticalEventPolicy());
    }
    
    private void processInventoryReleased(InventoryReleasedEvent event) {
        logger.info("Processing inventory released event for product {} - Quantity: {}, Reference: {}", 
                   event.getProductId(), event.getQuantity(), event.getReferenceId());
        
        try {
            // Update cache with released inventory
            cacheService.evictInventoryCache(event.getProductId());
            
            // Update analytics
            
            metrics.recordEventProcessed(event.getEventType(), true);
            logger.debug("Successfully processed inventory released event for product {}", event.getProductId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed(event.getEventType(), false);
            logger.error("Failed to process inventory released event for product {}", event.getProductId(), e);
            throw e;
        }
    }
    
    /**
     * Handles order created events for inventory allocation.
     */
    @EventListener
    @Async("inventoryEventExecutor")
    public CompletableFuture<Void> handleOrderCreated(OrderCreatedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processOrderCreatedForInventory, RetryPolicy.criticalEventPolicy());
    }
    
    private void processOrderCreatedForInventory(OrderCreatedEvent event) {
        logger.info("Processing order created event for inventory allocation - Order: {}", event.getOrderId());
        
        try {
            // Process inventory allocation for order items
            // This would typically call the inventory service to allocate stock
            
            metrics.recordEventProcessed("OrderCreatedForInventory", true);
            logger.debug("Successfully processed order created event for inventory allocation - Order: {}", event.getOrderId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("OrderCreatedForInventory", false);
            logger.error("Failed to process order created event for inventory allocation - Order: {}", event.getOrderId(), e);
            throw e;
        }
    }
    
    /**
     * Handles order cancelled events for inventory release.
     */
    @EventListener
    @Async("inventoryEventExecutor")
    public CompletableFuture<Void> handleOrderCancelled(OrderCancelledEvent event) {
        return eventRetryService.executeWithRetry(event, this::processOrderCancelledForInventory, RetryPolicy.criticalEventPolicy());
    }
    
    private void processOrderCancelledForInventory(OrderCancelledEvent event) {
        logger.info("Processing order cancelled event for inventory release - Order: {}", event.getOrderId());
        
        try {
            // Process inventory release for cancelled order items
            // This would typically call the inventory service to release allocated stock
            
            metrics.recordEventProcessed("OrderCancelledForInventory", true);
            logger.debug("Successfully processed order cancelled event for inventory release - Order: {}", event.getOrderId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("OrderCancelledForInventory", false);
            logger.error("Failed to process order cancelled event for inventory release - Order: {}", event.getOrderId(), e);
            throw e;
        }
    }
}