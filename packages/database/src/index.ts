// Export connection management
export * from './connection';

// Export schema definitions
export * from './schema';

// Export seeding functionality
export * from './seeds';

// Export repository pattern
export * from './repositories';

// Export query builder utilities
export * from './query-builder';

// Export transaction utilities
export * from './transactions';

// Export monitoring utilities
export * from './monitoring';

// Export health check utilities
export * from './health';

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
import { createRepositoryFactory, RepositoryFactory } from './repositories';
import { createKyselyInstance, createQueryBuilderUtils } from './query-builder';
import { createTransactionUtils, TransactionUtils } from './transactions';
import { createDatabaseMonitor, DatabaseMonitor } from './monitoring';
import { createDatabaseHealthMonitor, DatabaseHealthMonitor } from './health';

export {
  createDatabaseConnection,
  DatabaseConnection,
  createTransactionManager,
  TransactionManager,
  createHealthChecker,
  DatabaseHealthChecker,
  DatabaseSeeder,
  createRepositoryFactory,
  RepositoryFactory,
  createKyselyInstance,
  createQueryBuilderUtils,
  createTransactionUtils,
  TransactionUtils,
  createDatabaseMonitor,
  DatabaseMonitor,
  createDatabaseHealthMonitor,
  DatabaseHealthMonitor,
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

/**
 * Create a complete database layer instance with all utilities
 */
export function createDatabaseLayer(config?: Parameters<typeof createDatabaseConnection>[0]) {
  const db = createDatabaseConnection(config);
  const repositories = createRepositoryFactory(db);
  const transactionUtils = createTransactionUtils(db);
  const monitor = createDatabaseMonitor(db);
  const healthMonitor = createDatabaseHealthMonitor(db);
  const queryUtils = createQueryBuilderUtils(db.kysely);

  return {
    db,
    repositories,
    transactionUtils,
    monitor,
    healthMonitor,
    queryUtils,
  };
}