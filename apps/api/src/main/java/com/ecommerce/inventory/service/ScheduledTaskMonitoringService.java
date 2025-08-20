package com.ecommerce.inventory.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for monitoring scheduled task execution and handling failures.
 * Provides capabilities for task health monitoring, failure detection, and alerting.
 */
@Service
public class ScheduledTaskMonitoringService {
    
    private static final Logger logger = LoggerFactory.getLogger(ScheduledTaskMonitoringService.class);
    
    private final ScheduledTaskRegistry taskRegistry;
    private final NotificationService notificationService;
    
    @Autowired
    public ScheduledTaskMonitoringService(ScheduledTaskRegistry taskRegistry, 
                                        NotificationService notificationService) {
        this.taskRegistry = taskRegistry;
        this.notificationService = notificationService;
    }
    
    /**
     * Execute a scheduled task with monitoring and error handling.
     */
    public void executeWithMonitoring(String taskName, Runnable task) {
        long startTime = System.currentTimeMillis();
        taskRegistry.recordTaskStart(taskName);
        
        try {
            task.run();
            
            long executionTime = System.currentTimeMillis() - startTime;
            taskRegistry.recordTaskSuccess(taskName, executionTime);
            
            // Check for performance issues
            checkTaskPerformance(taskName, executionTime);
            
        } catch (Exception e) {
            long executionTime = System.currentTimeMillis() - startTime;
            String errorMessage = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            
            taskRegistry.recordTaskFailure(taskName, executionTime, errorMessage);
            
            // Handle task failure
            handleTaskFailure(taskName, e);
            
            logger.error("Scheduled task failed: {}", taskName, e);
        }
    }
    
    /**
     * Check for tasks that haven't executed recently (potential stuck or failed tasks).
     */
    public List<String> checkStuckTasks(int maxHoursSinceLastExecution) {
        LocalDateTime threshold = LocalDateTime.now().minusHours(maxHoursSinceLastExecution);
        
        return taskRegistry.getAllTasks().entrySet().stream()
                .filter(entry -> {
                    ScheduledTaskRegistry.TaskExecutionInfo info = entry.getValue();
                    return info.getLastExecutionStart() != null && 
                           info.getLastExecutionStart().isBefore(threshold) &&
                           !info.isCurrentlyExecuting();
                })
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
    
    /**
     * Check for tasks with high failure rates.
     */
    public List<String> checkHighFailureRateTasks(double maxFailureRatePercent) {
        return taskRegistry.getAllMetrics().entrySet().stream()
                .filter(entry -> {
                    ScheduledTaskRegistry.TaskMetrics metrics = entry.getValue();
                    return metrics.getExecutionCount() > 0 && 
                           (100.0 - metrics.getSuccessRate()) > maxFailureRatePercent;
                })
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
    
    /**
     * Check for tasks with unusually long execution times.
     */
    public List<String> checkSlowTasks(long maxExecutionTimeMs) {
        return taskRegistry.getAllMetrics().entrySet().stream()
                .filter(entry -> {
                    ScheduledTaskRegistry.TaskMetrics metrics = entry.getValue();
                    return metrics.getAverageExecutionTime() > maxExecutionTimeMs;
                })
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
    
    /**
     * Get overall system health status for scheduled tasks.
     */
    public TaskSystemHealth getSystemHealth() {
        Map<String, ScheduledTaskRegistry.TaskExecutionInfo> allTasks = taskRegistry.getAllTasks();
        Map<String, ScheduledTaskRegistry.TaskMetrics> allMetrics = taskRegistry.getAllMetrics();
        
        long totalTasks = allTasks.size();
        long runningTasks = taskRegistry.getRunningTaskCount();
        
        long healthyTasks = allMetrics.entrySet().stream()
                .mapToLong(entry -> {
                    ScheduledTaskRegistry.TaskMetrics metrics = entry.getValue();
                    return metrics.getSuccessRate() >= 95.0 ? 1 : 0;
                })
                .sum();
        
        List<String> stuckTasks = checkStuckTasks(24); // 24 hours
        List<String> highFailureTasks = checkHighFailureRateTasks(10.0); // 10% failure rate
        List<String> slowTasks = checkSlowTasks(300000); // 5 minutes
        
        return new TaskSystemHealth(
                totalTasks,
                runningTasks,
                healthyTasks,
                stuckTasks,
                highFailureTasks,
                slowTasks
        );
    }
    
    /**
     * Generate a comprehensive task monitoring report.
     */
    public String generateMonitoringReport() {
        TaskSystemHealth health = getSystemHealth();
        StringBuilder report = new StringBuilder();
        
        report.append("=== Scheduled Task Monitoring Report ===\n");
        report.append("Generated at: ").append(LocalDateTime.now()).append("\n\n");
        
        report.append("System Overview:\n");
        report.append("- Total Tasks: ").append(health.getTotalTasks()).append("\n");
        report.append("- Currently Running: ").append(health.getRunningTasks()).append("\n");
        report.append("- Healthy Tasks: ").append(health.getHealthyTasks()).append("\n\n");
        
        if (!health.getStuckTasks().isEmpty()) {
            report.append("Stuck Tasks (no execution in 24h):\n");
            health.getStuckTasks().forEach(task -> report.append("- ").append(task).append("\n"));
            report.append("\n");
        }
        
        if (!health.getHighFailureTasks().isEmpty()) {
            report.append("High Failure Rate Tasks (>10%):\n");
            health.getHighFailureTasks().forEach(task -> {
                ScheduledTaskRegistry.TaskMetrics metrics = taskRegistry.getTaskMetrics(task);
                report.append("- ").append(task)
                      .append(" (").append(String.format("%.1f", 100.0 - metrics.getSuccessRate()))
                      .append("% failure rate)\n");
            });
            report.append("\n");
        }
        
        if (!health.getSlowTasks().isEmpty()) {
            report.append("Slow Tasks (>5min average):\n");
            health.getSlowTasks().forEach(task -> {
                ScheduledTaskRegistry.TaskMetrics metrics = taskRegistry.getTaskMetrics(task);
                report.append("- ").append(task)
                      .append(" (").append(metrics.getAverageExecutionTime() / 1000)
                      .append("s average)\n");
            });
            report.append("\n");
        }
        
        report.append("Task Details:\n");
        taskRegistry.getAllTasks().forEach((taskName, info) -> {
            ScheduledTaskRegistry.TaskMetrics metrics = taskRegistry.getTaskMetrics(taskName);
            report.append("- ").append(taskName).append(":\n");
            report.append("  Status: ").append(info.getLastExecutionStatus()).append("\n");
            report.append("  Executions: ").append(metrics.getExecutionCount()).append("\n");
            report.append("  Success Rate: ").append(String.format("%.1f", metrics.getSuccessRate())).append("%\n");
            if (info.getLastExecutionStart() != null) {
                report.append("  Last Run: ").append(info.getLastExecutionStart()).append("\n");
            }
            report.append("\n");
        });
        
        return report.toString();
    }
    
    /**
     * Handle task failure with appropriate actions.
     */
    private void handleTaskFailure(String taskName, Exception e) {
        ScheduledTaskRegistry.TaskMetrics metrics = taskRegistry.getTaskMetrics(taskName);
        
        if (metrics != null) {
            double failureRate = 100.0 - metrics.getSuccessRate();
            
            // Send alert for high failure rates
            if (failureRate > 50.0 && metrics.getExecutionCount() >= 3) {
                String alertMessage = String.format(
                        "Scheduled task '%s' has high failure rate: %.1f%% (last error: %s)",
                        taskName, failureRate, e.getMessage()
                );
                
                try {
                    notificationService.sendSystemAlert("High Task Failure Rate", alertMessage);
                } catch (Exception notificationError) {
                    logger.error("Failed to send task failure alert", notificationError);
                }
            }
        }
    }
    
    /**
     * Check task performance and alert on issues.
     */
    private void checkTaskPerformance(String taskName, long executionTime) {
        // Alert on very long execution times (over 10 minutes)
        if (executionTime > 600000) {
            String alertMessage = String.format(
                    "Scheduled task '%s' took unusually long to execute: %d seconds",
                    taskName, executionTime / 1000
            );
            
            try {
                notificationService.sendSystemAlert("Slow Task Execution", alertMessage);
            } catch (Exception e) {
                logger.error("Failed to send slow task alert", e);
            }
        }
    }
    
    /**
     * System health information for scheduled tasks.
     */
    public static class TaskSystemHealth {
        private final long totalTasks;
        private final long runningTasks;
        private final long healthyTasks;
        private final List<String> stuckTasks;
        private final List<String> highFailureTasks;
        private final List<String> slowTasks;
        
        public TaskSystemHealth(long totalTasks, long runningTasks, long healthyTasks,
                              List<String> stuckTasks, List<String> highFailureTasks, List<String> slowTasks) {
            this.totalTasks = totalTasks;
            this.runningTasks = runningTasks;
            this.healthyTasks = healthyTasks;
            this.stuckTasks = stuckTasks;
            this.highFailureTasks = highFailureTasks;
            this.slowTasks = slowTasks;
        }
        
        // Getters
        public long getTotalTasks() { return totalTasks; }
        public long getRunningTasks() { return runningTasks; }
        public long getHealthyTasks() { return healthyTasks; }
        public List<String> getStuckTasks() { return stuckTasks; }
        public List<String> getHighFailureTasks() { return highFailureTasks; }
        public List<String> getSlowTasks() { return slowTasks; }
        
        public boolean isHealthy() {
            return stuckTasks.isEmpty() && highFailureTasks.isEmpty() && slowTasks.isEmpty();
        }
    }
}