import { CacheProvider, CacheStats } from '../types';

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface CacheMetricsData {
  hits: MetricPoint[];
  misses: MetricPoint[];
  sets: MetricPoint[];
  deletes: MetricPoint[];
  evictions: MetricPoint[];
  size: MetricPoint[];
  hitRate: MetricPoint[];
  missRate: MetricPoint[];
}

/**
 * Cache metrics collection and analysis
 */
export class CacheMetrics {
  private metrics: Map<string, CacheMetricsData> = new Map();
  private collectionInterval: NodeJS.Timeout | null = null;
  private isCollecting = false;

  constructor(
    private providers: Map<string, CacheProvider>,
    private options: {
      collectionInterval?: number; // How often to collect metrics (ms)
      retentionPeriod?: number; // How long to keep metrics (ms)
      maxDataPoints?: number; // Maximum data points per metric
    } = {}
  ) {
    this.options = {
      collectionInterval: 60000, // 1 minute
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      maxDataPoints: 1440, // 24 hours of minute data
      ...options
    };

    // Initialize metrics for each provider
    for (const providerName of this.providers.keys()) {
      this.metrics.set(providerName, this.createEmptyMetrics());
    }
  }

  /**
   * Start metrics collection
   */
  start(): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    this.collectionInterval = setInterval(
      () => this.collectMetrics(),
      this.options.collectionInterval
    );

    console.log('Cache metrics collection started');
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    console.log('Cache metrics collection stopped');
  }

  /**
   * Collect metrics from all providers
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();

    for (const [providerName, provider] of this.providers) {
      try {
        const stats = await provider.getStats();
        this.addMetricPoint(providerName, stats, timestamp);
      } catch (error) {
        console.error(`Error collecting metrics for ${providerName}:`, error);
      }
    }

    this.cleanupOldMetrics();
  }

  /**
   * Add metric point for provider
   */
  private addMetricPoint(providerName: string, stats: CacheStats, timestamp: number): void {
    const providerMetrics = this.metrics.get(providerName);
    if (!providerMetrics) {
      return;
    }

    // Add new data points
    providerMetrics.hits.push({ timestamp, value: stats.hits });
    providerMetrics.misses.push({ timestamp, value: stats.misses });
    providerMetrics.sets.push({ timestamp, value: stats.sets });
    providerMetrics.deletes.push({ timestamp, value: stats.deletes });
    providerMetrics.evictions.push({ timestamp, value: stats.evictions });
    providerMetrics.size.push({ timestamp, value: stats.size });
    providerMetrics.hitRate.push({ timestamp, value: stats.hitRate });
    providerMetrics.missRate.push({ timestamp, value: stats.missRate });

    // Limit data points
    this.limitDataPoints(providerMetrics);
  }

  /**
   * Limit data points to max count
   */
  private limitDataPoints(metrics: CacheMetricsData): void {
    const maxPoints = this.options.maxDataPoints!;

    Object.values(metrics).forEach(metricArray => {
      if (metricArray.length > maxPoints) {
        metricArray.splice(0, metricArray.length - maxPoints);
      }
    });
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.options.retentionPeriod!;

    for (const metrics of this.metrics.values()) {
      Object.values(metrics).forEach(metricArray => {
        const cutoffIndex = metricArray.findIndex(point => point.timestamp > cutoffTime);
        if (cutoffIndex > 0) {
          metricArray.splice(0, cutoffIndex);
        }
      });
    }
  }

  /**
   * Create empty metrics structure
   */
  private createEmptyMetrics(): CacheMetricsData {
    return {
      hits: [],
      misses: [],
      sets: [],
      deletes: [],
      evictions: [],
      size: [],
      hitRate: [],
      missRate: []
    };
  }

  /**
   * Get metrics for provider
   */
  getMetrics(providerName: string): CacheMetricsData | undefined {
    return this.metrics.get(providerName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, CacheMetricsData> {
    return new Map(this.metrics);
  }

  /**
   * Get metrics in time range
   */
  getMetricsInRange(
    providerName: string,
    startTime: number,
    endTime: number
  ): CacheMetricsData | undefined {
    const metrics = this.metrics.get(providerName);
    if (!metrics) {
      return undefined;
    }

    const filterByRange = (points: MetricPoint[]) =>
      points.filter(point => point.timestamp >= startTime && point.timestamp <= endTime);

    return {
      hits: filterByRange(metrics.hits),
      misses: filterByRange(metrics.misses),
      sets: filterByRange(metrics.sets),
      deletes: filterByRange(metrics.deletes),
      evictions: filterByRange(metrics.evictions),
      size: filterByRange(metrics.size),
      hitRate: filterByRange(metrics.hitRate),
      missRate: filterByRange(metrics.missRate)
    };
  }

  /**
   * Calculate average for metric over time period
   */
  getAverage(
    providerName: string,
    metric: keyof CacheMetricsData,
    periodMs: number = 60 * 60 * 1000 // 1 hour
  ): number {
    const metrics = this.metrics.get(providerName);
    if (!metrics) {
      return 0;
    }

    const cutoffTime = Date.now() - periodMs;
    const relevantPoints = metrics[metric].filter(point => point.timestamp > cutoffTime);

    if (relevantPoints.length === 0) {
      return 0;
    }

    const sum = relevantPoints.reduce((acc, point) => acc + point.value, 0);
    return sum / relevantPoints.length;
  }

  /**
   * Calculate rate of change for metric
   */
  getRateOfChange(
    providerName: string,
    metric: keyof CacheMetricsData,
    periodMs: number = 60 * 60 * 1000 // 1 hour
  ): number {
    const metrics = this.metrics.get(providerName);
    if (!metrics) {
      return 0;
    }

    const cutoffTime = Date.now() - periodMs;
    const relevantPoints = metrics[metric]
      .filter(point => point.timestamp > cutoffTime)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (relevantPoints.length < 2) {
      return 0;
    }

    const first = relevantPoints[0];
    const last = relevantPoints[relevantPoints.length - 1];
    const timeDiff = last.timestamp - first.timestamp;

    if (timeDiff === 0) {
      return 0;
    }

    return (last.value - first.value) / (timeDiff / 1000); // per second
  }

  /**
   * Get peak value for metric
   */
  getPeak(
    providerName: string,
    metric: keyof CacheMetricsData,
    periodMs: number = 60 * 60 * 1000 // 1 hour
  ): { value: number; timestamp: number } | null {
    const metrics = this.metrics.get(providerName);
    if (!metrics) {
      return null;
    }

    const cutoffTime = Date.now() - periodMs;
    const relevantPoints = metrics[metric].filter(point => point.timestamp > cutoffTime);

    if (relevantPoints.length === 0) {
      return null;
    }

    return relevantPoints.reduce((peak, point) =>
      point.value > peak.value ? point : peak
    );
  }

  /**
   * Get trend analysis
   */
  getTrend(
    providerName: string,
    metric: keyof CacheMetricsData,
    periodMs: number = 60 * 60 * 1000 // 1 hour
  ): 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' {
    const metrics = this.metrics.get(providerName);
    if (!metrics) {
      return 'insufficient_data';
    }

    const cutoffTime = Date.now() - periodMs;
    const relevantPoints = metrics[metric]
      .filter(point => point.timestamp > cutoffTime)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (relevantPoints.length < 3) {
      return 'insufficient_data';
    }

    // Simple linear regression to determine trend
    const n = relevantPoints.length;
    const sumX = relevantPoints.reduce((sum, point, index) => sum + index, 0);
    const sumY = relevantPoints.reduce((sum, point) => sum + point.value, 0);
    const sumXY = relevantPoints.reduce((sum, point, index) => sum + index * point.value, 0);
    const sumXX = relevantPoints.reduce((sum, point, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    if (Math.abs(slope) < 0.01) {
      return 'stable';
    }

    return slope > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(
    providerName: string,
    periodMs: number = 60 * 60 * 1000 // 1 hour
  ): {
    avgHitRate: number;
    avgSize: number;
    totalOperations: number;
    peakSize: number;
    trend: {
      hitRate: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
      size: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
    };
  } {
    const avgHitRate = this.getAverage(providerName, 'hitRate', periodMs);
    const avgSize = this.getAverage(providerName, 'size', periodMs);
    const peakSize = this.getPeak(providerName, 'size', periodMs)?.value || 0;
    
    // Calculate total operations
    const avgHits = this.getAverage(providerName, 'hits', periodMs);
    const avgMisses = this.getAverage(providerName, 'misses', periodMs);
    const totalOperations = avgHits + avgMisses;

    return {
      avgHitRate,
      avgSize,
      totalOperations,
      peakSize,
      trend: {
        hitRate: this.getTrend(providerName, 'hitRate', periodMs),
        size: this.getTrend(providerName, 'size', periodMs)
      }
    };
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(providerName?: string): string {
    const data = providerName 
      ? { [providerName]: this.metrics.get(providerName) }
      : Object.fromEntries(this.metrics);

    return JSON.stringify({
      exportTime: Date.now(),
      options: this.options,
      metrics: data
    }, null, 2);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(providerName?: string): void {
    if (providerName) {
      this.metrics.set(providerName, this.createEmptyMetrics());
    } else {
      for (const name of this.metrics.keys()) {
        this.metrics.set(name, this.createEmptyMetrics());
      }
    }
  }

  /**
   * Get collection status
   */
  getStatus(): {
    isCollecting: boolean;
    providersCount: number;
    totalDataPoints: number;
    oldestDataPoint?: number;
    newestDataPoint?: number;
  } {
    let totalDataPoints = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    for (const metrics of this.metrics.values()) {
      Object.values(metrics).forEach(metricArray => {
        totalDataPoints += metricArray.length;
        
        if (metricArray.length > 0) {
          const oldest = Math.min(...metricArray.map(p => p.timestamp));
          const newest = Math.max(...metricArray.map(p => p.timestamp));
          
          oldestTimestamp = Math.min(oldestTimestamp, oldest);
          newestTimestamp = Math.max(newestTimestamp, newest);
        }
      });
    }

    return {
      isCollecting: this.isCollecting,
      providersCount: this.providers.size,
      totalDataPoints,
      oldestDataPoint: oldestTimestamp === Infinity ? undefined : oldestTimestamp,
      newestDataPoint: newestTimestamp === 0 ? undefined : newestTimestamp
    };
  }
}