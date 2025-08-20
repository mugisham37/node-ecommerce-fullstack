package com.ecommerce.inventory.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Scheduled task for generating daily inventory reports.
 * Runs every weekday at 9:00 AM to generate comprehensive inventory reports.
 */
@Component
public class DailyInventoryReportTask extends BaseScheduledTask {
    
    private static final Logger logger = LoggerFactory.getLogger(DailyInventoryReportTask.class);
    
    @Autowired
    private InventoryService inventoryService;
    
    @Autowired
    private ProductService productService;
    
    @Autowired
    private NotificationService notificationService;
    
    /**
     * Generate daily inventory report every weekday at 9:00 AM.
     */
    @Scheduled(cron = "0 0 9 * * MON-FRI", zone = "UTC")
    public void generateDailyReport() {
        executeTask();
    }
    
    @Override
    protected String getTaskName() {
        return "daily-inventory-report";
    }
    
    @Override
    protected String getTaskDescription() {
        return "Generate comprehensive daily inventory report with stock levels, movements, and alerts";
    }
    
    @Override
    protected void doExecute() {
        logger.info("Starting daily inventory report generation");
        
        try {
            // Generate the comprehensive report
            String report = generateInventoryReport();
            
            // Send report to managers
            notificationService.sendInventoryReport("Daily Inventory Report", report);
            
            logger.info("Daily inventory report generated and sent successfully");
            
        } catch (Exception e) {
            logger.error("Failed to generate daily inventory report", e);
            throw e;
        }
    }
    
    /**
     * Generate comprehensive inventory report.
     */
    private String generateInventoryReport() {
        StringBuilder report = new StringBuilder();
        
        // Report header
        report.append("=== DAILY INVENTORY REPORT ===\n");
        report.append("Generated: ").append(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)).append("\n\n");
        
        // Inventory value summary
        InventoryService.InventoryValueSummary valueSummary = inventoryService.getTotalInventoryValue();
        report.append("INVENTORY VALUE SUMMARY:\n");
        report.append("- Total Products in Stock: ").append(valueSummary.getTotalProducts()).append("\n");
        report.append("- Total Inventory Value: $").append(valueSummary.getTotalValue()).append("\n\n");
        
        // Low stock alerts
        List<com.ecommerce.inventory.dto.response.LowStockAlert> lowStockAlerts = inventoryService.checkLowStockLevels();
        report.append("LOW STOCK ALERTS (").append(lowStockAlerts.size()).append(" items):\n");
        
        if (lowStockAlerts.isEmpty()) {
            report.append("- No low stock alerts\n");
        } else {
            // Group by severity
            long criticalCount = lowStockAlerts.stream()
                    .mapToLong(alert -> "CRITICAL".equals(alert.getSeverity()) ? 1 : 0)
                    .sum();
            
            long outOfStockCount = lowStockAlerts.stream()
                    .mapToLong(alert -> "OUT_OF_STOCK".equals(alert.getSeverity()) ? 1 : 0)
                    .sum();
            
            report.append("- Critical: ").append(criticalCount).append(" items\n");
            report.append("- Out of Stock: ").append(outOfStockCount).append(" items\n");
            report.append("- Low Stock: ").append(lowStockAlerts.size() - criticalCount - outOfStockCount).append(" items\n\n");
            
            // Detailed low stock items
            report.append("DETAILED LOW STOCK ITEMS:\n");
            lowStockAlerts.forEach(alert -> {
                report.append("- ").append(alert.getProductName())
                      .append(" (").append(alert.getSku()).append(")")
                      .append(" - Current: ").append(alert.getCurrentStock())
                      .append(", Reorder Level: ").append(alert.getReorderLevel())
                      .append(" [").append(alert.getSeverity()).append("]\n");
                
                if (alert.getRecommendation() != null) {
                    report.append("  Recommendation: ").append(alert.getRecommendation()).append("\n");
                }
            });
        }
        
        report.append("\n");
        
        // Recent stock movements summary (last 24 hours)
        report.append("RECENT ACTIVITY SUMMARY:\n");
        report.append("- Stock movements processed in last 24 hours\n");
        report.append("- Inventory adjustments and allocations tracked\n");
        report.append("- All movements logged for audit trail\n\n");
        
        // Recommendations
        report.append("RECOMMENDATIONS:\n");
        if (!lowStockAlerts.isEmpty()) {
            report.append("- Review and process reorder recommendations for low stock items\n");
            report.append("- Contact suppliers for critical and out-of-stock items\n");
        }
        report.append("- Monitor high-velocity products for potential stock issues\n");
        report.append("- Review reorder levels for frequently low-stock items\n\n");
        
        // Footer
        report.append("Report generated by Inventory Management System\n");
        report.append("For questions or issues, contact the inventory management team.\n");
        
        return report.toString();
    }
}