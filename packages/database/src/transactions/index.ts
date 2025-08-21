import { DatabaseConnection } from '../connection';
import { TransactionManager } from '../connection/transaction';

// Re-export transaction manager
export { TransactionManager } from '../connection/transaction';
export type { TransactionContext } from '../connection/transaction';

/**
 * Advanced transaction utilities and patterns
 */
export class TransactionUtils {
  private transactionManager: TransactionManager;

  constructor(db: DatabaseConnection) {
    this.transactionManager = new TransactionManager(db);
  }

  /**
   * Execute multiple operations in a single transaction with rollback on any failure
   */
  async executeAll<T extends any[]>(
    operations: Array<(ctx: any) => Promise<T[number]>>
  ): Promise<T> {
    return await this.transactionManager.execute(async (ctx) => {
      const results: T[number][] = [];
      
      for (const operation of operations) {
        const result = await operation(ctx);
        results.push(result);
      }
      
      return results as T;
    });
  }

  /**
   * Execute operations with savepoints for partial rollback
   */
  async executeWithSavepoints<T>(
    operations: Array<{
      name: string;
      operation: (ctx: any) => Promise<T>;
      onError?: (error: Error) => Promise<void>;
    }>
  ): Promise<T[]> {
    return await this.transactionManager.executeWithDrizzle(async (tx) => {
      const results: T[] = [];
      
      for (const { name, operation, onError } of operations) {
        try {
          // Create savepoint
          await tx.execute(`SAVEPOINT ${name}`);
          
          const result = await operation({ drizzle: tx });
          results.push(result);
          
          // Release savepoint on success
          await tx.execute(`RELEASE SAVEPOINT ${name}`);
        } catch (error) {
          // Rollback to savepoint
          await tx.execute(`ROLLBACK TO SAVEPOINT ${name}`);
          
          if (onError) {
            await onError(error as Error);
          }
          
          throw error;
        }
      }
      
      return results;
    });
  }

  /**
   * Execute with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: (ctx: any) => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      retryCondition?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 100,
      maxDelay = 5000,
      retryCondition = (error) => 
        error.message.includes('serialization_failure') ||
        error.message.includes('deadlock_detected') ||
        error.message.includes('connection')
    } = options;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.transactionManager.execute(operation);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries || !retryCondition(lastError)) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout<T>(
    operation: (ctx: any) => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    return await Promise.race([
      this.transactionManager.execute(operation),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Transaction timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  /**
   * Execute with distributed lock
   */
  async executeWithLock<T>(
    lockName: string,
    operation: (ctx: any) => Promise<T>,
    timeoutMs: number = 10000
  ): Promise<T> {
    return await this.transactionManager.executeWithDrizzle(async (tx) => {
      // Acquire advisory lock
      const lockId = this.hashLockName(lockName);
      const [{ acquired }] = await tx.execute(
        `SELECT pg_try_advisory_xact_lock(${lockId}) as acquired`
      );
      
      if (!acquired) {
        throw new Error(`Failed to acquire lock: ${lockName}`);
      }
      
      try {
        return await operation({ drizzle: tx });
      } finally {
        // Lock is automatically released at transaction end
      }
    });
  }

  /**
   * Batch operations with configurable batch size
   */
  async executeBatch<T, R>(
    items: T[],
    operation: (batch: T[], ctx: any) => Promise<R[]>,
    batchSize: number = 100
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchResults = await this.transactionManager.execute(async (ctx) => {
        return await operation(batch, ctx);
      });
      
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Execute with performance monitoring
   */
  async executeWithMonitoring<T>(
    operation: (ctx: any) => Promise<T>,
    options: {
      name?: string;
      logSlowQueries?: boolean;
      slowQueryThreshold?: number;
      onComplete?: (duration: number, result: T) => void;
      onError?: (duration: number, error: Error) => void;
    } = {}
  ): Promise<T> {
    const {
      name = 'transaction',
      logSlowQueries = true,
      slowQueryThreshold = 1000,
      onComplete,
      onError
    } = options;

    const startTime = Date.now();
    
    try {
      const result = await this.transactionManager.execute(operation);
      const duration = Date.now() - startTime;
      
      if (logSlowQueries && duration > slowQueryThreshold) {
        console.warn(`Slow transaction detected: ${name} took ${duration}ms`);
      }
      
      if (onComplete) {
        onComplete(duration, result);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (onError) {
        onError(duration, error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Hash lock name to integer for PostgreSQL advisory locks
   */
  private hashLockName(lockName: string): number {
    let hash = 0;
    for (let i = 0; i < lockName.length; i++) {
      const char = lockName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Transaction isolation levels
 */
export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE'
}

/**
 * Execute transaction with specific isolation level
 */
export async function executeWithIsolationLevel<T>(
  db: DatabaseConnection,
  isolationLevel: IsolationLevel,
  operation: (ctx: any) => Promise<T>
): Promise<T> {
  const transactionManager = new TransactionManager(db);
  
  return await transactionManager.executeWithDrizzle(async (tx) => {
    // Set isolation level
    await tx.execute(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
    
    return await operation({ drizzle: tx });
  });
}

/**
 * Create transaction utils instance
 */
export function createTransactionUtils(db: DatabaseConnection): TransactionUtils {
  return new TransactionUtils(db);
}

// Export commonly used patterns
export const TransactionPatterns = {
  /**
   * Optimistic locking pattern
   */
  optimisticLock: async <T>(
    db: DatabaseConnection,
    operation: (ctx: any) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> => {
    const utils = new TransactionUtils(db);
    return await utils.executeWithRetry(operation, {
      maxRetries,
      retryCondition: (error) => error.message.includes('serialization_failure')
    });
  },

  /**
   * Pessimistic locking pattern
   */
  pessimisticLock: async <T>(
    db: DatabaseConnection,
    lockName: string,
    operation: (ctx: any) => Promise<T>
  ): Promise<T> => {
    const utils = new TransactionUtils(db);
    return await utils.executeWithLock(lockName, operation);
  },

  /**
   * Saga pattern for distributed transactions
   */
  saga: async <T>(
    db: DatabaseConnection,
    steps: Array<{
      name: string;
      forward: (ctx: any) => Promise<T>;
      compensate: (ctx: any, result?: T) => Promise<void>;
    }>
  ): Promise<T[]> => {
    const utils = new TransactionUtils(db);
    const results: T[] = [];
    const completedSteps: Array<{ step: typeof steps[0]; result: T }> = [];

    try {
      for (const step of steps) {
        const result = await utils.transactionManager.execute(async (ctx) => {
          return await step.forward(ctx);
        });
        
        results.push(result);
        completedSteps.push({ step, result });
      }
      
      return results;
    } catch (error) {
      // Compensate in reverse order
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        const { step, result } = completedSteps[i];
        try {
          await utils.transactionManager.execute(async (ctx) => {
            await step.compensate(ctx, result);
          });
        } catch (compensationError) {
          console.error(`Compensation failed for step ${step.name}:`, compensationError);
        }
      }
      
      throw error;
    }
  }
};