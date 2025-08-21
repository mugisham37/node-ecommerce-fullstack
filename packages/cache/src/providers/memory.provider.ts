import NodeCache from 'node-cache';
import { 
  CacheProvider, 
  CacheStats, 
  CacheEntry,
  CacheOperationError
} from '../types';

export class MemoryProvider implements CacheProvider {
  private cache: NodeCache;
  private stats: CacheStats;
  private entries: Map<string, CacheEntry>;

  constructor(
    private options: {
      stdTTL?: number; // Standard TTL in seconds
      checkperiod?: number; // Check period for expired keys in seconds
      useClones?: boolean; // Use clones of stored values
      deleteOnExpire?: boolean; // Delete expired keys automatically
      maxKeys?: number; // Maximum number of keys
    } = {}
  ) {
    this.cache = new NodeCache({
      stdTTL: options.stdTTL || 0, // 0 means no expiration by default
      checkperiod: options.checkperiod || 600, // 10 minutes
      useClones: options.useClones ?? true,
      deleteOnExpire: options.deleteOnExpire ?? true,
      maxKeys: options.maxKeys || -1 // -1 means no limit
    });

    this.stats = this.initializeStats();
    this.entries = new Map();
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
    this.cache.on('set', (key: string, value: any) => {
      this.updateStats('set');
      this.updateEntry(key, value);
    });

    this.cache.on('del', (key: string, value: any) => {
      this.updateStats('delete');
      this.entries.delete(key);
    });

    this.cache.on('expired', (key: string, value: any) => {
      this.updateStats('eviction');
      this.entries.delete(key);
    });

    this.cache.on('flush', () => {
      this.entries.clear();
      this.stats.size = 0;
    });
  }

  private updateStats(operation: 'hit' | 'miss' | 'set' | 'delete' | 'eviction'): void {
    switch (operation) {
      case 'hit':
        this.stats.hits++;
        break;
      case 'miss':
        this.stats.misses++;
        break;
      case 'set':
        this.stats.sets++;
        this.stats.size = this.cache.keys().length;
        break;
      case 'delete':
        this.stats.deletes++;
        this.stats.size = this.cache.keys().length;
        break;
      case 'eviction':
        this.stats.evictions++;
        this.stats.size = this.cache.keys().length;
        break;
    }

    const total = this.stats.hits + this.stats.misses;
    if (total > 0) {
      this.stats.hitRate = this.stats.hits / total;
      this.stats.missRate = this.stats.misses / total;
    }
  }

  private updateEntry(key: string, value: any): void {
    const now = Date.now();
    const existing = this.entries.get(key);
    
    this.entries.set(key, {
      value,
      ttl: this.cache.getTtl(key) || 0,
      createdAt: existing?.createdAt || now,
      accessCount: existing?.accessCount || 0,
      lastAccessed: now
    });
  }

  private accessEntry(key: string): void {
    const entry = this.entries.get(key);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = this.cache.get<T>(key);
      
      if (value === undefined) {
        this.updateStats('miss');
        return null;
      }

      this.updateStats('hit');
      this.accessEntry(key);
      return value;
    } catch (error) {
      throw new CacheOperationError(
        `Memory cache get operation failed: ${error.message}`,
        'GET_ERROR',
        'memory',
        'get',
        key,
        error
      );
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const success = this.cache.set(key, value, ttl ? Math.ceil(ttl / 1000) : undefined);
      
      if (!success) {
        throw new Error('Failed to set value in memory cache');
      }

      this.updateEntry(key, value);
    } catch (error) {
      throw new CacheOperationError(
        `Memory cache set operation failed: ${error.message}`,
        'SET_ERROR',
        'memory',
        'set',
        key,
        error
      );
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const deleted = this.cache.del(key) > 0;
      
      if (deleted) {
        this.entries.delete(key);
      }
      
      return deleted;
    } catch (error) {
      throw new CacheOperationError(
        `Memory cache delete operation failed: ${error.message}`,
        'DELETE_ERROR',
        'memory',
        'delete',
        key,
        error
      );
    }
  }

  async clear(): Promise<void> {
    try {
      this.cache.flushAll();
      this.entries.clear();
      this.stats.size = 0;
    } catch (error) {
      throw new CacheOperationError(
        `Memory cache clear operation failed: ${error.message}`,
        'CLEAR_ERROR',
        'memory',
        'clear',
        undefined,
        error
      );
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return this.cache.has(key);
    } catch (error) {
      throw new CacheOperationError(
        `Memory cache has operation failed: ${error.message}`,
        'HAS_ERROR',
        'memory',
        'has',
        key,
        error
      );
    }
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    try {
      const allKeys = this.cache.keys();
      
      if (pattern === '*') {
        return allKeys;
      }

      // Simple pattern matching (supports * wildcard)
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return allKeys.filter(key => regex.test(key));
    } catch (error) {
      throw new CacheOperationError(
        `Memory cache keys operation failed: ${error.message}`,
        'KEYS_ERROR',
        'memory',
        'keys',
        pattern,
        error
      );
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const ttlTimestamp = this.cache.getTtl(key);
      
      if (ttlTimestamp === undefined || ttlTimestamp === 0) {
        return -1; // No expiration
      }

      const remainingMs = ttlTimestamp - Date.now();
      return remainingMs > 0 ? remainingMs : -2; // -2 means expired
    } catch (error) {
      throw new CacheOperationError(
        `Memory cache ttl operation failed: ${error.message}`,
        'TTL_ERROR',
        'memory',
        'ttl',
        key,
        error
      );
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      return this.cache.ttl(key, Math.ceil(ttl / 1000));
    } catch (error) {
      throw new CacheOperationError(
        `Memory cache expire operation failed: ${error.message}`,
        'EXPIRE_ERROR',
        'memory',
        'expire',
        key,
        error
      );
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      this.stats.size = this.cache.keys().length;
      return { ...this.stats };
    } catch (error) {
      console.error('Failed to get memory cache stats:', error);
      return { ...this.stats };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check - try to set and get a test value
      const testKey = '__health_check__';
      const testValue = Date.now();
      
      this.cache.set(testKey, testValue, 1); // 1 second TTL
      const retrieved = this.cache.get(testKey);
      this.cache.del(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      console.error('Memory cache health check failed:', error);
      return false;
    }
  }

  // Memory-specific methods

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      return keys.map(key => {
        const value = this.cache.get<T>(key);
        
        if (value === undefined) {
          this.updateStats('miss');
          return null;
        }

        this.updateStats('hit');
        this.accessEntry(key);
        return value;
      });
    } catch (error) {
      throw new CacheOperationError(
        `Memory cache mget operation failed: ${error.message}`,
        'MGET_ERROR',
        'memory',
        'mget',
        keys.join(','),
        error
      );
    }
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      for (const { key, value, ttl } of keyValuePairs) {
        const success = this.cache.set(key, value, ttl ? Math.ceil(ttl / 1000) : undefined);
        
        if (!success) {
          throw new Error(`Failed to set value for key: ${key}`);
        }

        this.updateEntry(key, value);
      }
    } catch (error) {
      throw new CacheOperationError(
        `Memory cache mset operation failed: ${error.message}`,
        'MSET_ERROR',
        'memory',
        'mset',
        'multiple',
        error
      );
    }
  }

  getEntry(key: string): CacheEntry | undefined {
    return this.entries.get(key);
  }

  getAllEntries(): Map<string, CacheEntry> {
    return new Map(this.entries);
  }

  getMemoryUsage(): {
    keys: number;
    approximateSize: number;
  } {
    const keys = this.cache.keys().length;
    
    // Rough approximation of memory usage
    let approximateSize = 0;
    for (const [key, entry] of this.entries) {
      approximateSize += key.length * 2; // Rough string size
      approximateSize += JSON.stringify(entry.value).length * 2; // Rough value size
    }

    return {
      keys,
      approximateSize
    };
  }
}