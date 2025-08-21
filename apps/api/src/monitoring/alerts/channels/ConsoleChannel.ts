/**
 * Console notification channel for alerts
 * Outputs alerts to console with formatting
 */

import { Alert, NotificationChannel, AlertSeverity } from '../AlertService';

export class ConsoleNotificationChannel implements NotificationChannel {
  public readonly name = 'console';

  async send(alert: Alert): Promise<void> {
    const timestamp = alert.timestamp.toISOString();
    const severity = this.formatSeverity(alert.severity);
    const source = alert.source.toUpperCase();
    
    console.log(`\n🚨 ALERT [${timestamp}] ${severity} from ${source}`);
    console.log(`📋 Title: ${alert.title}`);
    console.log(`💬 Message: ${alert.message}`);
    
    if (alert.metadata) {
      console.log(`📊 Metadata:`, JSON.stringify(alert.metadata, null, 2));
    }
    
    if (alert.resolved) {
      console.log(`✅ Status: RESOLVED at ${alert.resolvedAt?.toISOString()}`);
    } else {
      console.log(`❌ Status: ACTIVE`);
    }
    
    console.log(`🆔 Alert ID: ${alert.id}`);
    console.log('─'.repeat(80));
  }

  private formatSeverity(severity: AlertSeverity): string {
    const severityMap = {
      [AlertSeverity.INFO]: '🔵 INFO',
      [AlertSeverity.WARNING]: '🟡 WARNING',
      [AlertSeverity.ERROR]: '🔴 ERROR',
      [AlertSeverity.CRITICAL]: '🚨 CRITICAL',
    };
    
    return severityMap[severity] || '⚪ UNKNOWN';
  }
}