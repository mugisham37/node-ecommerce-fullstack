// Base event types
export * from './BaseEvent';

// Inventory events
export * from './InventoryEvents';

// Order events
export * from './OrderEvents';

// Supplier events
export * from './SupplierEvents';

// Union type for all domain events
import { InventoryEventType } from './InventoryEvents';
import { OrderEventType } from './OrderEvents';
import { SupplierEventType } from './SupplierEvents';

export type DomainEventType = InventoryEventType | OrderEventType | SupplierEventType;

// Event type registry for serialization/deserialization
export const EVENT_TYPE_REGISTRY = {
  // Inventory events
  StockUpdatedEvent: 'StockUpdatedEvent',
  LowStockEvent: 'LowStockEvent',
  InventoryAllocatedEvent: 'InventoryAllocatedEvent',
  InventoryReleasedEvent: 'InventoryReleasedEvent',
  
  // Order events
  OrderCreatedEvent: 'OrderCreatedEvent',
  OrderStatusChangedEvent: 'OrderStatusChangedEvent',
  OrderCancelledEvent: 'OrderCancelledEvent',
  
  // Supplier events
  SupplierCreatedEvent: 'SupplierCreatedEvent',
  SupplierStatusChangedEvent: 'SupplierStatusChangedEvent',
  SupplierPerformanceUpdatedEvent: 'SupplierPerformanceUpdatedEvent',
} as const;

export type EventTypeName = keyof typeof EVENT_TYPE_REGISTRY;