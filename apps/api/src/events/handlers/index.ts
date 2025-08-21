// Base handler
export * from './BaseEventHandler';

// Specific event handlers
export * from './InventoryEventHandler';
export * from './OrderEventHandler';
export * from './SupplierEventHandler';

// Handler registry for easy registration
import { inventoryEventHandler } from './InventoryEventHandler';
import { orderEventHandler } from './OrderEventHandler';
import { supplierEventHandler } from './SupplierEventHandler';
import { eventBus } from '../EventBus';

/**
 * Registers all event handlers with the event bus.
 */
export function registerAllEventHandlers(): void {
  console.log('Registering event handlers...');

  // Register inventory event handler
  eventBus.registerHandler('StockUpdatedEvent', inventoryEventHandler.handle.bind(inventoryEventHandler), {
    priority: inventoryEventHandler.getPriority(),
    async: true,
    retryOnFailure: inventoryEventHandler.shouldRetryOnFailure(),
    maxRetries: inventoryEventHandler.getMaxRetries(),
    timeout: inventoryEventHandler.getTimeout()
  });

  eventBus.registerHandler('LowStockEvent', inventoryEventHandler.handle.bind(inventoryEventHandler), {
    priority: inventoryEventHandler.getPriority(),
    async: true,
    retryOnFailure: inventoryEventHandler.shouldRetryOnFailure(),
    maxRetries: inventoryEventHandler.getMaxRetries(),
    timeout: inventoryEventHandler.getTimeout()
  });

  eventBus.registerHandler('InventoryAllocatedEvent', inventoryEventHandler.handle.bind(inventoryEventHandler), {
    priority: inventoryEventHandler.getPriority(),
    async: true,
    retryOnFailure: inventoryEventHandler.shouldRetryOnFailure(),
    maxRetries: inventoryEventHandler.getMaxRetries(),
    timeout: inventoryEventHandler.getTimeout()
  });

  eventBus.registerHandler('InventoryReleasedEvent', inventoryEventHandler.handle.bind(inventoryEventHandler), {
    priority: inventoryEventHandler.getPriority(),
    async: true,
    retryOnFailure: inventoryEventHandler.shouldRetryOnFailure(),
    maxRetries: inventoryEventHandler.getMaxRetries(),
    timeout: inventoryEventHandler.getTimeout()
  });

  // Register order event handler
  eventBus.registerHandler('OrderCreatedEvent', orderEventHandler.handle.bind(orderEventHandler), {
    priority: orderEventHandler.getPriority(),
    async: true,
    retryOnFailure: orderEventHandler.shouldRetryOnFailure(),
    maxRetries: orderEventHandler.getMaxRetries(),
    timeout: orderEventHandler.getTimeout()
  });

  eventBus.registerHandler('OrderStatusChangedEvent', orderEventHandler.handle.bind(orderEventHandler), {
    priority: orderEventHandler.getPriority(),
    async: true,
    retryOnFailure: orderEventHandler.shouldRetryOnFailure(),
    maxRetries: orderEventHandler.getMaxRetries(),
    timeout: orderEventHandler.getTimeout()
  });

  eventBus.registerHandler('OrderCancelledEvent', orderEventHandler.handle.bind(orderEventHandler), {
    priority: orderEventHandler.getPriority(),
    async: true,
    retryOnFailure: orderEventHandler.shouldRetryOnFailure(),
    maxRetries: orderEventHandler.getMaxRetries(),
    timeout: orderEventHandler.getTimeout()
  });

  // Register supplier event handler
  eventBus.registerHandler('SupplierCreatedEvent', supplierEventHandler.handle.bind(supplierEventHandler), {
    priority: supplierEventHandler.getPriority(),
    async: true,
    retryOnFailure: supplierEventHandler.shouldRetryOnFailure(),
    maxRetries: supplierEventHandler.getMaxRetries(),
    timeout: supplierEventHandler.getTimeout()
  });

  eventBus.registerHandler('SupplierStatusChangedEvent', supplierEventHandler.handle.bind(supplierEventHandler), {
    priority: supplierEventHandler.getPriority(),
    async: true,
    retryOnFailure: supplierEventHandler.shouldRetryOnFailure(),
    maxRetries: supplierEventHandler.getMaxRetries(),
    timeout: supplierEventHandler.getTimeout()
  });

  eventBus.registerHandler('SupplierPerformanceUpdatedEvent', supplierEventHandler.handle.bind(supplierEventHandler), {
    priority: supplierEventHandler.getPriority(),
    async: true,
    retryOnFailure: supplierEventHandler.shouldRetryOnFailure(),
    maxRetries: supplierEventHandler.getMaxRetries(),
    timeout: supplierEventHandler.getTimeout()
  });

  // Cross-domain event handling
  // Inventory handler also handles order events for inventory allocation/release
  eventBus.registerHandler('OrderCreatedEvent', inventoryEventHandler.handle.bind(inventoryEventHandler), {
    priority: inventoryEventHandler.getPriority() - 1, // Lower priority than order handler
    async: true,
    retryOnFailure: inventoryEventHandler.shouldRetryOnFailure(),
    maxRetries: inventoryEventHandler.getMaxRetries(),
    timeout: inventoryEventHandler.getTimeout()
  });

  eventBus.registerHandler('OrderCancelledEvent', inventoryEventHandler.handle.bind(inventoryEventHandler), {
    priority: inventoryEventHandler.getPriority() - 1, // Lower priority than order handler
    async: true,
    retryOnFailure: inventoryEventHandler.shouldRetryOnFailure(),
    maxRetries: inventoryEventHandler.getMaxRetries(),
    timeout: inventoryEventHandler.getTimeout()
  });

  console.log('Event handlers registered successfully');
}

/**
 * Gets statistics for all registered handlers.
 */
export function getAllHandlerStatistics(): Record<string, any> {
  return {
    inventoryHandler: inventoryEventHandler.getMetrics().getMetrics(),
    orderHandler: orderEventHandler.getMetrics().getMetrics(),
    supplierHandler: supplierEventHandler.getMetrics().getMetrics(),
    eventBus: eventBus.getStatistics()
  };
}

/**
 * Clears statistics for all handlers.
 */
export function clearAllHandlerStatistics(): void {
  inventoryEventHandler.getMetrics().clearMetrics();
  orderEventHandler.getMetrics().clearMetrics();
  supplierEventHandler.getMetrics().clearMetrics();
  eventBus.resetStatistics();
}