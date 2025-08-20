package com.ecommerce.inventory.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuator.health.Health;
import org.springframework.boot.actuator.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis Health Check Configuration
 * Provides comprehensive health monitoring for Redis connections and operations
 */
@Component
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis", matchIfMissing = false)
public class RedisHealthConfig implements HealthIndicator {

    private static final Logger logger = LoggerFactory.getLogger(RedisHealthConfig.class);
    private static final String HEALTH_CHECK_KEY = "inventory:health:check";
    private static final String HEALTH_CHECK_VALUE = "OK";
    private static final Duration HEALTH_CHECK_TIMEOUT = Duration.ofSeconds(5);

    private final RedisConnectionFactory redisConnectionFactory;
    private final RedisTemplate<String, Object> redisTemplate;

    public RedisHealthConfig(RedisConnectionFactory redisConnectionFactory, RedisTemplate<String, Object> redisTemplate) {
        this.redisConnectionFactory = redisConnectionFactory;
        this.redisTemplate = redisTemplate;
    }

    @Override
    public Health health() {
        try {
            Map<String, Object> details = new HashMap<>();
            
            // Test basic connection
            boolean connectionHealthy = testConnection(details);
            
            // Test read/write operations
            boolean operationsHealthy = testOperations(details);
            
            // Test connection pool status
            testConnectionPool(details);
            
            if (connectionHealthy && operationsHealthy) {
                return Health.up()
                        .withDetails(details)
                        .build();
            } else {
                return Health.down()
                        .withDetails(details)
                        .build();
            }
            
        } catch (Exception e) {
            logger.error("Redis health check failed", e);
            return Health.down()
                    .withException(e)
                    .withDetail("error", e.getMessage())
                    .withDetail("timestamp", LocalDateTime.now())
                    .build();
        }
    }

    /**
     * Test basic Redis connection
     */
    private boolean testConnection(Map<String, Object> details) {
        try {
            RedisConnection connection = redisConnectionFactory.getConnection();
            String pong = connection.ping();
            connection.close();
            
            details.put("connection", "UP");
            details.put("ping", pong);
            return true;
            
        } catch (Exception e) {
            logger.warn("Redis connection test failed", e);
            details.put("connection", "DOWN");
            details.put("connectionError", e.getMessage());
            return false;
        }
    }

    /**
     * Test Redis read/write operations
     */
    private boolean testOperations(Map<String, Object> details) {
        try {
            long startTime = System.currentTimeMillis();
            
            // Test write operation
            redisTemplate.opsForValue().set(HEALTH_CHECK_KEY, HEALTH_CHECK_VALUE, HEALTH_CHECK_TIMEOUT);
            
            // Test read operation
            String value = (String) redisTemplate.opsForValue().get(HEALTH_CHECK_KEY);
            
            // Test delete operation
            redisTemplate.delete(HEALTH_CHECK_KEY);
            
            long responseTime = System.currentTimeMillis() - startTime;
            
            boolean operationsSuccessful = HEALTH_CHECK_VALUE.equals(value);
            
            details.put("operations", operationsSuccessful ? "UP" : "DOWN");
            details.put("responseTime", responseTime + "ms");
            
            if (!operationsSuccessful) {
                details.put("operationsError", "Read/write test failed - expected: " + HEALTH_CHECK_VALUE + ", got: " + value);
            }
            
            return operationsSuccessful;
            
        } catch (Exception e) {
            logger.warn("Redis operations test failed", e);
            details.put("operations", "DOWN");
            details.put("operationsError", e.getMessage());
            return false;
        }
    }

    /**
     * Test connection pool status
     */
    private void testConnectionPool(Map<String, Object> details) {
        try {
            // Get connection pool information if available
            RedisConnection connection = redisConnectionFactory.getConnection();
            
            // Add connection factory type information
            details.put("connectionFactory", redisConnectionFactory.getClass().getSimpleName());
            details.put("timestamp", LocalDateTime.now());
            
            connection.close();
            
        } catch (Exception e) {
            logger.warn("Redis connection pool test failed", e);
            details.put("connectionPoolError", e.getMessage());
        }
    }
}