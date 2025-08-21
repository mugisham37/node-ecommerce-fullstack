import { CacheStrategy } from '../types';

/**
 * Least Recently Used (LRU) caching strategy
 * Evicts the least recently used items when cache is full
 */
export class LRUStrategy implements CacheStrategy {
  public readonly name = 'LRU';
  private accessOrder: Map<string, number> = new Map();
  private accessCounter = 0;

  constructor(
    private options: {
      maxSize: number;
      defaultTtl: number;
      trackAccess?: boolean;
    }
  ) {
    this.options.trackAccess = this.options.trackAccess ?? true;
  }

  shouldCache(key: string, value: any): boolean {
    // Cache everything by default in LRU strategy
    return value !== null && value !== undefined;
  }

  getTtl(key: string, value: any): number {
    return this.options.defaultTtl;
  }

  onHit(key: string, value: any): void {
    if (this.options.trackAccess) {
      this.accessOrder.set(key, ++this.accessCounter);
    }
  }

  onMiss(key: string): void {
    // No action needed on miss for LRU
  }

  onSet(key: string, value: any): void {
    if (this.options.trackAccess) {
      this.accessOrder.set(key, ++this.accessCounter);
    }

    // Check if we need to evict items
    if (this.accessOrder.size > this.options.maxSize) {
      this.evictLeastRecentlyUsed();
    }
  }

  onDelete(key: string): void {
    this.accessOrder.delete(key);
  }

  private evictLeastRecentlyUsed(): string[] {
    const sortedEntries = Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => a - b);

    const toEvict = sortedEntries.slice(0, sortedEntries.length - this.options.maxSize + 1);
    const evictedKeys: string[] = [];

    for (const [key] of toEvict) {
      this.accessOrder.delete(key);
      evictedKeys.push(key);
    }

    return evictedKeys;
  }

  getAccessOrder(): Map<string, number> {
    return new Map(this.accessOrder);
  }

  getMostRecentlyUsed(count: number = 10): string[] {
    return Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([key]) => key);
  }

  getLeastRecentlyUsed(count: number = 10): string[] {
    return Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => a - b)
      .slice(0, count)
      .map(([key]) => key);
  }

  getStats() {
    return {
      name: this.name,
      maxSize: this.options.maxSize,
      currentSize: this.accessOrder.size,
      accessCounter: this.accessCounter,
      utilizationRate: this.accessOrder.size / this.options.maxSize
    };
  }

  reset(): void {
    this.accessOrder.clear();
    this.accessCounter = 0;
  }
}