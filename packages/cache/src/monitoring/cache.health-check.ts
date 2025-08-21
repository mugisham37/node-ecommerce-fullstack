import { CacheProvider, CacheHealthCheck } from '../types';

export interface HealthCheckOptions {
  interval?: number; // Health check interval in ms
  timeout?: number; // Health check timeout in ms
  retries?: number; // Number of retries on failure
  retryDelay?: number; // Delay between retries in ms
  thresholds?: {
    maxLatency?: number; // Maximum acceptable latency in ms
    minHitRate?: number; // Minimum acceptable hit rate (0-1)
    maxErrorRate?: number; // Maximum acceptable error rate (0-1)
  };
}

/**
 * Cache health monitoring and alerting
 */
export class CacheHealthCheck {
  private healthChecks = new Map<string, CacheHealthCheck>();
  private healthTimer: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private errorCounts = new Map<string, number>();
  private totalChecks = new Map<string, number>();

  constructor(
    private providers: Map<string, CacheProvider>,
    private options: HealthCheckOptions = {}
  ) {
    this.options = {
      interval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
      retries: 3,
      retryDelay: 1000, // 1 second
      thresholds: {
        maxLatency: 1000, // 1 second
        minHitRate: 0.5, // 50%
        maxErrorRate: 0.1 // 10%
      },
      ...options
    };

    // Initialize counters
    for (const providerName of this.providers.keys()) {
      this.errorCounts.set(providerName, 0);
      this.totalChecks.set(providerName, 0);
    }
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Run initial health check
    this.performHealthChecks().catch(error => {
      console.error('Initial health check failed:', error);
    });

    // Schedule periodic health checks
    this.healthTimer = setInterval(
      () => this.performHealthChecks(),
      this.options.interval
    );

    console.log('Cache health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }

    console.log('Cache health monitoring stopped');
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.providers.entries()).map(
      ([name, provider]) => this.checkProviderHealth(name, provider)
    );

    await Promise.allSettled(checkPromises);
  }

  /**
   * Check health of a specific provider
   */
  private async checkProviderHealth(name: string, provider: CacheProvider): Promise<void> {
    const startTime = Date.now();
    let healthy = false;
    let error: string | undefined;

    try {
      // Perform health check with retries
      healthy = await this.performHealthCheckWithRetries(provider);
      
      if (!healthy) {
        error = 'Provider health check returned false';
      }
    } catch (err) {
      healthy = false;
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    const latency = Date.now() - startTime;
    const timestamp = Date.now();

    // Update counters
    const totalChecks = (this.totalChecks.get(name) || 0) + 1;
    this.totalChecks.set(name, totalChecks);

    if (!healthy) {
      const errorCount = (this.errorCounts.get(name) || 0) + 1;
      this.errorCounts.set(name, errorCount);
    }

    // Create health check result
    const healthCheck: CacheHealthCheck = {
      provider: name,
      healthy,
      latency,
      error,
      timestamp
    };

    // Store health check result
    this.healthChecks.set(name, healthCheck);

    // Check thresholds and alert if necessary
    await this.checkThresholds(name, healthCheck);
  }

  /**
   * Perform health check with retries
   */
  private async performHealthCheckWithRetries(provider: CacheProvider): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.retries!; attempt++) {
      try {
        const healthPromise = provider.isHealthy();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), this.options.timeout);
        });

        const healthy = await Promise.race([healthPromise, timeoutPromise]);
        
        if (healthy) {
          return true;
        }
        
        lastError = new Error('Health check returned false');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.options.retries!) {
          await this.delay(this.options.retryDelay!);
        }
      }
    }

    throw lastError || new Error('Health check failed');
  }

  /**
   * Check thresholds and trigger alerts
   */
  private async checkThresholds(name: string, healthCheck: CacheHealthCheck): Promise<void> {
    const thresholds = this.options.thresholds!;
    const alerts: string[] = [];

    // Check latency threshold
    if (thresholds.maxLatency && healthCheck.latency > thresholds.maxLatency) {
      alerts.push(`High latency: ${healthCheck.latency}ms (threshold: ${thresholds.maxLatency}ms)`);
    }

    // Check error rate threshold
    if (thresholds.maxErrorRate) {
      const errorRate = this.getErrorRate(name);
      if (errorRate > thresholds.maxErrorRate) {
        alerts.push(`High error rate: ${(errorRate * 100).toFixed(1)}% (threshold: ${(thresholds.maxErrorRate * 100).toFixed(1)}%)`);
      }
    }

    // Check hit rate threshold (requires provider stats)
    if (thresholds.minHitRate) {
      try {
        const provider = this.providers.get(name);
        if (provider) {
          const stats = await provider.getStats();
          if (stats.hitRate < thresholds.minHitRate) {
            alerts.push(`Low hit rate: ${(stats.hitRate * 100).toFixed(1)}% (threshold: ${(thresholds.minHitRate * 100).toFixed(1)}%)`);
          }
        }
      } catch (error) {
        // Ignore stats errors for threshold checking
      }
    }

    // Trigger alerts if any thresholds exceeded
    if (alerts.length > 0) {
      await this.triggerAlert(name, alerts, healthCheck);
    }
  }

  /**
   * Trigger alert for provider issues
   */
  private async triggerAlert(
    providerName: string,
    alerts: string[],
    healthCheck: CacheHealthCheck
  ): Promise<void> {
    const alertMessage = `Cache provider ${providerName} health issues:\n${alerts.join('\n')}`;
    
    console.warn(alertMessage);
    
    // Here you could integrate with alerting systems like:
    // - Email notifications
    // - Slack/Discord webhooks
    // - PagerDuty
    // - Custom webhook endpoints
    
    // Example webhook call (commented out):
    /*
    try {
      await fetch('https://your-webhook-url.com/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerName,
          alerts,
          healthCheck,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to send alert webhook:', error);
    }
    */
  }

  /**
   * Get current health status for all providers
   */
  getCurrentHealth(): Map<string, CacheHealthCheck> {
    return new Map(this.healthChecks);
  }

  /**
   * Get health status for specific provider
   */
  getProviderHealth(providerName: string): CacheHealthCheck | undefined {
    return this.healthChecks.get(providerName);
  }

  /**
   * Check if all providers are healthy
   */
  isAllHealthy(): boolean {
    for (const healthCheck of this.healthChecks.values()) {
      if (!healthCheck.healthy) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get error rate for provider
   */
  getErrorRate(providerName: string): number {
    const errorCount = this.errorCounts.get(providerName) || 0;
    const totalCount = this.totalChecks.get(providerName) || 0;
    
    return totalCount > 0 ? errorCount / totalCount : 0;
  }

  /**
   * Get uptime percentage for provider
   */
  getUptime(providerName: string): number {
    return 1 - this.getErrorRate(providerName);
  }

  /**
   * Get health summary for all providers
   */
  getHealthSummary(): {
    overall: boolean;
    providers: Array<{
      name: string;
      healthy: boolean;
      latency: number;
      uptime: number;
      errorRate: number;
      lastCheck: number;
      error?: string;
    }>;
  } {
    const providers = Array.from(this.healthChecks.entries()).map(([name, health]) => ({
      name,
      healthy: health.healthy,
      latency: health.latency,
      uptime: this.getUptime(name),
      errorRate: this.getErrorRate(name),
      lastCheck: health.timestamp,
      error: health.error
    }));

    return {
      overall: this.isAllHealthy(),
      providers
    };
  }

  /**
   * Reset health statistics
   */
  resetStats(providerName?: string): void {
    if (providerName) {
      this.errorCounts.set(providerName, 0);
      this.totalChecks.set(providerName, 0);
    } else {
      this.errorCounts.clear();
      this.totalChecks.clear();
      
      for (const name of this.providers.keys()) {
        this.errorCounts.set(name, 0);
        this.totalChecks.set(name, 0);
      }
    }
  }

  /**
   * Update health check options
   */
  updateOptions(options: Partial<HealthCheckOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Restart monitoring if interval changed
    if (options.interval !== undefined && this.isMonitoring) {
      this.stop();
      this.start();
    }
  }

  /**
   * Manual health check for specific provider
   */
  async checkProvider(providerName: string): Promise<CacheHealthCheck> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    await this.checkProviderHealth(providerName, provider);
    
    const healthCheck = this.healthChecks.get(providerName);
    if (!healthCheck) {
      throw new Error(`Health check failed for provider ${providerName}`);
    }

    return healthCheck;
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    providersCount: number;
    totalChecks: number;
    totalErrors: number;
    overallErrorRate: number;
    options: HealthCheckOptions;
  } {
    const totalChecks = Array.from(this.totalChecks.values()).reduce((sum, count) => sum + count, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    return {
      isMonitoring: this.isMonitoring,
      providersCount: this.providers.size,
      totalChecks,
      totalErrors,
      overallErrorRate: totalChecks > 0 ? totalErrors / totalChecks : 0,
      options: this.options
    };
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}