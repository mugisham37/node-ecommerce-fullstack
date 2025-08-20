package com.ecommerce.inventory.service;

import com.ecommerce.inventory.config.RedisConfig;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Redis Monitoring Service
 * Provides comprehensive monitoring and metrics collection for Redis operations
 */
@Service
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis", matchIfMissing = false)
public class RedisMonitoringService {

    private static final Logger logger = LoggerFactory.getLogger(RedisMonitoringService.class);

    private final RedisConnectionFactory redisConnectionFactory;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisConfig.RedisKeyNamingStrategy keyNamingStrategy;
    private final MeterRegistry meterRegistry;

    // Metrics
    private final Counter redisConnectionErrors;
    private final Counter redisOperationErrors;
    private final Timer redisOperationTimer;
    private final AtomicLong activeConnections = new AtomicLong(0);
    private final AtomicLong totalMemoryUsed = new AtomicLong(0);
    private final AtomicLong totalKeysCount = new AtomicLong(0);

    public RedisMonitoringService(RedisConnectionFactory redisConnectionFactory,
                                RedisTemplate<String, Object> redisTemplate,
                                RedisConfig.RedisKeyNamingStrategy keyNamingStrategy,
                                MeterRegistry meterRegistry) {
        this.redisConnectionFactory = redisConnectionFactory;
        this.redisTemplate = redisTemplate;
        this.keyNamingStrategy = keyNamingStrategy;
        this.meterRegistry = meterRegistry;

        // Initialize metrics
        this.redisConnectionErrors = Counter.builder("redis.connection.errors")
                .description("Number of Redis connection errors")
                .register(meterRegistry);

        this.redisOperationErrors = Counter.builder("redis.operation.errors")
                .description("Number of Redis operation errors")
                .register(meterRegistry);

        this.redisOperationTimer = Timer.builder("redis.operation.duration")
                .description("Redis operation execution time")
                .register(meterRegistry);

        // Register gauges
        Gauge.builder("redis.connections.active")
                .description("Number of active Redis connections")
                .register(meterRegistry, this, RedisMonitoringService::getActiveConnections);

        Gauge.builder("redis.memory.used")
                .description("Redis memory usage in bytes")
                .register(meterRegistry, this, RedisMonitoringService::getTotalMemoryUsed);

        Gauge.builder("redis.keys.total")
                .description("Total number of keys in Redis")
                .register(meterRegistry, this, RedisMonitoringService::getTotalKeysCount);
    }

    /**
     * Scheduled monitoring task to collect Redis metrics
     */
    @Scheduled(fixedRate = 30000) // Every 30 seconds
    public void collectRedisMetrics() {
        try {
            Timer.Sample sample = Timer.start(meterRegistry);
            
            RedisConnection connection = redisConnectionFactory.getConnection();
            
            try {
                // Get Redis info
                Properties info = connection.info();
                
                // Update memory usage
                String usedMemory = info.getProperty("used_memory");
                if (usedMemory != null) {
                    totalMemoryUsed.set(Long.parseLong(usedMemory));
                }
                
                // Count keys with our namespace
                Long keyCount = connection.dbSize();
                if (keyCount != null) {
                    totalKeysCount.set(keyCount);
                }
                
                // Update connection count (simplified)
                String connectedClients = info.getProperty("connected_clients");
                if (connectedClients != null) {
                    activeConnections.set(Long.parseLong(connectedClients));
                }
                
                logger.debug("Redis metrics collected - Memory: {} bytes, Keys: {}, Connections: {}", 
                           totalMemoryUsed.get(), totalKeysCount.get(), activeConnections.get());
                
            } finally {
                connection.close();
                sample.stop(redisOperationTimer);
            }
            
        } catch (Exception e) {
            logger.warn("Failed to collect Redis metrics", e);
            redisOperationErrors.increment();
        }
    }

    /**
     * Monitor Redis connection health
     */
    @Scheduled(fixedRate = 60000) // Every minute
    public void monitorConnectionHealth() {
        try {
            RedisConnection connection = redisConnectionFactory.getConnection();
            
            try {
                // Test connection with ping
                String pong = connection.ping();
                if (!"PONG".equals(pong)) {
                    logger.warn("Redis ping returned unexpected response: {}", pong);
                    redisConnectionErrors.increment();
                }
                
                logger.debug("Redis connection health check passed at {}", LocalDateTime.now());
                
            } finally {
                connection.close();
            }
            
        } catch (Exception e) {
            logger.error("Redis connection health check failed", e);
            redisConnectionErrors.increment();
        }
    }

    /**
     * Clean up expired keys and optimize memory usage
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    public void performMaintenanceTasks() {
        try {
            Timer.Sample sample = Timer.start(meterRegistry);
            
            // Count keys in our namespace
            String pattern = keyNamingStrategy.getNamespacePrefix() + "*";
            Long namespaceKeyCount = redisTemplate.countExistingKeys(
                redisTemplate.keys(pattern)
            );
            
            logger.debug("Maintenance task completed - Namespace keys: {}", namespaceKeyCount);
            
            sample.stop(Timer.builder("redis.maintenance.duration")
                    .description("Redis maintenance task duration")
                    .register(meterRegistry));
            
        } catch (Exception e) {
            logger.warn("Redis maintenance task failed", e);
            redisOperationErrors.increment();
        }
    }

    /**
     * Get Redis server information
     */
    public Properties getRedisInfo() {
        try {
            RedisConnection connection = redisConnectionFactory.getConnection();
            try {
                return connection.info();
            } finally {
                connection.close();
            }
        } catch (Exception e) {
            logger.error("Failed to get Redis info", e);
            redisConnectionErrors.increment();
            return new Properties();
        }
    }

    /**
     * Get cache statistics for monitoring
     */
    public RedisStatistics getRedisStatistics() {
        return RedisStatistics.builder()
                .activeConnections(activeConnections.get())
                .totalMemoryUsed(totalMemoryUsed.get())
                .totalKeysCount(totalKeysCount.get())
                .connectionErrors(redisConnectionErrors.count())
                .operationErrors(redisOperationErrors.count())
                .timestamp(LocalDateTime.now())
                .build();
    }

    // Getter methods for metrics
    public double getActiveConnections() {
        return activeConnections.get();
    }

    public double getTotalMemoryUsed() {
        return totalMemoryUsed.get();
    }

    public double getTotalKeysCount() {
        return totalKeysCount.get();
    }

    /**
     * Redis statistics data class
     */
    public static class RedisStatistics {
        private final long activeConnections;
        private final long totalMemoryUsed;
        private final long totalKeysCount;
        private final double connectionErrors;
        private final double operationErrors;
        private final LocalDateTime timestamp;

        private RedisStatistics(Builder builder) {
            this.activeConnections = builder.activeConnections;
            this.totalMemoryUsed = builder.totalMemoryUsed;
            this.totalKeysCount = builder.totalKeysCount;
            this.connectionErrors = builder.connectionErrors;
            this.operationErrors = builder.operationErrors;
            this.timestamp = builder.timestamp;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public long getActiveConnections() { return activeConnections; }
        public long getTotalMemoryUsed() { return totalMemoryUsed; }
        public long getTotalKeysCount() { return totalKeysCount; }
        public double getConnectionErrors() { return connectionErrors; }
        public double getOperationErrors() { return operationErrors; }
        public LocalDateTime getTimestamp() { return timestamp; }

        public static class Builder {
            private long activeConnections;
            private long totalMemoryUsed;
            private long totalKeysCount;
            private double connectionErrors;
            private double operationErrors;
            private LocalDateTime timestamp;

            public Builder activeConnections(long activeConnections) {
                this.activeConnections = activeConnections;
                return this;
            }

            public Builder totalMemoryUsed(long totalMemoryUsed) {
                this.totalMemoryUsed = totalMemoryUsed;
                return this;
            }

            public Builder totalKeysCount(long totalKeysCount) {
                this.totalKeysCount = totalKeysCount;
                return this;
            }

            public Builder connectionErrors(double connectionErrors) {
                this.connectionErrors = connectionErrors;
                return this;
            }

            public Builder operationErrors(double operationErrors) {
                this.operationErrors = operationErrors;
                return this;
            }

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public RedisStatistics build() {
                return new RedisStatistics(this);
            }
        }
    }
}