package com.ecommerce.inventory.service.report;

import com.ecommerce.inventory.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Report Delivery Service for delivering reports via various channels
 * Supports email delivery with attachment support and delivery tracking
 */
@Service
public class ReportDeliveryService {
    
    private static final Logger logger = LoggerFactory.getLogger(ReportDeliveryService.class);
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private ReportFormatService reportFormatService;
    
    /**
     * Deliver report to recipients
     */
    public ReportDeliveryResult deliverReport(ReportData reportData, String outputFormat, List<String> recipients) {
        logger.info("Delivering report {} in {} format to {} recipients", 
            reportData.getReportId(), outputFormat, recipients.size());
        
        ReportDeliveryResult.Builder resultBuilder = ReportDeliveryResult.builder()
            .reportId(reportData.getReportId())
            .deliveryTime(LocalDateTime.now())
            .outputFormat(outputFormat)
            .totalRecipients(recipients.size());
        
        List<String> successfulDeliveries = new ArrayList<>();
        List<String> failedDeliveries = new ArrayList<>();
        Map<String, String> deliveryErrors = new HashMap<>();
        
        try {
            // Format the report
            byte[] formattedReport = reportFormatService.formatReport(reportData, outputFormat);
            String fileName = generateFileName(reportData, outputFormat);
            
            // Deliver to each recipient
            for (String recipient : recipients) {
                try {
                    deliverToRecipient(reportData, formattedReport, fileName, recipient, outputFormat);
                    successfulDeliveries.add(recipient);
                    logger.debug("Report delivered successfully to: {}", recipient);
                    
                } catch (Exception e) {
                    failedDeliveries.add(recipient);
                    deliveryErrors.put(recipient, e.getMessage());
                    logger.error("Failed to deliver report to: {}", recipient, e);
                }
            }
            
            // Build result
            ReportDeliveryResult result = resultBuilder
                .successfulDeliveries(successfulDeliveries)
                .failedDeliveries(failedDeliveries)
                .deliveryErrors(deliveryErrors)
                .deliveryStatus(failedDeliveries.isEmpty() ? "SUCCESS" : "PARTIAL_FAILURE")
                .build();
            
            logger.info("Report delivery completed. Success: {}, Failed: {}", 
                successfulDeliveries.size(), failedDeliveries.size());
            
            return result;
            
        } catch (Exception e) {
            logger.error("Error during report delivery", e);
            
            return resultBuilder
                .successfulDeliveries(successfulDeliveries)
                .failedDeliveries(recipients)
                .deliveryStatus("FAILED")
                .errorMessage(e.getMessage())
                .build();
        }
    }
    
    /**
     * Deliver report to a single recipient
     */
    private void deliverToRecipient(ReportData reportData, byte[] formattedReport, 
                                  String fileName, String recipient, String outputFormat) {
        
        // Prepare email content
        String subject = generateEmailSubject(reportData);
        String body = generateEmailBody(reportData);
        
        // Send email with attachment
        notificationService.sendEmailWithAttachment(
            recipient,
            subject,
            body,
            fileName,
            formattedReport,
            getMimeType(outputFormat)
        );
    }
    
    /**
     * Generate email subject for report delivery
     */
    private String generateEmailSubject(ReportData reportData) {
        return String.format("Scheduled Report: %s - %s", 
            reportData.getReportName(),
            reportData.getGeneratedAt().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
        );
    }
    
    /**
     * Generate email body for report delivery
     */
    private String generateEmailBody(ReportData reportData) {
        StringBuilder body = new StringBuilder();
        
        body.append("Dear Recipient,\\n\\n");
        body.append("Please find attached the scheduled report: ").append(reportData.getReportName()).append("\\n\\n");
        
        body.append("Report Details:\\n");
        body.append("- Report ID: ").append(reportData.getReportId()).append("\\n");
        body.append("- Generated At: ").append(reportData.getGeneratedAt()).append("\\n");
        body.append("- Template: ").append(reportData.getTemplateId()).append("\\n");
        
        if (reportData.getDataAsOf() != null) {
            body.append("- Data As Of: ").append(reportData.getDataAsOf()).append("\\n");
        }
        
        if (reportData.getExecutionTimeMs() > 0) {
            body.append("- Generation Time: ").append(reportData.getExecutionTimeMs()).append(" ms\\n");
        }
        
        // Add summary if available
        if (reportData.getSummary() != null && !reportData.getSummary().isEmpty()) {
            body.append("\\nReport Summary:\\n");
            reportData.getSummary().forEach((key, value) -> {
                if (value != null) {
                    body.append("- ").append(formatKey(key)).append(": ").append(value).append("\\n");
                }
            });
        }
        
        body.append("\\nThis is an automated report delivery. Please do not reply to this email.\\n\\n");
        body.append("Best regards,\\n");
        body.append("Inventory Management System");
        
        return body.toString();
    }
    
    /**
     * Generate file name for report attachment
     */
    private String generateFileName(ReportData reportData, String outputFormat) {
        String timestamp = reportData.getGeneratedAt()
            .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        
        String reportName = reportData.getReportName()
            .replaceAll("[^a-zA-Z0-9]", "_")
            .toLowerCase();
        
        String extension = getFileExtension(outputFormat);
        
        return String.format("%s_%s.%s", reportName, timestamp, extension);
    }
    
    /**
     * Get file extension for output format
     */
    private String getFileExtension(String outputFormat) {
        switch (outputFormat.toUpperCase()) {
            case "PDF":
                return "pdf";
            case "EXCEL":
                return "xlsx";
            case "CSV":
                return "csv";
            case "JSON":
                return "json";
            default:
                return "txt";
        }
    }
    
    /**
     * Get MIME type for output format
     */
    private String getMimeType(String outputFormat) {
        switch (outputFormat.toUpperCase()) {
            case "PDF":
                return "application/pdf";
            case "EXCEL":
                return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "CSV":
                return "text/csv";
            case "JSON":
                return "application/json";
            default:
                return "text/plain";
        }
    }
    
    /**
     * Format key for display
     */
    private String formatKey(String key) {
        return key.replaceAll("([a-z])([A-Z])", "$1 $2")
                 .replaceAll("_", " ")
                 .toLowerCase()
                 .replaceAll("\\b\\w", m -> m.group().toUpperCase());
    }
    
    /**
     * Send delivery confirmation
     */
    public void sendDeliveryConfirmation(ReportDeliveryResult deliveryResult, String adminEmail) {
        logger.debug("Sending delivery confirmation for report: {}", deliveryResult.getReportId());
        
        try {
            String subject = "Report Delivery Confirmation - " + deliveryResult.getReportId();
            String body = generateDeliveryConfirmationBody(deliveryResult);
            
            notificationService.sendEmail(adminEmail, subject, body);
            
        } catch (Exception e) {
            logger.error("Error sending delivery confirmation", e);
        }
    }
    
    /**
     * Generate delivery confirmation email body
     */
    private String generateDeliveryConfirmationBody(ReportDeliveryResult deliveryResult) {
        StringBuilder body = new StringBuilder();
        
        body.append("Report Delivery Summary\\n\\n");
        body.append("Report ID: ").append(deliveryResult.getReportId()).append("\\n");
        body.append("Delivery Time: ").append(deliveryResult.getDeliveryTime()).append("\\n");
        body.append("Output Format: ").append(deliveryResult.getOutputFormat()).append("\\n");
        body.append("Status: ").append(deliveryResult.getDeliveryStatus()).append("\\n\\n");
        
        body.append("Delivery Statistics:\\n");
        body.append("- Total Recipients: ").append(deliveryResult.getTotalRecipients()).append("\\n");
        body.append("- Successful Deliveries: ").append(deliveryResult.getSuccessfulDeliveries().size()).append("\\n");
        body.append("- Failed Deliveries: ").append(deliveryResult.getFailedDeliveries().size()).append("\\n");
        
        if (!deliveryResult.getSuccessfulDeliveries().isEmpty()) {
            body.append("\\nSuccessful Deliveries:\\n");
            deliveryResult.getSuccessfulDeliveries().forEach(recipient -> 
                body.append("- ").append(recipient).append("\\n"));
        }
        
        if (!deliveryResult.getFailedDeliveries().isEmpty()) {
            body.append("\\nFailed Deliveries:\\n");
            deliveryResult.getFailedDeliveries().forEach(recipient -> {
                body.append("- ").append(recipient);
                String error = deliveryResult.getDeliveryErrors().get(recipient);
                if (error != null) {
                    body.append(" (").append(error).append(")");
                }
                body.append("\\n");
            });
        }
        
        return body.toString();
    }
    
    /**
     * Get delivery statistics
     */
    public Map<String, Object> getDeliveryStatistics() {
        Map<String, Object> stats = new HashMap<>();
        
        // Mock statistics - in real implementation, these would be calculated from actual data
        stats.put("totalDeliveries", 1250L);
        stats.put("successfulDeliveries", 1185L);
        stats.put("failedDeliveries", 65L);
        stats.put("successRate", 94.8);
        
        Map<String, Long> formatDistribution = new HashMap<>();
        formatDistribution.put("PDF", 650L);
        formatDistribution.put("EXCEL", 425L);
        formatDistribution.put("CSV", 175L);
        stats.put("formatDistribution", formatDistribution);
        
        Map<String, Long> deliveryMethods = new HashMap<>();
        deliveryMethods.put("EMAIL", 1200L);
        deliveryMethods.put("WEBHOOK", 50L);
        stats.put("deliveryMethods", deliveryMethods);
        
        stats.put("averageDeliveryTime", "2.3 seconds");
        stats.put("generatedAt", LocalDateTime.now());
        
        return stats;
    }
}