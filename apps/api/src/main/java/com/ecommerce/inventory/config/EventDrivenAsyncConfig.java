package com.ecommerce.inventory.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Async configuration for event-driven workflow processing.
 * Provides custom thread pools for different types of event processing.
 */
@Configuration
@EnableAsync
public class EventDrivenAsyncConfig {

    private static final Logger logger = LoggerFactory.getLogger(EventDrivenAsyncConfig.class);

    /**
     * Thread pool executor for inventory event processing
     */
    @Bean("inventoryEventExecutor")
    public Executor inventoryEventExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(15);
        executor.setQueueCapacity(100);
        executor.setKeepAliveSeconds(60);
        executor.setThreadNamePrefix("InventoryEvent-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        
        // Custom rejection handler
        executor.setRejectedExecutionHandler(new CustomRejectedExecutionHandler("InventoryEvent"));
        
        executor.initialize();
        
        logger.info("Initialized inventory event executor with core pool size: {}, max pool size: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize());
        
        return executor;
    }

    /**
     * Thread pool executor for order event processing
     */
    @Bean("orderEventExecutor")
    public Executor orderEventExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(8);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(200);
        executor.setKeepAliveSeconds(60);
        executor.setThreadNamePrefix("OrderEvent-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        
        // Custom rejection handler
        executor.setRejectedExecutionHandler(new CustomRejectedExecutionHandler("OrderEvent"));
        
        executor.initialize();
        
        logger.info("Initialized order event executor with core pool size: {}, max pool size: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize());
        
        return executor;
    }

    /**
     * Thread pool executor for cache event processing
     */
    @Bean("cacheEventExecutor")
    public Executor cacheEventExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setKeepAliveSeconds(30);
        executor.setThreadNamePrefix("CacheEvent-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(15);
        
        // Custom rejection handler
        executor.setRejectedExecutionHandler(new CustomRejectedExecutionHandler("CacheEvent"));
        
        executor.initialize();
        
        logger.info("Initialized cache event executor with core pool size: {}, max pool size: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize());
        
        return executor;
    }

    /**
     * Thread pool executor for workflow orchestration
     */
    @Bean("workflowExecutor")
    public Executor workflowExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(12);
        executor.setQueueCapacity(100);
        executor.setKeepAliveSeconds(60);
        executor.setThreadNamePrefix("Workflow-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(45);
        
        // Custom rejection handler
        executor.setRejectedExecutionHandler(new CustomRejectedExecutionHandler("Workflow"));
        
        executor.initialize();
        
        logger.info("Initialized workflow executor with core pool size: {}, max pool size: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize());
        
        return executor;
    }

    /**
     * Thread pool executor for notification processing
     */
    @Bean("notificationExecutor")
    public Executor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setKeepAliveSeconds(30);
        executor.setThreadNamePrefix("Notification-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(20);
        
        // Custom rejection handler
        executor.setRejectedExecutionHandler(new CustomRejectedExecutionHandler("Notification"));
        
        executor.initialize();
        
        logger.info("Initialized notification executor with core pool size: {}, max pool size: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize());
        
        return executor;
    }

    /**
     * Custom rejected execution handler for event processing
     */
    private static class CustomRejectedExecutionHandler implements RejectedExecutionHandler {
        
        private final String executorName;
        private final Logger logger = LoggerFactory.getLogger(CustomRejectedExecutionHandler.class);
        
        public CustomRejectedExecutionHandler(String executorName) {
            this.executorName = executorName;
        }
        
        @Override
        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
            logger.error("Task rejected by {} executor. Active threads: {}, Pool size: {}, Queue size: {}", 
                        executorName, executor.getActiveCount(), executor.getPoolSize(), executor.getQueue().size());
            
            // Try to execute in the caller thread as fallback
            try {
                logger.warn("Attempting to execute rejected task in caller thread for {} executor", executorName);
                r.run();
            } catch (Exception e) {
                logger.error("Failed to execute rejected task in caller thread for {} executor", executorName, e);
                throw new RuntimeException("Task execution failed after rejection", e);
            }
        }
    }
}