import { BaseScheduledTask } from '../schedulers/BaseScheduledTask';
import { ScheduledTaskRegistry } from '../schedulers/ScheduledTaskRegistry';
import { ScheduledTaskMonitoringService } from '../monitoring/ScheduledTaskMonitoringService';
import { ScheduledTaskPerformanceService } from '../monitoring/ScheduledTaskPerformanceService';
import { InventoryService } from '../../services/InventoryService';
import { NotificationService } from '../../services/NotificationService';
import { EventPublisher } from '../../events/EventPublisher';
import { LowStockEvent } from '../../events/inventory/LowStockEvent';
import { LowStockAlert } from '../../types/inventory';

/**
 * Scheduled task for processing low stock alerts with configurable intervals.
 * Monitors inventory levels and sends alerts during business hours.
 */
export class LowStockAlertTask extends BaseScheduledTask {
  private readonly businessHoursStart: string;
  private readonly businessHoursEnd: string;
  private readonly criticalStockThreshold: number;
  private readonly maxAlertsPerHour: number;
  
  // Track recent alerts to prevent spam
  private readonly recentAlerts = new Map<number, Date>();
  private readonly hourlyAlertCounts = new Map<number, number>();

  constructor(
    taskRegistry: ScheduledTaskRegistry,
    monitoringService: ScheduledTaskMonitoringService,
    performanceService: ScheduledTaskPerformanceService,
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService,
    private readonly eventPublisher: EventPublisher,
    config: {
      businessHoursStart?: string;
      businessHoursEnd?: string;
      criticalStockThreshold?: number;
      maxAlertsPerHour?: number;
    } = {}
  ) {
    super(taskRegistry, monitoringService, performanceService);
    
    this.businessHoursStart = config.businessHoursStart || '08:00';
    this.businessHoursEnd = config.businessHoursEnd || '18:00';
    this.criticalStockThreshold = config.criticalStockThreshold || 5;
    this.maxAlertsPerHour = config.maxAlertsPerHour || 10;
  }

  /**
   * Process low stock alerts every 5 minutes during business hours.
   */
  async processLowStockAlerts(): Promise<void> {
    if (this.isBusinessHours()) {
      await this.executeTask();
    } else {
      this.logger.debug('Skipping low stock alert processing - outside business hours');
    }
  }

  /**
   * Reset hourly alert counters every hour.
   */
  resetHourlyCounters(): void {
    this.hourlyAlertCounts.clear();
    this.logger.debug('Reset hourly alert counters');
  }

  /**
   * Clean up old alert tracking data daily.
   */
  cleanupAlertTracking(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [productId, alertTime] of this.recentAlerts.entries()) {
      if (alertTime < cutoff) {
        this.recentAlerts.delete(productId);
      }
    }
    
    this.logger.info(`Cleaned up old alert tracking data. Remaining entries: ${this.recentAlerts.size}`);
  }

  protected getTaskName(): string {
    return 'low-stock-alert-processing';
  }

  protected getTaskDescription(): string {
    return 'Monitor inventory levels and process low stock alerts during business hours';
  }

  protected async doExecute(): Promise<void> {
    this.logger.debug('Processing low stock alerts');
    
    try {
      const lowStockAlerts = await this.inventoryService.checkLowStockLevels();
      
      if (lowStockAlerts.length === 0) {
        this.logger.debug('No low stock alerts found');
        return;
      }
      
      // Filter and process alerts
      const alertsToProcess = this.filterAlertsForProcessing(lowStockAlerts);
      
      if (alertsToProcess.length === 0) {
        this.logger.debug('No new alerts to process after filtering');
        return;
      }
      
      // Group alerts by severity
      const alertsBySeverity = this.groupAlertsBySeverity(alertsToProcess);
      
      // Process critical and out-of-stock alerts immediately
      await this.processCriticalAlerts(alertsBySeverity.get('CRITICAL') || []);
      await this.processCriticalAlerts(alertsBySeverity.get('OUT_OF_STOCK') || []);
      
      // Process regular low stock alerts
      await this.processRegularAlerts(alertsBySeverity.get('LOW') || []);
      
      // Publish events for all alerts
      await this.publishLowStockEvents(alertsToProcess);
      
      this.logger.info(`Processed ${alertsToProcess.length} low stock alerts`);
      
    } catch (error) {
      this.logger.error('Failed to process low stock alerts', error);
      throw error;
    }
  }

  /**
   * Filter alerts to prevent spam and respect rate limits.
   */
  private filterAlertsForProcessing(allAlerts: LowStockAlert[]): LowStockAlert[] {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return allAlerts.filter(alert => {
      const productId = alert.productId;
      
      // Check if we've already sent an alert for this product recently
      const lastAlert = this.recentAlerts.get(productId);
      if (lastAlert && lastAlert > oneHourAgo) {
        this.logger.debug(`Skipping alert for product ${productId} - recent alert sent at ${lastAlert}`);
        return false;
      }
      
      // Check hourly rate limit
      const currentHourlyCount = this.hourlyAlertCounts.get(productId) || 0;
      if (currentHourlyCount >= this.maxAlertsPerHour) {
        this.logger.debug(`Skipping alert for product ${productId} - hourly limit reached (${currentHourlyCount})`);
        return false;
      }
      
      return true;
    });
  }

  /**
   * Group alerts by severity level.
   */
  private groupAlertsBySeverity(alerts: LowStockAlert[]): Map<string, LowStockAlert[]> {
    const grouped = new Map<string, LowStockAlert[]>();
    
    for (const alert of alerts) {
      const severity = alert.severity || 'LOW';
      if (!grouped.has(severity)) {
        grouped.set(severity, []);
      }
      grouped.get(severity)!.push(alert);
    }
    
    return grouped;
  }

  /**
   * Process critical alerts (CRITICAL and OUT_OF_STOCK) with immediate notification.
   */
  private async processCriticalAlerts(criticalAlerts: LowStockAlert[]): Promise<void> {
    if (criticalAlerts.length === 0) {
      return;
    }
    
    for (const alert of criticalAlerts) {
      try {
        const alertMessage = this.formatCriticalAlertMessage(alert);
        
        // Send immediate notification
        await this.notificationService.sendUrgentAlert('CRITICAL STOCK ALERT', alertMessage);
        
        // Update tracking
        this.updateAlertTracking(alert.productId);
        
        this.logger.warn(`Sent critical stock alert for product: ${alert.productName} (${alert.sku})`);
        
      } catch (error) {
        this.logger.error(`Failed to send critical alert for product: ${alert.productId}`, error);
      }
    }
  }

  /**
   * Process regular low stock alerts with batched notification.
   */
  private async processRegularAlerts(regularAlerts: LowStockAlert[]): Promise<void> {
    if (regularAlerts.length === 0) {
      return;
    }
    
    try {
      const batchMessage = this.formatBatchAlertMessage(regularAlerts);
      
      // Send batched notification
      await this.notificationService.sendSystemAlert('Low Stock Alert Summary', batchMessage);
      
      // Update tracking for all alerts
      regularAlerts.forEach(alert => this.updateAlertTracking(alert.productId));
      
      this.logger.info(`Sent batched low stock alert for ${regularAlerts.length} products`);
      
    } catch (error) {
      this.logger.error('Failed to send batched low stock alerts', error);
    }
  }

  /**
   * Publish low stock events for event-driven processing.
   */
  private async publishLowStockEvents(alerts: LowStockAlert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        const event = new LowStockEvent(
          alert.productId,
          alert.currentStock,
          alert.reorderLevel
        );
        
        await this.eventPublisher.publishEvent(event);
        
      } catch (error) {
        this.logger.error(`Failed to publish low stock event for product: ${alert.productId}`, error);
      }
    }
  }

  /**
   * Update alert tracking to prevent spam.
   */
  private updateAlertTracking(productId: number): void {
    const now = new Date();
    this.recentAlerts.set(productId, now);
    
    const currentCount = this.hourlyAlertCounts.get(productId) || 0;
    this.hourlyAlertCounts.set(productId, currentCount + 1);
  }

  /**
   * Format critical alert message.
   */
  private formatCriticalAlertMessage(alert: LowStockAlert): string {
    const lines: string[] = [];
    
    lines.push('🚨 CRITICAL STOCK ALERT 🚨');
    lines.push('');
    lines.push(`Product: ${alert.productName}`);
    lines.push(`SKU: ${alert.sku}`);
    lines.push(`Current Stock: ${alert.currentStock}`);
    lines.push(`Reorder Level: ${alert.reorderLevel}`);
    lines.push(`Severity: ${alert.severity}`);
    
    if (alert.supplierName) {
      lines.push(`Supplier: ${alert.supplierName}`);
    }
    
    if (alert.recommendation) {
      lines.push('');
      lines.push(`Recommendation: ${alert.recommendation}`);
    }
    
    lines.push('');
    lines.push('Immediate action required!');
    
    return lines.join('\n');
  }

  /**
   * Format batched alert message.
   */
  private formatBatchAlertMessage(alerts: LowStockAlert[]): string {
    const lines: string[] = [];
    
    lines.push('📦 Low Stock Alert Summary');
    lines.push('');
    lines.push(`The following ${alerts.length} products are running low on stock:`);
    lines.push('');
    
    alerts.forEach(alert => {
      lines.push(`• ${alert.productName} (${alert.sku}) - Current: ${alert.currentStock}, Reorder: ${alert.reorderLevel}`);
    });
    
    lines.push('');
    lines.push('Please review and take appropriate action.');
    
    return lines.join('\n');
  }

  /**
   * Check if current time is within business hours.
   */
  private isBusinessHours(): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
    
    return currentTime >= this.businessHoursStart && currentTime <= this.businessHoursEnd;
  }
}