import { BaseEventHandler, EventProcessingMetrics } from './BaseEventHandler';
import { 
  InventoryEvent, 
  StockUpdatedEvent, 
  LowStockEvent, 
  InventoryAllocatedEvent, 
  InventoryReleasedEvent 
} from '../types/InventoryEvents';
import { OrderCreatedEvent, OrderCancelledEvent } from '../types/OrderEvents';

/**
 * Cache service interface for inventory operations.
 */
interface CacheService {
  evictInventoryCache(productId: string): Promise<void>;
  evictProductCache(): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

/**
 * Mock cache service implementation.
 */
class MockCacheService implements CacheService {
  async evictInventoryCache(productId: string): Promise<void> {
    console.debug(`Evicting inventory cache for product ${productId}`);
  }

  async evictProductCache(): Promise<void> {
    console.debug('Evicting product cache');
  }

  async invalidatePattern(pattern: string): Promise<void> {
    console.debug(`Invalidating cache pattern: ${pattern}`);
  }
}

/**
 * Event handler for inventory-related events.
 * Handles cross-domain communication and inventory-specific processing.
 */
export class InventoryEventHandler extends BaseEventHandler {
  private cacheService: CacheService;

  constructor(
    cacheService?: CacheService,
    metrics?: EventProcessingMetrics
  ) {
    super(metrics);
    this.cacheService = cacheService || new MockCacheService();
  }

  /**
   * Checks if this handler can process the given event type.
   */
  public canHandle(eventType: string): boolean {
    return [
      'StockUpdatedEvent',
      'LowStockEvent',
      'InventoryAllocatedEvent',
      'InventoryReleasedEvent',
      'OrderCreatedEvent',
      'OrderCancelledEvent'
    ].includes(eventType);
  }

  /**
   * Gets the priority of this handler.
   */
  public getPriority(): number {
    return 10; // High priority for inventory events
  }

  /**
   * Main event processing method.
   */
  protected async processEvent(event: any): Promise<void> {
    switch (event.eventType) {
      case 'StockUpdatedEvent':
        await this.handleStockUpdated(event as StockUpdatedEvent);
        break;
      case 'LowStockEvent':
        await this.handleLowStock(event as LowStockEvent);
        break;
      case 'InventoryAllocatedEvent':
        await this.handleInventoryAllocated(event as InventoryAllocatedEvent);
        break;
      case 'InventoryReleasedEvent':
        await this.handleInventoryReleased(event as InventoryReleasedEvent);
        break;
      case 'OrderCreatedEvent':
        await this.handleOrderCreatedForInventory(event as OrderCreatedEvent);
        break;
      case 'OrderCancelledEvent':
        await this.handleOrderCancelledForInventory(event as OrderCancelledEvent);
        break;
      default:
        throw new Error(`Unsupported event type: ${event.eventType}`);
    }
  }

  /**
   * Handles stock updated events with cache invalidation.
   */
  private async handleStockUpdated(event: StockUpdatedEvent): Promise<void> {
    console.info(`Processing stock updated event for product ${event.productId} - Previous: ${event.previousQuantity}, New: ${event.newQuantity}, Movement: ${event.movementType}`);

    try {
      // Invalidate product and inventory caches
      await this.cacheService.evictInventoryCache(event.productId);
      await this.cacheService.evictProductCache();

      // Check if stock level is now low (reorder level would be checked by service layer)
      if (event.newQuantity <= 10) { // Default reorder level for demo
        console.warn(`Low stock detected for product ${event.productId} - Current: ${event.newQuantity}`);
        // Low stock event will be published by the service layer
      }

      // Update analytics (in a real implementation, this would call analytics service)
      await this.updateInventoryAnalytics(event);

      console.debug(`Successfully processed stock updated event for product ${event.productId}`);

    } catch (error) {
      console.error(`Failed to process stock updated event for product ${event.productId}`, error);
      throw error;
    }
  }

  /**
   * Handles low stock events with alerting.
   */
  private async handleLowStock(event: LowStockEvent): Promise<void> {
    console.warn(`Processing low stock event for product ${event.productId} - Current: ${event.currentStock}, Reorder Level: ${event.reorderLevel}`);

    try {
      // Generate purchase recommendations
      await this.generatePurchaseRecommendations(event);

      // Send alerts to managers
      await this.sendLowStockAlerts(event);

      // Update analytics
      await this.updateLowStockAnalytics(event);

      console.info(`Successfully processed low stock event for product ${event.productId}`);

    } catch (error) {
      console.error(`Failed to process low stock event for product ${event.productId}`, error);
      throw error;
    }
  }

  /**
   * Handles inventory allocation events.
   */
  private async handleInventoryAllocated(event: InventoryAllocatedEvent): Promise<void> {
    console.info(`Processing inventory allocated event for product ${event.productId} - Quantity: ${event.quantity}, Reference: ${event.referenceId}`);

    try {
      // Update cache with new allocation
      await this.cacheService.evictInventoryCache(event.productId);

      // Update analytics
      await this.updateAllocationAnalytics(event);

      // Check if allocation brings stock below reorder level
      await this.checkReorderLevelAfterAllocation(event);

      console.debug(`Successfully processed inventory allocated event for product ${event.productId}`);

    } catch (error) {
      console.error(`Failed to process inventory allocated event for product ${event.productId}`, error);
      throw error;
    }
  }

  /**
   * Handles inventory release events.
   */
  private async handleInventoryReleased(event: InventoryReleasedEvent): Promise<void> {
    console.info(`Processing inventory released event for product ${event.productId} - Quantity: ${event.quantity}, Reference: ${event.referenceId}`);

    try {
      // Update cache with released inventory
      await this.cacheService.evictInventoryCache(event.productId);

      // Update analytics
      await this.updateReleaseAnalytics(event);

      console.debug(`Successfully processed inventory released event for product ${event.productId}`);

    } catch (error) {
      console.error(`Failed to process inventory released event for product ${event.productId}`, error);
      throw error;
    }
  }

  /**
   * Handles order created events for inventory allocation.
   */
  private async handleOrderCreatedForInventory(event: OrderCreatedEvent): Promise<void> {
    console.info(`Processing order created event for inventory allocation - Order: ${event.orderId}`);

    try {
      // Process inventory allocation for order items
      for (const item of event.orderItems) {
        await this.allocateInventoryForOrderItem(event.orderId, item);
      }

      console.debug(`Successfully processed order created event for inventory allocation - Order: ${event.orderId}`);

    } catch (error) {
      console.error(`Failed to process order created event for inventory allocation - Order: ${event.orderId}`, error);
      throw error;
    }
  }

  /**
   * Handles order cancelled events for inventory release.
   */
  private async handleOrderCancelledForInventory(event: OrderCancelledEvent): Promise<void> {
    console.info(`Processing order cancelled event for inventory release - Order: ${event.orderId}`);

    try {
      // Process inventory release for cancelled order items
      for (const item of event.inventoryToRelease) {
        await this.releaseInventoryForOrderItem(event.orderId, item);
      }

      console.debug(`Successfully processed order cancelled event for inventory release - Order: ${event.orderId}`);

    } catch (error) {
      console.error(`Failed to process order cancelled event for inventory release - Order: ${event.orderId}`, error);
      throw error;
    }
  }

  // Helper methods for business logic

  private async updateInventoryAnalytics(event: StockUpdatedEvent): Promise<void> {
    // In a real implementation, this would update analytics database
    console.debug(`Updating inventory analytics for product ${event.productId}`);
  }

  private async generatePurchaseRecommendations(event: LowStockEvent): Promise<void> {
    // In a real implementation, this would generate purchase orders or recommendations
    console.debug(`Generating purchase recommendations for product ${event.productId}`);
  }

  private async sendLowStockAlerts(event: LowStockEvent): Promise<void> {
    // In a real implementation, this would send notifications to managers
    console.debug(`Sending low stock alerts for product ${event.productId}`);
  }

  private async updateLowStockAnalytics(event: LowStockEvent): Promise<void> {
    // In a real implementation, this would update low stock analytics
    console.debug(`Updating low stock analytics for product ${event.productId}`);
  }

  private async updateAllocationAnalytics(event: InventoryAllocatedEvent): Promise<void> {
    // In a real implementation, this would update allocation analytics
    console.debug(`Updating allocation analytics for product ${event.productId}`);
  }

  private async checkReorderLevelAfterAllocation(event: InventoryAllocatedEvent): Promise<void> {
    // In a real implementation, this would check current stock levels and trigger reorder if needed
    console.debug(`Checking reorder level after allocation for product ${event.productId}`);
  }

  private async updateReleaseAnalytics(event: InventoryReleasedEvent): Promise<void> {
    // In a real implementation, this would update release analytics
    console.debug(`Updating release analytics for product ${event.productId}`);
  }

  private async allocateInventoryForOrderItem(orderId: string, item: any): Promise<void> {
    // In a real implementation, this would call the inventory service to allocate stock
    console.debug(`Allocating inventory for order ${orderId}, product ${item.productId}, quantity ${item.quantity}`);
  }

  private async releaseInventoryForOrderItem(orderId: string, item: any): Promise<void> {
    // In a real implementation, this would call the inventory service to release allocated stock
    console.debug(`Releasing inventory for order ${orderId}, product ${item.productId}, quantity ${item.quantity}`);
  }
}

// Export singleton instance
export const inventoryEventHandler = new InventoryEventHandler();