package com.ecommerce.inventory.event.listener;

import com.ecommerce.inventory.event.inventory.LowStockEvent;
import com.ecommerce.inventory.event.retry.EventRetryService;
import com.ecommerce.inventory.event.retry.RetryPolicy;
import com.ecommerce.inventory.event.supplier.*;
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
 * Event listener for supplier-related events.
 * Handles cross-domain communication and supplier-specific processing.
 */
@Component
public class SupplierEventListener {
    
    private static final Logger logger = LoggerFactory.getLogger(SupplierEventListener.class);
    
    private final CacheService cacheService;
    private final EventRetryService eventRetryService;
    private final Executor eventProcessingExecutor;
    private final EventProcessingMetrics metrics;
    
    public SupplierEventListener(CacheService cacheService,
                               EventRetryService eventRetryService,
                               @Qualifier("eventProcessingExecutor") Executor eventProcessingExecutor,
                               EventProcessingMetrics metrics) {
        this.cacheService = cacheService;
        this.eventRetryService = eventRetryService;
        this.eventProcessingExecutor = eventProcessingExecutor;
        this.metrics = metrics;
    }
    
    /**
     * Handles supplier created events.
     */
    @EventListener
    @Async("eventProcessingExecutor")
    public CompletableFuture<Void> handleSupplierCreated(SupplierCreatedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processSupplierCreated, RetryPolicy.defaultPolicy());
    }
    
    private void processSupplierCreated(SupplierCreatedEvent event) {
        logger.info("Processing supplier created event - Supplier: {}, Name: {}", 
                   event.getSupplierId(), event.getSupplierName());
        
        try {
            // Send welcome email to supplier
            // Set up supplier onboarding workflow
            // Update supplier analytics
            // Clear supplier cache
            cacheService.evictProductCache(); // Products cache might include supplier info
            
            metrics.recordEventProcessed(event.getEventType(), true);
            logger.debug("Successfully processed supplier created event - Supplier: {}", event.getSupplierId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed(event.getEventType(), false);
            logger.error("Failed to process supplier created event - Supplier: {}", event.getSupplierId(), e);
            throw e;
        }
    }
    
    /**
     * Handles supplier status changed events.
     */
    @EventListener
    @Async("eventProcessingExecutor")
    public CompletableFuture<Void> handleSupplierStatusChanged(SupplierStatusChangedEvent event) {
        return eventRetryService.executeWithRetry(event, this::processSupplierStatusChanged, RetryPolicy.defaultPolicy());
    }
    
    private void processSupplierStatusChanged(SupplierStatusChangedEvent event) {
        logger.info("Processing supplier status changed event - Supplier: {}, From: {}, To: {}", 
                   event.getSupplierId(), event.getPreviousStatus(), event.getNewStatus());
        
        try {
            // Handle status-specific logic
            switch (event.getNewStatus()) {
                case ACTIVE -> handleSupplierActivated(event);
                case INACTIVE -> handleSupplierDeactivated(event);
                case SUSPENDED -> handleSupplierSuspended(event);
                default -> logger.debug("No specific handling for status: {}", event.getNewStatus());
            }
            
            // Clear related caches
            cacheService.evictProductCache(); // Products might be affected by supplier status
            
            metrics.recordEventProcessed(event.getEventType(), true);
            logger.debug("Successfully processed supplier status changed event - Supplier: {}", event.getSupplierId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed(event.getEventType(), false);
            logger.error("Failed to process supplier status changed event - Supplier: {}", event.getSupplierId(), e);
            throw e;
        }
    }
    
    /**
     * Handles low stock events for supplier notifications.
     */
    @EventListener
    @Async("eventProcessingExecutor")
    public CompletableFuture<Void> handleLowStockForSupplier(LowStockEvent event) {
        return eventRetryService.executeWithRetry(event, this::processLowStockForSupplier, RetryPolicy.defaultPolicy());
    }
    
    private void processLowStockForSupplier(LowStockEvent event) {
        logger.info("Processing low stock event for supplier notification - Product: {}, Current Stock: {}", 
                   event.getProductId(), event.getCurrentStock());
        
        try {
            // Generate purchase order recommendations
            // Notify relevant suppliers
            // Update supplier performance metrics
            // Schedule automatic reordering if configured
            
            metrics.recordEventProcessed("LowStockForSupplier", true);
            logger.debug("Successfully processed low stock event for supplier - Product: {}", event.getProductId());
            
        } catch (Exception e) {
            metrics.recordEventProcessed("LowStockForSupplier", false);
            logger.error("Failed to process low stock event for supplier - Product: {}", event.getProductId(), e);
            throw e;
        }
    }
    
    private void handleSupplierActivated(SupplierStatusChangedEvent event) {
        logger.info("Supplier {} activated - enabling product ordering", event.getSupplierId());
        // Enable products from this supplier
        // Send activation notification
        // Update supplier performance tracking
    }
    
    private void handleSupplierDeactivated(SupplierStatusChangedEvent event) {
        logger.info("Supplier {} deactivated - disabling new orders", event.getSupplierId());
        // Disable new orders from this supplier
        // Complete existing orders
        // Send deactivation notification
        // Find alternative suppliers for products
    }
    
    private void handleSupplierSuspended(SupplierStatusChangedEvent event) {
        logger.warn("Supplier {} suspended - immediate action required", event.getSupplierId());
        // Suspend all orders from this supplier
        // Alert procurement team
        // Find alternative suppliers urgently
        // Update risk management metrics
    }
}