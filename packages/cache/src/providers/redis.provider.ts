import { Redis } from 'ioredis';
import { 
  CacheProvider, 
  CacheStats, 
  CacheOperationError, 
  CacheConnectionError,
  CacheTimeoutError,
  CacheSerializationOptions,
  SerializationType
} from '../types';
import { RedisConfig } from '../config/redis.config';
import { CacheSerializer } from '../utils/serializer';
import { CacheCompressor } from '../utils/compressor';

export class RedisProvider implements CacheProvider {
  private redis: Redis;
  private stats: CacheStats;
  private serializer: CacheSerializer;
  private compressor: CacheCompressor;
  private keyNaming: ReturnType<typeof RedisConfig.getKeyNamingStrategy>;

  constructor(
    redis?: Redis,
    private options: {
      serialization?: CacheSerializationOptions;
      compression?: boolean;
      keyPrefix?: string;
    } = {}
  ) {
    this.redis = redis || RedisConfig.createRedisConnection();
    this.stats = this.initializeStats();
    this.serializer = new CacheSerializer(options.serialization?.type || 'json');
    this.compressor = new CacheCompressor();
    this.keyNaming = RedisConfig.getKeyNamingStrategy();

    this.setupEventListeners();
  }

  private initializeStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
      missRate: 0
    };
  }

  private setupEventListeners(): void {
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.redis.on('ready', () => {
      console.log('Redis ready for operations');
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  private updateStats(operation: 'hit' | 'miss' | 'set' | 'delete' | 'eviction'): void {
    this.stats[operation === 'hit' ? 'hits' : operation === 'miss' ? 'misses' : `${operation}s` as keyof CacheStats]++;
    
    const total = this.stats.hits + this.stats.misses;
    if (total > 0) {
      this.stats.hitRate = this.stats.hits / total;
      this.stats.missRate = this.stats.misses / total;
    }
  }

  private async handleError(operation: string, key: string, error: any): Promise<never> {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new CacheConnectionError(
        `Redis connection failed during ${operation}`,
        'redis',
        error
      );
    }

    if (error.code === 'ETIMEDOUT') {
      throw new CacheTimeoutError(
        `Redis operation ${operation} timed out`,
        'redis',
        operation,
        key
      );
    }

    throw new CacheOperationError(
      `Redis ${operation} operation failed: ${error.message}`,
      error.code || 'UNKNOWN_ERROR',
      'redis',
      operation,
      key,
      error
    );
  }

  private async serializeValue(value: any): Promise<string | Buffer> {
    try {
      let serialized = this.serializer.serialize(value);
      
      if (this.options.compression && typeof serialized === 'string') {
        serialized = await this.compressor.compress(serialized);
      }
      
      return serialized;
    } catch (error) {
      throw new CacheOperationError(
        `Failed to serialize value: ${error.message}`,
        'SERIALIZATION_ERROR',
        'redis',
        'serialize',
        undefined,
        error
      );
    }
  }

  private async deserializeValue<T>(data: string | Buffer): Promise<T> {
    try {
      let processedData = data;
      
      if (this.options.compression && Buffer.isBuffer(data)) {
        processedData = await this.compressor.decompress(data);
      }
      
      return this.serializer.deserialize<T>(processedData);
    } catch (error) {
      throw new CacheOperationError(
        `Failed to deserialize value: ${error.message}`,
        'DESERIALIZATION_ERROR',
        'redis',
        'deserialize',
        undefined,
        error
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      
      if (data === null) {
        this.updateStats('miss');
        return null;
      }

      this.updateStats('hit');
      return await this.deserializeValue<T>(data);
    } catch (error) {
      return this.handleError('get', key, error);
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serializedValue = await this.serializeValue(value);
      
      if (ttl && ttl > 0) {
        await this.redis.setex(key, Math.ceil(ttl / 1000), serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }

      this.updateStats('set');
      this.stats.size++;
    } catch (error) {
      return this.handleError('set', key, error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      const deleted = result > 0;
      
      if (deleted) {
        this.updateStats('delete');
        this.stats.size = Math.max(0, this.stats.size - 1);
      }
      
      return deleted;
    } catch (error) {
      return this.handleError('delete', key, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const pattern = this.keyNaming.getNamespacePrefix() + '*';
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.size = 0;
      }
    } catch (error) {
      return this.handleError('clear', '*', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      return this.handleError('exists', key, error);
    }
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    try {
      const fullPattern = this.keyNaming.getNamespacePrefix() + pattern;
      return await this.redis.keys(fullPattern);
    } catch (error) {
      return this.handleError('keys', pattern, error);
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const ttlSeconds = await this.redis.ttl(key);
      return ttlSeconds > 0 ? ttlSeconds * 1000 : ttlSeconds; // Convert to milliseconds
    } catch (error) {
      return this.handleError('ttl', key, error);
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, Math.ceil(ttl / 1000));
      return result === 1;
    } catch (error) {
      return this.handleError('expire', key, error);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      // Get current size from Redis
      const pattern = this.keyNaming.getNamespacePrefix() + '*';
      const keys = await this.redis.keys(pattern);
      this.stats.size = keys.length;
      
      return { ...this.stats };
    } catch (error) {
      console.error('Failed to get Redis stats:', error);
      return { ...this.stats };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Redis-specific methods

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(...keys);
      return Promise.all(
        values.map(async (value) => {
          if (value === null) {
            this.updateStats('miss');
            return null;
          }
          this.updateStats('hit');
          return await this.deserializeValue<T>(value);
        })
      );
    } catch (error) {
      return this.handleError('mget', keys.join(','), error);
    }
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const { key, value, ttl } of keyValuePairs) {
        const serializedValue = await this.serializeValue(value);
        
        if (ttl && ttl > 0) {
          pipeline.setex(key, Math.ceil(ttl / 1000), serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      }
      
      await pipeline.exec();
      this.stats.sets += keyValuePairs.length;
      this.stats.size += keyValuePairs.length;
    } catch (error) {
      return this.handleError('mset', 'multiple', error);
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, amount);
    } catch (error) {
      return this.handleError('increment', key, error);
    }
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.decrby(key, amount);
    } catch (error) {
      return this.handleError('decrement', key, error);
    }
  }

  async getConnection(): Promise<Redis> {
    return this.redis;
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
      this.redis.disconnect();
    }
  }
}