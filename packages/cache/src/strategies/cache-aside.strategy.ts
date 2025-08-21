import { CacheStrategy } from '../types';

/**
 * Cache-Aside (Lazy Loading) strategy
 * Application manages cache directly - loads data on cache miss
 */
export class CacheAsideStrategy implements CacheStrategy {
  public readonly name = 'CacheAside';
  private hitCount = 0;
  private missCount = 0;
  private setCount = 0;

  constructor(
    private options: {
      defaultTtl: number;
      cacheableTypes?: string[];
      excludePatterns?: (string | RegExp)[];
      maxValueSize?: number;
      conditionalCaching?: {
        [key: string]: (value: any) => boolean;
      };
    }
  ) {
    this.options.maxValueSize = this.options.maxValueSize ?? 1024 * 1024; // 1MB
    this.options.cacheableTypes = this.options.cacheableTypes ?? [
      'string', 'number', 'boolean', 'object'
    ];
    this.options.excludePatterns = this.options.excludePatterns ?? [];
  }

  shouldCache(key: string, value: any): boolean {
    // Check if value type is cacheable
    const valueType = Array.isArray(value) ? 'array' : typeof value;
    if (!this.options.cacheableTypes!.includes(valueType) && !this.options.cacheableTypes!.includes('object')) {
      return false;
    }

    // Don't cache null or undefined
    if (value === null || value === undefined) {
      return false;
    }

    // Check exclude patterns
    for (const pattern of this.options.excludePatterns!) {
      if (typeof pattern === 'string') {
        if (key.includes(pattern)) {
          return false;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(key)) {
          return false;
        }
      }
    }

    // Check value size
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length > this.options.maxValueSize!) {
        return false;
      }
    } catch {
      return false;
    }

    // Check conditional caching rules
    if (this.options.conditionalCaching) {
      for (const [pattern, condition] of Object.entries(this.options.conditionalCaching)) {
        const regex = new RegExp(pattern);
        if (regex.test(key)) {
          return condition(value);
        }
      }
    }

    return true;
  }

  getTtl(key: string, value: any): number {
    // Use default TTL for cache-aside strategy
    // TTL can be customized based on key patterns if needed
    return this.options.defaultTtl;
  }

  onHit(key: string, value: any): void {
    this.hitCount++;
  }

  onMiss(key: string): void {
    this.missCount++;
  }

  onSet(key: string, value: any): void {
    this.setCount++;
  }

  onDelete(key: string): void {
    // No specific action needed for cache-aside on delete
  }

  // Cache-aside specific methods

  /**
   * Get data with cache-aside pattern
   * If cache miss, load from data source and cache the result
   */
  async getWithFallback<T>(
    key: string,
    cacheProvider: any,
    dataLoader: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await cacheProvider.get<T>(key);
    if (cached !== null) {
      this.onHit(key, cached);
      return cached;
    }

    // Cache miss - load from data source
    this.onMiss(key);
    const data = await dataLoader();

    // Cache the loaded data if it should be cached
    if (this.shouldCache(key, data)) {
      const cacheTtl = ttl || this.getTtl(key, data);
      await cacheProvider.set(key, data, cacheTtl);
      this.onSet(key, data);
    }

    return data;
  }

  /**
   * Set data with cache-aside pattern
   * Update data source first, then update cache
   */
  async setWithWriteThrough<T>(
    key: string,
    value: T,
    cacheProvider: any,
    dataWriter: (value: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    // Write to data source first
    await dataWriter(value);

    // Then update cache if value should be cached
    if (this.shouldCache(key, value)) {
      const cacheTtl = ttl || this.getTtl(key, value);
      await cacheProvider.set(key, value, cacheTtl);
      this.onSet(key, value);
    }
  }

  /**
   * Delete data with cache-aside pattern
   * Delete from data source first, then invalidate cache
   */
  async deleteWithInvalidation(
    key: string,
    cacheProvider: any,
    dataDeleter: () => Promise<void>
  ): Promise<void> {
    // Delete from data source first
    await dataDeleter();

    // Then invalidate cache
    await cacheProvider.delete(key);
    this.onDelete(key);
  }

  /**
   * Bulk load with cache-aside pattern
   */
  async bulkGetWithFallback<T>(
    keys: string[],
    cacheProvider: any,
    dataLoader: (missedKeys: string[]) => Promise<Map<string, T>>,
    ttl?: number
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const missedKeys: string[] = [];

    // Try to get all keys from cache
    for (const key of keys) {
      const cached = await cacheProvider.get<T>(key);
      if (cached !== null) {
        result.set(key, cached);
        this.onHit(key, cached);
      } else {
        missedKeys.push(key);
        this.onMiss(key);
      }
    }

    // Load missed keys from data source
    if (missedKeys.length > 0) {
      const loadedData = await dataLoader(missedKeys);

      // Cache the loaded data
      const cacheOperations: Promise<void>[] = [];
      for (const [key, value] of loadedData) {
        result.set(key, value);
        
        if (this.shouldCache(key, value)) {
          const cacheTtl = ttl || this.getTtl(key, value);
          cacheOperations.push(cacheProvider.set(key, value, cacheTtl));
          this.onSet(key, value);
        }
      }

      // Execute cache operations in parallel
      await Promise.all(cacheOperations);
    }

    return result;
  }

  /**
   * Refresh cache entry
   */
  async refresh<T>(
    key: string,
    cacheProvider: any,
    dataLoader: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Load fresh data from source
    const data = await dataLoader();

    // Update cache with fresh data
    if (this.shouldCache(key, data)) {
      const cacheTtl = ttl || this.getTtl(key, data);
      await cacheProvider.set(key, data, cacheTtl);
      this.onSet(key, data);
    }

    return data;
  }

  addExcludePattern(pattern: string | RegExp): void {
    this.options.excludePatterns!.push(pattern);
  }

  removeExcludePattern(pattern: string | RegExp): boolean {
    const index = this.options.excludePatterns!.findIndex(p => 
      p === pattern || 
      (p instanceof RegExp && pattern instanceof RegExp && p.source === pattern.source)
    );
    
    if (index >= 0) {
      this.options.excludePatterns!.splice(index, 1);
      return true;
    }
    
    return false;
  }

  addConditionalCaching(pattern: string, condition: (value: any) => boolean): void {
    if (!this.options.conditionalCaching) {
      this.options.conditionalCaching = {};
    }
    this.options.conditionalCaching[pattern] = condition;
  }

  removeConditionalCaching(pattern: string): boolean {
    if (this.options.conditionalCaching && this.options.conditionalCaching[pattern]) {
      delete this.options.conditionalCaching[pattern];
      return true;
    }
    return false;
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      name: this.name,
      hits: this.hitCount,
      misses: this.missCount,
      sets: this.setCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
      missRate: total > 0 ? this.missCount / total : 0,
      totalOperations: total,
      cacheableTypes: this.options.cacheableTypes,
      excludePatterns: this.options.excludePatterns?.length || 0,
      conditionalRules: Object.keys(this.options.conditionalCaching || {}).length
    };
  }

  reset(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.setCount = 0;
  }
}