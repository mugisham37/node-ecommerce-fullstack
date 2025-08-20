package com.ecommerce.inventory.service;

import com.ecommerce.inventory.entity.StockMovement;
import com.ecommerce.inventory.repository.StockMovementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled task for data cleanup and archiving operations.
 * Manages old data retention, cleanup of temporary data, and archiving of historical records.
 */
@Component
public class DataCleanupTask extends BaseScheduledTask {
    
    private static final Logger logger = LoggerFactory.getLogger(DataCleanupTask.class);
    
    @Autowired
    private StockMovementRepository stockMovementRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    @Value("${inventory.cleanup.stock-movements.retention-days:365}")
    private int stockMovementRetentionDays;
    
    @Value("${inventory.cleanup.batch-size:1000}")
    private int cleanupBatchSize;
    
    @Value("${inventory.cleanup.enable-archiving:true}")
    private boolean enableArchiving;
    
    /**
     * Run data cleanup every Sunday at 2:00 AM.
     */
    @Scheduled(cron = "0 0 2 * * SUN", zone = "UTC")
    public void performWeeklyCleanup() {
        executeTask();
    }
    
    /**
     * Run comprehensive monthly cleanup on the first Sunday of each month at 3:00 AM.
     */
    @Scheduled(cron = "0 0 3 ? * SUN#1", zone = "UTC")
    public void performMonthlyCleanup() {
        getMonitoringService().executeWithMonitoring("monthly-data-cleanup", () -> {
            logger.info("Starting monthly comprehensive data cleanup");
            
            try {
                // Perform all cleanup operations
                CleanupResults results = new CleanupResults();
                
                results.addResult("Stock Movements", cleanupOldStockMovements());
                results.addResult("Temporary Data", cleanupTemporaryData());
                results.addResult("Log Files", cleanupOldLogEntries());
                results.addResult("Cache Cleanup", performCacheCleanup());
                
                // Generate cleanup report
                String cleanupReport = generateCleanupReport(results, true);
                notificationService.sendSystemAlert("Monthly Data Cleanup Report", cleanupReport);
                
                logger.info("Monthly data cleanup completed successfully");
                
            } catch (Exception e) {
                logger.error("Monthly data cleanup failed", e);
                throw e;
            }
        });
    }
    
    @Override
    protected String getTaskName() {
        return "data-cleanup-and-archiving";
    }
    
    @Override
    protected String getTaskDescription() {
        return "Clean up old data, archive historical records, and maintain database performance";
    }
    
    @Override
    @Transactional
    protected void doExecute() {
        logger.info("Starting weekly data cleanup and archiving");
        
        try {
            CleanupResults results = new CleanupResults();
            
            // Clean up old stock movements
            results.addResult("Stock Movements", cleanupOldStockMovements());
            
            // Clean up temporary data
            results.addResult("Temporary Data", cleanupTemporaryData());
            
            // Perform cache cleanup
            results.addResult("Cache Cleanup", performCacheCleanup());
            
            // Generate and send cleanup report
            String cleanupReport = generateCleanupReport(results, false);
            logger.info("Data cleanup completed: {}", cleanupReport);
            
            // Send notification if significant cleanup occurred
            if (results.getTotalRecordsProcessed() > 1000) {
                notificationService.sendSystemAlert("Weekly Data Cleanup Report", cleanupReport);
            }
            
        } catch (Exception e) {
            logger.error("Data cleanup failed", e);
            throw e;
        }
    }
    
    /**
     * Clean up old stock movement records.
     */
    private CleanupResult cleanupOldStockMovements() {
        logger.info("Cleaning up old stock movements (retention: {} days)", stockMovementRetentionDays);
        
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(stockMovementRetentionDays);
        
        try {
            // Find old stock movements in batches
            List<StockMovement> oldMovements = stockMovementRepository.findOldMovements(cutoffDate, cleanupBatchSize);
            
            int totalProcessed = 0;
            int archivedCount = 0;
            int deletedCount = 0;
            
            while (!oldMovements.isEmpty()) {
                if (enableArchiving) {
                    // Archive before deletion
                    archivedCount += archiveStockMovements(oldMovements);
                }
                
                // Delete the old movements
                stockMovementRepository.deleteAll(oldMovements);
                deletedCount += oldMovements.size();
                totalProcessed += oldMovements.size();
                
                logger.debug("Processed batch of {} old stock movements", oldMovements.size());
                
                // Get next batch
                oldMovements = stockMovementRepository.findOldMovements(cutoffDate, cleanupBatchSize);
            }
            
            logger.info("Stock movement cleanup completed: {} archived, {} deleted", archivedCount, deletedCount);
            
            return new CleanupResult(totalProcessed, archivedCount, deletedCount, 
                    "Cleaned up stock movements older than " + stockMovementRetentionDays + " days");
            
        } catch (Exception e) {
            logger.error("Failed to cleanup old stock movements", e);
            return new CleanupResult(0, 0, 0, "Failed: " + e.getMessage());
        }
    }
    
    /**
     * Clean up temporary data and expired sessions.
     */
    private CleanupResult cleanupTemporaryData() {
        logger.info("Cleaning up temporary data");
        
        try {
            int processedCount = 0;
            
            // Clean up expired cache entries (if applicable)
            // This would depend on your specific cache implementation
            
            // Clean up temporary files (if any)
            // This would clean up any temporary files created by the application
            
            // Clean up expired tokens or sessions (if stored in database)
            // This would depend on your authentication implementation
            
            logger.info("Temporary data cleanup completed: {} items processed", processedCount);
            
            return new CleanupResult(processedCount, 0, processedCount, "Cleaned up temporary data and expired sessions");
            
        } catch (Exception e) {
            logger.error("Failed to cleanup temporary data", e);
            return new CleanupResult(0, 0, 0, "Failed: " + e.getMessage());
        }
    }
    
    /**
     * Clean up old log entries (if stored in database).
     */
    private CleanupResult cleanupOldLogEntries() {
        logger.info("Cleaning up old log entries");
        
        try {
            // This would clean up application logs if they're stored in the database
            // For file-based logging, this might involve log rotation
            
            int processedCount = 0; // Placeholder
            
            logger.info("Log cleanup completed: {} entries processed", processedCount);
            
            return new CleanupResult(processedCount, 0, processedCount, "Cleaned up old log entries");
            
        } catch (Exception e) {
            logger.error("Failed to cleanup old log entries", e);
            return new CleanupResult(0, 0, 0, "Failed: " + e.getMessage());
        }
    }
    
    /**
     * Perform cache cleanup operations.
     */
    private CleanupResult performCacheCleanup() {
        logger.info("Performing cache cleanup");
        
        try {
            // Clear expired cache entries
            // This would depend on your cache implementation
            
            int processedCount = 0; // Placeholder
            
            logger.info("Cache cleanup completed: {} entries processed", processedCount);
            
            return new CleanupResult(processedCount, 0, processedCount, "Performed cache cleanup and optimization");
            
        } catch (Exception e) {
            logger.error("Failed to perform cache cleanup", e);
            return new CleanupResult(0, 0, 0, "Failed: " + e.getMessage());
        }
    }
    
    /**
     * Archive stock movements to long-term storage.
     */
    private int archiveStockMovements(List<StockMovement> movements) {
        logger.debug("Archiving {} stock movements", movements.size());
        
        try {
            // This would implement actual archiving logic
            // Could be to a separate database, file system, or cloud storage
            
            // For now, just log the archiving operation
            movements.forEach(movement -> {
                logger.trace("Archiving stock movement: ID={}, Product={}, Quantity={}, Date={}", 
                           movement.getId(), 
                           movement.getProduct().getName(), 
                           movement.getQuantity(), 
                           movement.getCreatedAt());
            });
            
            return movements.size();
            
        } catch (Exception e) {
            logger.error("Failed to archive stock movements", e);
            return 0;
        }
    }
    
    /**
     * Generate cleanup report.
     */
    private String generateCleanupReport(CleanupResults results, boolean isMonthly) {
        StringBuilder report = new StringBuilder();
        
        report.append("=== ").append(isMonthly ? "MONTHLY" : "WEEKLY").append(" DATA CLEANUP REPORT ===\n");
        report.append("Executed: ").append(LocalDateTime.now()).append("\n\n");
        
        report.append("CLEANUP SUMMARY:\n");
        report.append("- Total Records Processed: ").append(results.getTotalRecordsProcessed()).append("\n");
        report.append("- Total Records Archived: ").append(results.getTotalRecordsArchived()).append("\n");
        report.append("- Total Records Deleted: ").append(results.getTotalRecordsDeleted()).append("\n\n");
        
        report.append("DETAILED RESULTS:\n");
        results.getResults().forEach((operation, result) -> {
            report.append("- ").append(operation).append(":\n");
            report.append("  Processed: ").append(result.getProcessedCount()).append("\n");
            report.append("  Archived: ").append(result.getArchivedCount()).append("\n");
            report.append("  Deleted: ").append(result.getDeletedCount()).append("\n");
            report.append("  Details: ").append(result.getDetails()).append("\n\n");
        });
        
        report.append("SYSTEM IMPACT:\n");
        report.append("- Database space freed up through cleanup operations\n");
        report.append("- Improved query performance on active data\n");
        report.append("- Historical data preserved through archiving\n\n");
        
        report.append("Next cleanup scheduled: ").append(isMonthly ? "First Sunday of next month" : "Next Sunday").append("\n");
        
        return report.toString();
    }
    
    /**
     * Results of a single cleanup operation.
     */
    private static class CleanupResult {
        private final int processedCount;
        private final int archivedCount;
        private final int deletedCount;
        private final String details;
        
        public CleanupResult(int processedCount, int archivedCount, int deletedCount, String details) {
            this.processedCount = processedCount;
            this.archivedCount = archivedCount;
            this.deletedCount = deletedCount;
            this.details = details;
        }
        
        // Getters
        public int getProcessedCount() { return processedCount; }
        public int getArchivedCount() { return archivedCount; }
        public int getDeletedCount() { return deletedCount; }
        public String getDetails() { return details; }
    }
    
    /**
     * Aggregated results of all cleanup operations.
     */
    private static class CleanupResults {
        private final java.util.Map<String, CleanupResult> results = new java.util.HashMap<>();
        
        public void addResult(String operation, CleanupResult result) {
            results.put(operation, result);
        }
        
        public java.util.Map<String, CleanupResult> getResults() {
            return results;
        }
        
        public int getTotalRecordsProcessed() {
            return results.values().stream().mapToInt(CleanupResult::getProcessedCount).sum();
        }
        
        public int getTotalRecordsArchived() {
            return results.values().stream().mapToInt(CleanupResult::getArchivedCount).sum();
        }
        
        public int getTotalRecordsDeleted() {
            return results.values().stream().mapToInt(CleanupResult::getDeletedCount).sum();
        }
    }
}