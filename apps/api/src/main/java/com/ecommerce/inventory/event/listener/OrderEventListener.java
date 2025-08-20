package com.ecommerce.inventory.event.listener;

import com.ecommerce.inventory.event.inventory.LowStockEvent;
import com.ecommerce.inventory.event.inventory.StockUpdatedEvent;
import com.ecommerce.inventory.event.order.*;
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
 * Event listener for order-related events.
 * Handles cross-domain communication and order-specific processing.
 */
@Component
public class OrderEventListener {
    
    private static final Logger logger = LoggerFactory.getLogger(OrderEventListener.class);
    
    private final CacheService cacheService;
    private final EventRetryService eventRetryService;
    private final Executor orderEventExecutor;
    private final EventProcessingMetrics metrics;
    
    public OrderEventListener(CacheService cacheService,
                            EventRetryService eventRetryService,
                            @Qualifier("orderEventExecutor") Executor orderEventExecutor,
                            EventProcessingMetrics metrics) {
        this.cacheService = cacheService;
        this.eventRetryService = eventRetryService;
        this.orderEventExecutor = orderEventExecutor;
        this.metrics = metrics;
    }
    
    /**
     * Handles order created events.
     */
    @EventListener
    @Async("orderEventExecutor")
    public CompletableFuture<Void> handleOrderCreated(OrderCreatedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processOrderCreated, RetryPolicy.criticalEventPolicy());
    }
    
    private void processOrderCreated(OrderCreatedEvent event) {
        logger.info("Processing order created event - Order: {}, Customer: {}, Items: {}", 
                   event.getOrderId(), event.getCustomerEmail(), event.getOrderItems().size());
        
        try {
            // Send order confirmation email
            // Update customer analytics
            // Trigger fulfillment workflow
            // Update order cache
            
            metrics.recordEventProcessed(event.getEventType(), true);
            logger.debug("Successfully processed order created event - Order: {}", event.getOrderId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed(event.getEventType(), false);
            logger.error("Failed to process order created event - Order: {}", event.getOrderId(), e);
            throw e;
        }
    }
    
    /**
     * Handles order status changed events.
     */
    @EventListener
    @Async("orderEventExecutor")
    public CompletableFuture<Void> handleOrderStatusChanged(OrderStatusChangedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processOrderStatusChanged, RetryPolicy.defaultPolicy());
    }
    
    private void processOrderStatusChanged(OrderStatusChangedEvent event) {
        logger.info("Processing order status changed event - Order: {}, From: {}, To: {}", 
                   event.getOrderId(), event.getPreviousStatus(), event.getNewStatus());
        
        try {
            // Send status update notification
            // Update order cache
            // Trigger status-specific workflows
            
            switch (event.getNewStatus()) {
                case CONFIRMED -> handleOrderConfirmed(event);
                case SHIPPED -> handleOrderShipped(event);
                case DELIVERED -> handleOrderDelivered(event);
                case CANCELLED -> handleOrderCancelled(event);
                default -> logger.debug("No specific handling for status: {}", event.getNewStatus());
            }
            
            metrics.recordEventProcessed(event.getEventType(), true);
            logger.debug("Successfully processed order status changed event - Order: {}", event.getOrderId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed(event.getEventType(), false);
            logger.error("Failed to process order status changed event - Order: {}", event.getOrderId(), e);
            throw e;
        }
    }
    
    /**
     * Handles order cancelled events.
     */
    @EventListener
    @Async("orderEventExecutor")
    public CompletableFuture<Void> handleOrderCancelled(OrderCancelledEvent event) {
        return eventRetryService.executeWithRetry(event, this::processOrderCancelled, RetryPolicy.criticalEventPolicy());
    }
    
    private void processOrderCancelled(OrderCancelledEvent event) {
        logger.info("Processing order cancelled event - Order: {}, Reason: {}", 
                   event.getOrderId(), event.getCancellationReason());
        
        try {
            // Send cancellation notification
            // Process refund if payment was made
            // Update analytics
            // Clear order cache
            
            metrics.recordEventProcessed(event.getEventType(), true);
            logger.debug("Successfully processed order cancelled event - Order: {}", event.getOrderId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed(event.getEventType(), false);
            logger.error("Failed to process order cancelled event - Order: {}", event.getOrderId(), e);
            throw e;
        }
    }
    
    /**
     * Handles stock updated events that might affect orders.
     */
    @EventListener
    @Async("orderEventExecutor")
    public CompletableFuture<Void> handleStockUpdatedForOrders(StockUpdatedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processStockUpdatedForOrders, RetryPolicy.defaultPolicy());
    }
    
    private void processStockUpdatedForOrders(StockUpdatedEvent event) {
        logger.debug("Processing stock updated event for order implications - Product: {}, New Quantity: {}", 
                    event.getProductId(), event.getNewQuantity());
        
        try {
            // Check if any pending orders are affected by stock changes
            // Update order fulfillment status if needed
            // Notify customers of potential delays
            
            metrics.recordEventProcessed("StockUpdatedForOrders", true);
            logger.debug("Successfully processed stock updated event for orders - Product: {}", event.getProductId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("StockUpdatedForOrders", false);
            logger.error("Failed to process stock updated event for orders - Product: {}", event.getProductId(), e);
            throw e;
        }
    }
    
    /**
     * Handles low stock events that might affect order fulfillment.
     */
    @EventListener
    @Async("orderEventExecutor")
    public CompletableFuture<Void> handleLowStockForOrders(LowStockEvent event) {
        return eventRetryService.executeWithRetry(event, this::processLowStockForOrders, RetryPolicy.defaultPolicy());
    }
    
    private void processLowStockForOrders(LowStockEvent event) {
        logger.info("Processing low stock event for order implications - Product: {}, Current Stock: {}", 
                   event.getProductId(), event.getCurrentStock());
        
        try {
            // Check pending orders for this product
            // Prioritize order fulfillment
            // Notify customers of potential delays
            
            metrics.recordEventProcessed("LowStockForOrders", true);
            logger.debug("Successfully processed low stock event for orders - Product: {}", event.getProductId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("LowStockForOrders", false);
            logger.error("Failed to process low stock event for orders - Product: {}", event.getProductId(), e);
            throw e;
        }
    }
    
    private void handleOrderConfirmed(OrderStatusChangedEvent event) {
        logger.info("Order {} confirmed - triggering fulfillment workflow", event.getOrderId());
        // Trigger fulfillment workflow
        // Send confirmation email
    }
    
    private void handleOrderShipped(OrderStatusChangedEvent event) {
        logger.info("Order {} shipped - sending tracking information", event.getOrderId());
        // Send shipping notification with tracking
        // Update delivery estimates
    }
    
    private void handleOrderDelivered(OrderStatusChangedEvent event) {
        logger.info("Order {} delivered - requesting feedback", event.getOrderId());
        // Send delivery confirmation
        // Request customer feedback
        // Update customer satisfaction metrics
    }
    
    private void handleOrderCancelled(OrderStatusChangedEvent event) {
        logger.info("Order {} cancelled - processing refund", event.getOrderId());
        // Process refund
        // Send cancellation confirmation
    }
}