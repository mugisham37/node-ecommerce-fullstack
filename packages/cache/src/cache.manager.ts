import { 
  CacheProvider, 
  CacheStrategy, 
  CacheManagerOptions,
  CacheEvent,
  CacheEventListener
} from './types';
import { CacheMonitor } from './monitoring/cache.monitor';
import { CacheWarmer } from './warming/cache.warmer';

/**
 * Main cache manager that orchestrates providers, strategies, and monitoring
 */
export class CacheManager {
  private primaryProvider: CacheProvider;
  private fallbackProvider?: CacheProvider;
  private strategies: CacheStrategy[] = [];
  private monitor?: CacheMonitor;
  private warmer?: CacheWarmer;
  private eventListeners: CacheEventListener[] = [];

  constructor(options: CacheManagerOptions) {
    this.primaryProvider = options.providers.primary;
    this.fallbackProvider = options.providers.fallback;
    this.strategies = options.strategies || [];

    // Set up monitoring if enabled
    if (options.monitoring?.enabled) {
      const providers = new Map<string, CacheProvider>();
      providers.set('primary', this.primaryProvider);
      if (this.fallbackProvider) {
        providers.set('fallback', this.fallbackProvider);
      }

      this.monitor = new CacheMonitor(providers, {
        collectionInterval: options.monitoring.interval
      });

      // Add monitoring event listeners
      if (options.monitoring.listeners) {
        options.monitoring.listeners.forEach(listener => {
          this.addEventListener(listener);
        });
      }

      this.monitor.start();
    }

    // Set up cache warming if configured
    if (options.warmup?.enabled) {
      this.warmer = new CacheWarmer(this.primaryProvider, options.warmup);
      this.warmer.start();
    }
  }

  /**
   * Get value from cache with strategy application
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try primary provider first
      const value = await this.primaryProvider.get<T>(key);
      
      if (value !== null) {
        this.emitEvent({
          type: 'hit',
          key,
          value,
          timestamp: Date.now(),
          provider: 'primary'
        });

        // Apply strategy onHit callbacks
        this.strategies.forEach(strategy => strategy.onHit?.(key, value));
        
        return value;
      }

      // Try fallback provider if available
      if (this.fallbackProvider) {
        const fallbackValue = await this.fallbackProvider.get<T>(key);
        
        if (fallbackValue !== null) {
          // Populate primary cache with fallback value
          const strategy = this.getApplicableStrategy(key, fallbackValue);
          const ttl = strategy?.getTtl(key, fallbackValue);
          
          if (strategy?.shouldCache(key, fallbackValue)) {
            await this.primaryProvider.set(key, fallbackValue, ttl);
          }

          this.emitEvent({
            type: 'hit',
            key,
            value: fallbackValue,
            timestamp: Date.now(),
            provider: 'fallback'
          });

          return fallbackValue;
        }
      }

      // Cache miss
      this.emitEvent({
        type: 'miss',
        key,
        timestamp: Date.now(),
        provider: 'primary'
      });

      this.strategies.forEach(strategy => strategy.onMiss?.(key));
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with strategy application
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const strategy = this.getApplicableStrategy(key, value);
      
      // Check if value should be cached
      if (!strategy?.shouldCache(key, value)) {
        return;
      }

      const cacheTtl = ttl || strategy?.getTtl(key, value);

      // Set in primary provider
      await this.primaryProvider.set(key, value, cacheTtl);

      // Set in fallback provider if available
      if (this.fallbackProvider) {
        await this.fallbackProvider.set(key, value, cacheTtl);
      }

      this.emitEvent({
        type: 'set',
        key,
        value,
        ttl: cacheTtl,
        timestamp: Date.now(),
        provider: 'primary'
      });

      // Apply strategy onSet callbacks
      this.strategies.forEach(strategy => strategy.onSet?.(key, value));
    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const [primaryDeleted, fallbackDeleted] = await Promise.all([
        this.primaryProvider.delete(key),
        this.fallbackProvider?.delete(key) || Promise.resolve(false)
      ]);

      const deleted = primaryDeleted || fallbackDeleted;

      if (deleted) {
        this.emitEvent({
          type: 'delete',
          key,
          timestamp: Date.now(),
          provider: 'primary'
        });

        this.strategies.forEach(strategy => strategy.onDelete?.(key));
      }

      return deleted;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await Promise.all([
        this.primaryProvider.clear(),
        this.fallbackProvider?.clear() || Promise.resolve()
      ]);

      this.emitEvent({
        type: 'clear',
        key: '*',
        timestamp: Date.now(),
        provider: 'primary'
      });
    } catch (error) {
      console.error('Cache clear error:', error);
      throw error;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const primaryHas = await this.primaryProvider.has(key);
      if (primaryHas) {
        return true;
      }

      if (this.fallbackProvider) {
        return await this.fallbackProvider.has(key);
      }

      return false;
    } catch (error) {
      console.error('Cache has error:', error);
      return false;
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      const [primaryKeys, fallbackKeys] = await Promise.all([
        this.primaryProvider.keys(pattern),
        this.fallbackProvider?.keys(pattern) || Promise.resolve([])
      ]);

      // Combine and deduplicate
      const allKeys = new Set([...primaryKeys, ...fallbackKeys]);
      return Array.from(allKeys);
    } catch (error) {
      console.error('Cache keys error:', error);
      return [];
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      const primaryTtl = await this.primaryProvider.ttl(key);
      if (primaryTtl > 0) {
        return primaryTtl;
      }

      if (this.fallbackProvider) {
        return await this.fallbackProvider.ttl(key);
      }

      return primaryTtl;
    } catch (error) {
      console.error('Cache ttl error:', error);
      return -1;
    }
  }

  /**
   * Set expiration for key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const [primaryResult, fallbackResult] = await Promise.all([
        this.primaryProvider.expire(key, ttl),
        this.fallbackProvider?.expire(key, ttl) || Promise.resolve(false)
      ]);

      return primaryResult || fallbackResult;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const [primaryStats, fallbackStats] = await Promise.all([
        this.primaryProvider.getStats(),
        this.fallbackProvider?.getStats() || Promise.resolve(null)
      ]);

      return {
        primary: primaryStats,
        fallback: fallbackStats,
        monitoring: this.monitor?.getAggregatedStats(),
        warmup: this.warmer?.getStatus()
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }

  /**
   * Check cache health
   */
  async isHealthy(): Promise<boolean> {
    try {
      const primaryHealthy = await this.primaryProvider.isHealthy();
      
      if (this.fallbackProvider) {
        const fallbackHealthy = await this.fallbackProvider.isHealthy();
        return primaryHealthy || fallbackHealthy; // At least one should be healthy
      }

      return primaryHealthy;
    } catch (error) {
      console.error('Cache health check error:', error);
      return false;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: CacheEventListener): void {
    this.eventListeners.push(listener);
    this.monitor?.addEventListener(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: CacheEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index >= 0) {
      this.eventListeners.splice(index, 1);
    }
    this.monitor?.removeEventListener(listener);
  }

  /**
   * Add caching strategy
   */
  addStrategy(strategy: CacheStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Remove caching strategy
   */
  removeStrategy(strategyName: string): boolean {
    const index = this.strategies.findIndex(s => s.name === strategyName);
    if (index >= 0) {
      this.strategies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get applicable strategy for key/value
   */
  private getApplicableStrategy(key: string, value: any): CacheStrategy | undefined {
    // Return first strategy that should cache this key/value
    return this.strategies.find(strategy => strategy.shouldCache(key, value));
  }

  /**
   * Emit cache event
   */
  private emitEvent(event: CacheEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cache event listener:', error);
      }
    });

    this.monitor?.emitEvent(event);
  }

  /**
   * Get monitoring instance
   */
  getMonitor(): CacheMonitor | undefined {
    return this.monitor;
  }

  /**
   * Get warmer instance
   */
  getWarmer(): CacheWarmer | undefined {
    return this.warmer;
  }

  /**
   * Get primary provider
   */
  getPrimaryProvider(): CacheProvider {
    return this.primaryProvider;
  }

  /**
   * Get fallback provider
   */
  getFallbackProvider(): CacheProvider | undefined {
    return this.fallbackProvider;
  }

  /**
   * Get strategies
   */
  getStrategies(): CacheStrategy[] {
    return [...this.strategies];
  }

  /**
   * Shutdown cache manager
   */
  async shutdown(): Promise<void> {
    try {
      // Stop monitoring
      this.monitor?.stop();

      // Stop warming
      this.warmer?.stop();

      // Clear event listeners
      this.eventListeners = [];

      console.log('Cache manager shutdown completed');
    } catch (error) {
      console.error('Error during cache manager shutdown:', error);
    }
  }
}