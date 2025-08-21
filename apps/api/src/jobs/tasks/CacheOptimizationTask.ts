import { BaseScheduledTask } from '../schedulers/BaseScheduledTask';
import { ScheduledTaskRegistry } from '../schedulers/ScheduledTaskRegistry';
import { ScheduledTaskMonitoringService } from '../monitoring/ScheduledTaskMonitoringService';
import { ScheduledTaskPerformanceService } from '../monitoring/ScheduledTaskPerformanceService';
import { CacheService } from '../../services/CacheService';
import { NotificationService } from '../../services/NotificationService';

/**
 * Scheduled task for cache optimization and monitoring.
 * Handles cache metrics collection, health monitoring, and maintenance operations.
 */
export class CacheOptimizationTask extends BaseScheduledTask {
  private readonly cacheMetrics = new Map<string, CacheMetrics>();
  private readonly performanceHistory: CachePerformanceSnapshot[] = [];
  private readonly maxHistorySize = 1000;

  constructor(
    taskRegistry: ScheduledTaskRegistry,
    monitoringService: ScheduledTaskMonitoringService,
    performanceService: ScheduledTaskPerformanceService,
    private readonly cacheService: CacheService,
    private readonly notificationService: NotificationService,
    private readonly config: {
      metricsCollectionInterval?: number;
      healthCheckInterval?: number;
      maintenanceInterval?: number;
      alertThresholds?: CacheAlertThresholds;
    } = {}
  ) {
    super(taskRegistry, monitoringService, performanceService);
  }

  /**
   * Collect cache metrics every 30 seconds.
   */
  async collectCacheMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherCacheMetrics();
      this.updateMetricsHistory(metrics);
      
      // Check for performance issues
      await this.checkPerformanceThresholds(metrics);
      
      this.logger.debug('Cache metrics collected successfully', {
        hitRate: metrics.hitRate,
        memoryUsage: metrics.memoryUsage,
        connectionCount: metrics.connectionCount
      });
      
    } catch (error) {
      this.logger.error('Failed to collect cache metrics', error);
    }
  }

  /**
   * Monitor cache connection health every minute.
   */
  async monitorConnectionHealth(): Promise<void> {
    try {
      const healthStatus = await this.checkCacheHealth();
      
      if (!healthStatus.isHealthy) {
        await this.handleHealthIssue(healthStatus);
      }
      
      this.logger.debug('Cache health check completed', {
        isHealthy: healthStatus.isHealthy,
        responseTime: healthStatus.responseTime,
        connectionCount: healthStatus.connectionCount
      });
      
    } catch (error) {
      this.logger.error('Failed to monitor cache health', error);
    }
  }

  /**
   * Perform cache maintenance tasks every 5 minutes.
   */
  async performMaintenanceTasks(): Promise<void> {
    await this.executeTask();
  }

  protected getTaskName(): string {
    return 'cache-optimization-task';
  }

  protected getTaskDescription(): string {
    return 'Optimize cache performance, clean expired keys, and monitor cache health';
  }

  protected async doExecute(): Promise<void> {
    this.logger.info('Starting cache optimization and maintenance');
    
    try {
      // Clean up expired keys
      const expiredKeysRemoved = await this.cleanupExpiredKeys();
      
      // Optimize memory usage
      const memoryOptimized = await this.optimizeMemoryUsage();
      
      // Update cache statistics
      await this.updateCacheStatistics();
      
      // Generate performance report if needed
      if (this.shouldGenerateReport()) {
        await this.generatePerformanceReport();
      }
      
      this.logger.info('Cache optimization completed', {
        expiredKeysRemoved,
        memoryOptimized: memoryOptimized.bytesFreed,
        keysOptimized: memoryOptimized.keysOptimized
      });
      
    } catch (error) {
      this.logger.error('Failed to perform cache maintenance', error);
      throw error;
    }
  }

  /**
   * Get current cache performance metrics.
   */
  async getCachePerformanceMetrics(): Promise<CachePerformanceMetrics> {
    const metrics = await this.gatherCacheMetrics();
    const history = this.getRecentPerformanceHistory(24); // Last 24 hours
    
    return new CachePerformanceMetrics(
      metrics.hitRate,
      metrics.missRate,
      metrics.memoryUsage,
      metrics.connectionCount,
      metrics.operationsPerSecond,
      this.calculateAverageResponseTime(history),
      this.calculateThroughputTrend(history)
    );
  }

  /**
   * Get cache health status.
   */
  async getCacheHealthStatus(): Promise<CacheHealthStatus> {
    return await this.checkCacheHealth();
  }

  /**
   * Force cache optimization.
   */
  async forceCacheOptimization(): Promise<CacheOptimizationResult> {
    this.logger.info('Forcing cache optimization');
    
    const beforeMetrics = await this.gatherCacheMetrics();
    
    // Perform aggressive optimization
    const expiredKeys = await this.cleanupExpiredKeys();
    const memoryOpt = await this.optimizeMemoryUsage();
    await this.defragmentCache();
    
    const afterMetrics = await this.gatherCacheMetrics();
    
    const result = new CacheOptimizationResult(
      expiredKeys,
      memoryOpt.keysOptimized,
      memoryOpt.bytesFreed,
      beforeMetrics.memoryUsage - afterMetrics.memoryUsage,
      afterMetrics.hitRate - beforeMetrics.hitRate
    );
    
    this.logger.info('Forced cache optimization completed', result);
    
    return result;
  }

  /**
   * Gather comprehensive cache metrics.
   */
  private async gatherCacheMetrics(): Promise<CacheMetrics> {
    try {
      const info = await this.cacheService.getInfo();
      const stats = await this.cacheService.getStats();
      
      const hitRate = stats.hits > 0 ? (stats.hits / (stats.hits + stats.misses)) * 100 : 0;
      const missRate = 100 - hitRate;
      
      return new CacheMetrics(
        hitRate,
        missRate,
        info.memoryUsage,
        info.maxMemory,
        info.connectionCount,
        stats.operationsPerSecond,
        stats.averageResponseTime,
        new Date()
      );
      
    } catch (error) {
      this.logger.error('Failed to gather cache metrics', error);
      throw error;
    }
  }

  /**
   * Check cache health status.
   */
  private async checkCacheHealth(): Promise<CacheHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test basic operations
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'health_check_value';
      
      await this.cacheService.set(testKey, testValue, 60);
      const retrievedValue = await this.cacheService.get(testKey);
      await this.cacheService.delete(testKey);
      
      const responseTime = Date.now() - startTime;
      const isHealthy = retrievedValue === testValue && responseTime < 1000;
      
      const info = await this.cacheService.getInfo();
      
      return new CacheHealthStatus(
        isHealthy,
        responseTime,
        info.connectionCount,
        info.memoryUsage,
        isHealthy ? 'Healthy' : 'Degraded performance'
      );
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return new CacheHealthStatus(
        false,
        responseTime,
        0,
        0,
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Clean up expired keys.
   */
  private async cleanupExpiredKeys(): Promise<number> {
    try {
      return await this.cacheService.cleanupExpiredKeys();
    } catch (error) {
      this.logger.error('Failed to cleanup expired keys', error);
      return 0;
    }
  }

  /**
   * Optimize memory usage.
   */
  private async optimizeMemoryUsage(): Promise<MemoryOptimizationResult> {
    try {
      // Compress large values
      const compressionResult = await this.compressLargeValues();
      
      // Remove least recently used items if memory is high
      const evictionResult = await this.evictLeastRecentlyUsed();
      
      return new MemoryOptimizationResult(
        compressionResult.keysOptimized + evictionResult.keysEvicted,
        compressionResult.bytesFreed + evictionResult.bytesFreed
      );
      
    } catch (error) {
      this.logger.error('Failed to optimize memory usage', error);
      return new MemoryOptimizationResult(0, 0);
    }
  }

  /**
   * Compress large cache values.
   */
  private async compressLargeValues(): Promise<{keysOptimized: number, bytesFreed: number}> {
    // Implementation would identify and compress large values
    // This is a placeholder for the actual compression logic
    return { keysOptimized: 0, bytesFreed: 0 };
  }

  /**
   * Evict least recently used items when memory is high.
   */
  private async evictLeastRecentlyUsed(): Promise<{keysEvicted: number, bytesFreed: number}> {
    try {
      const info = await this.cacheService.getInfo();
      const memoryUsagePercent = (info.memoryUsage / info.maxMemory) * 100;
      
      if (memoryUsagePercent > 80) {
        // Evict some LRU items
        const evicted = await this.cacheService.evictLRU(100); // Evict 100 items
        return { keysEvicted: evicted.count, bytesFreed: evicted.bytesFreed };
      }
      
      return { keysEvicted: 0, bytesFreed: 0 };
      
    } catch (error) {
      this.logger.error('Failed to evict LRU items', error);
      return { keysEvicted: 0, bytesFreed: 0 };
    }
  }

  /**
   * Defragment cache memory.
   */
  private async defragmentCache(): Promise<void> {
    try {
      await this.cacheService.defragment();
      this.logger.info('Cache defragmentation completed');
    } catch (error) {
      this.logger.error('Failed to defragment cache', error);
    }
  }

  /**
   * Update metrics history.
   */
  private updateMetricsHistory(metrics: CacheMetrics): void {
    this.performanceHistory.push(new CachePerformanceSnapshot(
      metrics.timestamp,
      metrics.hitRate,
      metrics.memoryUsage,
      metrics.operationsPerSecond,
      metrics.averageResponseTime
    ));
    
    // Keep only recent history
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Check performance thresholds and alert if needed.
   */
  private async checkPerformanceThresholds(metrics: CacheMetrics): Promise<void> {
    const thresholds = this.config.alertThresholds || new CacheAlertThresholds();
    
    // Check hit rate
    if (metrics.hitRate < thresholds.minHitRate) {
      await this.sendAlert('Low Cache Hit Rate', 
        `Cache hit rate is ${metrics.hitRate.toFixed(1)}%, below threshold of ${thresholds.minHitRate}%`);
    }
    
    // Check memory usage
    const memoryUsagePercent = (metrics.memoryUsage / metrics.maxMemory) * 100;
    if (memoryUsagePercent > thresholds.maxMemoryUsage) {
      await this.sendAlert('High Cache Memory Usage', 
        `Cache memory usage is ${memoryUsagePercent.toFixed(1)}%, above threshold of ${thresholds.maxMemoryUsage}%`);
    }
    
    // Check response time
    if (metrics.averageResponseTime > thresholds.maxResponseTime) {
      await this.sendAlert('Slow Cache Response Time', 
        `Cache response time is ${metrics.averageResponseTime}ms, above threshold of ${thresholds.maxResponseTime}ms`);
    }
  }

  /**
   * Handle cache health issues.
   */
  private async handleHealthIssue(healthStatus: CacheHealthStatus): Promise<void> {
    const alertMessage = `Cache health issue detected: ${healthStatus.statusMessage}. Response time: ${healthStatus.responseTime}ms`;
    
    await this.sendAlert('Cache Health Issue', alertMessage);
    
    // Attempt automatic recovery
    try {
      await this.attemptCacheRecovery();
    } catch (error) {
      this.logger.error('Failed to recover cache', error);
    }
  }

  /**
   * Attempt automatic cache recovery.
   */
  private async attemptCacheRecovery(): Promise<void> {
    this.logger.info('Attempting cache recovery');
    
    try {
      // Restart connections
      await this.cacheService.reconnect();
      
      // Clear problematic keys
      await this.cleanupExpiredKeys();
      
      this.logger.info('Cache recovery completed');
    } catch (error) {
      this.logger.error('Cache recovery failed', error);
      throw error;
    }
  }

  /**
   * Send alert notification.
   */
  private async sendAlert(title: string, message: string): Promise<void> {
    try {
      await this.notificationService.sendSystemAlert(title, message);
    } catch (error) {
      this.logger.error('Failed to send cache alert', error);
    }
  }

  /**
   * Update cache statistics.
   */
  private async updateCacheStatistics(): Promise<void> {
    try {
      const metrics = await this.gatherCacheMetrics();
      this.cacheMetrics.set('current', metrics);
    } catch (error) {
      this.logger.error('Failed to update cache statistics', error);
    }
  }

  /**
   * Check if performance report should be generated.
   */
  private shouldGenerateReport(): boolean {
    // Generate report every hour
    const lastReport = this.cacheMetrics.get('lastReport');
    if (!lastReport) return true;
    
    const hoursSinceLastReport = (Date.now() - lastReport.timestamp.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastReport >= 1;
  }

  /**
   * Generate performance report.
   */
  private async generatePerformanceReport(): Promise<void> {
    try {
      const report = this.buildPerformanceReport();
      await this.notificationService.sendAnalyticsReport('Cache Performance Report', report);
      
      // Mark report as generated
      const currentMetrics = await this.gatherCacheMetrics();
      this.cacheMetrics.set('lastReport', currentMetrics);
      
    } catch (error) {
      this.logger.error('Failed to generate performance report', error);
    }
  }

  /**
   * Build performance report.
   */
  private buildPerformanceReport(): string {
    const history = this.getRecentPerformanceHistory(24);
    const currentMetrics = this.cacheMetrics.get('current');
    
    const report: string[] = [];
    
    report.push('=== CACHE PERFORMANCE REPORT ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');
    
    if (currentMetrics) {
      report.push('CURRENT METRICS:');
      report.push(`- Hit Rate: ${currentMetrics.hitRate.toFixed(1)}%`);
      report.push(`- Memory Usage: ${(currentMetrics.memoryUsage / 1024 / 1024).toFixed(1)} MB`);
      report.push(`- Operations/sec: ${currentMetrics.operationsPerSecond}`);
      report.push(`- Avg Response Time: ${currentMetrics.averageResponseTime}ms`);
      report.push('');
    }
    
    if (history.length > 0) {
      const avgHitRate = history.reduce((sum, h) => sum + h.hitRate, 0) / history.length;
      const avgResponseTime = history.reduce((sum, h) => sum + h.responseTime, 0) / history.length;
      
      report.push('24-HOUR AVERAGES:');
      report.push(`- Average Hit Rate: ${avgHitRate.toFixed(1)}%`);
      report.push(`- Average Response Time: ${avgResponseTime.toFixed(1)}ms`);
      report.push('');
    }
    
    return report.join('\n');
  }

  /**
   * Get recent performance history.
   */
  private getRecentPerformanceHistory(hours: number): CachePerformanceSnapshot[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.performanceHistory.filter(snapshot => snapshot.timestamp >= cutoff);
  }

  /**
   * Calculate average response time from history.
   */
  private calculateAverageResponseTime(history: CachePerformanceSnapshot[]): number {
    if (history.length === 0) return 0;
    return history.reduce((sum, h) => sum + h.responseTime, 0) / history.length;
  }

  /**
   * Calculate throughput trend from history.
   */
  private calculateThroughputTrend(history: CachePerformanceSnapshot[]): string {
    if (history.length < 2) return 'UNKNOWN';
    
    const recent = history.slice(-10); // Last 10 snapshots
    const older = history.slice(-20, -10); // Previous 10 snapshots
    
    if (older.length === 0) return 'STABLE';
    
    const recentAvg = recent.reduce((sum, h) => sum + h.operationsPerSecond, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.operationsPerSecond, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 10) return 'INCREASING';
    if (change < -10) return 'DECREASING';
    return 'STABLE';
  }
}

// Supporting classes and interfaces

export class CacheMetrics {
  constructor(
    public readonly hitRate: number,
    public readonly missRate: number,
    public readonly memoryUsage: number,
    public readonly maxMemory: number,
    public readonly connectionCount: number,
    public readonly operationsPerSecond: number,
    public readonly averageResponseTime: number,
    public readonly timestamp: Date
  ) {}
}

export class CacheHealthStatus {
  constructor(
    public readonly isHealthy: boolean,
    public readonly responseTime: number,
    public readonly connectionCount: number,
    public readonly memoryUsage: number,
    public readonly statusMessage: string
  ) {}
}

export class CachePerformanceMetrics {
  constructor(
    public readonly hitRate: number,
    public readonly missRate: number,
    public readonly memoryUsage: number,
    public readonly connectionCount: number,
    public readonly operationsPerSecond: number,
    public readonly averageResponseTime: number,
    public readonly throughputTrend: string
  ) {}
}

export class CacheOptimizationResult {
  constructor(
    public readonly expiredKeysRemoved: number,
    public readonly keysOptimized: number,
    public readonly bytesFreed: number,
    public readonly memoryReduced: number,
    public readonly hitRateImprovement: number
  ) {}
}

export class CachePerformanceSnapshot {
  constructor(
    public readonly timestamp: Date,
    public readonly hitRate: number,
    public readonly memoryUsage: number,
    public readonly operationsPerSecond: number,
    public readonly responseTime: number
  ) {}
}

export class MemoryOptimizationResult {
  constructor(
    public readonly keysOptimized: number,
    public readonly bytesFreed: number
  ) {}
}

export class CacheAlertThresholds {
  constructor(
    public readonly minHitRate: number = 80,
    public readonly maxMemoryUsage: number = 85,
    public readonly maxResponseTime: number = 100
  ) {}
}