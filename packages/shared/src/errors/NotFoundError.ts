/**
 * Exception thrown when a requested resource is not found
 * Converted from ResourceNotFoundException.java and specific not found exceptions
 */

import { AppError } from './index';

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number, cause?: Error) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super(message, 'NOT_FOUND', 'RESOURCE', 404, cause);
    this.addContext('resource', resource);
    if (identifier !== undefined) {
      this.addContext('identifier', identifier);
    }
  }

  /**
   * Create a not found error for a specific resource type
   */
  static forResource(resource: string, identifier?: string | number): NotFoundError {
    return new NotFoundError(resource, identifier);
  }
}

/**
 * Exception thrown when a product is not found
 */
export class ProductNotFoundError extends NotFoundError {
  constructor(productId: string) {
    super('Product', productId);
    this.errorCode = 'PRODUCT_NOT_FOUND';
  }
}

/**
 * Exception thrown when a category is not found
 */
export class CategoryNotFoundError extends NotFoundError {
  constructor(categoryId: string) {
    super('Category', categoryId);
    this.errorCode = 'CATEGORY_NOT_FOUND';
  }
}

/**
 * Exception thrown when an order is not found
 */
export class OrderNotFoundError extends NotFoundError {
  constructor(orderId: string) {
    super('Order', orderId);
    this.errorCode = 'ORDER_NOT_FOUND';
  }
}

/**
 * Exception thrown when a supplier is not found
 */
export class SupplierNotFoundError extends NotFoundError {
  constructor(supplierId: string) {
    super('Supplier', supplierId);
    this.errorCode = 'SUPPLIER_NOT_FOUND';
  }
}

/**
 * Exception thrown when a user is not found
 */
export class UserNotFoundError extends NotFoundError {
  constructor(userId: string) {
    super('User', userId);
    this.errorCode = 'USER_NOT_FOUND';
  }
}