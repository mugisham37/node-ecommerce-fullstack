package com.ecommerce.inventory.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for tracking and analyzing scheduled task performance.
 * Provides detailed performance metrics, logging, and analysis capabilities.
 */
@Service
public class ScheduledTaskPerformanceService {
    
    private static final Logger logger = LoggerFactory.getLogger(ScheduledTaskPerformanceService.class);
    private static final Logger performanceLogger = LoggerFactory.getLogger("SCHEDULED_TASK_PERFORMANCE");
    
    private final ScheduledTaskRegistry taskRegistry;
    private final Map<String, PerformanceThresholds> taskThresholds = new ConcurrentHashMap<>();
    
    @Autowired
    public ScheduledTaskPerformanceService(ScheduledTaskRegistry taskRegistry) {
        this.taskRegistry = taskRegistry;
        initializeDefaultThresholds();
    }
    
    /**
     * Log task execution performance with detailed metrics.
     */
    public void logTaskPerformance(String taskName, long executionTimeMs, boolean success) {
        ScheduledTaskRegistry.TaskMetrics metrics = taskRegistry.getTaskMetrics(taskName);
        
        if (metrics != null) {
            String performanceLog = String.format(
                    "TASK_PERFORMANCE | Task: %s | Duration: %dms | Success: %s | " +
                    "Total Executions: %d | Success Rate: %.2f%% | Avg Duration: %dms | Max Duration: %dms | Timestamp: %s",
                    taskName,
                    executionTimeMs,
                    success,
                    metrics.getExecutionCount(),
                    metrics.getSuccessRate(),
                    metrics.getAverageExecutionTime(),
                    metrics.getMaxExecutionTime(),
                    LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            );
            
            performanceLogger.info(performanceLog);
            
            // Check against performance thresholds
            checkPerformanceThresholds(taskName, executionTimeMs, metrics);
        }
    }
    
    /**
     * Set custom performance thresholds for a specific task.
     */
    public void setTaskThresholds(String taskName, long warningThresholdMs, long criticalThresholdMs, 
                                 double minSuccessRate) {
        PerformanceThresholds thresholds = new PerformanceThresholds(
                warningThresholdMs, criticalThresholdMs, minSuccessRate
        );
        taskThresholds.put(taskName, thresholds);
        
        logger.info("Set performance thresholds for task {}: warning={}ms, critical={}ms, minSuccessRate={}%",
                   taskName, warningThresholdMs, criticalThresholdMs, minSuccessRate);
    }
    
    /**
     * Generate a detailed performance analysis report.
     */
    public String generatePerformanceReport() {
        StringBuilder report = new StringBuilder();
        
        report.append("=== Scheduled Task Performance Analysis ===\n");
        report.append("Generated at: ").append(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)).append("\n\n");
        
        Map<String, ScheduledTaskRegistry.TaskExecutionInfo> allTasks = taskRegistry.getAllTasks();
        Map<String, ScheduledTaskRegistry.TaskMetrics> allMetrics = taskRegistry.getAllMetrics();
        
        // Overall statistics
        long totalExecutions = allMetrics.values().stream()
                .mapToLong(ScheduledTaskRegistry.TaskMetrics::getExecutionCount)
                .sum();
        
        long totalSuccesses = allMetrics.values().stream()
                .mapToLong(ScheduledTaskRegistry.TaskMetrics::getSuccessCount)
                .sum();
        
        double overallSuccessRate = totalExecutions > 0 ? (double) totalSuccesses / totalExecutions * 100 : 0;
        
        report.append("Overall Statistics:\n");
        report.append("- Total Tasks: ").append(allTasks.size()).append("\n");
        report.append("- Total Executions: ").append(totalExecutions).append("\n");
        report.append("- Overall Success Rate: ").append(String.format("%.2f", overallSuccessRate)).append("%\n\n");
        
        // Task-by-task analysis
        report.append("Task Performance Details:\n");
        report.append("----------------------------------------\n");
        
        allTasks.forEach((taskName, info) -> {
            ScheduledTaskRegistry.TaskMetrics metrics = allMetrics.get(taskName);
            PerformanceThresholds thresholds = taskThresholds.get(taskName);
            
            report.append("Task: ").append(taskName).append("\n");
            report.append("  Description: ").append(info.getDescription()).append("\n");
            report.append("  Status: ").append(info.getLastExecutionStatus()).append("\n");
            report.append("  Currently Executing: ").append(info.isCurrentlyExecuting()).append("\n");
            
            if (info.getLastExecutionStart() != null) {
                report.append("  Last Execution: ").append(info.getLastExecutionStart().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)).append("\n");
                report.append("  Last Duration: ").append(info.getLastExecutionDuration()).append("ms\n");
            }
            
            if (metrics != null) {
                report.append("  Total Executions: ").append(metrics.getExecutionCount()).append("\n");
                report.append("  Success Count: ").append(metrics.getSuccessCount()).append("\n");
                report.append("  Failure Count: ").append(metrics.getFailureCount()).append("\n");
                report.append("  Success Rate: ").append(String.format("%.2f", metrics.getSuccessRate())).append("%\n");
                report.append("  Average Duration: ").append(metrics.getAverageExecutionTime()).append("ms\n");
                report.append("  Max Duration: ").append(metrics.getMaxExecutionTime()).append("ms\n");
                
                // Performance assessment
                if (thresholds != null) {
                    String assessment = assessTaskPerformance(metrics, thresholds);
                    report.append("  Performance Assessment: ").append(assessment).append("\n");
                }
            }
            
            if (info.getLastErrorMessage() != null) {
                report.append("  Last Error: ").append(info.getLastErrorMessage()).append("\n");
            }
            
            report.append("\n");
        });
        
        // Performance recommendations
        report.append("Performance Recommendations:\n");
        report.append("----------------------------------------\n");
        generatePerformanceRecommendations(report, allMetrics);
        
        return report.toString();
    }
    
    /**
     * Get performance trends for a specific task.
     */
    public TaskPerformanceTrend getTaskPerformanceTrend(String taskName) {
        ScheduledTaskRegistry.TaskExecutionInfo info = taskRegistry.getTaskInfo(taskName);
        ScheduledTaskRegistry.TaskMetrics metrics = taskRegistry.getTaskMetrics(taskName);
        
        if (info == null || metrics == null) {
            return null;
        }
        
        return new TaskPerformanceTrend(
                taskName,
                metrics.getExecutionCount(),
                metrics.getSuccessRate(),
                metrics.getAverageExecutionTime(),
                metrics.getMaxExecutionTime(),
                info.getLastExecutionDuration(),
                assessTaskHealth(metrics)
        );
    }
    
    /**
     * Initialize default performance thresholds for common task types.
     */
    private void initializeDefaultThresholds() {
        // Inventory monitoring tasks - should be fast
        setTaskThresholds("inventory-monitoring", 30000, 60000, 95.0);
        setTaskThresholds("low-stock-check", 15000, 30000, 98.0);
        
        // Reporting tasks - can take longer
        setTaskThresholds("daily-inventory-report", 300000, 600000, 90.0);
        setTaskThresholds("analytics-processing", 600000, 1200000, 85.0);
        
        // Maintenance tasks - low priority, can be slower
        setTaskThresholds("data-cleanup", 1800000, 3600000, 80.0);
        setTaskThresholds("cache-optimization", 120000, 300000, 90.0);
        
        logger.info("Initialized default performance thresholds for scheduled tasks");
    }
    
    /**
     * Check task performance against configured thresholds.
     */
    private void checkPerformanceThresholds(String taskName, long executionTimeMs, 
                                          ScheduledTaskRegistry.TaskMetrics metrics) {
        PerformanceThresholds thresholds = taskThresholds.get(taskName);
        
        if (thresholds != null) {
            // Check execution time thresholds
            if (executionTimeMs > thresholds.getCriticalThresholdMs()) {
                logger.warn("CRITICAL: Task {} exceeded critical execution time threshold: {}ms > {}ms",
                           taskName, executionTimeMs, thresholds.getCriticalThresholdMs());
            } else if (executionTimeMs > thresholds.getWarningThresholdMs()) {
                logger.warn("WARNING: Task {} exceeded warning execution time threshold: {}ms > {}ms",
                           taskName, executionTimeMs, thresholds.getWarningThresholdMs());
            }
            
            // Check success rate threshold
            if (metrics.getExecutionCount() >= 5 && metrics.getSuccessRate() < thresholds.getMinSuccessRate()) {
                logger.warn("WARNING: Task {} success rate below threshold: {:.2f}% < {:.2f}%",
                           taskName, metrics.getSuccessRate(), thresholds.getMinSuccessRate());
            }
        }
    }
    
    /**
     * Assess task performance based on metrics and thresholds.
     */
    private String assessTaskPerformance(ScheduledTaskRegistry.TaskMetrics metrics, 
                                       PerformanceThresholds thresholds) {
        if (metrics.getExecutionCount() == 0) {
            return "NO_DATA";
        }
        
        boolean timeHealthy = metrics.getAverageExecutionTime() <= thresholds.getWarningThresholdMs();
        boolean successHealthy = metrics.getSuccessRate() >= thresholds.getMinSuccessRate();
        
        if (timeHealthy && successHealthy) {
            return "HEALTHY";
        } else if (!timeHealthy && !successHealthy) {
            return "CRITICAL";
        } else {
            return "WARNING";
        }
    }
    
    /**
     * Assess overall task health.
     */
    private String assessTaskHealth(ScheduledTaskRegistry.TaskMetrics metrics) {
        if (metrics.getExecutionCount() == 0) {
            return "UNKNOWN";
        }
        
        if (metrics.getSuccessRate() >= 95.0) {
            return "EXCELLENT";
        } else if (metrics.getSuccessRate() >= 90.0) {
            return "GOOD";
        } else if (metrics.getSuccessRate() >= 80.0) {
            return "FAIR";
        } else {
            return "POOR";
        }
    }
    
    /**
     * Generate performance recommendations.
     */
    private void generatePerformanceRecommendations(StringBuilder report, 
                                                  Map<String, ScheduledTaskRegistry.TaskMetrics> allMetrics) {
        allMetrics.forEach((taskName, metrics) -> {
            if (metrics.getExecutionCount() > 0) {
                if (metrics.getSuccessRate() < 90.0) {
                    report.append("- ").append(taskName)
                          .append(": Consider investigating frequent failures (")
                          .append(String.format("%.1f", 100.0 - metrics.getSuccessRate()))
                          .append("% failure rate)\n");
                }
                
                if (metrics.getAverageExecutionTime() > 300000) { // 5 minutes
                    report.append("- ").append(taskName)
                          .append(": Consider optimizing execution time (")
                          .append(metrics.getAverageExecutionTime() / 1000)
                          .append("s average)\n");
                }
            }
        });
    }
    
    /**
     * Performance thresholds for a task.
     */
    private static class PerformanceThresholds {
        private final long warningThresholdMs;
        private final long criticalThresholdMs;
        private final double minSuccessRate;
        
        public PerformanceThresholds(long warningThresholdMs, long criticalThresholdMs, double minSuccessRate) {
            this.warningThresholdMs = warningThresholdMs;
            this.criticalThresholdMs = criticalThresholdMs;
            this.minSuccessRate = minSuccessRate;
        }
        
        public long getWarningThresholdMs() { return warningThresholdMs; }
        public long getCriticalThresholdMs() { return criticalThresholdMs; }
        public double getMinSuccessRate() { return minSuccessRate; }
    }
    
    /**
     * Performance trend information for a task.
     */
    public static class TaskPerformanceTrend {
        private final String taskName;
        private final long totalExecutions;
        private final double successRate;
        private final long averageExecutionTime;
        private final long maxExecutionTime;
        private final long lastExecutionTime;
        private final String healthStatus;
        
        public TaskPerformanceTrend(String taskName, long totalExecutions, double successRate,
                                  long averageExecutionTime, long maxExecutionTime, 
                                  long lastExecutionTime, String healthStatus) {
            this.taskName = taskName;
            this.totalExecutions = totalExecutions;
            this.successRate = successRate;
            this.averageExecutionTime = averageExecutionTime;
            this.maxExecutionTime = maxExecutionTime;
            this.lastExecutionTime = lastExecutionTime;
            this.healthStatus = healthStatus;
        }
        
        // Getters
        public String getTaskName() { return taskName; }
        public long getTotalExecutions() { return totalExecutions; }
        public double getSuccessRate() { return successRate; }
        public long getAverageExecutionTime() { return averageExecutionTime; }
        public long getMaxExecutionTime() { return maxExecutionTime; }
        public long getLastExecutionTime() { return lastExecutionTime; }
        public String getHealthStatus() { return healthStatus; }
    }
}