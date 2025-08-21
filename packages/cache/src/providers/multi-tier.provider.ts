import { 
  CacheProvider, 
  CacheStats, 
  CacheOperationError
} from '../types';

/**
 * Multi-tier cache provider that combines multiple cache layers
 * Typically used with L1 (memory) and L2 (Redis) caches
 */
export class MultiTierProvider implements CacheProvider {
  private stats: CacheStats;

  constructor(
    private l1Cache: CacheProvider, // Fast cache (usually memory)
    private l2Cache: CacheProvider, // Persistent cache (usually Redis)
    private options: {
      l1Ttl?: number; // TTL for L1 cache
      l2Ttl?: number; // TTL for L2 cache
      writeThrough?: boolean; // Write to both caches simultaneously
      readThrough?: boolean; // Read from L2 if L1 misses
      syncOnWrite?: boolean; // Sync L1 and L2 on writes
    } = {}
  ) {
    this.stats = this.initializeStats();
    this.options = {
      writeThrough: true,
      readThrough: true,
      syncOnWrite: true,
      ...options
    };
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

  private updateStats(operation: 'hit' | 'miss' | 'set' | 'delete' | 'eviction'): void {
    this.stats[operation === 'hit' ? 'hits' : operation === 'miss' ? 'misses' : `${operation}s` as keyof CacheStats]++;
    
    const total = this.stats.hits + this.stats.misses;
    if (total > 0) {
      this.stats.hitRate = this.stats.hits / total;
      this.stats.missRate = this.stats.misses / total;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try L1 cache first
      const l1Value = await this.l1Cache.get<T>(key);
      if (l1Value !== null) {
        this.updateStats('hit');
        return l1Value;
      }

      // If readThrough is enabled, try L2 cache
      if (this.options.readThrough) {
        const l2Value = await this.l2Cache.get<T>(key);
        if (l2Value !== null) {
          // Populate L1 cache with L2 value
          await this.l1Cache.set(key, l2Value, this.options.l1Ttl);
          this.updateStats('hit');
          return l2Value;
        }
      }

      this.updateStats('miss');
      return null;
    } catch (error) {
      throw new CacheOperationError(
        `Multi-tier cache get operation failed: ${error.message}`,
        'GET_ERROR',
        'multi-tier',
        'get',
        key,
        error
      );
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const l1Ttl = ttl || this.options.l1Ttl;
      const l2Ttl = ttl || this.options.l2Ttl;

      if (this.options.writeThrough) {
        // Write to both caches
        await Promise.all([
          this.l1Cache.set(key, value, l1Ttl),
          this.l2Cache.set(key, value, l2Ttl)
        ]);
      } else {
        // Write to L1 first, then L2
        await this.l1Cache.set(key, value, l1Ttl);
        
        if (this.options.syncOnWrite) {
          // Async write to L2 (fire and forget)
          this.l2Cache.set(key, value, l2Ttl).catch(error => {
            console.error('Failed to sync to L2 cache:', error);
          });
        }
      }

      this.updateStats('set');
    } catch (error) {
      throw new CacheOperationError(
        `Multi-tier cache set operation failed: ${error.message}`,
        'SET_ERROR',
        'multi-tier',
        'set',
        key,
        error
      );
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const [l1Deleted, l2Deleted] = await Promise.all([
        this.l1Cache.delete(key),
        this.l2Cache.delete(key)
      ]);

      const deleted = l1Deleted || l2Deleted;
      if (deleted) {
        this.updateStats('delete');
      }

      return deleted;
    } catch (error) {
      throw new CacheOperationError(
        `Multi-tier cache delete operation failed: ${error.message}`,
        'DELETE_ERROR',
        'multi-tier',
        'delete',
        key,
        error
      );
    }
  }

  async clear(): Promise<void> {
    try {
      await Promise.all([
        this.l1Cache.clear(),
        this.l2Cache.clear()
      ]);

      this.stats.size = 0;
    } catch (error) {
      throw new CacheOperationError(
        `Multi-tier cache clear operation failed: ${error.message}`,
        'CLEAR_ERROR',
        'multi-tier',
        'clear',
        undefined,
        error
      );
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const l1Has = await this.l1Cache.has(key);
      if (l1Has) {
        return true;
      }

      return await this.l2Cache.has(key);
    } catch (error) {
      throw new CacheOperationError(
        `Multi-tier cache has operation failed: ${error.message}`,
        'HAS_ERROR',
        'multi-tier',
        'has',
        key,
        error
      );
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      const [l1Keys, l2Keys] = await Promise.all([
        this.l1Cache.keys(pattern),
        this.l2Cache.keys(pattern)
      ]);

      // Combine and deduplicate keys
      const allKeys = new Set([...l1Keys, ...l2Keys]);
      return Array.from(allKeys);
    } catch (error) {
      throw new CacheOperationError(
        `Multi-tier cache keys operation failed: ${error.message}`,
        'KEYS_ERROR',
        'multi-tier',
        'keys',
        pattern,
        error
      );
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      // Check L1 first, then L2
      const l1Ttl = await this.l1Cache.ttl(key);
      if (l1Ttl > 0) {
        return l1Ttl;
      }

      return await this.l2Cache.ttl(key);
    } catch (error) {
      throw new CacheOperationError(
        `Multi-tier cache ttl operation failed: ${error.message}`,
        'TTL_ERROR',
        'multi-tier',
        'ttl',
        key,
        error
      );
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const [l1Result, l2Result] = await Promise.all([
        this.l1Cache.expire(key, ttl),
        this.l2Cache.expire(key, ttl)
      ]);

      return l1Result || l2Result;
    } catch (error) {
      throw new CacheOperationError(
        `Multi-tier cache expire operation failed: ${error.message}`,
        'EXPIRE_ERROR',
        'multi-tier',
        'expire',
        key,
        error
      );
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const [l1Stats, l2Stats] = await Promise.all([
        this.l1Cache.getStats(),
        this.l2Cache.getStats()
      ]);

      // Combine stats from both tiers
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        sets: this.stats.sets,
        deletes: this.stats.deletes,
        evictions: l1Stats.evictions + l2Stats.evictions,
        size: l1Stats.size + l2Stats.size,
        hitRate: this.stats.hitRate,
        missRate: this.stats.missRate
      };
    } catch (error) {
      console.error('Failed to get multi-tier cache stats:', error);
      return { ...this.stats };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const [l1Healthy, l2Healthy] = await Promise.all([
        this.l1Cache.isHealthy(),
        this.l2Cache.isHealthy()
      ]);

      // At least one tier should be healthy
      return l1Healthy || l2Healthy;
    } catch (error) {
      console.error('Multi-tier cache health check failed:', error);
      return false;
    }
  }

  // Multi-tier specific methods

  async getL1Stats(): Promise<CacheStats> {
    return await this.l1Cache.getStats();
  }

  async getL2Stats(): Promise<CacheStats> {
    return await this.l2Cache.getStats();
  }

  async isL1Healthy(): Promise<boolean> {
    return await this.l1Cache.isHealthy();
  }

  async isL2Healthy(): Promise<boolean> {
    return await this.l2Cache.isHealthy();
  }

  async syncL1ToL2(keys?: string[]): Promise<void> {
    try {
      const keysToSync = keys || await this.l1Cache.keys();
      
      for (const key of keysToSync) {
        const value = await this.l1Cache.get(key);
        if (value !== null) {
          const ttl = await this.l1Cache.ttl(key);
          await this.l2Cache.set(key, value, ttl > 0 ? ttl : this.options.l2Ttl);
        }
      }
    } catch (error) {
      throw new CacheOperationError(
        `Failed to sync L1 to L2: ${error.message}`,
        'SYNC_ERROR',
        'multi-tier',
        'sync',
        undefined,
        error
      );
    }
  }

  async syncL2ToL1(keys?: string[]): Promise<void> {
    try {
      const keysToSync = keys || await this.l2Cache.keys();
      
      for (const key of keysToSync) {
        const value = await this.l2Cache.get(key);
        if (value !== null) {
          const ttl = await this.l2Cache.ttl(key);
          await this.l1Cache.set(key, value, ttl > 0 ? Math.min(ttl, this.options.l1Ttl || ttl) : this.options.l1Ttl);
        }
      }
    } catch (error) {
      throw new CacheOperationError(
        `Failed to sync L2 to L1: ${error.message}`,
        'SYNC_ERROR',
        'multi-tier',
        'sync',
        undefined,
        error
      );
    }
  }

  async invalidateL1(key: string): Promise<boolean> {
    return await this.l1Cache.delete(key);
  }

  async warmupL1FromL2(keys?: string[]): Promise<void> {
    await this.syncL2ToL1(keys);
  }

  getL1Provider(): CacheProvider {
    return this.l1Cache;
  }

  getL2Provider(): CacheProvider {
    return this.l2Cache;
  }
}