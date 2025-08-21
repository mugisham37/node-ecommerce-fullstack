import { DomainEvent } from './BaseEvent';

/**
 * Order status enumeration.
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  RETURNED = 'RETURNED'
}

/**
 * Order item information for events.
 */
export interface OrderItemInfo {
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Base class for all order-related events.
 */
export abstract class OrderEvent extends DomainEvent {
  public readonly orderId: string;
  public readonly orderNumber: string;
  public readonly customerName: string;
  public readonly customerEmail: string;
  public readonly orderStatus: OrderStatus;
  public readonly totalAmount: number;

  protected constructor(
    orderId: string,
    orderNumber: string,
    customerName: string,
    customerEmail: string,
    orderStatus: OrderStatus,
    totalAmount: number,
    userId: string,
    eventVersion?: string
  ) {
    super(orderId, userId, eventVersion);
    this.orderId = orderId;
    this.orderNumber = orderNumber;
    this.customerName = customerName;
    this.customerEmail = customerEmail;
    this.orderStatus = orderStatus;
    this.totalAmount = totalAmount;
  }
}

/**
 * Event published when a new order is created.
 * Contains comprehensive order information for downstream processing.
 */
export class OrderCreatedEvent extends OrderEvent {
  public readonly orderItems: OrderItemInfo[];
  public readonly shippingAddress: string;
  public readonly billingAddress: string;
  public readonly subtotal: number;
  public readonly taxAmount: number;
  public readonly shippingCost: number;
  public readonly metadata: Record<string, any>;

  constructor(
    orderId: string,
    orderNumber: string,
    customerName: string,
    customerEmail: string,
    totalAmount: number,
    orderItems: OrderItemInfo[],
    shippingAddress: string,
    billingAddress: string,
    subtotal: number,
    taxAmount: number,
    shippingCost: number,
    metadata: Record<string, any>,
    userId: string
  ) {
    super(orderId, orderNumber, customerName, customerEmail, OrderStatus.PENDING, totalAmount, userId);
    this.orderItems = orderItems;
    this.shippingAddress = shippingAddress;
    this.billingAddress = billingAddress;
    this.subtotal = subtotal;
    this.taxAmount = taxAmount;
    this.shippingCost = shippingCost;
    this.metadata = metadata;
  }

  getTotalItemCount(): number {
    return this.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  toString(): string {
    return `OrderCreatedEvent{orderId=${this.orderId}, orderNumber='${this.orderNumber}', customer='${this.customerName}', itemCount=${this.getTotalItemCount()}, total=${this.totalAmount}, eventId='${this.eventId}'}`;
  }
}

/**
 * Event published when an order status changes.
 */
export class OrderStatusChangedEvent extends OrderEvent {
  public readonly previousStatus: OrderStatus;
  public readonly newStatus: OrderStatus;
  public readonly statusChangeReason: string;
  public readonly statusChangedBy: string;
  public readonly estimatedDeliveryDate?: Date;
  public readonly trackingNumber?: string;

  constructor(
    orderId: string,
    orderNumber: string,
    customerName: string,
    customerEmail: string,
    totalAmount: number,
    previousStatus: OrderStatus,
    newStatus: OrderStatus,
    statusChangeReason: string,
    statusChangedBy: string,
    userId: string,
    estimatedDeliveryDate?: Date,
    trackingNumber?: string
  ) {
    super(orderId, orderNumber, customerName, customerEmail, newStatus, totalAmount, userId);
    this.previousStatus = previousStatus;
    this.newStatus = newStatus;
    this.statusChangeReason = statusChangeReason;
    this.statusChangedBy = statusChangedBy;
    this.estimatedDeliveryDate = estimatedDeliveryDate;
    this.trackingNumber = trackingNumber;
  }

  isStatusProgression(): boolean {
    const statusOrder = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED
    ];
    
    const previousIndex = statusOrder.indexOf(this.previousStatus);
    const newIndex = statusOrder.indexOf(this.newStatus);
    
    return newIndex > previousIndex;
  }

  toString(): string {
    return `OrderStatusChangedEvent{orderId=${this.orderId}, orderNumber='${this.orderNumber}', ${this.previousStatus} -> ${this.newStatus}, reason='${this.statusChangeReason}', eventId='${this.eventId}'}`;
  }
}

/**
 * Event published when an order is cancelled.
 */
export class OrderCancelledEvent extends OrderEvent {
  public readonly cancellationReason: string;
  public readonly cancelledBy: string;
  public readonly refundAmount: number;
  public readonly refundMethod: string;
  public readonly inventoryToRelease: OrderItemInfo[];

  constructor(
    orderId: string,
    orderNumber: string,
    customerName: string,
    customerEmail: string,
    totalAmount: number,
    cancellationReason: string,
    cancelledBy: string,
    refundAmount: number,
    refundMethod: string,
    inventoryToRelease: OrderItemInfo[],
    userId: string
  ) {
    super(orderId, orderNumber, customerName, customerEmail, OrderStatus.CANCELLED, totalAmount, userId);
    this.cancellationReason = cancellationReason;
    this.cancelledBy = cancelledBy;
    this.refundAmount = refundAmount;
    this.refundMethod = refundMethod;
    this.inventoryToRelease = inventoryToRelease;
  }

  isFullRefund(): boolean {
    return this.refundAmount >= this.totalAmount;
  }

  toString(): string {
    return `OrderCancelledEvent{orderId=${this.orderId}, orderNumber='${this.orderNumber}', reason='${this.cancellationReason}', refund=${this.refundAmount}, eventId='${this.eventId}'}`;
  }
}

/**
 * Union type for all order events.
 */
export type OrderEventType = 
  | OrderCreatedEvent 
  | OrderStatusChangedEvent 
  | OrderCancelledEvent;