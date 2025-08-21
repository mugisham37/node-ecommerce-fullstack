import { BaseEventHandler, EventProcessingMetrics } from './BaseEventHandler';
import { 
  OrderEvent, 
  OrderCreatedEvent, 
  OrderStatusChangedEvent, 
  OrderCancelledEvent 
} from '../types/OrderEvents';

/**
 * Notification service interface for order operations.
 */
interface NotificationService {
  sendOrderConfirmation(orderId: string, customerEmail: string): Promise<void>;
  sendOrderStatusUpdate(orderId: string, customerEmail: string, status: string): Promise<void>;
  sendOrderCancellation(orderId: string, customerEmail: string, reason: string): Promise<void>;
  notifyWarehouse(orderId: string, action: string): Promise<void>;
}

/**
 * Email service interface for order communications.
 */
interface EmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendTemplatedEmail(to: string, template: string, data: any): Promise<void>;
}

/**
 * Analytics service interface for order tracking.
 */
interface AnalyticsService {
  trackOrderCreated(event: OrderCreatedEvent): Promise<void>;
  trackOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void>;
  trackOrderCancelled(event: OrderCancelledEvent): Promise<void>;
  updateCustomerMetrics(customerId: string, event: OrderEvent): Promise<void>;
}

/**
 * Mock notification service implementation.
 */
class MockNotificationService implements NotificationService {
  async sendOrderConfirmation(orderId: string, customerEmail: string): Promise<void> {
    console.debug(`Sending order confirmation for order ${orderId} to ${customerEmail}`);
  }

  async sendOrderStatusUpdate(orderId: string, customerEmail: string, status: string): Promise<void> {
    console.debug(`Sending order status update for order ${orderId} to ${customerEmail}: ${status}`);
  }

  async sendOrderCancellation(orderId: string, customerEmail: string, reason: string): Promise<void> {
    console.debug(`Sending order cancellation for order ${orderId} to ${customerEmail}: ${reason}`);
  }

  async notifyWarehouse(orderId: string, action: string): Promise<void> {
    console.debug(`Notifying warehouse about order ${orderId}: ${action}`);
  }
}

/**
 * Mock email service implementation.
 */
class MockEmailService implements EmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.debug(`Sending email to ${to}: ${subject}`);
  }

  async sendTemplatedEmail(to: string, template: string, data: any): Promise<void> {
    console.debug(`Sending templated email to ${to} using template ${template}`);
  }
}

/**
 * Mock analytics service implementation.
 */
class MockAnalyticsService implements AnalyticsService {
  async trackOrderCreated(event: OrderCreatedEvent): Promise<void> {
    console.debug(`Tracking order created: ${event.orderId}`);
  }

  async trackOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    console.debug(`Tracking order status changed: ${event.orderId} -> ${event.newStatus}`);
  }

  async trackOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    console.debug(`Tracking order cancelled: ${event.orderId}`);
  }

  async updateCustomerMetrics(customerId: string, event: OrderEvent): Promise<void> {
    console.debug(`Updating customer metrics for ${customerId}`);
  }
}

/**
 * Event handler for order-related events.
 * Handles order processing, notifications, and analytics.
 */
export class OrderEventHandler extends BaseEventHandler {
  private notificationService: NotificationService;
  private emailService: EmailService;
  private analyticsService: AnalyticsService;

  constructor(
    notificationService?: NotificationService,
    emailService?: EmailService,
    analyticsService?: AnalyticsService,
    metrics?: EventProcessingMetrics
  ) {
    super(metrics);
    this.notificationService = notificationService || new MockNotificationService();
    this.emailService = emailService || new MockEmailService();
    this.analyticsService = analyticsService || new MockAnalyticsService();
  }

  /**
   * Checks if this handler can process the given event type.
   */
  public canHandle(eventType: string): boolean {
    return [
      'OrderCreatedEvent',
      'OrderStatusChangedEvent',
      'OrderCancelledEvent'
    ].includes(eventType);
  }

  /**
   * Gets the priority of this handler.
   */
  public getPriority(): number {
    return 8; // High priority for order events
  }

  /**
   * Main event processing method.
   */
  protected async processEvent(event: any): Promise<void> {
    switch (event.eventType) {
      case 'OrderCreatedEvent':
        await this.handleOrderCreated(event as OrderCreatedEvent);
        break;
      case 'OrderStatusChangedEvent':
        await this.handleOrderStatusChanged(event as OrderStatusChangedEvent);
        break;
      case 'OrderCancelledEvent':
        await this.handleOrderCancelled(event as OrderCancelledEvent);
        break;
      default:
        throw new Error(`Unsupported event type: ${event.eventType}`);
    }
  }

  /**
   * Handles order created events.
   */
  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    console.info(`Processing order created event - Order: ${event.orderId}, Customer: ${event.customerName}, Total: ${event.totalAmount}`);

    try {
      // Send order confirmation to customer
      await this.notificationService.sendOrderConfirmation(event.orderId, event.customerEmail);

      // Send order confirmation email
      await this.sendOrderConfirmationEmail(event);

      // Notify warehouse for fulfillment
      await this.notificationService.notifyWarehouse(event.orderId, 'NEW_ORDER');

      // Track analytics
      await this.analyticsService.trackOrderCreated(event);

      // Update customer metrics
      await this.analyticsService.updateCustomerMetrics(event.customerEmail, event);

      // Process payment (in a real implementation)
      await this.processPayment(event);

      // Generate order documents
      await this.generateOrderDocuments(event);

      console.info(`Successfully processed order created event for order ${event.orderId}`);

    } catch (error) {
      console.error(`Failed to process order created event for order ${event.orderId}`, error);
      throw error;
    }
  }

  /**
   * Handles order status changed events.
   */
  private async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    console.info(`Processing order status changed event - Order: ${event.orderId}, ${event.previousStatus} -> ${event.newStatus}`);

    try {
      // Send status update notification to customer
      await this.notificationService.sendOrderStatusUpdate(
        event.orderId, 
        event.customerEmail, 
        event.newStatus
      );

      // Send status update email
      await this.sendOrderStatusUpdateEmail(event);

      // Handle specific status transitions
      await this.handleStatusTransition(event);

      // Track analytics
      await this.analyticsService.trackOrderStatusChanged(event);

      // Update customer metrics
      await this.analyticsService.updateCustomerMetrics(event.customerEmail, event);

      console.info(`Successfully processed order status changed event for order ${event.orderId}`);

    } catch (error) {
      console.error(`Failed to process order status changed event for order ${event.orderId}`, error);
      throw error;
    }
  }

  /**
   * Handles order cancelled events.
   */
  private async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    console.info(`Processing order cancelled event - Order: ${event.orderId}, Reason: ${event.cancellationReason}`);

    try {
      // Send cancellation notification to customer
      await this.notificationService.sendOrderCancellation(
        event.orderId, 
        event.customerEmail, 
        event.cancellationReason
      );

      // Send cancellation email
      await this.sendOrderCancellationEmail(event);

      // Notify warehouse to stop fulfillment
      await this.notificationService.notifyWarehouse(event.orderId, 'CANCEL_ORDER');

      // Process refund if applicable
      if (event.refundAmount > 0) {
        await this.processRefund(event);
      }

      // Track analytics
      await this.analyticsService.trackOrderCancelled(event);

      // Update customer metrics
      await this.analyticsService.updateCustomerMetrics(event.customerEmail, event);

      console.info(`Successfully processed order cancelled event for order ${event.orderId}`);

    } catch (error) {
      console.error(`Failed to process order cancelled event for order ${event.orderId}`, error);
      throw error;
    }
  }

  // Helper methods for business logic

  private async sendOrderConfirmationEmail(event: OrderCreatedEvent): Promise<void> {
    const emailData = {
      orderNumber: event.orderNumber,
      customerName: event.customerName,
      orderItems: event.orderItems,
      totalAmount: event.totalAmount,
      shippingAddress: event.shippingAddress,
      estimatedDelivery: this.calculateEstimatedDelivery()
    };

    await this.emailService.sendTemplatedEmail(
      event.customerEmail,
      'order-confirmation',
      emailData
    );
  }

  private async sendOrderStatusUpdateEmail(event: OrderStatusChangedEvent): Promise<void> {
    const emailData = {
      orderNumber: event.orderNumber,
      customerName: event.customerName,
      previousStatus: event.previousStatus,
      newStatus: event.newStatus,
      statusChangeReason: event.statusChangeReason,
      trackingNumber: event.trackingNumber,
      estimatedDeliveryDate: event.estimatedDeliveryDate
    };

    await this.emailService.sendTemplatedEmail(
      event.customerEmail,
      'order-status-update',
      emailData
    );
  }

  private async sendOrderCancellationEmail(event: OrderCancelledEvent): Promise<void> {
    const emailData = {
      orderNumber: event.orderNumber,
      customerName: event.customerName,
      cancellationReason: event.cancellationReason,
      refundAmount: event.refundAmount,
      refundMethod: event.refundMethod,
      refundProcessingTime: this.getRefundProcessingTime(event.refundMethod)
    };

    await this.emailService.sendTemplatedEmail(
      event.customerEmail,
      'order-cancellation',
      emailData
    );
  }

  private async handleStatusTransition(event: OrderStatusChangedEvent): Promise<void> {
    switch (event.newStatus) {
      case 'CONFIRMED':
        await this.handleOrderConfirmed(event);
        break;
      case 'PROCESSING':
        await this.handleOrderProcessing(event);
        break;
      case 'SHIPPED':
        await this.handleOrderShipped(event);
        break;
      case 'DELIVERED':
        await this.handleOrderDelivered(event);
        break;
      default:
        // No specific handling needed
        break;
    }
  }

  private async handleOrderConfirmed(event: OrderStatusChangedEvent): Promise<void> {
    console.debug(`Handling order confirmed for order ${event.orderId}`);
    // In a real implementation, this might trigger inventory allocation
  }

  private async handleOrderProcessing(event: OrderStatusChangedEvent): Promise<void> {
    console.debug(`Handling order processing for order ${event.orderId}`);
    // In a real implementation, this might trigger warehouse picking
  }

  private async handleOrderShipped(event: OrderStatusChangedEvent): Promise<void> {
    console.debug(`Handling order shipped for order ${event.orderId}`);
    // In a real implementation, this might update tracking information
  }

  private async handleOrderDelivered(event: OrderStatusChangedEvent): Promise<void> {
    console.debug(`Handling order delivered for order ${event.orderId}`);
    // In a real implementation, this might trigger review requests
  }

  private async processPayment(event: OrderCreatedEvent): Promise<void> {
    // In a real implementation, this would integrate with payment processors
    console.debug(`Processing payment for order ${event.orderId}, amount: ${event.totalAmount}`);
  }

  private async processRefund(event: OrderCancelledEvent): Promise<void> {
    // In a real implementation, this would process refunds through payment processors
    console.debug(`Processing refund for order ${event.orderId}, amount: ${event.refundAmount}, method: ${event.refundMethod}`);
  }

  private async generateOrderDocuments(event: OrderCreatedEvent): Promise<void> {
    // In a real implementation, this would generate invoices, packing slips, etc.
    console.debug(`Generating order documents for order ${event.orderId}`);
  }

  private calculateEstimatedDelivery(): Date {
    // Simple calculation: 5-7 business days from now
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);
    return deliveryDate;
  }

  private getRefundProcessingTime(refundMethod: string): string {
    switch (refundMethod.toLowerCase()) {
      case 'credit_card':
        return '3-5 business days';
      case 'bank_transfer':
        return '1-2 business days';
      case 'paypal':
        return '1-2 business days';
      default:
        return '5-7 business days';
    }
  }
}

// Export singleton instance
export const orderEventHandler = new OrderEventHandler();