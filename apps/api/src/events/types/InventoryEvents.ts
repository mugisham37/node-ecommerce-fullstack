import { DomainEvent } from './BaseEvent';

/**
 * Stock movement types for inventory tracking.
 */
export enum StockMovementType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST'
}

/**
 * Base class for all inventory-related events.
 */
export abstract class InventoryEvent extends DomainEvent {
  public readonly productId: string;
  public readonly productSku: string;
  public readonly warehouseLocation: string;

  protected constructor(
    productId: string,
    productSku: string,
    warehouseLocation: string,
    userId: string,
    eventVersion?: string
  ) {
    super(productId, userId, eventVersion);
    this.productId = productId;
    this.productSku = productSku;
    this.warehouseLocation = warehouseLocation;
  }
}

/**
 * Event published when inventory stock levels are updated.
 * Contains comprehensive context about the stock change.
 */
export class StockUpdatedEvent extends InventoryEvent {
  public readonly previousQuantity: number;
  public readonly newQuantity: number;
  public readonly quantityChange: number;
  public readonly movementType: StockMovementType;
  public readonly reason: string;
  public readonly referenceId: string;
  public readonly referenceType: string;

  constructor(
    productId: string,
    productSku: string,
    warehouseLocation: string,
    previousQuantity: number,
    newQuantity: number,
    movementType: StockMovementType,
    reason: string,
    referenceId: string,
    referenceType: string,
    userId: string
  ) {
    super(productId, productSku, warehouseLocation, userId);
    this.previousQuantity = previousQuantity;
    this.newQuantity = newQuantity;
    this.quantityChange = newQuantity - previousQuantity;
    this.movementType = movementType;
    this.reason = reason;
    this.referenceId = referenceId;
    this.referenceType = referenceType;
  }

  isStockIncrease(): boolean {
    return this.quantityChange > 0;
  }

  isStockDecrease(): boolean {
    return this.quantityChange < 0;
  }

  toString(): string {
    return `StockUpdatedEvent{productId=${this.productId}, sku='${this.productSku}', previousQty=${this.previousQuantity}, newQty=${this.newQuantity}, change=${this.quantityChange}, type=${this.movementType}, reason='${this.reason}', eventId='${this.eventId}'}`;
  }
}

/**
 * Event published when inventory stock falls below reorder level.
 */
export class LowStockEvent extends InventoryEvent {
  public readonly currentStock: number;
  public readonly reorderLevel: number;
  public readonly recommendedOrderQuantity: number;
  public readonly supplierId?: string;
  public readonly supplierName?: string;
  public readonly lastOrderDate?: Date;

  constructor(
    productId: string,
    productSku: string,
    warehouseLocation: string,
    currentStock: number,
    reorderLevel: number,
    recommendedOrderQuantity: number,
    userId: string,
    supplierId?: string,
    supplierName?: string,
    lastOrderDate?: Date
  ) {
    super(productId, productSku, warehouseLocation, userId);
    this.currentStock = currentStock;
    this.reorderLevel = reorderLevel;
    this.recommendedOrderQuantity = recommendedOrderQuantity;
    this.supplierId = supplierId;
    this.supplierName = supplierName;
    this.lastOrderDate = lastOrderDate;
  }

  getStockDeficit(): number {
    return Math.max(0, this.reorderLevel - this.currentStock);
  }

  toString(): string {
    return `LowStockEvent{productId=${this.productId}, sku='${this.productSku}', currentStock=${this.currentStock}, reorderLevel=${this.reorderLevel}, deficit=${this.getStockDeficit()}, eventId='${this.eventId}'}`;
  }
}

/**
 * Event published when inventory is allocated for an order or reservation.
 */
export class InventoryAllocatedEvent extends InventoryEvent {
  public readonly quantity: number;
  public readonly referenceId: string;
  public readonly referenceType: string;
  public readonly allocationType: 'ORDER' | 'RESERVATION' | 'TRANSFER';
  public readonly expiresAt?: Date;
  public readonly priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

  constructor(
    productId: string,
    productSku: string,
    warehouseLocation: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    allocationType: 'ORDER' | 'RESERVATION' | 'TRANSFER',
    userId: string,
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL',
    expiresAt?: Date
  ) {
    super(productId, productSku, warehouseLocation, userId);
    this.quantity = quantity;
    this.referenceId = referenceId;
    this.referenceType = referenceType;
    this.allocationType = allocationType;
    this.priority = priority;
    this.expiresAt = expiresAt;
  }

  toString(): string {
    return `InventoryAllocatedEvent{productId=${this.productId}, sku='${this.productSku}', quantity=${this.quantity}, type=${this.allocationType}, reference=${this.referenceId}, eventId='${this.eventId}'}`;
  }
}

/**
 * Event published when allocated inventory is released back to available stock.
 */
export class InventoryReleasedEvent extends InventoryEvent {
  public readonly quantity: number;
  public readonly referenceId: string;
  public readonly referenceType: string;
  public readonly releaseReason: string;
  public readonly originalAllocationDate: Date;

  constructor(
    productId: string,
    productSku: string,
    warehouseLocation: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    releaseReason: string,
    originalAllocationDate: Date,
    userId: string
  ) {
    super(productId, productSku, warehouseLocation, userId);
    this.quantity = quantity;
    this.referenceId = referenceId;
    this.referenceType = referenceType;
    this.releaseReason = releaseReason;
    this.originalAllocationDate = originalAllocationDate;
  }

  getAllocationDuration(): number {
    return this.timestamp.getTime() - this.originalAllocationDate.getTime();
  }

  toString(): string {
    return `InventoryReleasedEvent{productId=${this.productId}, sku='${this.productSku}', quantity=${this.quantity}, reason='${this.releaseReason}', reference=${this.referenceId}, eventId='${this.eventId}'}`;
  }
}

/**
 * Union type for all inventory events.
 */
export type InventoryEventType = 
  | StockUpdatedEvent 
  | LowStockEvent 
  | InventoryAllocatedEvent 
  | InventoryReleasedEvent;