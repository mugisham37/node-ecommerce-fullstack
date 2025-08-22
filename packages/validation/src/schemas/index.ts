/**
 * Centralized schemas for the application
 * These schemas combine validators to create complete validation schemas
 */

// Existing schemas
export * from './category';
export * from './common';
export * from './inventory';
export * from './order';
export * from './product';
export * from './supplier';
export * from './user';

// Migrated schemas from other-backend
export * from './ab-test';
export * from './advanced-search';
export * from './country';
export * from './currency';
export * from './email';
export * from './loyalty';
export * from './tax';
export * from './vendor';