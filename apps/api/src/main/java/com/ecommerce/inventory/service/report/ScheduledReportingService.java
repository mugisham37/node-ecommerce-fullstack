package com.ecommerce.inventory.service.report;

import com.ecommerce.inventory.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Scheduled Reporting Service for automated report generation and delivery
 * Provides comprehensive scheduling, delivery, and subscription management
 */
@Service
public class ScheduledReportingService {
    
    private static final Logger logger = LoggerFactory.getLogger(ScheduledReportingService.class);
    
    // In-memory storage for scheduled reports (in production, this would be in database)
    private final Map<String, ScheduledReport> scheduledReports = new ConcurrentHashMap<>();
    private final Map<String, ReportSubscription> reportSubscriptions = new ConcurrentHashMap<>();
    private final Map<String, ReportExecution> reportExecutions = new ConcurrentHashMap<>();
    
    @Autowired
    private ReportGenerationService reportGenerationService;
    
    @Autowired
    private ReportDeliveryService reportDeliveryService;
    
    @Autowired
    private ReportArchiveService reportArchiveService;
    
    @Autowired
    private NotificationService notificationService;
    
    /**
     * Create a new scheduled report
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public String createScheduledReport(ScheduledReportRequest request) {
        logger.info("Creating scheduled report: {}", request.getReportName());
        
        String reportId = generateReportId();
        
        ScheduledReport scheduledReport = ScheduledReport.builder()
            .reportId(reportId)
            .reportName(request.getReportName())
            .templateId(request.getTemplateId())
            .schedule(request.getSchedule())
            .parameters(request.getParameters())
            .outputFormat(request.getOutputFormat())
            .recipients(request.getRecipients())
            .active(true)
            .createdAt(LocalDateTime.now())
            .createdBy(getCurrentUser())
            .nextRunTime(calculateNextRunTime(request.getSchedule()))
            .build();
        
        scheduledReports.put(reportId, scheduledReport);
        
        // Create subscriptions for recipients
        createSubscriptionsForRecipients(reportId, request.getRecipients());
        
        logger.info("Scheduled report created successfully: {}", reportId);
        return reportId;
    }
    
    /**
     * Update scheduled report configuration
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public void updateScheduledReport(String reportId, ScheduledReportRequest request) {
        logger.info("Updating scheduled report: {}", reportId);
        
        ScheduledReport existingReport = scheduledReports.get(reportId);
        if (existingReport == null) {
            throw new IllegalArgumentException("Scheduled report not found: " + reportId);
        }
        
        ScheduledReport updatedReport = existingReport.toBuilder()
            .reportName(request.getReportName())
            .templateId(request.getTemplateId())
            .schedule(request.getSchedule())
            .parameters(request.getParameters())
            .outputFormat(request.getOutputFormat())
            .recipients(request.getRecipients())
            .updatedAt(LocalDateTime.now())
            .updatedBy(getCurrentUser())
            .nextRunTime(calculateNextRunTime(request.getSchedule()))
            .build();
        
        scheduledReports.put(reportId, updatedReport);
        
        // Update subscriptions
        updateSubscriptionsForRecipients(reportId, request.getRecipients());
        
        logger.info("Scheduled report updated successfully: {}", reportId);
    }
    
    /**
     * Delete scheduled report
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public void deleteScheduledReport(String reportId) {
        logger.info("Deleting scheduled report: {}", reportId);
        
        ScheduledReport report = scheduledReports.remove(reportId);
        if (report == null) {
            throw new IllegalArgumentException("Scheduled report not found: " + reportId);
        }
        
        // Remove associated subscriptions
        removeSubscriptionsForReport(reportId);
        
        // Archive report executions
        archiveReportExecutions(reportId);
        
        logger.info("Scheduled report deleted successfully: {}", reportId);
    }
    
    /**
     * Get all scheduled reports
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<ScheduledReport> getAllScheduledReports() {
        logger.debug("Retrieving all scheduled reports");
        return new ArrayList<>(scheduledReports.values());
    }
    
    /**
     * Get scheduled report by ID
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ScheduledReport getScheduledReport(String reportId) {
        logger.debug("Retrieving scheduled report: {}", reportId);
        
        ScheduledReport report = scheduledReports.get(reportId);
        if (report == null) {
            throw new IllegalArgumentException("Scheduled report not found: " + reportId);
        }
        
        return report;
    }
    
    /**
     * Enable/disable scheduled report
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public void toggleScheduledReport(String reportId, boolean active) {
        logger.info("Toggling scheduled report {}: {}", reportId, active ? "ENABLED" : "DISABLED");
        
        ScheduledReport report = scheduledReports.get(reportId);
        if (report == null) {
            throw new IllegalArgumentException("Scheduled report not found: " + reportId);
        }
        
        ScheduledReport updatedReport = report.toBuilder()
            .active(active)
            .updatedAt(LocalDateTime.now())
            .updatedBy(getCurrentUser())
            .build();
        
        scheduledReports.put(reportId, updatedReport);
        
        logger.info("Scheduled report {} {}", reportId, active ? "enabled" : "disabled");
    }
    
    /**
     * Execute scheduled report manually
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Async
    public CompletableFuture<String> executeScheduledReportManually(String reportId) {
        logger.info("Manually executing scheduled report: {}", reportId);
        
        ScheduledReport report = scheduledReports.get(reportId);
        if (report == null) {
            throw new IllegalArgumentException("Scheduled report not found: " + reportId);
        }
        
        return executeScheduledReport(report, "MANUAL");
    }
    
    /**
     * Create report subscription
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public String createReportSubscription(ReportSubscriptionRequest request) {
        logger.info("Creating report subscription for user: {}", request.getUserEmail());
        
        String subscriptionId = generateSubscriptionId();
        
        ReportSubscription subscription = ReportSubscription.builder()
            .subscriptionId(subscriptionId)
            .reportId(request.getReportId())
            .userEmail(request.getUserEmail())
            .deliveryMethod(request.getDeliveryMethod())
            .deliverySchedule(request.getDeliverySchedule())
            .active(true)
            .createdAt(LocalDateTime.now())
            .preferences(request.getPreferences())
            .build();
        
        reportSubscriptions.put(subscriptionId, subscription);
        
        logger.info("Report subscription created successfully: {}", subscriptionId);
        return subscriptionId;
    }
    
    /**
     * Update report subscription
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public void updateReportSubscription(String subscriptionId, ReportSubscriptionRequest request) {
        logger.info("Updating report subscription: {}", subscriptionId);
        
        ReportSubscription existingSubscription = reportSubscriptions.get(subscriptionId);
        if (existingSubscription == null) {
            throw new IllegalArgumentException("Report subscription not found: " + subscriptionId);
        }
        
        ReportSubscription updatedSubscription = existingSubscription.toBuilder()
            .userEmail(request.getUserEmail())
            .deliveryMethod(request.getDeliveryMethod())
            .deliverySchedule(request.getDeliverySchedule())
            .preferences(request.getPreferences())
            .updatedAt(LocalDateTime.now())
            .build();
        
        reportSubscriptions.put(subscriptionId, updatedSubscription);
        
        logger.info("Report subscription updated successfully: {}", subscriptionId);
    }
    
    /**
     * Delete report subscription
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public void deleteReportSubscription(String subscriptionId) {
        logger.info("Deleting report subscription: {}", subscriptionId);
        
        ReportSubscription subscription = reportSubscriptions.remove(subscriptionId);
        if (subscription == null) {
            throw new IllegalArgumentException("Report subscription not found: " + subscriptionId);
        }
        
        logger.info("Report subscription deleted successfully: {}", subscriptionId);
    }
    
    /**
     * Get subscriptions for a report
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<ReportSubscription> getReportSubscriptions(String reportId) {
        logger.debug("Retrieving subscriptions for report: {}", reportId);
        
        return reportSubscriptions.values().stream()
            .filter(subscription -> reportId.equals(subscription.getReportId()))
            .toList();
    }
    
    /**
     * Get user subscriptions
     */
    public List<ReportSubscription> getUserSubscriptions(String userEmail) {
        logger.debug("Retrieving subscriptions for user: {}", userEmail);
        
        return reportSubscriptions.values().stream()
            .filter(subscription -> userEmail.equals(subscription.getUserEmail()))
            .toList();
    }
    
    /**
     * Get report execution history
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<ReportExecution> getReportExecutionHistory(String reportId, int limit) {
        logger.debug("Retrieving execution history for report: {}", reportId);
        
        return reportExecutions.values().stream()
            .filter(execution -> reportId.equals(execution.getReportId()))
            .sorted((a, b) -> b.getExecutionTime().compareTo(a.getExecutionTime()))
            .limit(limit)
            .toList();
    }
    
    /**
     * Get scheduled reporting statistics
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public Map<String, Object> getScheduledReportingStatistics() {
        logger.debug("Generating scheduled reporting statistics");
        
        Map<String, Object> stats = new HashMap<>();
        
        // Basic counts
        stats.put("totalScheduledReports", scheduledReports.size());
        stats.put("activeScheduledReports", scheduledReports.values().stream()
            .mapToLong(report -> report.isActive() ? 1 : 0).sum());
        stats.put("totalSubscriptions", reportSubscriptions.size());
        stats.put("activeSubscriptions", reportSubscriptions.values().stream()
            .mapToLong(subscription -> subscription.isActive() ? 1 : 0).sum());
        
        // Execution statistics
        long totalExecutions = reportExecutions.size();
        long successfulExecutions = reportExecutions.values().stream()
            .mapToLong(execution -> "SUCCESS".equals(execution.getStatus()) ? 1 : 0).sum();
        long failedExecutions = totalExecutions - successfulExecutions;
        
        stats.put("totalExecutions", totalExecutions);
        stats.put("successfulExecutions", successfulExecutions);
        stats.put("failedExecutions", failedExecutions);
        stats.put("successRate", totalExecutions > 0 ? (double) successfulExecutions / totalExecutions * 100 : 0);
        
        // Schedule distribution
        Map<String, Long> scheduleDistribution = scheduledReports.values().stream()
            .collect(java.util.stream.Collectors.groupingBy(
                ScheduledReport::getSchedule,
                java.util.stream.Collectors.counting()
            ));
        stats.put("scheduleDistribution", scheduleDistribution);
        
        // Format distribution
        Map<String, Long> formatDistribution = scheduledReports.values().stream()
            .collect(java.util.stream.Collectors.groupingBy(
                ScheduledReport::getOutputFormat,
                java.util.stream.Collectors.counting()
            ));
        stats.put("formatDistribution", formatDistribution);
        
        stats.put("generatedAt", LocalDateTime.now());
        
        return stats;
    }
    
    /**
     * Scheduled task to execute reports
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    @Async
    public void processScheduledReports() {
        logger.debug("Processing scheduled reports");
        
        LocalDateTime now = LocalDateTime.now();
        
        List<ScheduledReport> reportsToExecute = scheduledReports.values().stream()
            .filter(report -> report.isActive())
            .filter(report -> report.getNextRunTime() != null && report.getNextRunTime().isBefore(now))
            .toList();
        
        if (!reportsToExecute.isEmpty()) {
            logger.info("Found {} scheduled reports to execute", reportsToExecute.size());
            
            for (ScheduledReport report : reportsToExecute) {
                try {
                    executeScheduledReport(report, "SCHEDULED");
                } catch (Exception e) {
                    logger.error("Error executing scheduled report: {}", report.getReportId(), e);
                }
            }
        }
    }
    
    /**
     * Archive old report executions
     */
    @Scheduled(cron = "0 0 2 * * *") // Daily at 2 AM
    @Async
    public void archiveOldReportExecutions() {
        logger.info("Archiving old report executions");
        
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(90); // Archive executions older than 90 days
        
        List<String> executionsToArchive = reportExecutions.values().stream()
            .filter(execution -> execution.getExecutionTime().isBefore(cutoffDate))
            .map(ReportExecution::getExecutionId)
            .toList();
        
        for (String executionId : executionsToArchive) {
            ReportExecution execution = reportExecutions.remove(executionId);
            if (execution != null) {
                reportArchiveService.archiveReportExecution(execution);
            }
        }
        
        logger.info("Archived {} old report executions", executionsToArchive.size());
    }
    
    // Private helper methods
    
    private CompletableFuture<String> executeScheduledReport(ScheduledReport report, String triggerType) {
        return CompletableFuture.supplyAsync(() -> {
            String executionId = generateExecutionId();
            LocalDateTime startTime = LocalDateTime.now();
            
            logger.info("Executing scheduled report: {} ({})", report.getReportId(), triggerType);
            
            ReportExecution execution = ReportExecution.builder()
                .executionId(executionId)
                .reportId(report.getReportId())
                .executionTime(startTime)
                .triggerType(triggerType)
                .status("RUNNING")
                .build();
            
            reportExecutions.put(executionId, execution);
            
            try {
                // Generate the report
                ReportData reportData = reportGenerationService.generateReport(
                    report.getTemplateId(), 
                    report.getParameters()
                );
                
                // Deliver the report
                ReportDeliveryResult deliveryResult = reportDeliveryService.deliverReport(
                    reportData,
                    report.getOutputFormat(),
                    report.getRecipients()
                );
                
                // Update execution status
                execution = execution.toBuilder()
                    .status("SUCCESS")
                    .completedAt(LocalDateTime.now())
                    .executionTimeMs(System.currentTimeMillis() - startTime.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli())
                    .deliveryResult(deliveryResult)
                    .build();
                
                reportExecutions.put(executionId, execution);
                
                // Update next run time
                updateNextRunTime(report);
                
                // Archive the report
                reportArchiveService.archiveGeneratedReport(reportData, report.getOutputFormat());
                
                logger.info("Scheduled report executed successfully: {}", report.getReportId());
                
                return executionId;
                
            } catch (Exception e) {
                logger.error("Error executing scheduled report: {}", report.getReportId(), e);
                
                // Update execution status
                execution = execution.toBuilder()
                    .status("FAILED")
                    .completedAt(LocalDateTime.now())
                    .errorMessage(e.getMessage())
                    .build();
                
                reportExecutions.put(executionId, execution);
                
                // Send failure notification
                sendFailureNotification(report, e);
                
                throw new RuntimeException("Report execution failed", e);
            }
        });
    }
    
    private void updateNextRunTime(ScheduledReport report) {
        LocalDateTime nextRunTime = calculateNextRunTime(report.getSchedule());
        
        ScheduledReport updatedReport = report.toBuilder()
            .nextRunTime(nextRunTime)
            .lastRunTime(LocalDateTime.now())
            .build();
        
        scheduledReports.put(report.getReportId(), updatedReport);
    }
    
    private LocalDateTime calculateNextRunTime(String schedule) {
        LocalDateTime now = LocalDateTime.now();
        
        switch (schedule.toUpperCase()) {
            case "HOURLY":
                return now.plusHours(1);
            case "DAILY":
                return now.plusDays(1).withHour(9).withMinute(0).withSecond(0);
            case "WEEKLY":
                return now.plusWeeks(1).withHour(9).withMinute(0).withSecond(0);
            case "MONTHLY":
                return now.plusMonths(1).withDayOfMonth(1).withHour(9).withMinute(0).withSecond(0);
            case "QUARTERLY":
                return now.plusMonths(3).withDayOfMonth(1).withHour(9).withMinute(0).withSecond(0);
            default:
                return now.plusDays(1).withHour(9).withMinute(0).withSecond(0);
        }
    }
    
    private void createSubscriptionsForRecipients(String reportId, List<String> recipients) {
        for (String recipient : recipients) {
            ReportSubscriptionRequest subscriptionRequest = ReportSubscriptionRequest.builder()
                .reportId(reportId)
                .userEmail(recipient)
                .deliveryMethod("EMAIL")
                .deliverySchedule("IMMEDIATE")
                .preferences(new HashMap<>())
                .build();
            
            createReportSubscription(subscriptionRequest);
        }
    }
    
    private void updateSubscriptionsForRecipients(String reportId, List<String> recipients) {
        // Remove existing subscriptions
        removeSubscriptionsForReport(reportId);
        
        // Create new subscriptions
        createSubscriptionsForRecipients(reportId, recipients);
    }
    
    private void removeSubscriptionsForReport(String reportId) {
        List<String> subscriptionsToRemove = reportSubscriptions.values().stream()
            .filter(subscription -> reportId.equals(subscription.getReportId()))
            .map(ReportSubscription::getSubscriptionId)
            .toList();
        
        for (String subscriptionId : subscriptionsToRemove) {
            reportSubscriptions.remove(subscriptionId);
        }
    }
    
    private void archiveReportExecutions(String reportId) {
        List<ReportExecution> executionsToArchive = reportExecutions.values().stream()
            .filter(execution -> reportId.equals(execution.getReportId()))
            .toList();
        
        for (ReportExecution execution : executionsToArchive) {
            reportArchiveService.archiveReportExecution(execution);
            reportExecutions.remove(execution.getExecutionId());
        }
    }
    
    private void sendFailureNotification(ScheduledReport report, Exception error) {
        try {
            String subject = "Scheduled Report Execution Failed: " + report.getReportName();
            String message = String.format(
                "The scheduled report '%s' (ID: %s) failed to execute.\\n\\n" +
                "Error: %s\\n\\n" +
                "Please check the report configuration and try again.",
                report.getReportName(),
                report.getReportId(),
                error.getMessage()
            );
            
            // Send notification to report creator and administrators
            List<String> notificationRecipients = new ArrayList<>(report.getRecipients());
            notificationRecipients.add("admin@company.com"); // Add admin email
            
            for (String recipient : notificationRecipients) {
                notificationService.sendEmail(recipient, subject, message);
            }
            
        } catch (Exception e) {
            logger.error("Error sending failure notification for report: {}", report.getReportId(), e);
        }
    }
    
    private String generateReportId() {
        return "SCHED-RPT-" + System.currentTimeMillis();
    }
    
    private String generateSubscriptionId() {
        return "SUB-" + System.currentTimeMillis();
    }
    
    private String generateExecutionId() {
        return "EXEC-" + System.currentTimeMillis();
    }
    
    private String getCurrentUser() {
        // In a real implementation, this would get the current authenticated user
        return "system";
    }
}