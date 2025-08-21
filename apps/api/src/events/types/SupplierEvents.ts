import { DomainEvent } from './BaseEvent';

/**
 * Supplier status enumeration.
 */
export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  BLACKLISTED = 'BLACKLISTED'
}

/**
 * Supplier performance metrics.
 */
export interface SupplierPerformanceMetrics {
  onTimeDeliveryRate: number;
  qualityRating: number;
  responseTime: number;
  totalOrders: number;
  totalValue: number;
  lastOrderDate?: Date;
}

/**
 * Base class for all supplier-related events.
 */
export abstract class SupplierEvent extends DomainEvent {
  public readonly supplierId: string;
  public readonly supplierName: string;
  public readonly supplierCode: string;
  public readonly contactEmail: string;

  protected constructor(
    supplierId: string,
    supplierName: string,
    supplierCode: string,
    contactEmail: string,
    userId: string,
    eventVersion?: string
  ) {
    super(supplierId, userId, eventVersion);
    this.supplierId = supplierId;
    this.supplierName = supplierName;
    this.supplierCode = supplierCode;
    this.contactEmail = contactEmail;
  }
}

/**
 * Event published when a new supplier is created.
 */
export class SupplierCreatedEvent extends SupplierEvent {
  public readonly address: string;
  public readonly phoneNumber: string;
  public readonly website?: string;
  public readonly taxId: string;
  public readonly paymentTerms: string;
  public readonly creditLimit: number;
  public readonly categories: string[];
  public readonly initialStatus: SupplierStatus;

  constructor(
    supplierId: string,
    supplierName: string,
    supplierCode: string,
    contactEmail: string,
    address: string,
    phoneNumber: string,
    taxId: string,
    paymentTerms: string,
    creditLimit: number,
    categories: string[],
    userId: string,
    website?: string,
    initialStatus: SupplierStatus = SupplierStatus.PENDING_APPROVAL
  ) {
    super(supplierId, supplierName, supplierCode, contactEmail, userId);
    this.address = address;
    this.phoneNumber = phoneNumber;
    this.website = website;
    this.taxId = taxId;
    this.paymentTerms = paymentTerms;
    this.creditLimit = creditLimit;
    this.categories = categories;
    this.initialStatus = initialStatus;
  }

  toString(): string {
    return `SupplierCreatedEvent{supplierId=${this.supplierId}, name='${this.supplierName}', code='${this.supplierCode}', status=${this.initialStatus}, eventId='${this.eventId}'}`;
  }
}

/**
 * Event published when a supplier's status changes.
 */
export class SupplierStatusChangedEvent extends SupplierEvent {
  public readonly previousStatus: SupplierStatus;
  public readonly newStatus: SupplierStatus;
  public readonly statusChangeReason: string;
  public readonly changedBy: string;
  public readonly effectiveDate: Date;
  public readonly notificationRequired: boolean;

  constructor(
    supplierId: string,
    supplierName: string,
    supplierCode: string,
    contactEmail: string,
    previousStatus: SupplierStatus,
    newStatus: SupplierStatus,
    statusChangeReason: string,
    changedBy: string,
    effectiveDate: Date,
    userId: string,
    notificationRequired: boolean = true
  ) {
    super(supplierId, supplierName, supplierCode, contactEmail, userId);
    this.previousStatus = previousStatus;
    this.newStatus = newStatus;
    this.statusChangeReason = statusChangeReason;
    this.changedBy = changedBy;
    this.effectiveDate = effectiveDate;
    this.notificationRequired = notificationRequired;
  }

  isActivation(): boolean {
    return this.newStatus === SupplierStatus.ACTIVE && this.previousStatus !== SupplierStatus.ACTIVE;
  }

  isDeactivation(): boolean {
    return this.previousStatus === SupplierStatus.ACTIVE && this.newStatus !== SupplierStatus.ACTIVE;
  }

  isSuspension(): boolean {
    return this.newStatus === SupplierStatus.SUSPENDED;
  }

  toString(): string {
    return `SupplierStatusChangedEvent{supplierId=${this.supplierId}, name='${this.supplierName}', ${this.previousStatus} -> ${this.newStatus}, reason='${this.statusChangeReason}', eventId='${this.eventId}'}`;
  }
}

/**
 * Event published when supplier performance metrics are updated.
 */
export class SupplierPerformanceUpdatedEvent extends SupplierEvent {
  public readonly previousMetrics: SupplierPerformanceMetrics;
  public readonly newMetrics: SupplierPerformanceMetrics;
  public readonly updateTrigger: string;
  public readonly significantChange: boolean;

  constructor(
    supplierId: string,
    supplierName: string,
    supplierCode: string,
    contactEmail: string,
    previousMetrics: SupplierPerformanceMetrics,
    newMetrics: SupplierPerformanceMetrics,
    updateTrigger: string,
    userId: string
  ) {
    super(supplierId, supplierName, supplierCode, contactEmail, userId);
    this.previousMetrics = previousMetrics;
    this.newMetrics = newMetrics;
    this.updateTrigger = updateTrigger;
    this.significantChange = this.calculateSignificantChange();
  }

  private calculateSignificantChange(): boolean {
    const qualityChange = Math.abs(this.newMetrics.qualityRating - this.previousMetrics.qualityRating);
    const deliveryChange = Math.abs(this.newMetrics.onTimeDeliveryRate - this.previousMetrics.onTimeDeliveryRate);
    
    return qualityChange > 0.1 || deliveryChange > 0.1; // 10% threshold
  }

  getQualityTrend(): 'IMPROVING' | 'DECLINING' | 'STABLE' {
    const change = this.newMetrics.qualityRating - this.previousMetrics.qualityRating;
    if (change > 0.05) return 'IMPROVING';
    if (change < -0.05) return 'DECLINING';
    return 'STABLE';
  }

  getDeliveryTrend(): 'IMPROVING' | 'DECLINING' | 'STABLE' {
    const change = this.newMetrics.onTimeDeliveryRate - this.previousMetrics.onTimeDeliveryRate;
    if (change > 0.05) return 'IMPROVING';
    if (change < -0.05) return 'DECLINING';
    return 'STABLE';
  }

  toString(): string {
    return `SupplierPerformanceUpdatedEvent{supplierId=${this.supplierId}, name='${this.supplierName}', qualityRating=${this.newMetrics.qualityRating}, deliveryRate=${this.newMetrics.onTimeDeliveryRate}, significant=${this.significantChange}, eventId='${this.eventId}'}`;
  }
}

/**
 * Union type for all supplier events.
 */
export type SupplierEventType = 
  | SupplierCreatedEvent 
  | SupplierStatusChangedEvent 
  | SupplierPerformanceUpdatedEvent;