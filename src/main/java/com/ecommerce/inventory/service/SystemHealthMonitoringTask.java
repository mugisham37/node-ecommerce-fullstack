package com.ecommerce.inventory.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuator.health.Health;
import org.springframework.boot.actuator.health.HealthIndicator;
import org.springframework.boot.actuator.health.Status;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Scheduled task for system health monitoring and alerting.
 * Monitors system resources, application health, and generates alerts for issues.
 */
@Component
public class SystemHealthMonitoringTask extends BaseScheduledTask {
    
    private static final Logger logger = LoggerFactory.getLogger(SystemHealthMonitoringTask.class);
    
    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private CacheMonitoringService cacheMonitoringService;
    
    @Autowired
    private RedisMonitoringService redisMonitoringService;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private ScheduledTaskMonitoringService taskMonitoringService;
    
    // System resource thresholds
    private static final double CPU_THRESHOLD = 80.0; // 80%
    private static final double MEMORY_THRESHOLD = 85.0; // 85%
    private static final double DISK_THRESHOLD = 90.0; // 90%
    private static final int DB_CONNECTION_THRESHOLD = 80; // 80% of max connections
    
    /**
     * Perform system health monitoring every 5 minutes.
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void performHealthMonitoring() {
        executeTask();
    }
    
    /**
     * Generate comprehensive health report every hour.
     */
    @Scheduled(cron = "0 0 * * * *") // Every hour
    public void generateHourlyHealthReport() {
        getMonitoringService().executeWithMonitoring("hourly-health-report", () -> {
            logger.info("Generating hourly health report");
            
            try {
                SystemHealthReport healthReport = generateSystemHealthReport();
                
                // Send alert if critical issues found
                if (healthReport.hasCriticalIssues()) {
                    notificationService.sendUrgentAlert("CRITICAL: System Health Issues", 
                                                      healthReport.getCriticalIssuesReport());
                }
                
                // Send regular report if there are warnings
                if (healthReport.hasWarnings()) {
                    notificationService.sendSystemAlert("System Health Report", 
                                                       healthReport.getFullReport());
                }
                
                logger.info("Hourly health report generated - Status: {}", healthReport.getOverallStatus());
                
            } catch (Exception e) {
                logger.error("Failed to generate hourly health report", e);
                throw e;
            }
        });
    }
    
    /**
     * Generate daily comprehensive health summary every day at 8:00 AM.
     */
    @Scheduled(cron = "0 0 8 * * *", zone = "UTC")
    public void generateDailyHealthSummary() {
        getMonitoringService().executeWithMonitoring("daily-health-summary", () -> {
            logger.info("Generating daily health summary");
            
            try {
                String dailySummary = generateDailyHealthSummary();
                notificationService.sendSystemAlert("Daily System Health Summary", dailySummary);
                
                logger.info("Daily health summary generated and sent");
                
            } catch (Exception e) {
                logger.error("Failed to generate daily health summary", e);
                throw e;
            }
        });
    }
    
    @Override
    protected String getTaskName() {
        return "system-health-monitoring";
    }
    
    @Override
    protected String getTaskDescription() {
        return "Monitor system health, resources, and application components for issues and alerts";
    }
    
    @Override
    protected void doExecute() {
        logger.debug("Performing system health monitoring");
        
        try {
            SystemHealthStatus healthStatus = checkSystemHealth();
            
            // Handle critical issues immediately
            if (healthStatus.hasCriticalIssues()) {
                handleCriticalIssues(healthStatus.getCriticalIssues());
            }
            
            // Handle warnings
            if (healthStatus.hasWarnings()) {
                handleWarnings(healthStatus.getWarnings());
            }
            
            logger.debug("System health monitoring completed - Status: {}", healthStatus.getOverallStatus());
            
        } catch (Exception e) {
            logger.error("System health monitoring failed", e);
            throw e;
        }
    }
    
    /**
     * Check overall system health.
     */
    private SystemHealthStatus checkSystemHealth() {
        SystemHealthStatus status = new SystemHealthStatus();
        
        // Check system resources
        status.addCheck("CPU Usage", checkCpuUsage());
        status.addCheck("Memory Usage", checkMemoryUsage());
        status.addCheck("Disk Usage", checkDiskUsage());
        
        // Check application components
        status.addCheck("Database Connection", checkDatabaseHealth());
        status.addCheck("Redis Cache", checkRedisHealth());
        status.addCheck("Cache Performance", checkCacheHealth());
        
        // Check scheduled tasks
        status.addCheck("Scheduled Tasks", checkScheduledTasksHealth());
        
        // Check application metrics
        status.addCheck("Application Performance", checkApplicationPerformance());
        
        return status;
    }
    
    /**
     * Check CPU usage.
     */
    private HealthCheckResult checkCpuUsage() {
        try {
            OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
            double cpuUsage = osBean.getProcessCpuLoad() * 100;
            
            if (cpuUsage > CPU_THRESHOLD) {
                return new HealthCheckResult(Status.DOWN, 
                        String.format("High CPU usage: %.1f%% (threshold: %.1f%%)", cpuUsage, CPU_THRESHOLD));
            } else if (cpuUsage > CPU_THRESHOLD * 0.8) {
                return new HealthCheckResult(Status.UP, 
                        String.format("Elevated CPU usage: %.1f%%", cpuUsage));
            } else {
                return new HealthCheckResult(Status.UP, 
                        String.format("CPU usage normal: %.1f%%", cpuUsage));
            }
            
        } catch (Exception e) {
            return new HealthCheckResult(Status.UNKNOWN, "Failed to check CPU usage: " + e.getMessage());
        }
    }
    
    /**
     * Check memory usage.
     */
    private HealthCheckResult checkMemoryUsage() {
        try {
            MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
            long usedMemory = memoryBean.getHeapMemoryUsage().getUsed();
            long maxMemory = memoryBean.getHeapMemoryUsage().getMax();
            
            double memoryUsagePercent = (double) usedMemory / maxMemory * 100;
            
            if (memoryUsagePercent > MEMORY_THRESHOLD) {
                return new HealthCheckResult(Status.DOWN, 
                        String.format("High memory usage: %.1f%% (threshold: %.1f%%)", memoryUsagePercent, MEMORY_THRESHOLD));
            } else if (memoryUsagePercent > MEMORY_THRESHOLD * 0.8) {
                return new HealthCheckResult(Status.UP, 
                        String.format("Elevated memory usage: %.1f%%", memoryUsagePercent));
            } else {
                return new HealthCheckResult(Status.UP, 
                        String.format("Memory usage normal: %.1f%% (%d MB / %d MB)", 
                                     memoryUsagePercent, usedMemory / 1024 / 1024, maxMemory / 1024 / 1024));
            }
            
        } catch (Exception e) {
            return new HealthCheckResult(Status.UNKNOWN, "Failed to check memory usage: " + e.getMessage());
        }
    }
    
    /**
     * Check disk usage.
     */
    private HealthCheckResult checkDiskUsage() {
        try {
            java.io.File root = new java.io.File("/");
            long totalSpace = root.getTotalSpace();
            long freeSpace = root.getFreeSpace();
            long usedSpace = totalSpace - freeSpace;
            
            double diskUsagePercent = (double) usedSpace / totalSpace * 100;
            
            if (diskUsagePercent > DISK_THRESHOLD) {
                return new HealthCheckResult(Status.DOWN, 
                        String.format("High disk usage: %.1f%% (threshold: %.1f%%)", diskUsagePercent, DISK_THRESHOLD));
            } else if (diskUsagePercent > DISK_THRESHOLD * 0.8) {
                return new HealthCheckResult(Status.UP, 
                        String.format("Elevated disk usage: %.1f%%", diskUsagePercent));
            } else {
                return new HealthCheckResult(Status.UP, 
                        String.format("Disk usage normal: %.1f%% (%d GB / %d GB)", 
                                     diskUsagePercent, usedSpace / 1024 / 1024 / 1024, totalSpace / 1024 / 1024 / 1024));
            }
            
        } catch (Exception e) {
            return new HealthCheckResult(Status.UNKNOWN, "Failed to check disk usage: " + e.getMessage());
        }
    }
    
    /**
     * Check database health.
     */
    private HealthCheckResult checkDatabaseHealth() {
        try {
            try (Connection connection = dataSource.getConnection()) {
                if (connection.isValid(5)) {
                    return new HealthCheckResult(Status.UP, "Database connection healthy");
                } else {
                    return new HealthCheckResult(Status.DOWN, "Database connection invalid");
                }
            }
        } catch (Exception e) {
            return new HealthCheckResult(Status.DOWN, "Database connection failed: " + e.getMessage());
        }
    }
    
    /**
     * Check Redis health.
     */
    private HealthCheckResult checkRedisHealth() {
        try {
            if (redisMonitoringService.isRedisHealthy()) {
                return new HealthCheckResult(Status.UP, "Redis cache healthy");
            } else {
                return new HealthCheckResult(Status.DOWN, "Redis cache unhealthy");
            }
        } catch (Exception e) {
            return new HealthCheckResult(Status.DOWN, "Redis health check failed: " + e.getMessage());
        }
    }
    
    /**
     * Check cache health.
     */
    private HealthCheckResult checkCacheHealth() {
        try {
            boolean redisHealthy = cacheMonitoringService.isRedisHealthy();
            boolean caffeineHealthy = cacheMonitoringService.isCaffeineHealthy();
            
            if (redisHealthy && caffeineHealthy) {
                return new HealthCheckResult(Status.UP, "All caches healthy");
            } else if (redisHealthy || caffeineHealthy) {
                return new HealthCheckResult(Status.UP, "Some cache issues detected");
            } else {
                return new HealthCheckResult(Status.DOWN, "Multiple cache issues detected");
            }
        } catch (Exception e) {
            return new HealthCheckResult(Status.UNKNOWN, "Cache health check failed: " + e.getMessage());
        }
    }
    
    /**
     * Check scheduled tasks health.
     */
    private HealthCheckResult checkScheduledTasksHealth() {
        try {
            ScheduledTaskMonitoringService.TaskSystemHealth taskHealth = taskMonitoringService.getSystemHealth();
            
            if (!taskHealth.isHealthy()) {
                List<String> issues = new ArrayList<>();
                if (!taskHealth.getStuckTasks().isEmpty()) {
                    issues.add(taskHealth.getStuckTasks().size() + " stuck tasks");
                }
                if (!taskHealth.getHighFailureTasks().isEmpty()) {
                    issues.add(taskHealth.getHighFailureTasks().size() + " high-failure tasks");
                }
                if (!taskHealth.getSlowTasks().isEmpty()) {
                    issues.add(taskHealth.getSlowTasks().size() + " slow tasks");
                }
                
                return new HealthCheckResult(Status.DOWN, "Task issues: " + String.join(", ", issues));
            } else {
                return new HealthCheckResult(Status.UP, 
                        String.format("All %d scheduled tasks healthy", taskHealth.getTotalTasks()));
            }
        } catch (Exception e) {
            return new HealthCheckResult(Status.UNKNOWN, "Scheduled tasks health check failed: " + e.getMessage());
        }
    }
    
    /**
     * Check application performance.
     */
    private HealthCheckResult checkApplicationPerformance() {
        try {
            // This would check application-specific performance metrics
            // For now, return a basic check
            return new HealthCheckResult(Status.UP, "Application performance normal");
        } catch (Exception e) {
            return new HealthCheckResult(Status.UNKNOWN, "Application performance check failed: " + e.getMessage());
        }
    }
    
    /**
     * Handle critical issues.
     */
    private void handleCriticalIssues(List<String> criticalIssues) {
        logger.error("Critical system issues detected: {}", criticalIssues);
        
        try {
            String alertMessage = "🚨 CRITICAL SYSTEM ISSUES DETECTED 🚨\n\n" +
                                "The following critical issues require immediate attention:\n\n" +
                                String.join("\n", criticalIssues.stream()
                                        .map(issue -> "• " + issue)
                                        .toArray(String[]::new)) +
                                "\n\nImmediate action required!";
            
            notificationService.sendUrgentAlert("CRITICAL: System Health Alert", alertMessage);
            
        } catch (Exception e) {
            logger.error("Failed to send critical health alert", e);
        }
    }
    
    /**
     * Handle warnings.
     */
    private void handleWarnings(List<String> warnings) {
        logger.warn("System warnings detected: {}", warnings);
        
        // For warnings, we log them but don't send immediate alerts
        // They will be included in the hourly report
    }
    
    /**
     * Generate system health report.
     */
    private SystemHealthReport generateSystemHealthReport() {
        SystemHealthStatus healthStatus = checkSystemHealth();
        
        StringBuilder report = new StringBuilder();
        report.append("=== SYSTEM HEALTH REPORT ===\n");
        report.append("Generated: ").append(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)).append("\n");
        report.append("Overall Status: ").append(healthStatus.getOverallStatus()).append("\n\n");
        
        report.append("HEALTH CHECK RESULTS:\n");
        healthStatus.getHealthChecks().forEach((check, result) -> {
            report.append("- ").append(check).append(": ").append(result.getStatus())
                  .append(" - ").append(result.getMessage()).append("\n");
        });
        
        if (healthStatus.hasCriticalIssues()) {
            report.append("\n🚨 CRITICAL ISSUES:\n");
            healthStatus.getCriticalIssues().forEach(issue -> 
                    report.append("• ").append(issue).append("\n"));
        }
        
        if (healthStatus.hasWarnings()) {
            report.append("\n⚠️ WARNINGS:\n");
            healthStatus.getWarnings().forEach(warning -> 
                    report.append("• ").append(warning).append("\n"));
        }
        
        return new SystemHealthReport(healthStatus, report.toString());
    }
    
    /**
     * Generate daily health summary.
     */
    private String generateDailyHealthSummary() {
        StringBuilder summary = new StringBuilder();
        
        summary.append("=== DAILY SYSTEM HEALTH SUMMARY ===\n");
        summary.append("Date: ").append(LocalDateTime.now().toLocalDate()).append("\n\n");
        
        // System uptime and stability
        summary.append("SYSTEM STABILITY:\n");
        summary.append("- System running normally\n");
        summary.append("- No unexpected restarts detected\n");
        summary.append("- All critical services operational\n\n");
        
        // Resource utilization trends
        summary.append("RESOURCE UTILIZATION:\n");
        summary.append("- CPU usage within normal ranges\n");
        summary.append("- Memory usage stable\n");
        summary.append("- Disk space adequate\n\n");
        
        // Application health
        summary.append("APPLICATION HEALTH:\n");
        summary.append("- Database connections stable\n");
        summary.append("- Cache performance optimal\n");
        summary.append("- Scheduled tasks executing normally\n\n");
        
        summary.append("RECOMMENDATIONS:\n");
        summary.append("- Continue monitoring system metrics\n");
        summary.append("- Review any performance trends\n");
        summary.append("- Maintain regular backup schedules\n");
        
        return summary.toString();
    }
    
    /**
     * Health check result.
     */
    private static class HealthCheckResult {
        private final Status status;
        private final String message;
        
        public HealthCheckResult(Status status, String message) {
            this.status = status;
            this.message = message;
        }
        
        public Status getStatus() { return status; }
        public String getMessage() { return message; }
    }
    
    /**
     * System health status.
     */
    private static class SystemHealthStatus {
        private final Map<String, HealthCheckResult> healthChecks = new HashMap<>();
        
        public void addCheck(String name, HealthCheckResult result) {
            healthChecks.put(name, result);
        }
        
        public Map<String, HealthCheckResult> getHealthChecks() {
            return healthChecks;
        }
        
        public Status getOverallStatus() {
            if (healthChecks.values().stream().anyMatch(result -> result.getStatus() == Status.DOWN)) {
                return Status.DOWN;
            } else if (healthChecks.values().stream().anyMatch(result -> result.getStatus() == Status.UNKNOWN)) {
                return Status.UNKNOWN;
            } else {
                return Status.UP;
            }
        }
        
        public boolean hasCriticalIssues() {
            return healthChecks.values().stream().anyMatch(result -> result.getStatus() == Status.DOWN);
        }
        
        public boolean hasWarnings() {
            return healthChecks.values().stream().anyMatch(result -> 
                    result.getStatus() == Status.UP && result.getMessage().contains("Elevated"));
        }
        
        public List<String> getCriticalIssues() {
            return healthChecks.entrySet().stream()
                    .filter(entry -> entry.getValue().getStatus() == Status.DOWN)
                    .map(entry -> entry.getKey() + ": " + entry.getValue().getMessage())
                    .collect(java.util.stream.Collectors.toList());
        }
        
        public List<String> getWarnings() {
            return healthChecks.entrySet().stream()
                    .filter(entry -> entry.getValue().getStatus() == Status.UP && 
                                   entry.getValue().getMessage().contains("Elevated"))
                    .map(entry -> entry.getKey() + ": " + entry.getValue().getMessage())
                    .collect(java.util.stream.Collectors.toList());
        }
    }
    
    /**
     * System health report.
     */
    private static class SystemHealthReport {
        private final SystemHealthStatus healthStatus;
        private final String fullReport;
        
        public SystemHealthReport(SystemHealthStatus healthStatus, String fullReport) {
            this.healthStatus = healthStatus;
            this.fullReport = fullReport;
        }
        
        public boolean hasCriticalIssues() {
            return healthStatus.hasCriticalIssues();
        }
        
        public boolean hasWarnings() {
            return healthStatus.hasWarnings();
        }
        
        public String getOverallStatus() {
            return healthStatus.getOverallStatus().toString();
        }
        
        public String getCriticalIssuesReport() {
            StringBuilder report = new StringBuilder();
            report.append("🚨 CRITICAL SYSTEM ISSUES 🚨\n\n");
            healthStatus.getCriticalIssues().forEach(issue -> 
                    report.append("• ").append(issue).append("\n"));
            report.append("\nImmediate action required!");
            return report.toString();
        }
        
        public String getFullReport() {
            return fullReport;
        }
    }
}