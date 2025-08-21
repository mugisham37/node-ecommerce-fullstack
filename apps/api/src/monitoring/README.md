# Monitoring System

This monitoring system provides comprehensive observability for the e-commerce inventory management API, including health checks, metrics collection, performance monitoring, alerting, and structured logging.

## Features

### 🏥 Health Checks
- **Database Health**: PostgreSQL connectivity, connection pool metrics, and basic business queries
- **Redis Health**: Cache connectivity, performance metrics, and operation testing
- **Business Health**: Inventory levels, order processing, and system performance indicators

### 📊 Metrics Collection
- **Prometheus Integration**: Industry-standard metrics format
- **HTTP Metrics**: Request counts, duration, and status codes
- **Database Metrics**: Query performance and connection pool status
- **Cache Metrics**: Hit/miss ratios and operation latency
- **Business Metrics**: Active products, low stock alerts, pending orders
- **System Metrics**: Memory usage, CPU utilization, and event loop lag

### ⚡ Performance Monitoring
- **Request Tracing**: Automatic performance measurement for HTTP requests
- **Database Query Monitoring**: Track slow queries and optimization opportunities
- **Cache Performance**: Monitor cache efficiency and identify bottlenecks
- **Custom Measurements**: Instrument any operation with performance tracking

### 🚨 Alerting System
- **Rule-Based Alerts**: Configurable conditions for automatic alerting
- **Multiple Channels**: Console, email, and extensible notification system
- **Severity Levels**: Info, Warning, Error, and Critical classifications
- **Cooldown Periods**: Prevent alert spam with configurable cooldowns
- **Alert Resolution**: Track and resolve alerts with audit trail

### 📝 Structured Logging
- **Winston Integration**: Professional logging with multiple transports
- **Request Context**: Automatic request ID and user context tracking
- **Log Levels**: Configurable log levels for different environments
- **Sensitive Data Protection**: Automatic sanitization of passwords and tokens
- **Performance Logging**: Dedicated performance and audit log streams

## Quick Start

### 1. Initialize Monitoring

```typescript
import { MonitoringService } from './monitoring';

const monitoring = MonitoringService.initialize({
  database: { pool: dbPool },
  redis: { client: redisClient },
  services: {
    inventoryService,
    orderService,
    productService,
    cacheService,
  },
  alerts: {
    email: {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'alerts@example.com', pass: 'password' },
      from: 'alerts@example.com',
      to: ['admin@example.com'],
    },
  },
});

await monitoring.start();
```

### 2. Add Express Middleware

```typescript
import express from 'express';

const app = express();

// Add request logging
app.use(monitoring.requestLogger.middleware());

// Health check endpoints
app.get('/health', async (req, res) => {
  const health = await monitoring.healthService.checkHealth();
  res.status(health.status === 'UP' ? 200 : 503).json(health);
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  const metrics = await monitoring.getPrometheusMetrics();
  res.set('Content-Type', 'text/plain').send(metrics);
});
```

### 3. Instrument Your Code

```typescript
// Performance monitoring
const endMeasurement = monitoring.performanceMonitor.startMeasurement(
  'database-query-products'
);
const products = await productService.findAll();
endMeasurement();

// Custom logging with context
const logger = monitoring.requestLogger.createRequestLogger(req);
logger.info('Products retrieved', { count: products.length });

// Manual alerts
await monitoring.alertService.triggerAlert(
  'Low Stock Alert',
  'Multiple products are running low on stock',
  'warning',
  'inventory'
);
```

## Health Check Endpoints

| Endpoint | Description | Response |
|----------|-------------|----------|
| `/health` | Complete health check | JSON with all health indicators |
| `/ready` | Readiness probe | Simple ready/not ready status |
| `/live` | Liveness probe | Simple alive/dead status |
| `/metrics` | Prometheus metrics | Text format metrics |
| `/status` | System overview | Comprehensive system status |

## Configuration

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=info
LOG_DIR=logs

# Alerts
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alerts@example.com
SMTP_PASSWORD=password
ALERT_FROM_EMAIL=alerts@example.com
ALERT_TO_EMAILS=admin@example.com,ops@example.com

# Monitoring
METRICS_COLLECTION_INTERVAL=30000
```

## Metrics Available

### HTTP Metrics
- `http_requests_total` - Total HTTP requests by method, route, and status
- `http_request_duration_seconds` - Request duration histogram
- `http_requests_in_flight` - Current number of requests being processed

### Database Metrics
- `database_connections_active` - Active database connections
- `database_connections_idle` - Idle database connections
- `database_query_duration_seconds` - Database query duration histogram
- `database_query_errors_total` - Database query errors by type

### Cache Metrics
- `cache_hits_total` - Cache hits by cache name
- `cache_misses_total` - Cache misses by cache name
- `cache_operation_duration_seconds` - Cache operation duration

### Business Metrics
- `business_active_products` - Number of active products
- `business_low_stock_products` - Number of low stock products
- `business_pending_orders` - Number of pending orders
- `business_orders_processed_total` - Total processed orders by status
- `business_inventory_adjustments_total` - Total inventory adjustments

### System Metrics
- `nodejs_memory_usage_bytes` - Node.js memory usage by type
- `nodejs_cpu_usage_percent` - CPU usage percentage
- `nodejs_eventloop_lag_seconds` - Event loop lag histogram

## Alert Rules

### Default Rules
- **High Memory Usage**: Triggers when memory usage > 85%
- **Critical Memory Usage**: Triggers when memory usage > 95%
- **Low Database Connections**: Triggers when available connections < 2
- **High Error Rate**: Triggers when error rate > 5%
- **High Low Stock Percentage**: Triggers when low stock items > 15%

### Custom Rules

```typescript
monitoring.alertService.addRule({
  id: 'custom_rule',
  name: 'Custom Business Rule',
  condition: (data) => data.customMetric > threshold,
  severity: 'warning',
  source: 'business',
  cooldownMs: 5 * 60 * 1000, // 5 minutes
  enabled: true,
});
```

## Performance Monitoring

### Automatic Measurements
- HTTP request duration
- Database query performance
- Cache operation latency

### Manual Measurements

```typescript
// Async operations
const result = await monitoring.performanceMonitor.measureAsync(
  'business-operation',
  async () => {
    return await complexBusinessLogic();
  },
  { userId: 'user123', operation: 'complex-calc' }
);

// Sync operations
const result = monitoring.performanceMonitor.measureSync(
  'sync-operation',
  () => {
    return synchronousOperation();
  }
);
```

## Logging Best Practices

### Structured Logging

```typescript
import { logger } from './monitoring';

// Basic logging
logger.info('User logged in', { userId: 'user123', ip: '192.168.1.1' });

// Error logging with context
logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  operation: 'user-lookup',
  userId: 'user123',
});

// Performance logging
logger.performance('database-query', 150, {
  query: 'SELECT * FROM products',
  table: 'products',
});

// Business event logging
logger.business('order-created', {
  orderId: 'order123',
  userId: 'user123',
  amount: 99.99,
});
```

### Request Context

```typescript
// Create request-scoped logger
const requestLogger = monitoring.requestLogger.createRequestLogger(req);

// All logs will include request context
requestLogger.info('Processing order', { orderId: 'order123' });
requestLogger.error('Order processing failed', error);
```

## Extending the System

### Custom Health Indicators

```typescript
import { HealthIndicator, HealthStatus } from './monitoring';

class CustomHealthIndicator implements HealthIndicator {
  public readonly name = 'custom-service';

  async check(): Promise<HealthStatus> {
    try {
      // Your health check logic
      const isHealthy = await checkCustomService();
      
      return {
        status: isHealthy ? 'UP' : 'DOWN',
        timestamp: new Date(),
        details: { customMetric: 'value' },
      };
    } catch (error) {
      return {
        status: 'DOWN',
        timestamp: new Date(),
        details: {},
        error: error.message,
      };
    }
  }
}

// Register the indicator
monitoring.healthService.registerIndicator(new CustomHealthIndicator());
```

### Custom Notification Channels

```typescript
import { NotificationChannel, Alert } from './monitoring';

class SlackNotificationChannel implements NotificationChannel {
  public readonly name = 'slack';

  async send(alert: Alert): Promise<void> {
    // Send alert to Slack
    await sendSlackMessage({
      channel: '#alerts',
      text: `🚨 ${alert.title}: ${alert.message}`,
      color: this.getSeverityColor(alert.severity),
    });
  }
}

// Register the channel
monitoring.alertService.registerChannel(new SlackNotificationChannel());
```

## Troubleshooting

### Common Issues

1. **Health checks failing**: Check database and Redis connectivity
2. **Metrics not updating**: Verify metrics collector is running
3. **Alerts not sending**: Check notification channel configuration
4. **High memory usage**: Monitor for memory leaks in application code
5. **Slow performance**: Use performance monitoring to identify bottlenecks

### Debug Mode

```bash
LOG_LEVEL=debug npm run dev
```

This will enable detailed logging for troubleshooting monitoring issues.

## Production Deployment

### Docker Configuration

```dockerfile
# Ensure log directory exists
RUN mkdir -p /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Kubernetes Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/metrics"
spec:
  ports:
  - port: 3000
    targetPort: 3000
  selector:
    app: api

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
spec:
  template:
    spec:
      containers:
      - name: api
        livenessProbe:
          httpGet:
            path: /live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

This monitoring system provides enterprise-grade observability for your e-commerce API, helping you maintain high availability and performance in production environments.