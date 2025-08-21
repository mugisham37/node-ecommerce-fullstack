/**
 * Metrics collector service that periodically collects and updates metrics
 * Coordinates with various services to gather business and system metrics
 */

import { PrometheusMetrics } from './PrometheusMetrics';
import { logger } from '../logging/Logger';

interface MetricsSource {
  getActiveProductsCount(): Promise<number>;
  getLowStockProductsCount(): Promise<number>;
  getPendingOrdersCount(): Promise<number>;
  getDatabaseConnectionMetrics(): Promise<{
    active: number;
    idle: number;
  }>;
}

export class MetricsCollector {
  private metrics: PrometheusMetrics;
  private intervalId: NodeJS.Timeout | null = null;
  private isCollecting = false;

  constructor(
    private metricsSource: MetricsSource,
    private collectionIntervalMs: number = 30000 // 30 seconds default
  ) {
    this.metrics = PrometheusMetrics.getInstance();
  }

  /**
   * Start periodic metrics collection
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('Metrics collector is already running');
      return;
    }

    logger.info(`Starting metrics collection with ${this.collectionIntervalMs}ms interval`);
    
    // Collect metrics immediately
    this.collectMetrics();

    // Set up periodic collection
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.collectionIntervalMs);
  }

  /**
   * Stop periodic metrics collection
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped metrics collection');
    }
  }

  /**
   * Collect all metrics once
   */
  async collectMetrics(): Promise<void> {
    if (this.isCollecting) {
      logger.debug('Metrics collection already in progress, skipping');
      return;
    }

    this.isCollecting = true;
    const startTime = Date.now();

    try {
      // Collect system metrics
      this.metrics.updateSystemMetrics();

      // Collect business metrics
      await this.collectBusinessMetrics();

      // Collect database metrics
      await this.collectDatabaseMetrics();

      const duration = Date.now() - startTime;
      logger.debug(`Metrics collection completed in ${duration}ms`);
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
    } finally {
      this.isCollecting = false;
    }
  }

  private async collectBusinessMetrics(): Promise<void> {
    try {
      const [activeProducts, lowStockProducts, pendingOrders] = await Promise.all([
        this.metricsSource.getActiveProductsCount(),
        this.metricsSource.getLowStockProductsCount(),
        this.metricsSource.getPendingOrdersCount(),
      ]);

      await this.metrics.updateBusinessMetrics({
        activeProducts,
        lowStockProducts,
        pendingOrders,
      });
    } catch (error) {
      logger.error('Failed to collect business metrics:', error);
    }
  }

  private async collectDatabaseMetrics(): Promise<void> {
    try {
      const dbMetrics = await this.metricsSource.getDatabaseConnectionMetrics();
      this.metrics.databaseConnectionsActive.set(dbMetrics.active);
      this.metrics.databaseConnectionsIdle.set(dbMetrics.idle);
    } catch (error) {
      logger.error('Failed to collect database metrics:', error);
    }
  }

  /**
   * Get current collection status
   */
  getStatus(): {
    isRunning: boolean;
    isCollecting: boolean;
    intervalMs: number;
  } {
    return {
      isRunning: this.intervalId !== null,
      isCollecting: this.isCollecting,
      intervalMs: this.collectionIntervalMs,
    };
  }
}