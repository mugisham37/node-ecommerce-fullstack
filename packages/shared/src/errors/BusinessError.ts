/**
 * Base class for all business-related exceptions in the inventory management system
 * Converted from BusinessException.java
 */

import { AppError } from './index';

export abstract class BusinessError extends AppError {
  protected constructor(
    message: string,
    errorCode: string,
    category: string,
    statusCode: number = 400,
    cause?: Error
  ) {
    super(message, errorCode, category, statusCode, cause);
  }
}

/**
 * Exception thrown when insufficient stock is available for an operation
 */
export class InsufficientStockError extends BusinessError {
  constructor(productId: string, requestedQuantity: number, availableQuantity: number) {
    super(
      `Insufficient stock for product ${productId}. Requested: ${requestedQuantity}, Available: ${availableQuantity}`,
      'INSUFFICIENT_STOCK',
      'INVENTORY',
      400
    );
    this.addContext('productId', productId);
    this.addContext('requestedQuantity', requestedQuantity);
    this.addContext('availableQuantity', availableQuantity);
  }
}

/**
 * Exception thrown when an invalid order status transition is attempted
 */
export class InvalidOrderStatusTransitionError extends BusinessError {
  constructor(orderId: string, currentStatus: string, targetStatus: string) {
    super(
      `Invalid order status transition for order ${orderId} from ${currentStatus} to ${targetStatus}`,
      'INVALID_ORDER_STATUS_TRANSITION',
      'ORDER',
      400
    );
    this.addContext('orderId', orderId);
    this.addContext('currentStatus', currentStatus);
    this.addContext('targetStatus', targetStatus);
  }
}

/**
 * Exception thrown when an inventory operation fails
 */
export class InventoryOperationError extends BusinessError {
  constructor(message: string, operation: string, productId?: string) {
    super(message, 'INVENTORY_OPERATION_ERROR', 'INVENTORY', 400);
    this.addContext('operation', operation);
    if (productId) {
      this.addContext('productId', productId);
    }
  }
}

/**
 * Exception thrown when a user already exists
 */
export class UserAlreadyExistsError extends BusinessError {
  constructor(email: string) {
    super(
      `User with email ${email} already exists`,
      'USER_ALREADY_EXISTS',
      'USER',
      409
    );
    this.addContext('email', email);
  }
}