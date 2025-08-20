package com.ecommerce.inventory.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis Configuration for caching and data storage
 * Provides Redis connection factory, templates, and cache managers with proper serialization
 */
@Configuration
@EnableCaching
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis", matchIfMissing = false)
public class RedisConfig {

    @Value("${spring.cache.redis.time-to-live:3600000}")
    private long defaultTtl;

    /**
     * Configure Redis connection factory with optimized settings
     */
    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        return new LettuceConnectionFactory();
    }

    /**
     * Configure ObjectMapper for Redis serialization with proper Java 8 time support
     */
    @Bean
    public ObjectMapper redisObjectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        objectMapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ObjectMapper.DefaultTyping.NON_FINAL);
        objectMapper.registerModule(new JavaTimeModule());
        return objectMapper;
    }

    /**
     * Configure Redis template with proper serialization for general Redis operations
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory, ObjectMapper redisObjectMapper) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Use String serializer for keys
        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);

        // Use Jackson serializer for values
        Jackson2JsonRedisSerializer<Object> jackson2JsonRedisSerializer = new Jackson2JsonRedisSerializer<>(redisObjectMapper, Object.class);
        template.setValueSerializer(jackson2JsonRedisSerializer);
        template.setHashValueSerializer(jackson2JsonRedisSerializer);

        template.setDefaultSerializer(jackson2JsonRedisSerializer);
        template.afterPropertiesSet();
        return template;
    }

    /**
     * Configure Redis cache manager with TTL configurations for different data types
     */
    @Bean
    @Primary
    public CacheManager redisCacheManager(RedisConnectionFactory connectionFactory, ObjectMapper redisObjectMapper) {
        // Default cache configuration
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMillis(defaultTtl))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer(redisObjectMapper)))
                .disableCachingNullValues();

        // Specific cache configurations with different TTLs
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        
        // Product cache - 2 hours TTL
        cacheConfigurations.put("products", defaultConfig.entryTtl(Duration.ofHours(2)));
        
        // Category cache - 4 hours TTL (categories change less frequently)
        cacheConfigurations.put("categories", defaultConfig.entryTtl(Duration.ofHours(4)));
        
        // Supplier cache - 6 hours TTL
        cacheConfigurations.put("suppliers", defaultConfig.entryTtl(Duration.ofHours(6)));
        
        // Inventory cache - 30 minutes TTL (needs to be fresh)
        cacheConfigurations.put("inventory", defaultConfig.entryTtl(Duration.ofMinutes(30)));
        
        // User cache - 1 hour TTL
        cacheConfigurations.put("users", defaultConfig.entryTtl(Duration.ofHours(1)));
        
        // Order cache - 1 hour TTL
        cacheConfigurations.put("orders", defaultConfig.entryTtl(Duration.ofHours(1)));
        
        // Search results cache - 15 minutes TTL
        cacheConfigurations.put("search", defaultConfig.entryTtl(Duration.ofMinutes(15)));
        
        // Reports cache - 4 hours TTL
        cacheConfigurations.put("reports", defaultConfig.entryTtl(Duration.ofHours(4)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .transactionAware()
                .build();
    }

    /**
     * Redis key naming strategy configuration
     */
    @Bean
    public RedisKeyNamingStrategy redisKeyNamingStrategy() {
        return new RedisKeyNamingStrategy();
    }

    /**
     * Custom key naming strategy for Redis keys with namespace management
     */
    public static class RedisKeyNamingStrategy {
        private static final String NAMESPACE_PREFIX = "inventory:";
        private static final String SEPARATOR = ":";

        public String generateKey(String cacheName, Object key) {
            return NAMESPACE_PREFIX + cacheName + SEPARATOR + key.toString();
        }

        public String generateKey(String cacheName, String subNamespace, Object key) {
            return NAMESPACE_PREFIX + cacheName + SEPARATOR + subNamespace + SEPARATOR + key.toString();
        }

        public String getNamespacePrefix() {
            return NAMESPACE_PREFIX;
        }

        public String getCachePrefix(String cacheName) {
            return NAMESPACE_PREFIX + cacheName + SEPARATOR;
        }
    }
}