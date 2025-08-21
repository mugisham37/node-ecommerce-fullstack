import { CacheStrategy } from '../types';

/**
 * Write-Around caching strategy
 * Writes go directly to data store, bypassing cache
 * Cache is only populated on reads (cache misses)
 */
export class WriteAroundStrategy implements CacheStrategy {
  public readonly name = 'WriteAround';

  constructor(
    private options: {
      defaultTtl: number;
      invalidateOnWrite?: boolean;
      writePatterns?: (string | RegExp)[];
    }
  ) {
    this.options.invalidateOnWrite = this.options.invalidateOnWrite ?? true;
    this.options.writePatterns = this.options.writePatterns ?? [];
  }

  shouldCache(key: string, value: any): boolean {
    return value !== null && value !== undefined;
  }

  getTtl(key: string, value: any): number {
    return this.options.defaultTtl;
  }

  onHit(key: string, value: any): void {
    // No specific action needed on hit
  }

  onMiss(key: string): void {
    // Cache miss will trigger read from data store and cache population
  }

  onSet(key: string, value: any): void {
    // In write-around, sets bypass cache initially
  }

  onDelete(key: string): void {
    // Delete operations should invalidate cache
  }

  /**
   * Write-around write operation
   * Writes directly to data store and optionally invalidates cache
   */
  async writeAround<T>(
    key: string,
    value: T,
    cacheProvider: any,
    dataWriter: (key: string, value: T) => Promise<void>
  ): Promise<void> {
    // Write directly to data store
    await dataWriter(key, value);

    // Optionally invalidate cache entry to ensure consistency
    if (this.options.invalidateOnWrite) {
      await cacheProvider.delete(key);
    }

    this.onSet(key, value);
  }

  /**
   * Write-around read operation
   * Reads from cache first, if miss then reads from data store and caches
   */
  async readAround<T>(
    key: string,
    cacheProvider: any,
    dataReader: (key: string) => Promise<T | null>,
    ttl?: number
  ): Promise<T | null> {
    // Try cache first
    const cached = await cacheProvider.get<T>(key);
    if (cached !== null) {
      this.onHit(key, cached);
      return cached;
    }

    // Cache miss - read from data store
    this.onMiss(key);
    const data = await dataReader(key);

    // Cache the data if it exists and should be cached
    if (data !== null && this.shouldCache(key, data)) {
      const cacheTtl = ttl || this.getTtl(key, data);
      await cacheProvider.set(key, data, cacheTtl);
    }

    return data;
  }

  /**
   * Write-around delete operation
   * Deletes from data store and invalidates cache
   */
  async deleteAround(
    key: string,
    cacheProvider: any,
    dataDeleter: (key: string) => Promise<void>
  ): Promise<void> {
    // Delete from data store
    await dataDeleter(key);

    // Invalidate cache
    await cacheProvider.delete(key);

    this.onDelete(key);
  }

  /**
   * Bulk write-around operation
   */
  async bulkWriteAround<T>(
    items: Array<{ key: string; value: T }>,
    cacheProvider: any,
    dataBulkWriter: (items: Array<{ key: string; value: T }>) => Promise<void>
  ): Promise<void> {
    // Write all items to data store
    await dataBulkWriter(items);

    // Optionally invalidate cache entries
    if (this.options.invalidateOnWrite) {
      const invalidationPromises = items.map(({ key }) => 
        cacheProvider.delete(key)
      );
      await Promise.all(invalidationPromises);
    }

    // Track sets
    items.forEach(({ key, value }) => this.onSet(key, value));
  }

  /**
   * Check if a key matches write patterns
   */
  private matchesWritePattern(key: string): boolean {
    if (!this.options.writePatterns || this.options.writePatterns.length === 0) {
      return true;
    }

    return this.options.writePatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return key.includes(pattern);
      } else {
        return pattern.test(key);
      }
    });
  }

  /**
   * Conditional write-around based on patterns
   */
  async conditionalWriteAround<T>(
    key: string,
    value: T,
    cacheProvider: any,
    dataWriter: (key: string, value: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    if (this.matchesWritePattern(key)) {
      // Use write-around strategy
      await this.writeAround(key, value, cacheProvider, dataWriter);
    } else {
      // Use write-through strategy for non-matching patterns
      const cacheTtl = ttl || this.getTtl(key, value);
      await Promise.all([
        cacheProvider.set(key, value, cacheTtl),
        dataWriter(key, value)
      ]);
    }

    this.onSet(key, value);
  }

  /**
   * Warm up cache for specific keys
   */
  async warmupCache<T>(
    keys: string[],
    cacheProvider: any,
    dataReader: (keys: string[]) => Promise<Map<string, T>>,
    ttl?: number
  ): Promise<void> {
    const data = await dataReader(keys);
    
    const cacheOperations: Promise<void>[] = [];
    for (const [key, value] of data) {
      if (this.shouldCache(key, value)) {
        const cacheTtl = ttl || this.getTtl(key, value);
        cacheOperations.push(cacheProvider.set(key, value, cacheTtl));
      }
    }

    await Promise.all(cacheOperations);
  }

  addWritePattern(pattern: string | RegExp): void {
    this.options.writePatterns!.push(pattern);
  }

  removeWritePattern(pattern: string | RegExp): boolean {
    const index = this.options.writePatterns!.findIndex(p => 
      p === pattern || 
      (p instanceof RegExp && pattern instanceof RegExp && p.source === pattern.source)
    );
    
    if (index >= 0) {
      this.options.writePatterns!.splice(index, 1);
      return true;
    }
    
    return false;
  }

  getStats() {
    return {
      name: this.name,
      defaultTtl: this.options.defaultTtl,
      invalidateOnWrite: this.options.invalidateOnWrite,
      writePatterns: this.options.writePatterns?.length || 0
    };
  }
}