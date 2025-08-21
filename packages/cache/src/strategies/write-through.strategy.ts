import { CacheStrategy } from '../types';

/**
 * Write-Through caching strategy
 * Writes go to cache and data store simultaneously
 */
export class WriteThroughStrategy implements CacheStrategy {
  public readonly name = 'WriteThrough';

  constructor(
    private options: {
      defaultTtl: number;
      syncTimeout?: number;
      retryAttempts?: number;
      retryDelay?: number;
    }
  ) {
    this.options.syncTimeout = this.options.syncTimeout ?? 5000; // 5 seconds
    this.options.retryAttempts = this.options.retryAttempts ?? 3;
    this.options.retryDelay = this.options.retryDelay ?? 1000; // 1 second
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
    // No specific action needed on miss
  }

  onSet(key: string, value: any): void {
    // Write-through happens during set operation
  }

  onDelete(key: string): void {
    // Write-through happens during delete operation
  }

  /**
   * Write-through set operation
   * Writes to both cache and data store simultaneously
   */
  async writeThrough<T>(
    key: string,
    value: T,
    cacheProvider: any,
    dataWriter: (key: string, value: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    const cacheTtl = ttl || this.getTtl(key, value);
    
    // Write to both cache and data store simultaneously
    await Promise.all([
      cacheProvider.set(key, value, cacheTtl),
      this.writeWithRetry(key, value, dataWriter)
    ]);

    this.onSet(key, value);
  }

  /**
   * Write-through delete operation
   * Deletes from both cache and data store simultaneously
   */
  async deleteThrough(
    key: string,
    cacheProvider: any,
    dataDeleter: (key: string) => Promise<void>
  ): Promise<void> {
    // Delete from both cache and data store simultaneously
    await Promise.all([
      cacheProvider.delete(key),
      this.deleteWithRetry(key, dataDeleter)
    ]);

    this.onDelete(key);
  }

  private async writeWithRetry<T>(
    key: string,
    value: T,
    dataWriter: (key: string, value: T) => Promise<void>
  ): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts!; attempt++) {
      try {
        await Promise.race([
          dataWriter(key, value),
          this.createTimeoutPromise(this.options.syncTimeout!)
        ]);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.options.retryAttempts!) {
          await this.delay(this.options.retryDelay! * attempt);
        }
      }
    }

    throw new Error(`Write-through failed after ${this.options.retryAttempts} attempts: ${lastError?.message}`);
  }

  private async deleteWithRetry(
    key: string,
    dataDeleter: (key: string) => Promise<void>
  ): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts!; attempt++) {
      try {
        await Promise.race([
          dataDeleter(key),
          this.createTimeoutPromise(this.options.syncTimeout!)
        ]);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.options.retryAttempts!) {
          await this.delay(this.options.retryDelay! * attempt);
        }
      }
    }

    throw new Error(`Delete-through failed after ${this.options.retryAttempts} attempts: ${lastError?.message}`);
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeout);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      name: this.name,
      defaultTtl: this.options.defaultTtl,
      syncTimeout: this.options.syncTimeout,
      retryAttempts: this.options.retryAttempts,
      retryDelay: this.options.retryDelay
    };
  }
}