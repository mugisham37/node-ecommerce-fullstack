/**
 * Performance monitoring service
 * Tracks application performance metrics and provides insights
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { PrometheusMetrics } from '../metrics/PrometheusMetrics';
import { logger } from '../logging/Logger';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface PerformanceThresholds {
  slow: number;
  critical: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PrometheusMetrics;
  private performanceObserver: PerformanceObserver | null = null;
  private recentMetrics: PerformanceMetric[] = [];
  private maxRecentMetrics = 1000;
  
  // Default thresholds in milliseconds
  private thresholds: Record<string, PerformanceThresholds> = {
    'http-request': { slow: 1000, critical: 5000 },
    'database-query': { slow: 100, critical: 1000 },
    'cache-operation': { slow: 10, critical: 100 },
    'business-operation': { slow: 500, critical: 2000 },
  };

  private constructor() {
    this.metrics = PrometheusMetrics.getInstance();
    this.setupPerformanceObserver();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start a performance measurement
   */
  startMeasurement(name: string, metadata?: Record<string, any>): () => void {
    const startTime = performance.now();
    const startMark = `${name}-start-${Date.now()}`;
    
    performance.mark(startMark);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordMetric({
        name,
        duration,
        timestamp: new Date(),
        metadata,
      });

      // Clean up the mark
      try {
        performance.clearMarks(startMark);
      } catch {
        // Ignore cleanup errors
      }
    };
  }

  /**
   * Record a performance metric directly
   */
  recordMetric(metric: PerformanceMetric): void {
    // Add to recent metrics
    this.recentMetrics.push(metric);
    if (this.recentMetrics.length > this.maxRecentMetrics) {
      this.recentMetrics.shift();
    }

    // Check thresholds and log warnings
    this.checkThresholds(metric);

    // Update Prometheus metrics based on metric type
    this.updatePrometheusMetrics(metric);
  }

  /**
   * Measure and record an async operation
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const endMeasurement = this.startMeasurement(name, metadata);
    
    try {
      const result = await operation();
      endMeasurement();
      return result;
    } catch (error) {
      endMeasurement();
      throw error;
    }
  }

  /**
   * Measure and record a sync operation
   */
  measureSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    const endMeasurement = this.startMeasurement(name, metadata);
    
    try {
      const result = operation();
      endMeasurement();
      return result;
    } catch (error) {
      endMeasurement();
      throw error;
    }
  }

  /**
   * Get performance statistics for a specific metric name
   */
  getStatistics(metricName: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const relevantMetrics = this.recentMetrics
      .filter(m => m.name === metricName)
      .map(m => m.duration)
      .sort((a, b) => a - b);

    if (relevantMetrics.length === 0) {
      return null;
    }

    const count = relevantMetrics.length;
    const sum = relevantMetrics.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const min = relevantMetrics[0];
    const max = relevantMetrics[count - 1];

    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * count) - 1;
      return relevantMetrics[Math.max(0, index)];
    };

    return {
      count,
      average,
      min,
      max,
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  /**
   * Get recent slow operations
   */
  getSlowOperations(limit = 10): PerformanceMetric[] {
    return this.recentMetrics
      .filter(metric => this.isSlowOperation(metric))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Set custom thresholds for a metric type
   */
  setThresholds(metricType: string, thresholds: PerformanceThresholds): void {
    this.thresholds[metricType] = thresholds;
  }

  /**
   * Clear recent metrics (useful for testing)
   */
  clearMetrics(): void {
    this.recentMetrics = [];
  }

  private setupPerformanceObserver(): void {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            this.recordMetric({
              name: entry.name,
              duration: entry.duration,
              timestamp: new Date(),
            });
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      logger.warn('Failed to setup performance observer:', error);
    }
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const metricType = this.getMetricType(metric.name);
    const threshold = this.thresholds[metricType];

    if (!threshold) {
      return;
    }

    if (metric.duration > threshold.critical) {
      logger.error(`Critical performance issue: ${metric.name} took ${metric.duration.toFixed(2)}ms`, {
        metric: metric.name,
        duration: metric.duration,
        threshold: threshold.critical,
        metadata: metric.metadata,
      });
    } else if (metric.duration > threshold.slow) {
      logger.warn(`Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`, {
        metric: metric.name,
        duration: metric.duration,
        threshold: threshold.slow,
        metadata: metric.metadata,
      });
    }
  }

  private updatePrometheusMetrics(metric: PerformanceMetric): void {
    const durationSeconds = metric.duration / 1000;

    if (metric.name.startsWith('http-')) {
      // HTTP request metrics are handled separately
      return;
    }

    if (metric.name.startsWith('database-')) {
      const operation = metric.metadata?.operation || 'unknown';
      const table = metric.metadata?.table || 'unknown';
      this.metrics.databaseQueryDuration.observe(
        { operation, table },
        durationSeconds
      );
    } else if (metric.name.startsWith('cache-')) {
      const operation = metric.metadata?.operation || 'unknown';
      const cacheName = metric.metadata?.cacheName || 'default';
      this.metrics.cacheOperationDuration.observe(
        { operation, cache_name: cacheName },
        durationSeconds
      );
    }
  }

  private getMetricType(metricName: string): string {
    if (metricName.startsWith('http-')) return 'http-request';
    if (metricName.startsWith('database-')) return 'database-query';
    if (metricName.startsWith('cache-')) return 'cache-operation';
    return 'business-operation';
  }

  private isSlowOperation(metric: PerformanceMetric): boolean {
    const metricType = this.getMetricType(metric.name);
    const threshold = this.thresholds[metricType];
    return threshold ? metric.duration > threshold.slow : false;
  }
}