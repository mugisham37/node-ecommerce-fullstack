package com.ecommerce.inventory.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Registry service for managing and monitoring scheduled tasks.
 * Provides capabilities to track task execution, failures, and performance metrics.
 */
@Service
public class ScheduledTaskRegistry {
    
    private static final Logger logger = LoggerFactory.getLogger(ScheduledTaskRegistry.class);
    
    private final Map<String, TaskExecutionInfo> taskRegistry = new ConcurrentHashMap<>();
    private final Map<String, TaskMetrics> taskMetrics = new ConcurrentHashMap<>();
    
    /**
     * Register a scheduled task for monitoring.
     */
    public void registerTask(String taskName, String description) {
        TaskExecutionInfo info = new TaskExecutionInfo(taskName, description);
        taskRegistry.put(taskName, info);
        taskMetrics.put(taskName, new TaskMetrics());
        
        logger.info("Registered scheduled task: {} - {}", taskName, description);
    }
    
    /**
     * Record the start of a task execution.
     */
    public void recordTaskStart(String taskName) {
        TaskExecutionInfo info = taskRegistry.get(taskName);
        if (info != null) {
            info.setLastExecutionStart(LocalDateTime.now());
            info.setCurrentlyExecuting(true);
            
            TaskMetrics metrics = taskMetrics.get(taskName);
            if (metrics != null) {
                metrics.incrementExecutionCount();
            }
            
            logger.debug("Task started: {}", taskName);
        }
    }
    
    /**
     * Record the successful completion of a task execution.
     */
    public void recordTaskSuccess(String taskName, long executionTimeMs) {
        TaskExecutionInfo info = taskRegistry.get(taskName);
        if (info != null) {
            info.setLastExecutionEnd(LocalDateTime.now());
            info.setLastExecutionDuration(executionTimeMs);
            info.setCurrentlyExecuting(false);
            info.setLastExecutionStatus("SUCCESS");
            
            TaskMetrics metrics = taskMetrics.get(taskName);
            if (metrics != null) {
                metrics.incrementSuccessCount();
                metrics.updateAverageExecutionTime(executionTimeMs);
                metrics.updateMaxExecutionTime(executionTimeMs);
            }
            
            logger.debug("Task completed successfully: {} ({}ms)", taskName, executionTimeMs);
        }
    }
    
    /**
     * Record a task execution failure.
     */
    public void recordTaskFailure(String taskName, long executionTimeMs, String errorMessage) {
        TaskExecutionInfo info = taskRegistry.get(taskName);
        if (info != null) {
            info.setLastExecutionEnd(LocalDateTime.now());
            info.setLastExecutionDuration(executionTimeMs);
            info.setCurrentlyExecuting(false);
            info.setLastExecutionStatus("FAILED");
            info.setLastErrorMessage(errorMessage);
            
            TaskMetrics metrics = taskMetrics.get(taskName);
            if (metrics != null) {
                metrics.incrementFailureCount();
                metrics.updateAverageExecutionTime(executionTimeMs);
            }
            
            logger.warn("Task failed: {} ({}ms) - {}", taskName, executionTimeMs, errorMessage);
        }
    }
    
    /**
     * Get execution information for a specific task.
     */
    public TaskExecutionInfo getTaskInfo(String taskName) {
        return taskRegistry.get(taskName);
    }
    
    /**
     * Get metrics for a specific task.
     */
    public TaskMetrics getTaskMetrics(String taskName) {
        return taskMetrics.get(taskName);
    }
    
    /**
     * Get all registered tasks.
     */
    public Map<String, TaskExecutionInfo> getAllTasks() {
        return new ConcurrentHashMap<>(taskRegistry);
    }
    
    /**
     * Get metrics for all tasks.
     */
    public Map<String, TaskMetrics> getAllMetrics() {
        return new ConcurrentHashMap<>(taskMetrics);
    }
    
    /**
     * Check if any tasks are currently executing.
     */
    public boolean hasRunningTasks() {
        return taskRegistry.values().stream()
                .anyMatch(TaskExecutionInfo::isCurrentlyExecuting);
    }
    
    /**
     * Get count of currently executing tasks.
     */
    public long getRunningTaskCount() {
        return taskRegistry.values().stream()
                .mapToLong(info -> info.isCurrentlyExecuting() ? 1 : 0)
                .sum();
    }
    
    /**
     * Information about a scheduled task execution.
     */
    public static class TaskExecutionInfo {
        private final String taskName;
        private final String description;
        private final LocalDateTime registeredAt;
        private LocalDateTime lastExecutionStart;
        private LocalDateTime lastExecutionEnd;
        private long lastExecutionDuration;
        private boolean currentlyExecuting;
        private String lastExecutionStatus;
        private String lastErrorMessage;
        
        public TaskExecutionInfo(String taskName, String description) {
            this.taskName = taskName;
            this.description = description;
            this.registeredAt = LocalDateTime.now();
            this.currentlyExecuting = false;
            this.lastExecutionStatus = "NEVER_EXECUTED";
        }
        
        // Getters and setters
        public String getTaskName() { return taskName; }
        public String getDescription() { return description; }
        public LocalDateTime getRegisteredAt() { return registeredAt; }
        public LocalDateTime getLastExecutionStart() { return lastExecutionStart; }
        public void setLastExecutionStart(LocalDateTime lastExecutionStart) { this.lastExecutionStart = lastExecutionStart; }
        public LocalDateTime getLastExecutionEnd() { return lastExecutionEnd; }
        public void setLastExecutionEnd(LocalDateTime lastExecutionEnd) { this.lastExecutionEnd = lastExecutionEnd; }
        public long getLastExecutionDuration() { return lastExecutionDuration; }
        public void setLastExecutionDuration(long lastExecutionDuration) { this.lastExecutionDuration = lastExecutionDuration; }
        public boolean isCurrentlyExecuting() { return currentlyExecuting; }
        public void setCurrentlyExecuting(boolean currentlyExecuting) { this.currentlyExecuting = currentlyExecuting; }
        public String getLastExecutionStatus() { return lastExecutionStatus; }
        public void setLastExecutionStatus(String lastExecutionStatus) { this.lastExecutionStatus = lastExecutionStatus; }
        public String getLastErrorMessage() { return lastErrorMessage; }
        public void setLastErrorMessage(String lastErrorMessage) { this.lastErrorMessage = lastErrorMessage; }
    }
    
    /**
     * Metrics for a scheduled task.
     */
    public static class TaskMetrics {
        private final AtomicLong executionCount = new AtomicLong(0);
        private final AtomicLong successCount = new AtomicLong(0);
        private final AtomicLong failureCount = new AtomicLong(0);
        private volatile long totalExecutionTime = 0;
        private volatile long maxExecutionTime = 0;
        
        public void incrementExecutionCount() {
            executionCount.incrementAndGet();
        }
        
        public void incrementSuccessCount() {
            successCount.incrementAndGet();
        }
        
        public void incrementFailureCount() {
            failureCount.incrementAndGet();
        }
        
        public synchronized void updateAverageExecutionTime(long executionTime) {
            totalExecutionTime += executionTime;
        }
        
        public synchronized void updateMaxExecutionTime(long executionTime) {
            if (executionTime > maxExecutionTime) {
                maxExecutionTime = executionTime;
            }
        }
        
        public long getExecutionCount() { return executionCount.get(); }
        public long getSuccessCount() { return successCount.get(); }
        public long getFailureCount() { return failureCount.get(); }
        public double getSuccessRate() {
            long total = executionCount.get();
            return total > 0 ? (double) successCount.get() / total * 100 : 0;
        }
        public synchronized long getAverageExecutionTime() {
            long total = executionCount.get();
            return total > 0 ? totalExecutionTime / total : 0;
        }
        public long getMaxExecutionTime() { return maxExecutionTime; }
    }
}