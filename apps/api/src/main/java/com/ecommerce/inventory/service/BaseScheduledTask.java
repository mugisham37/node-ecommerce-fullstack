package com.ecommerce.inventory.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import javax.annotation.PostConstruct;

/**
 * Base class for scheduled tasks that provides monitoring and performance tracking capabilities.
 * All scheduled tasks should extend this class to benefit from automatic monitoring.
 */
public abstract class BaseScheduledTask {
    
    private static final Logger logger = LoggerFactory.getLogger(BaseScheduledTask.class);
    
    @Autowired
    private ScheduledTaskRegistry taskRegistry;
    
    @Autowired
    private ScheduledTaskMonitoringService monitoringService;
    
    @Autowired
    private ScheduledTaskPerformanceService performanceService;
    
    /**
     * Register this task with the monitoring system after construction.
     */
    @PostConstruct
    public void registerTask() {
        String taskName = getTaskName();
        String description = getTaskDescription();
        
        taskRegistry.registerTask(taskName, description);
        logger.info("Registered scheduled task: {} - {}", taskName, description);
    }
    
    /**
     * Execute the scheduled task with full monitoring and error handling.
     */
    protected final void executeTask() {
        String taskName = getTaskName();
        
        monitoringService.executeWithMonitoring(taskName, () -> {
            long startTime = System.currentTimeMillis();
            boolean success = false;
            
            try {
                logger.debug("Starting scheduled task: {}", taskName);
                
                // Execute the actual task logic
                doExecute();
                
                success = true;
                logger.debug("Completed scheduled task: {}", taskName);
                
            } catch (Exception e) {
                logger.error("Error executing scheduled task: {}", taskName, e);
                throw e;
            } finally {
                long executionTime = System.currentTimeMillis() - startTime;
                performanceService.logTaskPerformance(taskName, executionTime, success);
            }
        });
    }
    
    /**
     * Get the unique name for this scheduled task.
     * This name is used for monitoring and logging purposes.
     */
    protected abstract String getTaskName();
    
    /**
     * Get a human-readable description of what this task does.
     */
    protected abstract String getTaskDescription();
    
    /**
     * Execute the actual task logic.
     * Subclasses should implement this method with their specific task logic.
     */
    protected abstract void doExecute();
    
    /**
     * Get the task registry for manual task management if needed.
     */
    protected ScheduledTaskRegistry getTaskRegistry() {
        return taskRegistry;
    }
    
    /**
     * Get the monitoring service for custom monitoring if needed.
     */
    protected ScheduledTaskMonitoringService getMonitoringService() {
        return monitoringService;
    }
    
    /**
     * Get the performance service for custom performance tracking if needed.
     */
    protected ScheduledTaskPerformanceService getPerformanceService() {
        return performanceService;
    }
}