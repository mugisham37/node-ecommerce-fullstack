package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.response.LowStockAlert;
import com.ecommerce.inventory.entity.Product;
import com.ecommerce.inventory.entity.Supplier;
import com.ecommerce.inventory.repository.ProductRepository;
import com.ecommerce.inventory.repository.SupplierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Scheduled task for generating automated reorder recommendations.
 * Analyzes inventory levels and generates purchase recommendations with supplier information.
 */
@Component
public class ReorderRecommendationTask extends BaseScheduledTask {
    
    private static final Logger logger = LoggerFactory.getLogger(ReorderRecommendationTask.class);
    
    @Autowired
    private InventoryService inventoryService;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private SupplierRepository supplierRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    /**
     * Generate reorder recommendations every day at 10:00 AM on weekdays.
     */
    @Scheduled(cron = "0 0 10 * * MON-FRI", zone = "UTC")
    public void generateReorderRecommendations() {
        executeTask();
    }
    
    /**
     * Generate urgent reorder recommendations every 2 hours during business hours.
     */
    @Scheduled(cron = "0 0 8-18/2 * * MON-FRI", zone = "UTC")
    public void generateUrgentReorderRecommendations() {
        getMonitoringService().executeWithMonitoring("urgent-reorder-recommendations", () -> {
            logger.info("Generating urgent reorder recommendations");
            
            List<LowStockAlert> criticalAlerts = inventoryService.checkLowStockLevels().stream()
                    .filter(alert -> "CRITICAL".equals(alert.getSeverity()) || "OUT_OF_STOCK".equals(alert.getSeverity()))
                    .collect(Collectors.toList());
            
            if (!criticalAlerts.isEmpty()) {
                String urgentReport = generateUrgentReorderReport(criticalAlerts);
                notificationService.sendUrgentAlert("URGENT: Reorder Recommendations", urgentReport);
                logger.warn("Sent urgent reorder recommendations for {} critical items", criticalAlerts.size());
            }
        });
    }
    
    @Override
    protected String getTaskName() {
        return "reorder-recommendation-generation";
    }
    
    @Override
    protected String getTaskDescription() {
        return "Generate automated reorder recommendations based on inventory levels and supplier information";
    }
    
    @Override
    protected void doExecute() {
        logger.info("Starting reorder recommendation generation");
        
        try {
            // Get all low stock alerts
            List<LowStockAlert> lowStockAlerts = inventoryService.checkLowStockLevels();
            
            if (lowStockAlerts.isEmpty()) {
                logger.info("No reorder recommendations needed - all stock levels are adequate");
                return;
            }
            
            // Generate comprehensive reorder report
            String reorderReport = generateReorderReport(lowStockAlerts);
            
            // Send report to procurement team
            notificationService.sendProcurementAlert("Daily Reorder Recommendations", reorderReport);
            
            logger.info("Generated and sent reorder recommendations for {} products", lowStockAlerts.size());
            
        } catch (Exception e) {
            logger.error("Failed to generate reorder recommendations", e);
            throw e;
        }
    }
    
    /**
     * Generate comprehensive reorder report.
     */
    private String generateReorderReport(List<LowStockAlert> lowStockAlerts) {
        StringBuilder report = new StringBuilder();
        
        // Report header
        report.append("=== AUTOMATED REORDER RECOMMENDATIONS ===\n");
        report.append("Generated: ").append(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)).append("\n\n");
        
        // Summary statistics
        Map<String, List<LowStockAlert>> alertsBySeverity = lowStockAlerts.stream()
                .collect(Collectors.groupingBy(alert -> 
                        alert.getSeverity() != null ? alert.getSeverity() : "LOW"));
        
        report.append("SUMMARY:\n");
        report.append("- Total Items Requiring Reorder: ").append(lowStockAlerts.size()).append("\n");
        report.append("- Critical/Out of Stock: ").append(
                alertsBySeverity.getOrDefault("CRITICAL", List.of()).size() + 
                alertsBySeverity.getOrDefault("OUT_OF_STOCK", List.of()).size()).append("\n");
        report.append("- Low Stock: ").append(alertsBySeverity.getOrDefault("LOW", List.of()).size()).append("\n\n");
        
        // Group by supplier for efficient ordering
        Map<String, List<LowStockAlert>> alertsBySupplier = groupAlertsBySupplier(lowStockAlerts);
        
        report.append("REORDER RECOMMENDATIONS BY SUPPLIER:\n");
        report.append("=====================================\n\n");
        
        BigDecimal totalOrderValue = BigDecimal.ZERO;
        
        for (Map.Entry<String, List<LowStockAlert>> entry : alertsBySupplier.entrySet()) {
            String supplierName = entry.getKey();
            List<LowStockAlert> supplierAlerts = entry.getValue();
            
            report.append("SUPPLIER: ").append(supplierName).append("\n");
            report.append("Items to reorder: ").append(supplierAlerts.size()).append("\n");
            
            // Get supplier information
            Supplier supplier = getSupplierByName(supplierName);
            if (supplier != null) {
                report.append("Contact: ").append(supplier.getContactEmail()).append("\n");
                report.append("Phone: ").append(supplier.getContactPhone()).append("\n");
                if (supplier.getPaymentTerms() != null) {
                    report.append("Payment Terms: ").append(supplier.getPaymentTerms()).append("\n");
                }
            }
            
            report.append("\nRecommended Orders:\n");
            
            BigDecimal supplierOrderValue = BigDecimal.ZERO;
            
            for (LowStockAlert alert : supplierAlerts) {
                ReorderRecommendation recommendation = calculateReorderRecommendation(alert);
                
                report.append("- ").append(alert.getProductName())
                      .append(" (").append(alert.getSku()).append(")\n");
                report.append("  Current Stock: ").append(alert.getCurrentStock()).append("\n");
                report.append("  Reorder Level: ").append(alert.getReorderLevel()).append("\n");
                report.append("  Recommended Quantity: ").append(recommendation.getRecommendedQuantity()).append("\n");
                report.append("  Estimated Cost: $").append(recommendation.getEstimatedCost()).append("\n");
                report.append("  Priority: ").append(recommendation.getPriority()).append("\n");
                
                if (recommendation.getNotes() != null) {
                    report.append("  Notes: ").append(recommendation.getNotes()).append("\n");
                }
                
                report.append("\n");
                
                supplierOrderValue = supplierOrderValue.add(recommendation.getEstimatedCost());
            }
            
            report.append("Supplier Total: $").append(supplierOrderValue).append("\n");
            report.append("----------------------------------------\n\n");
            
            totalOrderValue = totalOrderValue.add(supplierOrderValue);
        }
        
        // Summary and recommendations
        report.append("TOTAL ESTIMATED ORDER VALUE: $").append(totalOrderValue).append("\n\n");
        
        report.append("PROCUREMENT RECOMMENDATIONS:\n");
        report.append("1. Process critical and out-of-stock items immediately\n");
        report.append("2. Consolidate orders by supplier to optimize shipping costs\n");
        report.append("3. Verify supplier availability and lead times before ordering\n");
        report.append("4. Consider bulk discounts for large quantity orders\n");
        report.append("5. Update reorder levels for frequently low-stock items\n\n");
        
        // Urgent actions
        List<LowStockAlert> urgentAlerts = lowStockAlerts.stream()
                .filter(alert -> "CRITICAL".equals(alert.getSeverity()) || "OUT_OF_STOCK".equals(alert.getSeverity()))
                .collect(Collectors.toList());
        
        if (!urgentAlerts.isEmpty()) {
            report.append("⚠️  URGENT ACTIONS REQUIRED:\n");
            urgentAlerts.forEach(alert -> {
                report.append("- IMMEDIATE ORDER: ").append(alert.getProductName())
                      .append(" (").append(alert.getSku()).append(") - ")
                      .append(alert.getSeverity()).append("\n");
            });
            report.append("\n");
        }
        
        report.append("Report generated by Inventory Management System\n");
        report.append("For questions, contact the procurement team.\n");
        
        return report.toString();
    }
    
    /**
     * Generate urgent reorder report for critical items.
     */
    private String generateUrgentReorderReport(List<LowStockAlert> criticalAlerts) {
        StringBuilder report = new StringBuilder();
        
        report.append("🚨 URGENT REORDER RECOMMENDATIONS 🚨\n\n");
        report.append("The following items require IMMEDIATE attention:\n\n");
        
        for (LowStockAlert alert : criticalAlerts) {
            ReorderRecommendation recommendation = calculateReorderRecommendation(alert);
            
            report.append("• ").append(alert.getProductName())
                  .append(" (").append(alert.getSku()).append(")\n");
            report.append("  Status: ").append(alert.getSeverity()).append("\n");
            report.append("  Current Stock: ").append(alert.getCurrentStock()).append("\n");
            report.append("  Recommended Order: ").append(recommendation.getRecommendedQuantity()).append(" units\n");
            report.append("  Estimated Cost: $").append(recommendation.getEstimatedCost()).append("\n");
            
            if (alert.getSupplierName() != null) {
                report.append("  Supplier: ").append(alert.getSupplierName()).append("\n");
            }
            
            report.append("\n");
        }
        
        report.append("⏰ ACTION REQUIRED: Process these orders immediately to prevent stockouts!\n");
        
        return report.toString();
    }
    
    /**
     * Group alerts by supplier for efficient ordering.
     */
    private Map<String, List<LowStockAlert>> groupAlertsBySupplier(List<LowStockAlert> alerts) {
        return alerts.stream()
                .collect(Collectors.groupingBy(alert -> 
                        alert.getSupplierName() != null ? alert.getSupplierName() : "Unknown Supplier"));
    }
    
    /**
     * Get supplier information by name.
     */
    private Supplier getSupplierByName(String supplierName) {
        if ("Unknown Supplier".equals(supplierName)) {
            return null;
        }
        
        return supplierRepository.findByName(supplierName).orElse(null);
    }
    
    /**
     * Calculate reorder recommendation for a product.
     */
    private ReorderRecommendation calculateReorderRecommendation(LowStockAlert alert) {
        // Get product details for cost calculation
        Product product = productRepository.findById(alert.getProductId()).orElse(null);
        
        int recommendedQuantity = calculateRecommendedQuantity(alert);
        BigDecimal estimatedCost = calculateEstimatedCost(product, recommendedQuantity);
        String priority = determinePriority(alert);
        String notes = generateRecommendationNotes(alert, product);
        
        return new ReorderRecommendation(
                alert.getProductId(),
                recommendedQuantity,
                estimatedCost,
                priority,
                notes
        );
    }
    
    /**
     * Calculate recommended reorder quantity.
     */
    private int calculateRecommendedQuantity(LowStockAlert alert) {
        int currentStock = alert.getCurrentStock();
        int reorderLevel = alert.getReorderLevel();
        int reorderQuantity = alert.getReorderQuantity() != null ? alert.getReorderQuantity() : 50;
        
        // For critical/out of stock, order more aggressively
        if ("CRITICAL".equals(alert.getSeverity()) || "OUT_OF_STOCK".equals(alert.getSeverity())) {
            return Math.max(reorderQuantity, reorderLevel * 2);
        }
        
        // For regular low stock, use standard reorder quantity
        return reorderQuantity;
    }
    
    /**
     * Calculate estimated cost for the order.
     */
    private BigDecimal calculateEstimatedCost(Product product, int quantity) {
        if (product == null || product.getCostPrice() == null) {
            return BigDecimal.ZERO;
        }
        
        return product.getCostPrice().multiply(BigDecimal.valueOf(quantity));
    }
    
    /**
     * Determine priority level for the reorder.
     */
    private String determinePriority(LowStockAlert alert) {
        switch (alert.getSeverity()) {
            case "OUT_OF_STOCK":
                return "URGENT";
            case "CRITICAL":
                return "HIGH";
            default:
                return "NORMAL";
        }
    }
    
    /**
     * Generate recommendation notes.
     */
    private String generateRecommendationNotes(LowStockAlert alert, Product product) {
        StringBuilder notes = new StringBuilder();
        
        if ("OUT_OF_STOCK".equals(alert.getSeverity())) {
            notes.append("STOCKOUT - Order immediately to prevent sales loss. ");
        } else if ("CRITICAL".equals(alert.getSeverity())) {
            notes.append("Critical stock level - Expedite order if possible. ");
        }
        
        if (product != null && product.getReorderLevel() != null && 
            alert.getCurrentStock() <= product.getReorderLevel() / 2) {
            notes.append("Consider increasing reorder level. ");
        }
        
        return notes.length() > 0 ? notes.toString().trim() : null;
    }
    
    /**
     * Reorder recommendation data structure.
     */
    private static class ReorderRecommendation {
        private final Long productId;
        private final int recommendedQuantity;
        private final BigDecimal estimatedCost;
        private final String priority;
        private final String notes;
        
        public ReorderRecommendation(Long productId, int recommendedQuantity, BigDecimal estimatedCost,
                                   String priority, String notes) {
            this.productId = productId;
            this.recommendedQuantity = recommendedQuantity;
            this.estimatedCost = estimatedCost;
            this.priority = priority;
            this.notes = notes;
        }
        
        // Getters
        public Long getProductId() { return productId; }
        public int getRecommendedQuantity() { return recommendedQuantity; }
        public BigDecimal getEstimatedCost() { return estimatedCost; }
        public String getPriority() { return priority; }
        public String getNotes() { return notes; }
    }
}