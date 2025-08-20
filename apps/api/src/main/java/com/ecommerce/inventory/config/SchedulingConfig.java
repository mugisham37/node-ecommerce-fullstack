package com.ecommerce.inventory.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Configuration for scheduled task processing with custom thread pools and monitoring.
 * Provides optimized thread pool configurations for different types of scheduled tasks.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig implements SchedulingConfigurer {
    
    private static final Logger logger = LoggerFactory.getLogger(SchedulingConfig.class);
    
    /**
     * Primary task scheduler for general scheduled tasks.
     */
    @Bean(name = "taskScheduler")
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(10);
        scheduler.setThreadNamePrefix("ScheduledTask-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(60);
        scheduler.setRejectedExecutionHandler(new ScheduledTaskRejectedExecutionHandler());
        scheduler.initialize();
        
        logger.info("Initialized task scheduler with pool size: {}", scheduler.getPoolSize());
        
        return scheduler;
    }
    
    /**
     * High-priority scheduler for critical inventory monitoring tasks.
     */
    @Bean(name = "inventoryTaskScheduler")
    public TaskScheduler inventoryTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(5);
        scheduler.setThreadNamePrefix("InventoryTask-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(30);
        scheduler.setRejectedExecutionHandler(new InventoryTaskRejectedExecutionHandler());
        scheduler.initialize();
        
        logger.info("Initialized inventory task scheduler with pool size: {}", scheduler.getPoolSize());
        
        return scheduler;
    }
    
    /**
     * Low-priority scheduler for maintenance and optimization tasks.
     */
    @Bean(name = "maintenanceTaskScheduler")
    public TaskScheduler maintenanceTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(3);
        scheduler.setThreadNamePrefix("MaintenanceTask-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(120);
        scheduler.setRejectedExecutionHandler(new MaintenanceTaskRejectedExecutionHandler());
        scheduler.initialize();
        
        logger.info("Initialized maintenance task scheduler with pool size: {}", scheduler.getPoolSize());
        
        return scheduler;
    }
    
    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        taskRegistrar.setScheduler(taskScheduler());
    }
    
    /**
     * Custom rejected execution handler for general scheduled tasks.
     */
    private static class ScheduledTaskRejectedExecutionHandler implements RejectedExecutionHandler {
        @Override
        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
            logger.warn("Scheduled task rejected. Active threads: {}, Pool size: {}, Queue size: {}", 
                       executor.getActiveCount(), executor.getPoolSize(), executor.getQueue().size());
            
            // Log the rejection but don't execute in caller thread for scheduled tasks
            // as this could block the scheduler
        }
    }
    
    /**
     * Custom rejected execution handler for inventory tasks.
     */
    private static class InventoryTaskRejectedExecutionHandler implements RejectedExecutionHandler {
        @Override
        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
            logger.error("Critical inventory scheduled task rejected. Active threads: {}, Pool size: {}, Queue size: {}", 
                        executor.getActiveCount(), executor.getPoolSize(), executor.getQueue().size());
            
            // For critical inventory tasks, we should try to execute them
            if (!executor.isShutdown()) {
                try {
                    r.run();
                    logger.warn("Executed rejected inventory task in caller thread");
                } catch (Exception e) {
                    logger.error("Failed to execute rejected inventory task", e);
                }
            }
        }
    }
    
    /**
     * Custom rejected execution handler for maintenance tasks.
     */
    private static class MaintenanceTaskRejectedExecutionHandler implements RejectedExecutionHandler {
        @Override
        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
            logger.info("Maintenance scheduled task rejected (acceptable for low-priority tasks). " +
                       "Active threads: {}, Pool size: {}, Queue size: {}", 
                       executor.getActiveCount(), executor.getPoolSize(), executor.getQueue().size());
            
            // For maintenance tasks, we can skip execution if system is overloaded
            // These are not critical for immediate system operation
        }
    }
}