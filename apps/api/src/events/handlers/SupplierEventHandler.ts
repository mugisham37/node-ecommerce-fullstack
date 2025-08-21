import { BaseEventHandler, EventProcessingMetrics } from './BaseEventHandler';
import { 
  SupplierEvent, 
  SupplierCreatedEvent, 
  SupplierStatusChangedEvent, 
  SupplierPerformanceUpdatedEvent 
} from '../types/SupplierEvents';

/**
 * Supplier notification service interface.
 */
interface SupplierNotificationService {
  sendWelcomeEmail(supplierId: string, supplierEmail: string): Promise<void>;
  sendStatusChangeNotification(supplierId: string, supplierEmail: string, newStatus: string, reason: string): Promise<void>;
  sendPerformanceReport(supplierId: string, supplierEmail: string, metrics: any): Promise<void>;
  notifyProcurementTeam(supplierId: string, action: string, details: any): Promise<void>;
}

/**
 * Supplier analytics service interface.
 */
interface SupplierAnalyticsService {
  trackSupplierCreated(event: SupplierCreatedEvent): Promise<void>;
  trackSupplierStatusChanged(event: SupplierStatusChangedEvent): Promise<void>;
  updateSupplierPerformanceMetrics(event: SupplierPerformanceUpdatedEvent): Promise<void>;
  generateSupplierReport(supplierId: string): Promise<any>;
}

/**
 * Supplier integration service interface.
 */
interface SupplierIntegrationService {
  setupSupplierPortalAccess(supplierId: string): Promise<void>;
  revokeSupplierPortalAccess(supplierId: string): Promise<void>;
  syncSupplierCatalog(supplierId: string): Promise<void>;
  updateSupplierContracts(supplierId: string, status: string): Promise<void>;
}

/**
 * Mock supplier notification service implementation.
 */
class MockSupplierNotificationService implements SupplierNotificationService {
  async sendWelcomeEmail(supplierId: string, supplierEmail: string): Promise<void> {
    console.debug(`Sending welcome email to supplier ${supplierId} at ${supplierEmail}`);
  }

  async sendStatusChangeNotification(supplierId: string, supplierEmail: string, newStatus: string, reason: string): Promise<void> {
    console.debug(`Sending status change notification to supplier ${supplierId}: ${newStatus} - ${reason}`);
  }

  async sendPerformanceReport(supplierId: string, supplierEmail: string, metrics: any): Promise<void> {
    console.debug(`Sending performance report to supplier ${supplierId}`);
  }

  async notifyProcurementTeam(supplierId: string, action: string, details: any): Promise<void> {
    console.debug(`Notifying procurement team about supplier ${supplierId}: ${action}`);
  }
}

/**
 * Mock supplier analytics service implementation.
 */
class MockSupplierAnalyticsService implements SupplierAnalyticsService {
  async trackSupplierCreated(event: SupplierCreatedEvent): Promise<void> {
    console.debug(`Tracking supplier created: ${event.supplierId}`);
  }

  async trackSupplierStatusChanged(event: SupplierStatusChangedEvent): Promise<void> {
    console.debug(`Tracking supplier status changed: ${event.supplierId} -> ${event.newStatus}`);
  }

  async updateSupplierPerformanceMetrics(event: SupplierPerformanceUpdatedEvent): Promise<void> {
    console.debug(`Updating supplier performance metrics: ${event.supplierId}`);
  }

  async generateSupplierReport(supplierId: string): Promise<any> {
    console.debug(`Generating supplier report for ${supplierId}`);
    return { supplierId, reportGenerated: new Date() };
  }
}

/**
 * Mock supplier integration service implementation.
 */
class MockSupplierIntegrationService implements SupplierIntegrationService {
  async setupSupplierPortalAccess(supplierId: string): Promise<void> {
    console.debug(`Setting up supplier portal access for ${supplierId}`);
  }

  async revokeSupplierPortalAccess(supplierId: string): Promise<void> {
    console.debug(`Revoking supplier portal access for ${supplierId}`);
  }

  async syncSupplierCatalog(supplierId: string): Promise<void> {
    console.debug(`Syncing supplier catalog for ${supplierId}`);
  }

  async updateSupplierContracts(supplierId: string, status: string): Promise<void> {
    console.debug(`Updating supplier contracts for ${supplierId}: ${status}`);
  }
}

/**
 * Event handler for supplier-related events.
 * Handles supplier lifecycle, performance tracking, and integrations.
 */
export class SupplierEventHandler extends BaseEventHandler {
  private notificationService: SupplierNotificationService;
  private analyticsService: SupplierAnalyticsService;
  private integrationService: SupplierIntegrationService;

  constructor(
    notificationService?: SupplierNotificationService,
    analyticsService?: SupplierAnalyticsService,
    integrationService?: SupplierIntegrationService,
    metrics?: EventProcessingMetrics
  ) {
    super(metrics);
    this.notificationService = notificationService || new MockSupplierNotificationService();
    this.analyticsService = analyticsService || new MockSupplierAnalyticsService();
    this.integrationService = integrationService || new MockSupplierIntegrationService();
  }

  /**
   * Checks if this handler can process the given event type.
   */
  public canHandle(eventType: string): boolean {
    return [
      'SupplierCreatedEvent',
      'SupplierStatusChangedEvent',
      'SupplierPerformanceUpdatedEvent'
    ].includes(eventType);
  }

  /**
   * Gets the priority of this handler.
   */
  public getPriority(): number {
    return 6; // Medium priority for supplier events
  }

  /**
   * Main event processing method.
   */
  protected async processEvent(event: any): Promise<void> {
    switch (event.eventType) {
      case 'SupplierCreatedEvent':
        await this.handleSupplierCreated(event as SupplierCreatedEvent);
        break;
      case 'SupplierStatusChangedEvent':
        await this.handleSupplierStatusChanged(event as SupplierStatusChangedEvent);
        break;
      case 'SupplierPerformanceUpdatedEvent':
        await this.handleSupplierPerformanceUpdated(event as SupplierPerformanceUpdatedEvent);
        break;
      default:
        throw new Error(`Unsupported event type: ${event.eventType}`);
    }
  }

  /**
   * Handles supplier created events.
   */
  private async handleSupplierCreated(event: SupplierCreatedEvent): Promise<void> {
    console.info(`Processing supplier created event - Supplier: ${event.supplierId}, Name: ${event.supplierName}, Status: ${event.initialStatus}`);

    try {
      // Send welcome email to supplier
      await this.notificationService.sendWelcomeEmail(event.supplierId, event.contactEmail);

      // Set up supplier portal access if approved
      if (event.initialStatus === 'ACTIVE') {
        await this.integrationService.setupSupplierPortalAccess(event.supplierId);
      }

      // Notify procurement team about new supplier
      await this.notificationService.notifyProcurementTeam(event.supplierId, 'SUPPLIER_CREATED', {
        supplierName: event.supplierName,
        categories: event.categories,
        creditLimit: event.creditLimit,
        status: event.initialStatus
      });

      // Track analytics
      await this.analyticsService.trackSupplierCreated(event);

      // Initialize supplier contracts
      await this.integrationService.updateSupplierContracts(event.supplierId, event.initialStatus);

      // Set up initial catalog sync if active
      if (event.initialStatus === 'ACTIVE') {
        await this.integrationService.syncSupplierCatalog(event.supplierId);
      }

      console.info(`Successfully processed supplier created event for supplier ${event.supplierId}`);

    } catch (error) {
      console.error(`Failed to process supplier created event for supplier ${event.supplierId}`, error);
      throw error;
    }
  }

  /**
   * Handles supplier status changed events.
   */
  private async handleSupplierStatusChanged(event: SupplierStatusChangedEvent): Promise<void> {
    console.info(`Processing supplier status changed event - Supplier: ${event.supplierId}, ${event.previousStatus} -> ${event.newStatus}`);

    try {
      // Send status change notification to supplier
      if (event.notificationRequired) {
        await this.notificationService.sendStatusChangeNotification(
          event.supplierId,
          event.contactEmail,
          event.newStatus,
          event.statusChangeReason
        );
      }

      // Handle specific status transitions
      await this.handleStatusTransition(event);

      // Notify procurement team about status change
      await this.notificationService.notifyProcurementTeam(event.supplierId, 'STATUS_CHANGED', {
        supplierName: event.supplierName,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        reason: event.statusChangeReason,
        changedBy: event.changedBy
      });

      // Track analytics
      await this.analyticsService.trackSupplierStatusChanged(event);

      // Update supplier contracts
      await this.integrationService.updateSupplierContracts(event.supplierId, event.newStatus);

      console.info(`Successfully processed supplier status changed event for supplier ${event.supplierId}`);

    } catch (error) {
      console.error(`Failed to process supplier status changed event for supplier ${event.supplierId}`, error);
      throw error;
    }
  }

  /**
   * Handles supplier performance updated events.
   */
  private async handleSupplierPerformanceUpdated(event: SupplierPerformanceUpdatedEvent): Promise<void> {
    console.info(`Processing supplier performance updated event - Supplier: ${event.supplierId}, Quality: ${event.newMetrics.qualityRating}, Delivery: ${event.newMetrics.onTimeDeliveryRate}`);

    try {
      // Update performance metrics in analytics
      await this.analyticsService.updateSupplierPerformanceMetrics(event);

      // Send performance report to supplier if significant change
      if (event.significantChange) {
        await this.notificationService.sendPerformanceReport(
          event.supplierId,
          event.contactEmail,
          event.newMetrics
        );
      }

      // Handle performance-based actions
      await this.handlePerformanceBasedActions(event);

      // Notify procurement team if performance is declining
      if (event.getQualityTrend() === 'DECLINING' || event.getDeliveryTrend() === 'DECLINING') {
        await this.notificationService.notifyProcurementTeam(event.supplierId, 'PERFORMANCE_DECLINING', {
          supplierName: event.supplierName,
          qualityTrend: event.getQualityTrend(),
          deliveryTrend: event.getDeliveryTrend(),
          newMetrics: event.newMetrics,
          previousMetrics: event.previousMetrics
        });
      }

      console.info(`Successfully processed supplier performance updated event for supplier ${event.supplierId}`);

    } catch (error) {
      console.error(`Failed to process supplier performance updated event for supplier ${event.supplierId}`, error);
      throw error;
    }
  }

  // Helper methods for business logic

  private async handleStatusTransition(event: SupplierStatusChangedEvent): Promise<void> {
    switch (event.newStatus) {
      case 'ACTIVE':
        await this.handleSupplierActivated(event);
        break;
      case 'INACTIVE':
        await this.handleSupplierDeactivated(event);
        break;
      case 'SUSPENDED':
        await this.handleSupplierSuspended(event);
        break;
      case 'BLACKLISTED':
        await this.handleSupplierBlacklisted(event);
        break;
      default:
        // No specific handling needed
        break;
    }
  }

  private async handleSupplierActivated(event: SupplierStatusChangedEvent): Promise<void> {
    console.debug(`Handling supplier activation for supplier ${event.supplierId}`);
    
    // Set up portal access
    await this.integrationService.setupSupplierPortalAccess(event.supplierId);
    
    // Sync catalog
    await this.integrationService.syncSupplierCatalog(event.supplierId);
  }

  private async handleSupplierDeactivated(event: SupplierStatusChangedEvent): Promise<void> {
    console.debug(`Handling supplier deactivation for supplier ${event.supplierId}`);
    
    // Revoke portal access
    await this.integrationService.revokeSupplierPortalAccess(event.supplierId);
  }

  private async handleSupplierSuspended(event: SupplierStatusChangedEvent): Promise<void> {
    console.debug(`Handling supplier suspension for supplier ${event.supplierId}`);
    
    // Temporarily revoke portal access
    await this.integrationService.revokeSupplierPortalAccess(event.supplierId);
    
    // Generate suspension report
    await this.generateSuspensionReport(event);
  }

  private async handleSupplierBlacklisted(event: SupplierStatusChangedEvent): Promise<void> {
    console.debug(`Handling supplier blacklisting for supplier ${event.supplierId}`);
    
    // Permanently revoke portal access
    await this.integrationService.revokeSupplierPortalAccess(event.supplierId);
    
    // Generate blacklist report
    await this.generateBlacklistReport(event);
  }

  private async handlePerformanceBasedActions(event: SupplierPerformanceUpdatedEvent): Promise<void> {
    const qualityRating = event.newMetrics.qualityRating;
    const deliveryRate = event.newMetrics.onTimeDeliveryRate;

    // Take action based on performance thresholds
    if (qualityRating < 0.7 || deliveryRate < 0.8) {
      // Poor performance - consider review
      await this.schedulePerformanceReview(event.supplierId, 'POOR_PERFORMANCE');
    } else if (qualityRating > 0.95 && deliveryRate > 0.95) {
      // Excellent performance - consider rewards
      await this.schedulePerformanceReview(event.supplierId, 'EXCELLENT_PERFORMANCE');
    }
  }

  private async generateSuspensionReport(event: SupplierStatusChangedEvent): Promise<void> {
    console.debug(`Generating suspension report for supplier ${event.supplierId}`);
    // In a real implementation, this would generate a detailed suspension report
  }

  private async generateBlacklistReport(event: SupplierStatusChangedEvent): Promise<void> {
    console.debug(`Generating blacklist report for supplier ${event.supplierId}`);
    // In a real implementation, this would generate a detailed blacklist report
  }

  private async schedulePerformanceReview(supplierId: string, reviewType: string): Promise<void> {
    console.debug(`Scheduling performance review for supplier ${supplierId}: ${reviewType}`);
    // In a real implementation, this would schedule a performance review meeting
  }
}

// Export singleton instance
export const supplierEventHandler = new SupplierEventHandler();