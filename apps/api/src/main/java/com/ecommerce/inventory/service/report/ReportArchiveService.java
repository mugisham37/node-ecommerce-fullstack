package com.ecommerce.inventory.service.report;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Report Archive Service for managing report archiving and historical data
 * Provides comprehensive archiving, retrieval, and cleanup capabilities
 */
@Service
public class ReportArchiveService {
    
    private static final Logger logger = LoggerFactory.getLogger(ReportArchiveService.class);
    
    private static final String ARCHIVE_BASE_PATH = "reports/archive";
    private static final int DEFAULT_RETENTION_DAYS = 365; // 1 year
    
    // In-memory storage for archived report metadata (in production, this would be in database)
    private final Map<String, ArchivedReportMetadata> archivedReports = new ConcurrentHashMap<>();
    
    /**
     * Archive a generated report
     */
    public String archiveGeneratedReport(ReportData reportData, String outputFormat) {
        logger.info("Archiving generated report: {}", reportData.getReportId());
        
        try {
            String archiveId = generateArchiveId();
            String archivePath = createArchivePath(reportData, outputFormat);
            
            // Create archive directory if it doesn't exist
            createArchiveDirectory(archivePath);
            
            // Archive report data as JSON
            String reportDataPath = archivePath + "/report_data.json";
            archiveReportData(reportData, reportDataPath);
            
            // Archive formatted report if available
            if (outputFormat != null) {
                String formattedReportPath = archivePath + "/report." + getFileExtension(outputFormat);
                archiveFormattedReport(reportData, outputFormat, formattedReportPath);
            }
            
            // Create metadata
            ArchivedReportMetadata metadata = ArchivedReportMetadata.builder()
                .archiveId(archiveId)
                .reportId(reportData.getReportId())
                .reportName(reportData.getReportName())
                .templateId(reportData.getTemplateId())
                .archivedAt(LocalDateTime.now())
                .archivePath(archivePath)
                .outputFormat(outputFormat)
                .generatedAt(reportData.getGeneratedAt())
                .executionTimeMs(reportData.getExecutionTimeMs())
                .fromCache(reportData.isFromCache())
                .retentionUntil(LocalDateTime.now().plusDays(DEFAULT_RETENTION_DAYS))
                .build();
            
            archivedReports.put(archiveId, metadata);
            
            logger.info("Report archived successfully: {} -> {}", reportData.getReportId(), archiveId);
            return archiveId;
            
        } catch (Exception e) {
            logger.error("Error archiving report: {}", reportData.getReportId(), e);
            throw new RuntimeException("Failed to archive report: " + e.getMessage(), e);
        }
    }
    
    /**
     * Archive report execution
     */
    public String archiveReportExecution(ReportExecution execution) {
        logger.info("Archiving report execution: {}", execution.getExecutionId());
        
        try {
            String archiveId = generateArchiveId();
            String archivePath = createExecutionArchivePath(execution);
            
            // Create archive directory
            createArchiveDirectory(archivePath);
            
            // Archive execution data
            String executionDataPath = archivePath + "/execution_data.json";
            archiveExecutionData(execution, executionDataPath);
            
            // Create metadata
            ArchivedExecutionMetadata metadata = ArchivedExecutionMetadata.builder()
                .archiveId(archiveId)
                .executionId(execution.getExecutionId())
                .reportId(execution.getReportId())
                .archivedAt(LocalDateTime.now())
                .archivePath(archivePath)
                .executionTime(execution.getExecutionTime())
                .triggerType(execution.getTriggerType())
                .status(execution.getStatus())
                .executionTimeMs(execution.getExecutionTimeMs())
                .retentionUntil(LocalDateTime.now().plusDays(DEFAULT_RETENTION_DAYS))
                .build();
            
            // Store metadata (in production, this would go to database)
            // For now, we'll use a separate map or extend the existing one
            
            logger.info("Report execution archived successfully: {} -> {}", execution.getExecutionId(), archiveId);
            return archiveId;
            
        } catch (Exception e) {
            logger.error("Error archiving report execution: {}", execution.getExecutionId(), e);
            throw new RuntimeException("Failed to archive report execution: " + e.getMessage(), e);
        }
    }
    
    /**
     * Retrieve archived report
     */
    public ArchivedReportMetadata getArchivedReport(String archiveId) {
        logger.debug("Retrieving archived report: {}", archiveId);
        
        ArchivedReportMetadata metadata = archivedReports.get(archiveId);
        if (metadata == null) {
            throw new IllegalArgumentException("Archived report not found: " + archiveId);
        }
        
        return metadata;
    }
    
    /**
     * Search archived reports
     */
    public List<ArchivedReportMetadata> searchArchivedReports(String reportId, String templateId, 
                                                            LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Searching archived reports");
        
        return archivedReports.values().stream()
            .filter(metadata -> reportId == null || reportId.equals(metadata.getReportId()))
            .filter(metadata -> templateId == null || templateId.equals(metadata.getTemplateId()))
            .filter(metadata -> startDate == null || metadata.getGeneratedAt().isAfter(startDate))
            .filter(metadata -> endDate == null || metadata.getGeneratedAt().isBefore(endDate))
            .sorted((a, b) -> b.getArchivedAt().compareTo(a.getArchivedAt()))
            .toList();
    }
    
    /**
     * Get archived report data
     */
    public ReportData getArchivedReportData(String archiveId) {
        logger.debug("Retrieving archived report data: {}", archiveId);
        
        ArchivedReportMetadata metadata = getArchivedReport(archiveId);
        String reportDataPath = metadata.getArchivePath() + "/report_data.json";
        
        try {
            // In a real implementation, this would deserialize the JSON file
            // For now, returning a placeholder
            return ReportData.builder(metadata.getReportId(), metadata.getTemplateId(), metadata.getReportName())
                .generatedAt(metadata.getGeneratedAt())
                .executionTime(metadata.getExecutionTimeMs())
                .fromCache(metadata.isFromCache())
                .build();
            
        } catch (Exception e) {
            logger.error("Error retrieving archived report data: {}", archiveId, e);
            throw new RuntimeException("Failed to retrieve archived report data: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get archived report file
     */
    public byte[] getArchivedReportFile(String archiveId) {
        logger.debug("Retrieving archived report file: {}", archiveId);
        
        ArchivedReportMetadata metadata = getArchivedReport(archiveId);
        String reportFilePath = metadata.getArchivePath() + "/report." + getFileExtension(metadata.getOutputFormat());
        
        try {
            Path filePath = Paths.get(reportFilePath);
            if (Files.exists(filePath)) {
                return Files.readAllBytes(filePath);
            } else {
                throw new IllegalArgumentException("Archived report file not found: " + reportFilePath);
            }
            
        } catch (Exception e) {
            logger.error("Error retrieving archived report file: {}", archiveId, e);
            throw new RuntimeException("Failed to retrieve archived report file: " + e.getMessage(), e);
        }
    }
    
    /**
     * Delete archived report
     */
    public void deleteArchivedReport(String archiveId) {
        logger.info("Deleting archived report: {}", archiveId);
        
        ArchivedReportMetadata metadata = archivedReports.remove(archiveId);
        if (metadata == null) {
            throw new IllegalArgumentException("Archived report not found: " + archiveId);
        }
        
        try {
            // Delete archive directory and files
            Path archivePath = Paths.get(metadata.getArchivePath());
            if (Files.exists(archivePath)) {
                deleteDirectory(archivePath);
            }
            
            logger.info("Archived report deleted successfully: {}", archiveId);
            
        } catch (Exception e) {
            logger.error("Error deleting archived report: {}", archiveId, e);
            throw new RuntimeException("Failed to delete archived report: " + e.getMessage(), e);
        }
    }
    
    /**
     * Cleanup expired archives
     */
    public void cleanupExpiredArchives() {
        logger.info("Cleaning up expired archives");
        
        LocalDateTime now = LocalDateTime.now();
        List<String> expiredArchives = archivedReports.values().stream()
            .filter(metadata -> metadata.getRetentionUntil().isBefore(now))
            .map(ArchivedReportMetadata::getArchiveId)
            .toList();
        
        int deletedCount = 0;
        for (String archiveId : expiredArchives) {
            try {
                deleteArchivedReport(archiveId);
                deletedCount++;
            } catch (Exception e) {
                logger.error("Error deleting expired archive: {}", archiveId, e);
            }
        }
        
        logger.info("Cleanup completed. Deleted {} expired archives", deletedCount);
    }
    
    /**
     * Get archive statistics
     */
    public Map<String, Object> getArchiveStatistics() {
        logger.debug("Generating archive statistics");
        
        Map<String, Object> stats = new HashMap<>();
        
        // Basic counts
        stats.put("totalArchivedReports", archivedReports.size());
        
        // Size statistics (simplified)
        long totalSizeBytes = archivedReports.size() * 1024 * 1024; // Mock: 1MB per report
        stats.put("totalArchiveSizeBytes", totalSizeBytes);
        stats.put("totalArchiveSizeMB", totalSizeBytes / (1024 * 1024));
        
        // Format distribution
        Map<String, Long> formatDistribution = archivedReports.values().stream()
            .filter(metadata -> metadata.getOutputFormat() != null)
            .collect(java.util.stream.Collectors.groupingBy(
                ArchivedReportMetadata::getOutputFormat,
                java.util.stream.Collectors.counting()
            ));
        stats.put("formatDistribution", formatDistribution);
        
        // Template distribution
        Map<String, Long> templateDistribution = archivedReports.values().stream()
            .collect(java.util.stream.Collectors.groupingBy(
                ArchivedReportMetadata::getTemplateId,
                java.util.stream.Collectors.counting()
            ));
        stats.put("templateDistribution", templateDistribution);
        
        // Age distribution
        LocalDateTime now = LocalDateTime.now();
        Map<String, Long> ageDistribution = new HashMap<>();
        ageDistribution.put("last7Days", archivedReports.values().stream()
            .mapToLong(metadata -> metadata.getArchivedAt().isAfter(now.minusDays(7)) ? 1 : 0).sum());
        ageDistribution.put("last30Days", archivedReports.values().stream()
            .mapToLong(metadata -> metadata.getArchivedAt().isAfter(now.minusDays(30)) ? 1 : 0).sum());
        ageDistribution.put("last90Days", archivedReports.values().stream()
            .mapToLong(metadata -> metadata.getArchivedAt().isAfter(now.minusDays(90)) ? 1 : 0).sum());
        stats.put("ageDistribution", ageDistribution);
        
        // Retention statistics
        long expiringSoon = archivedReports.values().stream()
            .mapToLong(metadata -> metadata.getRetentionUntil().isBefore(now.plusDays(30)) ? 1 : 0).sum();
        stats.put("expiringSoon", expiringSoon);
        
        stats.put("generatedAt", LocalDateTime.now());
        
        return stats;
    }
    
    // Private helper methods
    
    private String generateArchiveId() {
        return "ARCH-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
    
    private String createArchivePath(ReportData reportData, String outputFormat) {
        String dateFolder = reportData.getGeneratedAt().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        return ARCHIVE_BASE_PATH + "/reports/" + dateFolder + "/" + reportData.getReportId();
    }
    
    private String createExecutionArchivePath(ReportExecution execution) {
        String dateFolder = execution.getExecutionTime().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        return ARCHIVE_BASE_PATH + "/executions/" + dateFolder + "/" + execution.getExecutionId();
    }
    
    private void createArchiveDirectory(String archivePath) throws IOException {
        Path path = Paths.get(archivePath);
        if (!Files.exists(path)) {
            Files.createDirectories(path);
        }
    }
    
    private void archiveReportData(ReportData reportData, String filePath) throws IOException {
        // In a real implementation, this would serialize the ReportData to JSON
        String jsonData = "{\\"reportId\\": \\"" + reportData.getReportId() + "\\", \\"archived\\": true}";
        Files.write(Paths.get(filePath), jsonData.getBytes());
    }
    
    private void archiveFormattedReport(ReportData reportData, String outputFormat, String filePath) throws IOException {
        // In a real implementation, this would save the formatted report
        String content = "Formatted report content for " + reportData.getReportId();
        Files.write(Paths.get(filePath), content.getBytes());
    }
    
    private void archiveExecutionData(ReportExecution execution, String filePath) throws IOException {
        // In a real implementation, this would serialize the ReportExecution to JSON
        String jsonData = "{\\"executionId\\": \\"" + execution.getExecutionId() + "\\", \\"archived\\": true}";
        Files.write(Paths.get(filePath), jsonData.getBytes());
    }
    
    private String getFileExtension(String outputFormat) {
        if (outputFormat == null) return "txt";
        
        switch (outputFormat.toUpperCase()) {
            case "PDF": return "pdf";
            case "EXCEL": return "xlsx";
            case "CSV": return "csv";
            case "JSON": return "json";
            default: return "txt";
        }
    }
    
    private void deleteDirectory(Path path) throws IOException {
        if (Files.isDirectory(path)) {
            Files.list(path).forEach(child -> {
                try {
                    deleteDirectory(child);
                } catch (IOException e) {
                    logger.error("Error deleting directory: {}", child, e);
                }
            });
        }
        Files.deleteIfExists(path);
    }
    
    // Inner classes for metadata
    
    public static class ArchivedReportMetadata {
        private String archiveId;
        private String reportId;
        private String reportName;
        private String templateId;
        private LocalDateTime archivedAt;
        private String archivePath;
        private String outputFormat;
        private LocalDateTime generatedAt;
        private long executionTimeMs;
        private boolean fromCache;
        private LocalDateTime retentionUntil;
        
        private ArchivedReportMetadata(Builder builder) {
            this.archiveId = builder.archiveId;
            this.reportId = builder.reportId;
            this.reportName = builder.reportName;
            this.templateId = builder.templateId;
            this.archivedAt = builder.archivedAt;
            this.archivePath = builder.archivePath;
            this.outputFormat = builder.outputFormat;
            this.generatedAt = builder.generatedAt;
            this.executionTimeMs = builder.executionTimeMs;
            this.fromCache = builder.fromCache;
            this.retentionUntil = builder.retentionUntil;
        }
        
        public static Builder builder() {
            return new Builder();
        }
        
        public static class Builder {
            private String archiveId;
            private String reportId;
            private String reportName;
            private String templateId;
            private LocalDateTime archivedAt;
            private String archivePath;
            private String outputFormat;
            private LocalDateTime generatedAt;
            private long executionTimeMs;
            private boolean fromCache;
            private LocalDateTime retentionUntil;
            
            public Builder archiveId(String archiveId) { this.archiveId = archiveId; return this; }
            public Builder reportId(String reportId) { this.reportId = reportId; return this; }
            public Builder reportName(String reportName) { this.reportName = reportName; return this; }
            public Builder templateId(String templateId) { this.templateId = templateId; return this; }
            public Builder archivedAt(LocalDateTime archivedAt) { this.archivedAt = archivedAt; return this; }
            public Builder archivePath(String archivePath) { this.archivePath = archivePath; return this; }
            public Builder outputFormat(String outputFormat) { this.outputFormat = outputFormat; return this; }
            public Builder generatedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; return this; }
            public Builder executionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; return this; }
            public Builder fromCache(boolean fromCache) { this.fromCache = fromCache; return this; }
            public Builder retentionUntil(LocalDateTime retentionUntil) { this.retentionUntil = retentionUntil; return this; }
            
            public ArchivedReportMetadata build() {
                return new ArchivedReportMetadata(this);
            }
        }
        
        // Getters
        public String getArchiveId() { return archiveId; }
        public String getReportId() { return reportId; }
        public String getReportName() { return reportName; }
        public String getTemplateId() { return templateId; }
        public LocalDateTime getArchivedAt() { return archivedAt; }
        public String getArchivePath() { return archivePath; }
        public String getOutputFormat() { return outputFormat; }
        public LocalDateTime getGeneratedAt() { return generatedAt; }
        public long getExecutionTimeMs() { return executionTimeMs; }
        public boolean isFromCache() { return fromCache; }
        public LocalDateTime getRetentionUntil() { return retentionUntil; }
    }
    
    public static class ArchivedExecutionMetadata {
        private String archiveId;
        private String executionId;
        private String reportId;
        private LocalDateTime archivedAt;
        private String archivePath;
        private LocalDateTime executionTime;
        private String triggerType;
        private String status;
        private long executionTimeMs;
        private LocalDateTime retentionUntil;
        
        private ArchivedExecutionMetadata(Builder builder) {
            this.archiveId = builder.archiveId;
            this.executionId = builder.executionId;
            this.reportId = builder.reportId;
            this.archivedAt = builder.archivedAt;
            this.archivePath = builder.archivePath;
            this.executionTime = builder.executionTime;
            this.triggerType = builder.triggerType;
            this.status = builder.status;
            this.executionTimeMs = builder.executionTimeMs;
            this.retentionUntil = builder.retentionUntil;
        }
        
        public static Builder builder() {
            return new Builder();
        }
        
        public static class Builder {
            private String archiveId;
            private String executionId;
            private String reportId;
            private LocalDateTime archivedAt;
            private String archivePath;
            private LocalDateTime executionTime;
            private String triggerType;
            private String status;
            private long executionTimeMs;
            private LocalDateTime retentionUntil;
            
            public Builder archiveId(String archiveId) { this.archiveId = archiveId; return this; }
            public Builder executionId(String executionId) { this.executionId = executionId; return this; }
            public Builder reportId(String reportId) { this.reportId = reportId; return this; }
            public Builder archivedAt(LocalDateTime archivedAt) { this.archivedAt = archivedAt; return this; }
            public Builder archivePath(String archivePath) { this.archivePath = archivePath; return this; }
            public Builder executionTime(LocalDateTime executionTime) { this.executionTime = executionTime; return this; }
            public Builder triggerType(String triggerType) { this.triggerType = triggerType; return this; }
            public Builder status(String status) { this.status = status; return this; }
            public Builder executionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; return this; }
            public Builder retentionUntil(LocalDateTime retentionUntil) { this.retentionUntil = retentionUntil; return this; }
            
            public ArchivedExecutionMetadata build() {
                return new ArchivedExecutionMetadata(this);
            }
        }
        
        // Getters
        public String getArchiveId() { return archiveId; }
        public String getExecutionId() { return executionId; }
        public String getReportId() { return reportId; }
        public LocalDateTime getArchivedAt() { return archivedAt; }
        public String getArchivePath() { return archivePath; }
        public LocalDateTime getExecutionTime() { return executionTime; }
        public String getTriggerType() { return triggerType; }
        public String getStatus() { return status; }
        public long getExecutionTimeMs() { return executionTimeMs; }
        public LocalDateTime getRetentionUntil() { return retentionUntil; }
    }
}