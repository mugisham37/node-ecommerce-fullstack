/**
 * Inventory-specific errors
 */

import { BusinessError } from './BusinessError';

export class InventoryError extends BusinessError {
  constructor(message: string, operation: string, productId?: string, cause?: Error) {
    super(message, 'INVENTORY_ERROR', 'INVENTORY', 400, cause);
    this.addContext('operation', operation);
    if (productId) {
      this.addContext('productId', productId);
    }
  }
}

/**
 * Exception thrown when stock adjustment fails
 */
export class StockAdjustmentError extends InventoryError {
  constructor(
    productId: string,
    adjustmentType: 'INCREASE' | 'DECREASE',
    quantity: number,
    reason: string
  ) {
    super(
      `Stock adjustment failed for product ${productId}: ${reason}`,
      'STOCK_ADJUSTMENT',
      productId
    );
    this.errorCode = 'STOCK_ADJUSTMENT_ERROR';
    this.addContext('adjustmentType', adjustmentType);
    this.addContext('quantity', quantity);
    this.addContext('reason', reason);
  }
}

/**
 * Exception thrown when inventory reservation fails
 */
export class InventoryReservationError extends InventoryError {
  constructor(productId: string, requestedQuantity: number, reason: string) {
    super(
      `Failed to reserve ${requestedQuantity} units of product ${productId}: ${reason}`,
      'RESERVATION',
      productId
    );
    this.errorCode = 'INVENTORY_RESERVATION_ERROR';
    this.addContext('requestedQuantity', requestedQuantity);
    this.addContext('reason', reason);
  }
}

/**
 * Exception thrown when inventory release fails
 */
export class InventoryReleaseError extends InventoryError {
  constructor(productId: string, quantity: number, reason: string) {
    super(
      `Failed to release ${quantity} units of product ${productId}: ${reason}`,
      'RELEASE',
      productId
    );
    this.errorCode = 'INVENTORY_RELEASE_ERROR';
    this.addContext('quantity', quantity);
    this.addContext('reason', reason);
  }
}