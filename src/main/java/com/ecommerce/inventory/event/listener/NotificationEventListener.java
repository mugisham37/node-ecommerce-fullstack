package com.ecommerce.inventory.event.listener;

import com.ecommerce.inventory.event.inventory.LowStockEvent;
import com.ecommerce.inventory.event.inventory.StockUpdatedEvent;
import com.ecommerce.inventory.event.order.OrderCreatedEvent;
import com.ecommerce.inventory.event.order.OrderStatusChangedEvent;
import com.ecommerce.inventory.event.order.OrderCancelledEvent;
import com.ecommerce.inventory.event.supplier.SupplierStatusChangedEvent;
import com.ecommerce.inventory.event.retry.EventRetryService;
import com.ecommerce.inventory.event.retry.RetryPolicy;
import com.ecommerce.inventory.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

/**
 * Event listener for notification-related events.
 * Handles event-driven notification and alerting systems.
 */
@Component
public class NotificationEventListener {
    
    private static final Logger logger = LoggerFactory.getLogger(NotificationEventListener.class);
    
    private final NotificationService notificationService;
    private final EventRetryService eventRetryService;
    private final Executor notificationExecutor;
    private final EventProcessingMetrics metrics;
    
    public NotificationEventListener(NotificationService notificationService,
                                   EventRetryService eventRetryService,
                                   @Qualifier("notificationExecutor") Executor notificationExecutor,
                                   EventProcessingMetrics metrics) {
        this.notificationService = notificationService;
        this.eventRetryService = eventRetryService;
        this.notificationExecutor = notificationExecutor;
        this.metrics = metrics;
    }
    
    /**
     * Handle low stock events with notification alerts
     */
    @EventListener
    @Async("notificationExecutor")
    public CompletableFuture<Void> handleLowStockNotification(LowStockEvent event) {
        return eventRetryService.executeWithRetry(event, this::processLowStockNotification, RetryPolicy.notificationEventPolicy());
    }
    
    private void processLowStockNotification(LowStockEvent event) {
        logger.info("Processing low stock notification for product: {}", event.getProductId());
        
        try {
            // Send low stock alert notification
            notificationService.sendLowStockAlert(event).join();
            
            metrics.recordEventProcessed("LowStockNotification", true);
            logger.debug("Successfully processed low stock notification for product: {}", event.getProductId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("LowStockNotification", false);
            logger.error("Failed to process low stock notification for product: {}", event.getProductId(), e);
            throw e;
        }
    }
    
    /**
     * Handle order created events with customer and internal notifications
     */
    @EventListener
    @Async("notificationExecutor")
    public CompletableFuture<Void> handleOrderCreatedNotification(OrderCreatedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processOrderCreatedNotification, RetryPolicy.notificationEventPolicy());
    }
    
    private void processOrderCreatedNotification(OrderCreatedEvent event) {
        logger.info("Processing order created notification for order: {}", event.getOrderNumber());
        
        try {
            // Send order created notification
            notificationService.sendOrderCreatedNotification(event).join();
            
            metrics.recordEventProcessed("OrderCreatedNotification", true);
            logger.debug("Successfully processed order created notification for order: {}", event.getOrderNumber());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("OrderCreatedNotification", false);
            logger.error("Failed to process order created notification for order: {}", event.getOrderNumber(), e);
            throw e;
        }
    }
    
    /**
     * Handle order status change events with customer notifications
     */
    @EventListener
    @Async("notificationExecutor")
    public CompletableFuture<Void> handleOrderStatusChangeNotification(OrderStatusChangedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processOrderStatusChangeNotification, RetryPolicy.notificationEventPolicy());
    }
    
    private void processOrderStatusChangeNotification(OrderStatusChangedEvent event) {
        logger.info("Processing order status change notification for order: {} - {} to {}", 
                   event.getOrderNumber(), event.getPreviousStatus(), event.getNewStatus());
        
        try {
            // Send order status change notification
            notificationService.sendOrderStatusChangeNotification(event).join();
            
            metrics.recordEventProcessed("OrderStatusChangeNotification", true);
            logger.debug("Successfully processed order status change notification for order: {}", event.getOrderNumber());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("OrderStatusChangeNotification", false);
            logger.error("Failed to process order status change notification for order: {}", event.getOrderNumber(), e);
            throw e;
        }
    }
    
    /**
     * Handle order cancelled events with notifications
     */
    @EventListener
    @Async("notificationExecutor")
    public CompletableFuture<Void> handleOrderCancelledNotification(OrderCancelledEvent event) {
        return eventRetryService.executeWithRetry(event, this::processOrderCancelledNotification, RetryPolicy.notificationEventPolicy());
    }
    
    private void processOrderCancelledNotification(OrderCancelledEvent event) {
        logger.info("Processing order cancelled notification for order: {}", event.getOrderId());
        
        try {
            // Send order cancellation notification
            String message = String.format("Order %s has been cancelled. Previous status: %s. Reason: %s", 
                event.getOrderNumber(), event.getPreviousStatus(), event.getReason());
            
            notificationService.sendSystemAlert("Order Cancelled", message, "MEDIUM").join();
            
            metrics.recordEventProcessed("OrderCancelledNotification", true);
            logger.debug("Successfully processed order cancelled notification for order: {}", event.getOrderId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("OrderCancelledNotification", false);
            logger.error("Failed to process order cancelled notification for order: {}", event.getOrderId(), e);
            throw e;
        }
    }
    
    /**
     * Handle significant stock updates with adjustment alerts
     */
    @EventListener
    @Async("notificationExecutor")
    public CompletableFuture<Void> handleStockUpdateNotification(StockUpdatedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processStockUpdateNotification, RetryPolicy.notificationEventPolicy());
    }
    
    private void processStockUpdateNotification(StockUpdatedEvent event) {
        logger.debug("Processing stock update notification for product: {}", event.getProductId());
        
        try {
            // Only send notifications for significant stock changes
            if (isSignificantStockChange(event)) {
                notificationService.sendInventoryAdjustmentAlert(
                    event.getProductId(),
                    event.getProductSku(),
                    event.getPreviousQuantity(),
                    event.getNewQuantity(),
                    event.getReason(),
                    event.getUserId()
                ).join();
                
                logger.info("Sent inventory adjustment alert for significant stock change - Product: {}", event.getProductId());
            }
            
            metrics.recordEventProcessed("StockUpdateNotification", true);
            logger.debug("Successfully processed stock update notification for product: {}", event.getProductId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("StockUpdateNotification", false);
            logger.error("Failed to process stock update notification for product: {}", event.getProductId(), e);
            throw e;
        }
    }
    
    /**
     * Handle supplier status change events with procurement notifications
     */
    @EventListener
    @Async("notificationExecutor")
    public CompletableFuture<Void> handleSupplierStatusChangeNotification(SupplierStatusChangedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processSupplierStatusChangeNotification, RetryPolicy.notificationEventPolicy());
    }
    
    private void processSupplierStatusChangeNotification(SupplierStatusChangedEvent event) {
        logger.info("Processing supplier status change notification for supplier: {}", event.getSupplierId());
        
        try {
            // Send supplier status change alert
            String severity = isSupplierDeactivation(event) ? "HIGH" : "MEDIUM";
            String message = String.format("Supplier %d status changed from %s to %s", 
                event.getSupplierId(), event.getPreviousStatus(), event.getNewStatus());
            
            notificationService.sendSystemAlert("Supplier Status Change", message, severity).join();
            
            metrics.recordEventProcessed("SupplierStatusChangeNotification", true);
            logger.debug("Successfully processed supplier status change notification for supplier: {}", event.getSupplierId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("SupplierStatusChangeNotification", false);
            logger.error("Failed to process supplier status change notification for supplier: {}", event.getSupplierId(), e);
            throw e;
        }
    }
    
    // Private helper methods
    
    private boolean isSignificantStockChange(StockUpdatedEvent event) {
        int change = Math.abs(event.getQuantityChange());
        return change > 100 || (event.getPreviousQuantity() > 0 && change > event.getPreviousQuantity() * 0.5);
    }
    
    private boolean isSupplierDeactivation(SupplierStatusChangedEvent event) {
        return "INACTIVE".equals(event.getNewStatus().toString()) || 
               "SUSPENDED".equals(event.getNewStatus().toString());
    }
}