/**
 * Email notification channel for alerts
 * Sends alerts via email using nodemailer
 */

import nodemailer, { Transporter } from 'nodemailer';
import { Alert, NotificationChannel, AlertSeverity } from '../AlertService';
import { logger } from '../../logging/Logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string[];
}

export class EmailNotificationChannel implements NotificationChannel {
  public readonly name = 'email';
  private transporter: Transporter;

  constructor(private config: EmailConfig) {
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async send(alert: Alert): Promise<void> {
    try {
      const subject = this.generateSubject(alert);
      const html = this.generateHtmlContent(alert);
      const text = this.generateTextContent(alert);

      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to.join(', '),
        subject,
        text,
        html,
      });

      logger.info(`Alert email sent: ${alert.id}`);
    } catch (error) {
      logger.error(`Failed to send alert email: ${alert.id}`, error);
      throw error;
    }
  }

  private generateSubject(alert: Alert): string {
    const prefix = alert.resolved ? '[RESOLVED]' : '[ALERT]';
    const severity = alert.severity.toUpperCase();
    return `${prefix} ${severity}: ${alert.title}`;
  }

  private generateTextContent(alert: Alert): string {
    const lines = [
      `Alert: ${alert.title}`,
      `Severity: ${alert.severity.toUpperCase()}`,
      `Source: ${alert.source}`,
      `Time: ${alert.timestamp.toISOString()}`,
      `Status: ${alert.resolved ? 'RESOLVED' : 'ACTIVE'}`,
      '',
      `Message: ${alert.message}`,
    ];

    if (alert.metadata) {
      lines.push('');
      lines.push('Metadata:');
      lines.push(JSON.stringify(alert.metadata, null, 2));
    }

    if (alert.resolved && alert.resolvedAt) {
      lines.push('');
      lines.push(`Resolved at: ${alert.resolvedAt.toISOString()}`);
    }

    lines.push('');
    lines.push(`Alert ID: ${alert.id}`);

    return lines.join('\n');
  }

  private generateHtmlContent(alert: Alert): string {
    const severityColor = this.getSeverityColor(alert.severity);
    const statusBadge = alert.resolved 
      ? '<span style="background-color: #28a745; color: white; padding: 2px 8px; border-radius: 4px;">RESOLVED</span>'
      : '<span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 4px;">ACTIVE</span>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Alert Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${severityColor}; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">${alert.title}</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Alert ID: ${alert.id}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Severity:</td>
                <td style="padding: 8px 0;">${alert.severity.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Source:</td>
                <td style="padding: 8px 0;">${alert.source}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                <td style="padding: 8px 0;">${alert.timestamp.toISOString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0;">${statusBadge}</td>
              </tr>
              ${alert.resolved && alert.resolvedAt ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Resolved:</td>
                <td style="padding: 8px 0;">${alert.resolvedAt.toISOString()}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background-color: white; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="margin-top: 0;">Message</h3>
            <p>${alert.message}</p>
          </div>
          
          ${alert.metadata ? `
          <div style="background-color: white; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px;">
            <h3 style="margin-top: 0;">Additional Information</h3>
            <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px;">${JSON.stringify(alert.metadata, null, 2)}</pre>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center;">
            <p>This is an automated alert from your monitoring system.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSeverityColor(severity: AlertSeverity): string {
    const colorMap = {
      [AlertSeverity.INFO]: '#17a2b8',
      [AlertSeverity.WARNING]: '#ffc107',
      [AlertSeverity.ERROR]: '#dc3545',
      [AlertSeverity.CRITICAL]: '#721c24',
    };
    
    return colorMap[severity] || '#6c757d';
  }
}