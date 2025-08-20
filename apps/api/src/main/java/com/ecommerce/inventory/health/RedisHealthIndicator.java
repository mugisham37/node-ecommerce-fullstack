package com.ecommerce.inventory.health;

import org.springframework.boot.actuator.health.Health;
import org.springframework.boot.actuator.health.HealthIndicator;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

/**
 * Custom health indicator for Redis with detailed connection and performance metrics
 */
@Component("redis")
public class RedisHealthIndicator implements HealthIndicator {

    private final RedisConnectionFactory redisConnectionFactory;
    private final RedisTemplate<String, Object> redisTemplate;

    @Autowired
    public RedisHealthIndicator(RedisConnectionFactory redisConnectionFactory, 
                               RedisTemplate<String, Object> redisTemplate) {
        this.redisConnectionFactory = redisConnectionFactory;
        this.redisTemplate = redisTemplate;
    }

    @Override
    public Health health() {
        try {
            return checkRedisHealth();
        } catch (Exception e) {
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .withDetail("timestamp", LocalDateTime.now())
                    .build();
        }
    }

    private Health checkRedisHealth() {
        Map<String, Object> details = new HashMap<>();
        details.put("timestamp", LocalDateTime.now());

        try (RedisConnection connection = redisConnectionFactory.getConnection()) {
            // Test basic connectivity with ping
            String pong = connection.ping();
            if (!"PONG".equals(pong)) {
                return Health.down()
                        .withDetails(details)
                        .withDetail("status", "Ping failed")
                        .withDetail("response", pong)
                        .build();
            }

            // Get Redis server info
            Properties info = connection.info();
            if (info != null) {
                details.put("redis.version", info.getProperty("redis_version"));
                details.put("redis.mode", info.getProperty("redis_mode"));
                details.put("redis.os", info.getProperty("os"));
                details.put("redis.uptime_in_seconds", info.getProperty("uptime_in_seconds"));
                details.put("redis.connected_clients", info.getProperty("connected_clients"));
                details.put("redis.used_memory_human", info.getProperty("used_memory_human"));
                details.put("redis.used_memory_peak_human", info.getProperty("used_memory_peak_human"));
                details.put("redis.total_commands_processed", info.getProperty("total_commands_processed"));
                details.put("redis.keyspace_hits", info.getProperty("keyspace_hits"));
                details.put("redis.keyspace_misses", info.getProperty("keyspace_misses"));
                
                // Calculate hit ratio
                String hits = info.getProperty("keyspace_hits");
                String misses = info.getProperty("keyspace_misses");
                if (hits != null && misses != null) {
                    long hitCount = Long.parseLong(hits);
                    long missCount = Long.parseLong(misses);
                    long total = hitCount + missCount;
                    if (total > 0) {
                        double hitRatio = (double) hitCount / total * 100;
                        details.put("redis.hit_ratio_percent", String.format("%.2f", hitRatio));
                    }
                }
            }

            // Test cache operations
            String testKey = "health_check_" + System.currentTimeMillis();
            String testValue = "test_value";
            
            try {
                // Test set operation
                long startTime = System.currentTimeMillis();
                redisTemplate.opsForValue().set(testKey, testValue);
                long setTime = System.currentTimeMillis() - startTime;
                
                // Test get operation
                startTime = System.currentTimeMillis();
                Object retrievedValue = redisTemplate.opsForValue().get(testKey);
                long getTime = System.currentTimeMillis() - startTime;
                
                // Test delete operation
                startTime = System.currentTimeMillis();
                redisTemplate.delete(testKey);
                long deleteTime = System.currentTimeMillis() - startTime;
                
                if (testValue.equals(retrievedValue)) {
                    details.put("cache.set_operation_ms", setTime);
                    details.put("cache.get_operation_ms", getTime);
                    details.put("cache.delete_operation_ms", deleteTime);
                    details.put("cache.operations_status", "All operations successful");
                } else {
                    return Health.down()
                            .withDetails(details)
                            .withDetail("cache.error", "Value mismatch in cache operations")
                            .build();
                }
            } catch (Exception e) {
                return Health.down()
                        .withDetails(details)
                        .withDetail("cache.error", "Cache operations failed: " + e.getMessage())
                        .build();
            }

            // Get database-specific info
            Properties dbInfo = connection.info("keyspace");
            if (dbInfo != null) {
                details.put("keyspace.info", dbInfo.toString());
            }

            return Health.up()
                    .withDetails(details)
                    .withDetail("status", "Connected and operational")
                    .build();

        } catch (Exception e) {
            return Health.down()
                    .withDetails(details)
                    .withDetail("error", e.getMessage())
                    .withDetail("error_type", e.getClass().getSimpleName())
                    .build();
        }
    }
}