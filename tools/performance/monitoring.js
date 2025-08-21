/**
 * Production Performance Monitoring Tool
 * Monitors application performance metrics in real-time
 */

const express = require('express');
const prometheus = require('prom-client');
const pidusage = require('pidusage');

class PerformanceMonitor {
  constructor() {
    this.app = express();
    this.setupMetrics();
    this.setupRoutes();
  }

  setupMetrics() {
    // Create a Registry to register the metrics
    this.register = new prometheus.Registry();
    
    // Add default metrics
    prometheus.collectDefaultMetrics({ register: this.register });

    // Custom metrics
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestTotal = new prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    this.databaseQueryDuration = new prometheus.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
    });

    this.cacheHitRate = new prometheus.Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type']
    });

    this.memoryUsage = new prometheus.Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type']
    });

    this.cpuUsage = new prometheus.Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage'
    });

    // Register metrics
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestTotal);
    this.register.registerMetric(this.databaseQueryDuration);
    this.register.registerMetric(this.cacheHitRate);
    this.register.registerMetric(this.memoryUsage);
    this.register.registerMetric(this.cpuUsage);
  }

  setupRoutes() {
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', this.register.contentType);
      res.end(await this.register.metrics());
    });

    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
  }

  // Middleware for HTTP request monitoring
  httpMetricsMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        
        this.httpRequestDuration
          .labels(req.method, route, res.statusCode.toString())
          .observe(duration);
          
        this.httpRequestTotal
          .labels(req.method, route, res.statusCode.toString())
          .inc();
      });
      
      next();
    };
  }

  // Monitor system resources
  async monitorSystemResources() {
    try {
      const stats = await pidusage(process.pid);
      
      this.memoryUsage.labels('rss').set(stats.memory);
      this.cpuUsage.set(stats.cpu);
      
      // Monitor heap usage
      const memUsage = process.memoryUsage();
      this.memoryUsage.labels('heap_used').set(memUsage.heapUsed);
      this.memoryUsage.labels('heap_total').set(memUsage.heapTotal);
      this.memoryUsage.labels('external').set(memUsage.external);
      
    } catch (error) {
      console.error('Error monitoring system resources:', error);
    }
  }

  // Database query monitoring helper
  monitorDatabaseQuery(queryType, table, duration) {
    this.databaseQueryDuration
      .labels(queryType, table)
      .observe(duration);
  }

  // Cache monitoring helper
  updateCacheHitRate(cacheType, hitRate) {
    this.cacheHitRate.labels(cacheType).set(hitRate);
  }

  start(port = 9090) {
    // Start system resource monitoring
    setInterval(() => {
      this.monitorSystemResources();
    }, 5000);

    this.app.listen(port, () => {
      console.log(`Performance monitoring server running on port ${port}`);
      console.log(`Metrics available at http://localhost:${port}/metrics`);
    });
  }
}

module.exports = PerformanceMonitor;