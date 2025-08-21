/**
 * Prometheus metrics collection and exposition
 * Provides application and business metrics for monitoring
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../logging/Logger';

export class PrometheusMetrics {
  private static instance: PrometheusMetrics;
  
  // HTTP metrics
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestsInFlight: Gauge<string>;

  // Database metrics
  public readonly databaseConnectionsActive: Gauge<string>;
  public readonly databaseConnectionsIdle: Gauge<string>;
  public readonly databaseQueryDuration: Histogram<string>;
  public readonly databaseQueryErrors: Counter<string>;

  // Cache metrics
  public readonly cacheHits: Counter<string>;
  public readonly cacheMisses: Counter<string>;
  public readonly cacheOperationDuration: Histogram<string>;

  // Business metrics
  public readonly activeProducts: Gauge<string>;
  public readonly lowStockProducts: Gauge<string>;
  public readonly pendingOrders: Gauge<string>;
  public readonly ordersProcessed: Counter<string>;
  public readonly inventoryAdjustments: Counter<string>;

  // System metrics
  public readonly memoryUsage: Gauge<string>;
  public readonly cpuUsage: Gauge<string>;
  public readonly eventLoopLag: Histogram<string>;

  private constructor() {
    // Collect default Node.js metrics
    collectDefaultMetrics({ register });

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [register],
    });

    this.httpRequestsInFlight = new Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      registers: [register],
    });

    // Database Metrics
    this.databaseConnectionsActive = new Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      registers: [register],
    });

    this.databaseConnectionsIdle = new Gauge({
      name: 'database_connections_idle',
      help: 'Number of idle database connections',
      registers: [register],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [register],
    });

    this.databaseQueryErrors = new Counter({
      name: 'database_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table', 'error_type'],
      registers: [register],
    });

    // Cache Metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_name'],
      registers: [register],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_name'],
      registers: [register],
    });

    this.cacheOperationDuration = new Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation', 'cache_name'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
      registers: [register],
    });

    // Business Metrics
    this.activeProducts = new Gauge({
      name: 'business_active_products',
      help: 'Number of active products in inventory',
      registers: [register],
    });

    this.lowStockProducts = new Gauge({
      name: 'business_low_stock_products',
      help: 'Number of products with low stock',
      registers: [register],
    });

    this.pendingOrders = new Gauge({
      name: 'business_pending_orders',
      help: 'Number of pending orders',
      registers: [register],
    });

    this.ordersProcessed = new Counter({
      name: 'business_orders_processed_total',
      help: 'Total number of orders processed',
      labelNames: ['status'],
      registers: [register],
    });

    this.inventoryAdjustments = new Counter({
      name: 'business_inventory_adjustments_total',
      help: 'Total number of inventory adjustments',
      labelNames: ['type', 'reason'],
      registers: [register],
    });

    // System Metrics
    this.memoryUsage = new Gauge({
      name: 'nodejs_memory_usage_bytes',
      help: 'Node.js memory usage in bytes',
      labelNames: ['type'],
      registers: [register],
    });

    this.cpuUsage = new Gauge({
      name: 'nodejs_cpu_usage_percent',
      help: 'Node.js CPU usage percentage',
      registers: [register],
    });

    this.eventLoopLag = new Histogram({
      name: 'nodejs_eventloop_lag_seconds',
      help: 'Event loop lag in seconds',
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [register],
    });

    logger.info('Prometheus metrics initialized');
  }

  public static getInstance(): PrometheusMetrics {
    if (!PrometheusMetrics.instance) {
      PrometheusMetrics.instance = new PrometheusMetrics();
    }
    return PrometheusMetrics.instance;
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(): void {
    try {
      const memoryUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'heap_used' }, memoryUsage.heapUsed);
      this.memoryUsage.set({ type: 'heap_total' }, memoryUsage.heapTotal);
      this.memoryUsage.set({ type: 'external' }, memoryUsage.external);
      this.memoryUsage.set({ type: 'rss' }, memoryUsage.rss);

      const cpuUsage = process.cpuUsage();
      const totalCpuTime = cpuUsage.user + cpuUsage.system;
      this.cpuUsage.set(totalCpuTime / 1000000); // Convert to seconds
    } catch (error) {
      logger.error('Failed to update system metrics:', error);
    }
  }

  /**
   * Update business metrics
   */
  async updateBusinessMetrics(metrics: {
    activeProducts: number;
    lowStockProducts: number;
    pendingOrders: number;
  }): Promise<void> {
    try {
      this.activeProducts.set(metrics.activeProducts);
      this.lowStockProducts.set(metrics.lowStockProducts);
      this.pendingOrders.set(metrics.pendingOrders);
    } catch (error) {
      logger.error('Failed to update business metrics:', error);
    }
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ): void {
    const labels = { method, route, status_code: statusCode.toString() };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    error?: Error
  ): void {
    const labels = { operation, table };
    this.databaseQueryDuration.observe(labels, duration);
    
    if (error) {
      this.databaseQueryErrors.inc({
        ...labels,
        error_type: error.constructor.name,
      });
    }
  }

  /**
   * Record cache operation
   */
  recordCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    cacheName: string,
    duration?: number
  ): void {
    if (operation === 'hit') {
      this.cacheHits.inc({ cache_name: cacheName });
    } else if (operation === 'miss') {
      this.cacheMisses.inc({ cache_name: cacheName });
    }

    if (duration !== undefined) {
      this.cacheOperationDuration.observe(
        { operation, cache_name: cacheName },
        duration
      );
    }
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    register.clear();
  }
}