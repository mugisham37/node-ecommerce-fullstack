/**
 * Alert service for monitoring and notification
 * Handles various alert types and notification channels
 */

import { logger } from '../logging/Logger';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  source: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (data: any) => boolean;
  severity: AlertSeverity;
  source: string;
  cooldownMs: number;
  enabled: boolean;
}

export interface NotificationChannel {
  name: string;
  send(alert: Alert): Promise<void>;
}

export class AlertService {
  private static instance: AlertService;
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private lastAlertTime: Map<string, Date> = new Map();
  private maxAlertsInMemory = 1000;

  private constructor() {
    this.setupDefaultRules();
  }

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  /**
   * Register a notification channel
   */
  registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.name, channel);
    logger.info(`Registered alert channel: ${channel.name}`);
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`Added alert rule: ${rule.name}`);
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.lastAlertTime.delete(ruleId);
    logger.info(`Removed alert rule: ${ruleId}`);
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      logger.info(`${enabled ? 'Enabled' : 'Disabled'} alert rule: ${rule.name}`);
    }
  }

  /**
   * Trigger an alert directly
   */
  async triggerAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    source: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const alert: Alert = {
      id: this.generateAlertId(),
      title,
      message,
      severity,
      source,
      timestamp: new Date(),
      metadata,
      resolved: false,
    };

    await this.processAlert(alert);
    return alert.id;
  }

  /**
   * Check data against all rules and trigger alerts if conditions are met
   */
  async checkRules(data: any, source: string): Promise<void> {
    const relevantRules = Array.from(this.rules.values()).filter(
      rule => rule.enabled && rule.source === source
    );

    for (const rule of relevantRules) {
      try {
        if (rule.condition(data)) {
          // Check cooldown
          const lastAlert = this.lastAlertTime.get(rule.id);
          const now = new Date();
          
          if (lastAlert && (now.getTime() - lastAlert.getTime()) < rule.cooldownMs) {
            continue; // Skip due to cooldown
          }

          await this.triggerAlert(
            rule.name,
            `Alert condition met for rule: ${rule.name}`,
            rule.severity,
            rule.source,
            { rule: rule.id, data }
          );

          this.lastAlertTime.set(rule.id, now);
        }
      } catch (error) {
        logger.error(`Error checking rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    if (resolvedBy) {
      alert.metadata = { ...alert.metadata, resolvedBy };
    }

    logger.info(`Alert resolved: ${alert.title} (${alertId})`);
    
    // Notify channels about resolution
    await this.notifyChannels({
      ...alert,
      title: `RESOLVED: ${alert.title}`,
      message: `Alert has been resolved: ${alert.message}`,
    });

    return true;
  }

  /**
   * Get active (unresolved) alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.severity === severity);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 50): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear old resolved alerts
   */
  clearOldAlerts(olderThanMs = 7 * 24 * 60 * 60 * 1000): number { // 7 days default
    const cutoff = new Date(Date.now() - olderThanMs);
    let cleared = 0;

    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoff) {
        this.alerts.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.info(`Cleared ${cleared} old resolved alerts`);
    }

    return cleared;
  }

  private async processAlert(alert: Alert): Promise<void> {
    // Store alert
    this.alerts.set(alert.id, alert);

    // Maintain memory limit
    if (this.alerts.size > this.maxAlertsInMemory) {
      const oldestResolved = Array.from(this.alerts.values())
        .filter(a => a.resolved)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
      
      if (oldestResolved) {
        this.alerts.delete(oldestResolved.id);
      }
    }

    // Log alert
    const logLevel = this.getLogLevel(alert.severity);
    logger[logLevel](`Alert triggered: ${alert.title}`, {
      alertId: alert.id,
      severity: alert.severity,
      source: alert.source,
      message: alert.message,
      metadata: alert.metadata,
    });

    // Send notifications
    await this.notifyChannels(alert);
  }

  private async notifyChannels(alert: Alert): Promise<void> {
    const notificationPromises = Array.from(this.channels.values()).map(
      async (channel) => {
        try {
          await channel.send(alert);
        } catch (error) {
          logger.error(`Failed to send alert via ${channel.name}:`, error);
        }
      }
    );

    await Promise.allSettled(notificationPromises);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLogLevel(severity: AlertSeverity): 'info' | 'warn' | 'error' {
    switch (severity) {
      case AlertSeverity.INFO:
        return 'info';
      case AlertSeverity.WARNING:
        return 'warn';
      case AlertSeverity.ERROR:
      case AlertSeverity.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }

  private setupDefaultRules(): void {
    // High memory usage rule
    this.addRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      condition: (data: any) => {
        return data.memoryUsagePercent > 85;
      },
      severity: AlertSeverity.WARNING,
      source: 'system',
      cooldownMs: 5 * 60 * 1000, // 5 minutes
      enabled: true,
    });

    // Critical memory usage rule
    this.addRule({
      id: 'critical_memory_usage',
      name: 'Critical Memory Usage',
      condition: (data: any) => {
        return data.memoryUsagePercent > 95;
      },
      severity: AlertSeverity.CRITICAL,
      source: 'system',
      cooldownMs: 2 * 60 * 1000, // 2 minutes
      enabled: true,
    });

    // Database connection issues
    this.addRule({
      id: 'database_connection_low',
      name: 'Low Database Connections Available',
      condition: (data: any) => {
        const availableConnections = data.maxConnections - data.activeConnections;
        return availableConnections < 2;
      },
      severity: AlertSeverity.WARNING,
      source: 'database',
      cooldownMs: 3 * 60 * 1000, // 3 minutes
      enabled: true,
    });

    // High error rate
    this.addRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: (data: any) => {
        return data.errorRate > 0.05; // 5% error rate
      },
      severity: AlertSeverity.ERROR,
      source: 'api',
      cooldownMs: 5 * 60 * 1000, // 5 minutes
      enabled: true,
    });

    // Low stock alert
    this.addRule({
      id: 'high_low_stock_percentage',
      name: 'High Percentage of Low Stock Items',
      condition: (data: any) => {
        return data.lowStockPercentage > 15;
      },
      severity: AlertSeverity.WARNING,
      source: 'business',
      cooldownMs: 30 * 60 * 1000, // 30 minutes
      enabled: true,
    });
  }
}