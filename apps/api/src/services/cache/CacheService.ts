import { createClient, RedisClientType } from 'redis';
import { Logger } from '../../utils/logger';

/**
 * Cache Service
 * Provides Redis-based caching functionality
 */
export class CacheService {
  private static instance: CacheService;
  private client: RedisClientType;
  private logger = Logger.getInstance();
  private isConnected = false;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DB || '0'),
      socket: {
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000'),
        commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000'),
      },
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis client error:', error);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      this.logger.warn('Redis client disconnected');
      this.isConnected = false;
    });

    // Connect to Redis
    this.connect();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
    }
  }

  /**
   * Set a key-value pair in cache with optional expiration
   */
  public async set(key: string, value: string, expirationInSeconds?: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      if (expirationInSeconds) {
        await this.client.setEx(key, expirationInSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error('Cache set error:', error);
    }
  }

  /**
   * Get a value from cache by key
   */
  public async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  public async del(key: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache delete');
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error('Cache delete error:', error);
    }
  }

  /**
   * Check if a key exists in cache
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache exists check');
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Set expiration for a key
   */
  public async expire(key: string, seconds: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache expire');
      return;
    }

    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      this.logger.error('Cache expire error:', error);
    }
  }

  /**
   * Get multiple keys at once
   */
  public async mget(keys: string[]): Promise<(string | null)[]> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache mget');
      return keys.map(() => null);
    }

    try {
      return await this.client.mGet(keys);
    } catch (error) {
      this.logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs at once
   */
  public async mset(keyValues: Record<string, string>): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache mset');
      return;
    }

    try {
      await this.client.mSet(keyValues);
    } catch (error) {
      this.logger.error('Cache mset error:', error);
    }
  }

  /**
   * Increment a numeric value in cache
   */
  public async incr(key: string): Promise<number> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache incr');
      return 0;
    }

    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error('Cache incr error:', error);
      return 0;
    }
  }

  /**
   * Get keys matching a pattern
   */
  public async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache keys');
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error('Cache keys error:', error);
      return [];
    }
  }

  /**
   * Clear all cache entries (use with caution)
   */
  public async flushAll(): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache flush');
      return;
    }

    try {
      await this.client.flushAll();
      this.logger.info('Cache flushed');
    } catch (error) {
      this.logger.error('Cache flush error:', error);
    }
  }

  /**
   * Health check for cache service
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Close the cache connection
   */
  public async close(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.info('Cache connection closed');
    } catch (error) {
      this.logger.error('Error closing cache connection:', error);
    }
  }
}