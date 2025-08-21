import { Redis, RedisOptions } from 'ioredis';
import { CacheConfig, CacheConfigOptions } from '../types';

/**
 * Redis Configuration for caching and data storage
 * Converted from Java Spring Boot RedisConfig.java
 * Provides Redis connection factory, templates, and cache managers with proper serialization
 */

export interface RedisConfigOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  keepAlive?: number;
  family?: number;
  connectTimeout?: number;
  commandTimeout?: number;
}

export interface CacheManagerConfig {
  defaultTtl: number;
  cacheConfigurations: Map<string, CacheConfig>;
  namespacePrefix: string;
  transactionAware: boolean;
}

export class RedisConfig {
  private static readonly DEFAULT_TTL = 3600000; // 1 hour in milliseconds
  private static readonly NAMESPACE_PREFIX = 'inventory:';
  private static readonly SEPARATOR = ':';

  /**
   * Create Redis connection with optimized settings
   */
  static createRedisConnection(options: RedisConfigOptions = {}): Redis {
    const defaultOptions: RedisOptions = {
      host: options.host || process.env.REDIS_HOST || 'localhost',
      port: options.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: options.password || process.env.REDIS_PASSWORD,
      db: options.db || parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: options.keyPrefix || this.NAMESPACE_PREFIX,
      retryDelayOnFailover: options.retryDelayOnFailover || 100,
      maxRetriesPerRequest: options.maxRetriesPerRequest || 3,
      lazyConnect: options.lazyConnect ?? true,
      keepAlive: options.keepAlive || 30000,
      family: options.family || 4,
      connectTimeout: options.connectTimeout || 10000,
      commandTimeout: options.commandTimeout || 5000,
    };

    return new Redis(defaultOptions);
  }

  /**
   * Get cache manager configuration with TTL settings for different data types
   * Equivalent to Java's redisCacheManager bean
   */
  static getCacheManagerConfig(): CacheManagerConfig {
    const defaultTtl = parseInt(process.env.CACHE_DEFAULT_TTL || this.DEFAULT_TTL.toString());
    
    const cacheConfigurations = new Map<string, CacheConfig>([
      // Product cache - 2 hours TTL
      ['products', {
        ttl: 2 * 60 * 60 * 1000, // 2 hours
        maxSize: 10000,
        compression: true,
        serialization: 'json'
      }],
      
      // Category cache - 4 hours TTL (categories change less frequently)
      ['categories', {
        ttl: 4 * 60 * 60 * 1000, // 4 hours
        maxSize: 1000,
        compression: true,
        serialization: 'json'
      }],
      
      // Supplier cache - 6 hours TTL
      ['suppliers', {
        ttl: 6 * 60 * 60 * 1000, // 6 hours
        maxSize: 5000,
        compression: true,
        serialization: 'json'
      }],
      
      // Inventory cache - 30 minutes TTL (needs to be fresh)
      ['inventory', {
        ttl: 30 * 60 * 1000, // 30 minutes
        maxSize: 50000,
        compression: false, // Fast access needed
        serialization: 'json'
      }],
      
      // User cache - 1 hour TTL
      ['users', {
        ttl: 60 * 60 * 1000, // 1 hour
        maxSize: 100000,
        compression: true,
        serialization: 'json'
      }],
      
      // Order cache - 1 hour TTL
      ['orders', {
        ttl: 60 * 60 * 1000, // 1 hour
        maxSize: 50000,
        compression: true,
        serialization: 'json'
      }],
      
      // Search results cache - 15 minutes TTL
      ['search', {
        ttl: 15 * 60 * 1000, // 15 minutes
        maxSize: 10000,
        compression: true,
        serialization: 'json'
      }],
      
      // Reports cache - 4 hours TTL
      ['reports', {
        ttl: 4 * 60 * 60 * 1000, // 4 hours
        maxSize: 1000,
        compression: true,
        serialization: 'json'
      }]
    ]);

    return {
      defaultTtl,
      cacheConfigurations,
      namespacePrefix: this.NAMESPACE_PREFIX,
      transactionAware: true
    };
  }

  /**
   * Redis key naming strategy configuration
   * Equivalent to Java's RedisKeyNamingStrategy class
   */
  static getKeyNamingStrategy() {
    return {
      generateKey: (cacheName: string, key: string | number): string => {
        return `${this.NAMESPACE_PREFIX}${cacheName}${this.SEPARATOR}${key.toString()}`;
      },

      generateKeyWithSubNamespace: (cacheName: string, subNamespace: string, key: string | number): string => {
        return `${this.NAMESPACE_PREFIX}${cacheName}${this.SEPARATOR}${subNamespace}${this.SEPARATOR}${key.toString()}`;
      },

      getNamespacePrefix: (): string => {
        return this.NAMESPACE_PREFIX;
      },

      getCachePrefix: (cacheName: string): string => {
        return `${this.NAMESPACE_PREFIX}${cacheName}${this.SEPARATOR}`;
      },

      extractCacheName: (key: string): string | null => {
        if (!key.startsWith(this.NAMESPACE_PREFIX)) {
          return null;
        }
        const parts = key.substring(this.NAMESPACE_PREFIX.length).split(this.SEPARATOR);
        return parts.length > 0 ? parts[0] : null;
      },

      extractKeyFromFullKey: (fullKey: string): string | null => {
        if (!fullKey.startsWith(this.NAMESPACE_PREFIX)) {
          return null;
        }
        const parts = fullKey.substring(this.NAMESPACE_PREFIX.length).split(this.SEPARATOR);
        return parts.length > 1 ? parts.slice(1).join(this.SEPARATOR) : null;
      }
    };
  }

  /**
   * Get Redis connection health check configuration
   */
  static getHealthCheckConfig() {
    return {
      enabled: process.env.REDIS_HEALTH_CHECK_ENABLED !== 'false',
      interval: parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
      timeout: parseInt(process.env.REDIS_HEALTH_CHECK_TIMEOUT || '5000'), // 5 seconds
      retries: parseInt(process.env.REDIS_HEALTH_CHECK_RETRIES || '3')
    };
  }

  /**
   * Get Redis performance monitoring configuration
   */
  static getMonitoringConfig() {
    return {
      enabled: process.env.REDIS_MONITORING_ENABLED !== 'false',
      metricsInterval: parseInt(process.env.REDIS_METRICS_INTERVAL || '60000'), // 1 minute
      slowLogEnabled: process.env.REDIS_SLOW_LOG_ENABLED !== 'false',
      slowLogThreshold: parseInt(process.env.REDIS_SLOW_LOG_THRESHOLD || '100'), // 100ms
      commandStatsEnabled: process.env.REDIS_COMMAND_STATS_ENABLED !== 'false'
    };
  }
}

export default RedisConfig;