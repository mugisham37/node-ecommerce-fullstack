/**
 * Main monitoring service that coordinates all monitoring components
 * Provides a unified interface for health checks, metrics, alerts, and logging
 */

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { HealthService } from './health/HealthService';
import { DatabaseHealthIndicator } from './health/DatabaseHealth';
import { RedisHealthIndicator } from './health/RedisHealth';
import { BusinessHealthIndicator } from './health/BusinessHealth';
import { PrometheusMetrics } from './metrics/PrometheusMetrics';
import { MetricsCollector } from './metrics/MetricsCollector';
import { PerformanceMonitor } from './performance/PerformanceMonitor';
import { AlertService } from './alerts/AlertService';
import { ConsoleNotificationChannel } from './alerts/channels/ConsoleChannel';
import { EmailNotificationChannel } from './alerts/channels/EmailChannel';
import { RequestLogger } from './logging/RequestLogger';
import { logger } from './logging/Logger';

interface MonitoringConfig {
  database: {
    pool: Pool;
  };
  redis: {
    client: Redis;
  };
  services: {
    inventoryService: any;
    orderService: any;
    productService: any;
    cacheService: any;
  };
  alerts: {
    email?: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
      from: string;
      to: string[];
    };
  };
  metrics: {
    collectionIntervalMs?: number;
  };
}

export class MonitoringService {
  private static instance: MonitoringService;
  
  public readonly healthService: HealthService;
  public readonly metricsCollector: MetricsCollector;
  public readonly performanceMonitor: PerformanceMonitor;
  public readonly alertService: AlertService;
  public readonly requestLogger: RequestLogger;
  public readonly prometheusMetrics: PrometheusMetrics;

  private constructor(private config: MonitoringConfig) {
    // Initialize services
    this.healthService = new HealthService();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.alertService = AlertService.getInstance();
    this.requestLogger = new RequestLogger();
    this.prometheusMetrics = PrometheusMetrics.getInstance();

    // Setup health indicators
    this.setupHealthIndicators();

    // Setup metrics collector
    this.setupMetricsCollector();

    // Setup alert channels
    this.setupAlertChannels();

    logger.info('Monitoring service initialized');
  }

  public static initialize(config: MonitoringConfig): MonitoringService {
    if (MonitoringService.instance) {
      throw new Error('MonitoringService is already initialized');
    }
    
    MonitoringService.instance = new MonitoringService(config);
    return MonitoringService.instance;
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      throw new Error('MonitoringService must be initialized first');
    }
    return MonitoringService.instance;
  }

  /**
   * Start all monitoring services
   */
  async start(): Promise<void> {
    try {
      // Start metrics collection
      this.metricsCollector.start();

      // Perform initial health check
      const healthResult = await this.healthService.checkHealth();
      logger.info('Initial health check completed', {
        status: healthResult.status,
        checks: Object.keys(healthResult.checks).length,
      });

      // Start periodic health monitoring
      this.startHealthMonitoring();

      logger.info('Monitoring service started successfully');
    } catch (error) {
      logger.error('Failed to start monitoring service:', error);
      throw error;
    }
  }

  /**
   * Stop all monitoring services
   */
  async stop(): Promise<void> {
    try {
      // Stop metrics collection
      this.metricsCollector.stop();

      logger.info('Monitoring service stopped');
    } catch (error) {
      logger.error('Error stopping monitoring service:', error);
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<{
    health: any;
    metrics: {
      status: any;
      performance: any;
    };
    alerts: {
      active: number;
      recent: any[];
    };
  }> {
    const [healthResult, metricsStatus, activeAlerts, recentAlerts] = await Promise.all([
      this.healthService.checkHealth(),
      this.metricsCollector.getStatus(),
      this.alertService.getActiveAlerts(),
      this.alertService.getRecentAlerts(10),
    ]);

    return {
      health: healthResult,
      metrics: {
        status: metricsStatus,
        performance: {
          slowOperations: this.performanceMonitor.getSlowOperations(5),
        },
      },
      alerts: {
        active: activeAlerts.length,
        recent: recentAlerts,
      },
    };
  }

  /**
   * Trigger a manual health check
   */
  async triggerHealthCheck(): Promise<any> {
    return await this.healthService.checkHealth();
  }

  /**
   * Get Prometheus metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    return await this.prometheusMetrics.getMetrics();
  }

  private setupHealthIndicators(): void {
    // Database health indicator
    const databaseHealth = new DatabaseHealthIndicator(this.config.database.pool);
    this.healthService.registerIndicator(databaseHealth);

    // Redis health indicator
    const redisHealth = new RedisHealthIndicator(this.config.redis.client);
    this.healthService.registerIndicator(redisHealth);

    // Business health indicator
    const businessHealth = new BusinessHealthIndicator(
      this.config.services.inventoryService,
      this.config.services.orderService,
      this.config.services.productService,
      this.config.services.cacheService
    );
    this.healthService.registerIndicator(businessHealth);
  }

  private setupMetricsCollector(): void {
    // Create metrics source that implements the required interface
    const metricsSource = {
      getActiveProductsCount: async () => {
        try {
          const products = await this.config.services.productService.findActiveProducts();
          return products.length;
        } catch {
          return 0;
        }
      },
      getLowStockProductsCount: async () => {
        try {
          const products = await this.config.services.inventoryService.findLowStockProducts();
          return products.length;
        } catch {
          return 0;
        }
      },
      getPendingOrdersCount: async () => {
        try {
          const orders = await this.config.services.orderService.findPendingOrders();
          return orders.length;
        } catch {
          return 0;
        }
      },
      getDatabaseConnectionMetrics: async () => {
        try {
          return {
            active: this.config.database.pool.totalCount - this.config.database.pool.idleCount,
            idle: this.config.database.pool.idleCount,
          };
        } catch {
          return { active: 0, idle: 0 };
        }
      },
    };

    this.metricsCollector = new MetricsCollector(
      metricsSource,
      this.config.metrics.collectionIntervalMs
    );
  }

  private setupAlertChannels(): void {
    // Always setup console channel
    const consoleChannel = new ConsoleNotificationChannel();
    this.alertService.registerChannel(consoleChannel);

    // Setup email channel if configured
    if (this.config.alerts.email) {
      const emailChannel = new EmailNotificationChannel(this.config.alerts.email);
      this.alertService.registerChannel(emailChannel);
    }
  }

  private startHealthMonitoring(): void {
    // Check health every 5 minutes and trigger alerts if needed
    setInterval(async () => {
      try {
        const healthResult = await this.healthService.checkHealth();
        
        // Check for health issues and trigger alerts
        for (const [name, check] of Object.entries(healthResult.checks)) {
          if (check.status === 'DOWN') {
            await this.alertService.triggerAlert(
              `Health Check Failed: ${name}`,
              `Health check for ${name} is reporting DOWN status: ${check.error || 'Unknown error'}`,
              'critical' as any,
              'health',
              { healthCheck: name, details: check.details }
            );
          } else if (check.status === 'WARNING') {
            await this.alertService.triggerAlert(
              `Health Check Warning: ${name}`,
              `Health check for ${name} is reporting WARNING status`,
              'warning' as any,
              'health',
              { healthCheck: name, details: check.details }
            );
          }
        }

        // Check business metrics for alerts
        if (healthResult.checks['business-metrics']) {
          const businessCheck = healthResult.checks['business-metrics'];
          if (businessCheck.details) {
            await this.alertService.checkRules(businessCheck.details, 'business');
          }
        }

        // Check system metrics for alerts
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        
        await this.alertService.checkRules({
          memoryUsagePercent,
          maxConnections: this.config.database.pool.options.max || 10,
          activeConnections: this.config.database.pool.totalCount - this.config.database.pool.idleCount,
        }, 'system');

      } catch (error) {
        logger.error('Health monitoring check failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
}