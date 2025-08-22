/**
 * Validation package main export
 * Provides all validation schemas and utilities
 */

// Export all schemas (including migrated ones)
export * from './schemas';

// Export specific validators to avoid conflicts
export { CommonValidator } from './validators/CommonValidator';
export { EmailValidator } from './validators/EmailValidator';
export { PhoneValidator } from './validators/PhoneValidator';
export { PriceValidator } from './validators/PriceValidator';
export { ProductValidator } from './validators/ProductValidator';
export { UserValidator } from './validators/UserValidator';
export { OrderValidator } from './validators/OrderValidator';

// Export validation utilities
export * from './utils/ValidationUtils';

// Export schema types
export * from './types/ValidationTypes';

// Export tRPC validation middleware
export * from './middleware/trpc-validation';