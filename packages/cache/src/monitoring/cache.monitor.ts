import { 
  CacheProvider, 
  CacheMonitoringMetrics, 
  CacheEvent, 
  CacheEventListener 
} from '../types';

/**
 * Cache monitoring and metrics collection
 */
export class CacheMonitor {
  private metrics: CacheMonitoringMetrics[] = [];
  private listeners: CacheEventListener[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor(
    private providers: Map<string, CacheProvider>,
    private options: {
      metricsRetention?: number; // How long to keep metrics (ms)
      collectionInterval?: number; // How often to collect metrics (ms)
      maxMetricsCount?: number; // Maximum metrics to keep in memory
      enableEventTracking?: boolean;
    } = {}
  ) {
    this.options = {
      metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
      collectionInterval: 60 * 1000, // 1 minute
      maxMetricsCount: 1440, // 24 hours of minute-by-minute data
      enableEventTracking: true,
      ...options
    };
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(
      () => this.collectMetrics(),
      this.options.collectionInterval
    );

    console.log('Cache monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Cache monitoring stopped');
  }

  /**
   * Add event listener
   */
  addEventListener(listener: CacheEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: CacheEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit cache event
   */
  emitEvent(event: CacheEvent): void {
    if (!this.options.enableEventTracking) {
      return;
    }

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cache event listener:', error);
      }
    });
  }

  /**
   * Collect metrics from all providers
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();

    for (const [name, provider] of this.providers) {
      try {
        const stats = await provider.getStats();
        
        const metrics: CacheMonitoringMetrics = {
          timestamp,
          provider: name,
          stats,
          memoryUsage: await this.getMemoryUsage(provider),
          connectionStats: await this.getConnectionStats(provider),
          performance: await this.getPerformanceStats(provider)
        };

        this.metrics.push(metrics);
      } catch (error) {
        console.error(`Error collecting metrics for provider ${name}:`, error);
      }
    }

    // Clean up old metrics
    this.cleanupMetrics();
  }

  /**
   * Get memory usage for provider
   */
  private async getMemoryUsage(provider: CacheProvider): Promise<{
    used: number;
    total: number;
    percentage: number;
  } | undefined> {
    try {
      // This would be provider-specific implementation
      // For now, return undefined as it's optional
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get connection stats for provider
   */
  private async getConnectionStats(provider: CacheProvider): Promise<{
    active: number;
    idle: number;
    total: number;
  } | undefined> {
    try {
      // This would be provider-specific implementation
      // For now, return undefined as it's optional
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get performance stats for provider
   */
  private async getPerformanceStats(provider: CacheProvider): Promise<{
    avgResponseTime: number;
    slowQueries: number;
    errorRate: number;
  } | undefined> {
    try {
      // This would be provider-specific implementation
      // For now, return undefined as it's optional
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupMetrics(): void {
    const cutoffTime = Date.now() - this.options.metricsRetention!;
    
    // Remove metrics older than retention period
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
    
    // Limit total metrics count
    if (this.metrics.length > this.options.maxMetricsCount!) {
      this.metrics = this.metrics.slice(-this.options.maxMetricsCount!);
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): CacheMonitoringMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for specific provider
   */
  getProviderMetrics(providerName: string): CacheMonitoringMetrics[] {
    return this.metrics.filter(metric => metric.provider === providerName);
  }

  /**
   * Get metrics within time range
   */
  getMetricsInRange(startTime: number, endTime: number): CacheMonitoringMetrics[] {
    return this.metrics.filter(
      metric => metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  /**
   * Get aggregated stats for all providers
   */
  getAggregatedStats(): {
    totalHits: number;
    totalMisses: number;
    totalSets: number;
    totalDeletes: number;
    totalEvictions: number;
    totalSize: number;
    overallHitRate: number;
    overallMissRate: number;
  } {
    const latest = this.getLatestMetrics();
    
    let totalHits = 0;
    let totalMisses = 0;
    let totalSets = 0;
    let totalDeletes = 0;
    let totalEvictions = 0;
    let totalSize = 0;

    latest.forEach(metric => {
      totalHits += metric.stats.hits;
      totalMisses += metric.stats.misses;
      totalSets += metric.stats.sets;
      totalDeletes += metric.stats.deletes;
      totalEvictions += metric.stats.evictions;
      totalSize += metric.stats.size;
    });

    const totalOperations = totalHits + totalMisses;
    
    return {
      totalHits,
      totalMisses,
      totalSets,
      totalDeletes,
      totalEvictions,
      totalSize,
      overallHitRate: totalOperations > 0 ? totalHits / totalOperations : 0,
      overallMissRate: totalOperations > 0 ? totalMisses / totalOperations : 0
    };
  }

  /**
   * Get latest metrics for each provider
   */
  getLatestMetrics(): CacheMonitoringMetrics[] {
    const latestByProvider = new Map<string, CacheMonitoringMetrics>();
    
    this.metrics.forEach(metric => {
      const existing = latestByProvider.get(metric.provider);
      if (!existing || metric.timestamp > existing.timestamp) {
        latestByProvider.set(metric.provider, metric);
      }
    });

    return Array.from(latestByProvider.values());
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(providerName?: string): {
    hitRateTrend: number[];
    sizeTrend: number[];
    timestamps: number[];
  } {
    const relevantMetrics = providerName 
      ? this.getProviderMetrics(providerName)
      : this.metrics;

    const hitRateTrend = relevantMetrics.map(m => m.stats.hitRate);
    const sizeTrend = relevantMetrics.map(m => m.stats.size);
    const timestamps = relevantMetrics.map(m => m.timestamp);

    return {
      hitRateTrend,
      sizeTrend,
      timestamps
    };
  }

  /**
   * Check if any provider is unhealthy
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    providers: Array<{
      name: string;
      healthy: boolean;
      error?: string;
    }>;
  }> {
    const results = [];
    let overallHealthy = true;

    for (const [name, provider] of this.providers) {
      try {
        const healthy = await provider.isHealthy();
        results.push({ name, healthy });
        
        if (!healthy) {
          overallHealthy = false;
        }
      } catch (error) {
        results.push({ 
          name, 
          healthy: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        overallHealthy = false;
      }
    }

    return {
      healthy: overallHealthy,
      providers: results
    };
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      exportTime: Date.now(),
      options: this.options,
      metrics: this.metrics
    }, null, 2);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    providersCount: number;
    listenersCount: number;
    oldestMetric?: number;
    newestMetric?: number;
  } {
    const timestamps = this.metrics.map(m => m.timestamp);
    
    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metrics.length,
      providersCount: this.providers.size,
      listenersCount: this.listeners.length,
      oldestMetric: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestMetric: timestamps.length > 0 ? Math.max(...timestamps) : undefined
    };
  }
}