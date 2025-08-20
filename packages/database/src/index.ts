// Export connection management
export * from './connection';

// Export schema definitions
export * from './schema';

// Export seeding functionality
export * from './seeds';

// Export types and utilities
export type { DatabaseConfig } from './connection';
export type { SeedOptions } from './seeds';

// Re-export Drizzle and Kysely types for convenience
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
export type { Kysely } from 'kysely';

// Export commonly used database utilities
import { createDatabaseConnection, DatabaseConnection } from './connection';
import { createTransactionManager, TransactionManager } from './connection/transaction';
import { createHealthChecker, DatabaseHealthChecker } from './connection/health';
import { DatabaseSeeder } from './seeds';

export {
  createDatabaseConnection,
  DatabaseConnection,
  createTransactionManager,
  TransactionManager,
  createHealthChecker,
  DatabaseHealthChecker,
  DatabaseSeeder,
};

// Default database instance factory
let defaultDb: DatabaseConnection | null = null;

export function getDatabase(config?: Parameters<typeof createDatabaseConnection>[0]): DatabaseConnection {
  if (!defaultDb) {
    defaultDb = createDatabaseConnection(config);
  }
  return defaultDb;
}

export function resetDatabase(): void {
  defaultDb = null;
}