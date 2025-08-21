/**
 * Example integration of the monitoring system
 * Shows how to set up and use all monitoring components
 */

import express from 'express';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { MonitoringService } from './MonitoringService';
import { logger } from './logging/Logger';

// Example service interfaces (these would be your actual services)
class ExampleInventoryService {
  async findLowStockProducts() {
    // Mock implementation
    return [];
  }
}

class ExampleOrderService {
  async findPendingOrders() {
    // Mock implementation
    return [];
  }

  async findOldPendingOrders(hoursOld: number) {
    // Mock implementation
    return [];
  }
}

class ExampleProductService {
  async findActiveProducts() {
    // Mock implementation
    return [];
  }
}

class ExampleCacheService {
  async getCacheStatistics() {
    // Mock implementation
    return {
      hitRatio: 0.85,
      missRatio: 0.15,
      evictionCount: 0,
    };
  }
}

/**
 * Example setup function
 */
export async function setupMonitoring() {
  // Database connection
  const dbPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ecommerce',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    min: 5,
  });

  // Redis connection
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  // Initialize services
  const inventoryService = new ExampleInventoryService();
  const orderService = new ExampleOrderService();
  const productService = new ExampleProductService();
  const cacheService = new ExampleCacheService();

  // Configure monitoring
  const monitoringConfig = {
    database: {
      pool: dbPool,
    },
    redis: {
      client: redis,
    },
    services: {
      inventoryService,
      orderService,
      productService,
      cacheService,
    },
    alerts: {
      email: process.env.SMTP_HOST ? {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || '',
        },
        from: process.env.ALERT_FROM_EMAIL || 'alerts@example.com',
        to: (process.env.ALERT_TO_EMAILS || '').split(',').filter(Boolean),
      } : undefined,
    },
    metrics: {
      collectionIntervalMs: 30000, // 30 seconds
    },
  };

  // Initialize monitoring service
  const monitoring = MonitoringService.initialize(monitoringConfig);
  await monitoring.start();

  logger.info('Monitoring system initialized successfully');
  return monitoring;
}

/**
 * Example Express app setup with monitoring
 */
export function setupExpressWithMonitoring(monitoring: MonitoringService) {
  const app = express();

  // Add request logging middleware
  app.use(monitoring.requestLogger.middleware());

  // Health check endpoints
  app.get('/health', async (req, res) => {
    try {
      const health = await monitoring.healthService.checkHealth();
      const statusCode = health.status === 'UP' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check endpoint error:', error);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // Readiness check
  app.get('/ready', async (req, res) => {
    try {
      const isReady = await monitoring.healthService.isReady();
      res.status(isReady ? 200 : 503).json({ ready: isReady });
    } catch (error) {
      logger.error('Readiness check endpoint error:', error);
      res.status(500).json({ ready: false });
    }
  });

  // Liveness check
  app.get('/live', (req, res) => {
    const isAlive = monitoring.healthService.isAlive();
    res.status(isAlive ? 200 : 503).json({ alive: isAlive });
  });

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (req, res) => {
    try {
      const metrics = await monitoring.getPrometheusMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      logger.error('Metrics endpoint error:', error);
      res.status(500).send('Error generating metrics');
    }
  });

  // System status endpoint
  app.get('/status', async (req, res) => {
    try {
      const status = await monitoring.getSystemStatus();
      res.json(status);
    } catch (error) {
      logger.error('Status endpoint error:', error);
      res.status(500).json({ error: 'Failed to get system status' });
    }
  });

  return app;
}

/**
 * Example usage in your main application
 */
export async function exampleUsage() {
  try {
    // Setup monitoring
    const monitoring = await setupMonitoring();

    // Setup Express app
    const app = setupExpressWithMonitoring(monitoring);

    // Example of using performance monitoring
    app.get('/api/products', async (req, res) => {
      const endMeasurement = monitoring.performanceMonitor.startMeasurement(
        'api-get-products',
        { endpoint: '/api/products', userId: req.headers['user-id'] }
      );

      try {
        // Your business logic here
        const products = await getProducts(); // Your actual function
        
        endMeasurement();
        res.json(products);
      } catch (error) {
        endMeasurement();
        
        // Log error with context
        const requestLogger = monitoring.requestLogger.createRequestLogger(req);
        requestLogger.error('Failed to get products', error);
        
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Start server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info(`Server started on port ${port}`);
    });

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Mock function for example
async function getProducts() {
  return [{ id: 1, name: 'Example Product' }];
}