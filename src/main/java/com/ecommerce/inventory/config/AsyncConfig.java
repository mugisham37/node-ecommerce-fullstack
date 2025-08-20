package com.ecommerce.inventory.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Configuration for asynchronous event processing with custom thread pools.
 * Provides optimized thread pool configurations for different types of event processing.
 */
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    private static final Logger logger = LoggerFactory.getLogger(AsyncConfig.class);
    
    /**
     * Primary executor for general event processing.
     */
    @Bean(name = "eventProcessingExecutor")
    public Executor eventProcessingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("EventProcessor-");
        executor.setKeepAliveSeconds(60);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.setRejectedExecutionHandler(new EventProcessingRejectedExecutionHandler());
        executor.initialize();
        
        logger.info("Initialized event processing executor with core pool size: {}, max pool size: {}, queue capacity: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());
        
        return executor;
    }
    
    /**
     * High-priority executor for critical inventory events.
     */
    @Bean(name = "inventoryEventExecutor")
    public Executor inventoryEventExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("InventoryEvent-");
        executor.setKeepAliveSeconds(30);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(20);
        executor.setRejectedExecutionHandler(new InventoryEventRejectedExecutionHandler());
        executor.initialize();
        
        logger.info("Initialized inventory event executor with core pool size: {}, max pool size: {}, queue capacity: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());
        
        return executor;
    }
    
    /**
     * Executor for order processing events.
     */
    @Bean(name = "orderEventExecutor")
    public Executor orderEventExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(15);
        executor.setQueueCapacity(75);
        executor.setThreadNamePrefix("OrderEvent-");
        executor.setKeepAliveSeconds(45);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(25);
        executor.setRejectedExecutionHandler(new OrderEventRejectedExecutionHandler());
        executor.initialize();
        
        logger.info("Initialized order event executor with core pool size: {}, max pool size: {}, queue capacity: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());
        
        return executor;
    }
    
    /**
     * Low-priority executor for notification and reporting events.
     */
    @Bean(name = "notificationEventExecutor")
    public Executor notificationEventExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("NotificationEvent-");
        executor.setKeepAliveSeconds(120);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.setRejectedExecutionHandler(new NotificationEventRejectedExecutionHandler());
        executor.initialize();
        
        logger.info("Initialized notification event executor with core pool size: {}, max pool size: {}, queue capacity: {}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());
        
        return executor;
    }
    
    @Override
    public Executor getAsyncExecutor() {
        return eventProcessingExecutor();
    }
    
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return new CustomAsyncUncaughtExceptionHandler();
    }
    
    /**
     * Custom exception handler for async event processing.
     */
    private static class CustomAsyncUncaughtExceptionHandler implements AsyncUncaughtExceptionHandler {
        @Override
        public void handleUncaughtException(Throwable ex, java.lang.reflect.Method method, Object... params) {
            logger.error("Uncaught exception in async event processing. Method: {}, Parameters: {}", 
                        method.getName(), params, ex);
        }
    }
    
    /**
     * Custom rejected execution handler for general event processing.
     */
    private static class EventProcessingRejectedExecutionHandler implements RejectedExecutionHandler {
        @Override
        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
            logger.warn("Event processing task rejected. Active threads: {}, Pool size: {}, Queue size: {}", 
                       executor.getActiveCount(), executor.getPoolSize(), executor.getQueue().size());
            
            // Try to execute in caller thread as fallback
            if (!executor.isShutdown()) {
                try {
                    r.run();
                    logger.info("Successfully executed rejected event processing task in caller thread");
                } catch (Exception e) {
                    logger.error("Failed to execute rejected event processing task in caller thread", e);
                }
            }
        }
    }
    
    /**
     * Custom rejected execution handler for inventory events.
     */
    private static class InventoryEventRejectedExecutionHandler implements RejectedExecutionHandler {
        @Override
        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
            logger.error("Critical inventory event processing task rejected. Active threads: {}, Pool size: {}, Queue size: {}", 
                        executor.getActiveCount(), executor.getPoolSize(), executor.getQueue().size());
            
            // For inventory events, we must execute them even if rejected
            if (!executor.isShutdown()) {
                r.run();
                logger.warn("Executed rejected inventory event in caller thread");
            }
        }
    }
    
    /**
     * Custom rejected execution handler for order events.
     */
    private static class OrderEventRejectedExecutionHandler implements RejectedExecutionHandler {
        @Override
        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
            logger.warn("Order event processing task rejected. Active threads: {}, Pool size: {}, Queue size: {}", 
                       executor.getActiveCount(), executor.getPoolSize(), executor.getQueue().size());
            
            // Try to execute in caller thread for order events
            if (!executor.isShutdown()) {
                try {
                    r.run();
                    logger.info("Successfully executed rejected order event task in caller thread");
                } catch (Exception e) {
                    logger.error("Failed to execute rejected order event task in caller thread", e);
                }
            }
        }
    }
    
    /**
     * Custom rejected execution handler for notification events.
     */
    private static class NotificationEventRejectedExecutionHandler implements RejectedExecutionHandler {
        @Override
        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
            logger.info("Notification event processing task rejected (acceptable for low-priority events). " +
                       "Active threads: {}, Pool size: {}, Queue size: {}", 
                       executor.getActiveCount(), executor.getPoolSize(), executor.getQueue().size());
            
            // For notifications, we can drop the task if system is overloaded
            // This is acceptable as notifications are not critical
        }
    }
}