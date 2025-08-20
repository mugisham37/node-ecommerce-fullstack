package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.response.LowStockAlert;
import com.ecommerce.inventory.event.EventPublisher;
import com.ecommerce.inventory.event.inventory.LowStockEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Scheduled task for processing low stock alerts with configurable intervals.
 * Monitors inventory levels and sends alerts during business hours.
 */
@Component
public class LowStockAlertTask extends BaseScheduledTask {
    
    private static final Logger logger = LoggerFactory.getLogger(LowStockAlertTask.class);
    
    @Autowired
    private InventoryService inventoryService;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private EventPublisher eventPublisher;
    
    @Value("${inventory.alerts.business-hours.start:08:00}")
    private String businessHoursStart;
    
    @Value("${inventory.alerts.business-hours.end:18:00}")
    private String businessHoursEnd;
    
    @Value("${inventory.alerts.critical-threshold:5}")
    private int criticalStockThreshold;
    
    @Value("${inventory.alerts.max-alerts-per-hour:10}")
    private int maxAlertsPerHour;
    
    // Track recent alerts to prevent spam
    private final Map<Long, LocalDateTime> recentAlerts = new ConcurrentHashMap<>();
    private final Map<Long, Integer> hourlyAlertCounts = new ConcurrentHashMap<>();
    
    /**
     * Process low stock alerts every 5 minutes during business hours.
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void processLowStockAlerts() {
        if (isBusinessHours()) {
            executeTask();
        } else {
            logger.debug("Skipping low stock alert processing - outside business hours");
        }
    }
    
    /**
     * Reset hourly alert counters every hour.
     */
    @Scheduled(cron = "0 0 * * * *") // Every hour
    public void resetHourlyCounters() {
        hourlyAlertCounts.clear();
        logger.debug("Reset hourly alert counters");
    }
    
    /**
     * Clean up old alert tracking data daily.
     */
    @Scheduled(cron = "0 0 2 * * *") // Daily at 2 AM
    public void cleanupAlertTracking() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
        
        recentAlerts.entrySet().removeIf(entry -> entry.getValue().isBefore(cutoff));
        
        logger.info("Cleaned up old alert tracking data. Remaining entries: {}", recentAlerts.size());
    }
    
    @Override
    protected String getTaskName() {
        return "low-stock-alert-processing";
    }
    
    @Override
    protected String getTaskDescription() {
        return "Monitor inventory levels and process low stock alerts during business hours";
    }
    
    @Override
    protected void doExecute() {
        logger.debug("Processing low stock alerts");
        
        try {
            List<LowStockAlert> lowStockAlerts = inventoryService.checkLowStockLevels();
            
            if (lowStockAlerts.isEmpty()) {
                logger.debug("No low stock alerts found");
                return;
            }
            
            // Filter and process alerts
            List<LowStockAlert> alertsToProcess = filterAlertsForProcessing(lowStockAlerts);
            
            if (alertsToProcess.isEmpty()) {
                logger.debug("No new alerts to process after filtering");
                return;
            }
            
            // Group alerts by severity
            Map<String, List<LowStockAlert>> alertsBySeverity = alertsToProcess.stream()
                    .collect(Collectors.groupingBy(alert -> 
                            alert.getSeverity() != null ? alert.getSeverity() : "LOW"));
            
            // Process critical and out-of-stock alerts immediately
            processCriticalAlerts(alertsBySeverity.getOrDefault("CRITICAL", List.of()));
            processCriticalAlerts(alertsBySeverity.getOrDefault("OUT_OF_STOCK", List.of()));
            
            // Process regular low stock alerts
            processRegularAlerts(alertsBySeverity.getOrDefault("LOW", List.of()));
            
            // Publish events for all alerts
            publishLowStockEvents(alertsToProcess);
            
            logger.info("Processed {} low stock alerts", alertsToProcess.size());
            
        } catch (Exception e) {
            logger.error("Failed to process low stock alerts", e);
            throw e;
        }
    }
    
    /**
     * Filter alerts to prevent spam and respect rate limits.
     */
    private List<LowStockAlert> filterAlertsForProcessing(List<LowStockAlert> allAlerts) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneHourAgo = now.minusHours(1);
        
        return allAlerts.stream()
                .filter(alert -> {
                    Long productId = alert.getProductId();
                    
                    // Check if we've already sent an alert for this product recently
                    LocalDateTime lastAlert = recentAlerts.get(productId);
                    if (lastAlert != null && lastAlert.isAfter(oneHourAgo)) {
                        logger.debug("Skipping alert for product {} - recent alert sent at {}", 
                                   productId, lastAlert);
                        return false;
                    }
                    
                    // Check hourly rate limit
                    int currentHourlyCount = hourlyAlertCounts.getOrDefault(productId, 0);
                    if (currentHourlyCount >= maxAlertsPerHour) {
                        logger.debug("Skipping alert for product {} - hourly limit reached ({})", 
                                   productId, currentHourlyCount);
                        return false;
                    }
                    
                    return true;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Process critical alerts (CRITICAL and OUT_OF_STOCK) with immediate notification.
     */
    private void processCriticalAlerts(List<LowStockAlert> criticalAlerts) {
        if (criticalAlerts.isEmpty()) {
            return;
        }
        
        for (LowStockAlert alert : criticalAlerts) {
            try {
                String alertMessage = formatCriticalAlertMessage(alert);
                
                // Send immediate notification
                notificationService.sendUrgentAlert("CRITICAL STOCK ALERT", alertMessage);
                
                // Update tracking
                updateAlertTracking(alert.getProductId());
                
                logger.warn("Sent critical stock alert for product: {} ({})", 
                           alert.getProductName(), alert.getSku());
                
            } catch (Exception e) {
                logger.error("Failed to send critical alert for product: {}", alert.getProductId(), e);
            }
        }
    }
    
    /**
     * Process regular low stock alerts with batched notification.
     */
    private void processRegularAlerts(List<LowStockAlert> regularAlerts) {
        if (regularAlerts.isEmpty()) {
            return;
        }
        
        try {
            String batchMessage = formatBatchAlertMessage(regularAlerts);
            
            // Send batched notification
            notificationService.sendSystemAlert("Low Stock Alert Summary", batchMessage);
            
            // Update tracking for all alerts
            regularAlerts.forEach(alert -> updateAlertTracking(alert.getProductId()));
            
            logger.info("Sent batched low stock alert for {} products", regularAlerts.size());
            
        } catch (Exception e) {
            logger.error("Failed to send batched low stock alerts", e);
        }
    }
    
    /**
     * Publish low stock events for event-driven processing.
     */
    private void publishLowStockEvents(List<LowStockAlert> alerts) {
        for (LowStockAlert alert : alerts) {
            try {
                LowStockEvent event = new LowStockEvent(
                        this,
                        alert.getProductId(),
                        alert.getCurrentStock(),
                        alert.getReorderLevel()
                );
                
                eventPublisher.publishEvent(event);
                
            } catch (Exception e) {
                logger.error("Failed to publish low stock event for product: {}", alert.getProductId(), e);
            }
        }
    }
    
    /**
     * Update alert tracking to prevent spam.
     */
    private void updateAlertTracking(Long productId) {
        LocalDateTime now = LocalDateTime.now();
        recentAlerts.put(productId, now);
        hourlyAlertCounts.merge(productId, 1, Integer::sum);
    }
    
    /**
     * Format critical alert message.
     */
    private String formatCriticalAlertMessage(LowStockAlert alert) {
        StringBuilder message = new StringBuilder();
        
        message.append("🚨 CRITICAL STOCK ALERT 🚨\n\n");
        message.append("Product: ").append(alert.getProductName()).append("\n");
        message.append("SKU: ").append(alert.getSku()).append("\n");
        message.append("Current Stock: ").append(alert.getCurrentStock()).append("\n");
        message.append("Reorder Level: ").append(alert.getReorderLevel()).append("\n");
        message.append("Severity: ").append(alert.getSeverity()).append("\n");
        
        if (alert.getSupplierName() != null) {
            message.append("Supplier: ").append(alert.getSupplierName()).append("\n");
        }
        
        if (alert.getRecommendation() != null) {
            message.append("\nRecommendation: ").append(alert.getRecommendation()).append("\n");
        }
        
        message.append("\nImmediate action required!");
        
        return message.toString();
    }
    
    /**
     * Format batched alert message.
     */
    private String formatBatchAlertMessage(List<LowStockAlert> alerts) {
        StringBuilder message = new StringBuilder();
        
        message.append("📦 Low Stock Alert Summary\n\n");
        message.append("The following ").append(alerts.size()).append(" products are running low on stock:\n\n");
        
        alerts.forEach(alert -> {
            message.append("• ").append(alert.getProductName())
                   .append(" (").append(alert.getSku()).append(")")
                   .append(" - Current: ").append(alert.getCurrentStock())
                   .append(", Reorder: ").append(alert.getReorderLevel()).append("\n");
        });
        
        message.append("\nPlease review and take appropriate action.");
        
        return message.toString();
    }
    
    /**
     * Check if current time is within business hours.
     */
    private boolean isBusinessHours() {
        LocalTime now = LocalTime.now();
        LocalTime start = LocalTime.parse(businessHoursStart);
        LocalTime end = LocalTime.parse(businessHoursEnd);
        
        return now.isAfter(start) && now.isBefore(end);
    }
}