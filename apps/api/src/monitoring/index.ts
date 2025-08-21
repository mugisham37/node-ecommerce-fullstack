/**
 * Monitoring module exports
 * Provides a unified interface to all monitoring components
 */

// Main service
export { MonitoringService } from './MonitoringService';

// Health checks
export { HealthService } from './health/HealthService';
export { DatabaseHealthIndicator } from './health/DatabaseHealth';
export { RedisHealthIndicator } from './health/RedisHealth';
export { BusinessHealthIndicator } from './health/BusinessHealth';
export * from './health/types';

// Metrics
export { PrometheusMetrics } from './metrics/PrometheusMetrics';
export { MetricsCollector } from './metrics/MetricsCollector';

// Performance monitoring
export { PerformanceMonitor } from './performance/PerformanceMonitor';

// Alerts
export { AlertService, AlertSeverity } from './alerts/AlertService';
export { ConsoleNotificationChannel } from './alerts/channels/ConsoleChannel';
export { EmailNotificationChannel } from './alerts/channels/EmailChannel';
export type { Alert, AlertRule, NotificationChannel } from './alerts/AlertService';

// Logging
export { logger, StructuredLogger, LogLevel } from './logging/Logger';
export { RequestLogger } from './logging/RequestLogger';

// Convenience function to initialize monitoring
export async function initializeMonitoring(config: any) {
  const monitoringService = MonitoringService.initialize(config);
  await monitoringService.start();
  return monitoringService;
}