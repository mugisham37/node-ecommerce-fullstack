import { CacheProvider, CacheWarmupConfig } from '../types';

export interface WarmupStrategy {
  name: string;
  execute(cacheProvider: CacheProvider): Promise<void>;
}

/**
 * Cache warming utility
 * Preloads cache with frequently accessed data
 */
export class CacheWarmer {
  private strategies = new Map<string, WarmupStrategy>();
  private isWarming = false;
  private warmupTimer: NodeJS.Timeout | null = null;

  constructor(
    private cacheProvider: CacheProvider,
    private config: CacheWarmupConfig
  ) {}

  /**
   * Register a warmup strategy
   */
  registerStrategy(strategy: WarmupStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Unregister a warmup strategy
   */
  unregisterStrategy(name: string): boolean {
    return this.strategies.delete(name);
  }

  /**
   * Start scheduled warmup
   */
  start(): void {
    if (!this.config.enabled || this.warmupTimer) {
      return;
    }

    if (this.config.schedule) {
      // For simplicity, using interval instead of cron
      // In production, you'd want to use a proper cron library
      const interval = this.parseCronToInterval(this.config.schedule);
      
      this.warmupTimer = setInterval(() => {
        this.warmup().catch(error => {
          console.error('Scheduled warmup failed:', error);
        });
      }, interval);
    }

    console.log('Cache warmer started');
  }

  /**
   * Stop scheduled warmup
   */
  stop(): void {
    if (this.warmupTimer) {
      clearInterval(this.warmupTimer);
      this.warmupTimer = null;
    }

    console.log('Cache warmer stopped');
  }

  /**
   * Execute warmup manually
   */
  async warmup(): Promise<void> {
    if (this.isWarming) {
      console.log('Warmup already in progress, skipping');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      console.log('Starting cache warmup...');

      const strategiesToRun = this.config.strategies
        .map(name => this.strategies.get(name))
        .filter((strategy): strategy is WarmupStrategy => strategy !== undefined);

      if (strategiesToRun.length === 0) {
        console.log('No warmup strategies configured');
        return;
      }

      // Execute strategies with concurrency control
      const concurrency = this.config.concurrency || 3;
      const batches = this.createBatches(strategiesToRun, concurrency);

      for (const batch of batches) {
        const promises = batch.map(strategy => 
          this.executeStrategyWithTimeout(strategy)
        );

        await Promise.allSettled(promises);
      }

      const duration = Date.now() - startTime;
      console.log(`Cache warmup completed in ${duration}ms`);
    } catch (error) {
      console.error('Cache warmup failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Execute a single strategy with timeout
   */
  private async executeStrategyWithTimeout(strategy: WarmupStrategy): Promise<void> {
    const timeout = this.config.timeout || 30000; // 30 seconds default

    try {
      console.log(`Executing warmup strategy: ${strategy.name}`);
      
      await Promise.race([
        strategy.execute(this.cacheProvider),
        this.createTimeoutPromise(timeout)
      ]);

      console.log(`Warmup strategy ${strategy.name} completed`);
    } catch (error) {
      console.error(`Warmup strategy ${strategy.name} failed:`, error);
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Warmup strategy timed out')), timeout);
    });
  }

  /**
   * Create batches for concurrent execution
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Simple cron to interval parser (for demo purposes)
   * In production, use a proper cron library
   */
  private parseCronToInterval(cron: string): number {
    // Very basic parsing - just handle some common cases
    switch (cron) {
      case '0 * * * *': // Every hour
        return 60 * 60 * 1000;
      case '*/30 * * * *': // Every 30 minutes
        return 30 * 60 * 1000;
      case '*/15 * * * *': // Every 15 minutes
        return 15 * 60 * 1000;
      case '*/5 * * * *': // Every 5 minutes
        return 5 * 60 * 1000;
      default:
        return 60 * 60 * 1000; // Default to hourly
    }
  }

  /**
   * Get warmup status
   */
  getStatus(): {
    enabled: boolean;
    isWarming: boolean;
    strategiesCount: number;
    registeredStrategies: string[];
    configuredStrategies: string[];
    schedule?: string;
  } {
    return {
      enabled: this.config.enabled,
      isWarming: this.isWarming,
      strategiesCount: this.strategies.size,
      registeredStrategies: Array.from(this.strategies.keys()),
      configuredStrategies: this.config.strategies,
      schedule: this.config.schedule
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CacheWarmupConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart if schedule changed
    if (config.schedule !== undefined) {
      this.stop();
      if (this.config.enabled) {
        this.start();
      }
    }
  }

  /**
   * Get registered strategies
   */
  getStrategies(): WarmupStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Check if strategy is registered
   */
  hasStrategy(name: string): boolean {
    return this.strategies.has(name);
  }
}