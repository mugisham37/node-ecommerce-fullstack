import { CacheStrategy } from '../types';

interface PendingWrite<T = any> {
  key: string;
  value: T;
  timestamp: number;
  retryCount: number;
}

/**
 * Write-Back (Write-Behind) caching strategy
 * Writes go to cache immediately, data store writes are deferred
 */
export class WriteBackStrategy implements CacheStrategy {
  public readonly name = 'WriteBack';
  private pendingWrites = new Map<string, PendingWrite>();
  private writeTimer: NodeJS.Timeout | null = null;
  private isWriting = false;

  constructor(
    private options: {
      defaultTtl: number;
      flushInterval?: number; // How often to flush pending writes
      batchSize?: number; // Maximum writes per batch
      maxRetries?: number; // Maximum retry attempts
      retryDelay?: number; // Delay between retries
      maxPendingWrites?: number; // Maximum pending writes before forcing flush
    }
  ) {
    this.options.flushInterval = this.options.flushInterval ?? 30000; // 30 seconds
    this.options.batchSize = this.options.batchSize ?? 100;
    this.options.maxRetries = this.options.maxRetries ?? 3;
    this.options.retryDelay = this.options.retryDelay ?? 1000; // 1 second
    this.options.maxPendingWrites = this.options.maxPendingWrites ?? 1000;

    this.startFlushTimer();
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
    // Add to pending writes for later flush
  }

  onDelete(key: string): void {
    // Remove from pending writes and add delete operation
  }

  /**
   * Write-back set operation
   * Writes to cache immediately and queues data store write
   */
  async writeBack<T>(
    key: string,
    value: T,
    cacheProvider: any,
    dataWriter: (key: string, value: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    // Write to cache immediately
    const cacheTtl = ttl || this.getTtl(key, value);
    await cacheProvider.set(key, value, cacheTtl);

    // Queue write to data store
    this.queueWrite(key, value, dataWriter);

    this.onSet(key, value);
  }

  /**
   * Write-back delete operation
   * Deletes from cache immediately and queues data store delete
   */
  async deleteBack(
    key: string,
    cacheProvider: any,
    dataDeleter: (key: string) => Promise<void>
  ): Promise<void> {
    // Delete from cache immediately
    await cacheProvider.delete(key);

    // Remove from pending writes if exists
    this.pendingWrites.delete(key);

    // Queue delete to data store
    this.queueWrite(key, null, async (k) => await dataDeleter(k));

    this.onDelete(key);
  }

  private queueWrite<T>(
    key: string,
    value: T,
    writer: (key: string, value: T) => Promise<void>
  ): void {
    this.pendingWrites.set(key, {
      key,
      value,
      timestamp: Date.now(),
      retryCount: 0
    });

    // Store the writer function for later use
    (this.pendingWrites.get(key) as any).writer = writer;

    // Force flush if we have too many pending writes
    if (this.pendingWrites.size >= this.options.maxPendingWrites!) {
      this.flushPendingWrites().catch(error => {
        console.error('Error during forced flush:', error);
      });
    }
  }

  private startFlushTimer(): void {
    this.writeTimer = setInterval(() => {
      this.flushPendingWrites().catch(error => {
        console.error('Error during scheduled flush:', error);
      });
    }, this.options.flushInterval);
  }

  private async flushPendingWrites(): Promise<void> {
    if (this.isWriting || this.pendingWrites.size === 0) {
      return;
    }

    this.isWriting = true;

    try {
      // Get batch of writes to process
      const writes = Array.from(this.pendingWrites.values())
        .slice(0, this.options.batchSize);

      const writePromises = writes.map(async (write) => {
        try {
          const writer = (write as any).writer;
          if (writer) {
            await writer(write.key, write.value);
            this.pendingWrites.delete(write.key);
          }
        } catch (error) {
          await this.handleWriteError(write, error as Error);
        }
      });

      await Promise.allSettled(writePromises);
    } finally {
      this.isWriting = false;
    }
  }

  private async handleWriteError(write: PendingWrite, error: Error): Promise<void> {
    write.retryCount++;

    if (write.retryCount >= this.options.maxRetries!) {
      console.error(`Write-back failed permanently for key ${write.key}:`, error);
      this.pendingWrites.delete(write.key);
      
      // Could emit an event or call an error handler here
      this.onWriteFailure?.(write.key, write.value, error);
    } else {
      console.warn(`Write-back retry ${write.retryCount} for key ${write.key}:`, error);
      
      // Update timestamp for retry delay
      write.timestamp = Date.now() + (this.options.retryDelay! * write.retryCount);
    }
  }

  /**
   * Force flush all pending writes immediately
   */
  async forceFlush(): Promise<void> {
    while (this.pendingWrites.size > 0) {
      await this.flushPendingWrites();
      
      // Small delay to prevent tight loop
      if (this.pendingWrites.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Get pending writes count
   */
  getPendingWritesCount(): number {
    return this.pendingWrites.size;
  }

  /**
   * Get pending writes for a specific key pattern
   */
  getPendingWrites(pattern?: string | RegExp): PendingWrite[] {
    const writes = Array.from(this.pendingWrites.values());
    
    if (!pattern) {
      return writes;
    }

    if (typeof pattern === 'string') {
      return writes.filter(write => write.key.includes(pattern));
    } else {
      return writes.filter(write => pattern.test(write.key));
    }
  }

  /**
   * Cancel pending writes for specific keys
   */
  cancelPendingWrites(keys: string[]): number {
    let cancelled = 0;
    for (const key of keys) {
      if (this.pendingWrites.delete(key)) {
        cancelled++;
      }
    }
    return cancelled;
  }

  /**
   * Shutdown the write-back strategy
   */
  async shutdown(): Promise<void> {
    // Clear the timer
    if (this.writeTimer) {
      clearInterval(this.writeTimer);
      this.writeTimer = null;
    }

    // Flush all pending writes
    await this.forceFlush();
  }

  // Optional error handler
  onWriteFailure?: (key: string, value: any, error: Error) => void;

  getStats() {
    const now = Date.now();
    const oldWrites = Array.from(this.pendingWrites.values())
      .filter(write => now - write.timestamp > this.options.flushInterval!).length;

    return {
      name: this.name,
      defaultTtl: this.options.defaultTtl,
      flushInterval: this.options.flushInterval,
      batchSize: this.options.batchSize,
      maxRetries: this.options.maxRetries,
      pendingWrites: this.pendingWrites.size,
      oldPendingWrites: oldWrites,
      isWriting: this.isWriting
    };
  }
}