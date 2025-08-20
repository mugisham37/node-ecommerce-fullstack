import { DatabaseConnection } from './index';

export interface TransactionContext {
  drizzle: ReturnType<DatabaseConnection['drizzle']['transaction']>;
  kysely: ReturnType<DatabaseConnection['kysely']['transaction']>;
}

export class TransactionManager {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Execute a function within a database transaction
   * Supports both Drizzle ORM and Kysely operations
   */
  async execute<T>(
    callback: (ctx: TransactionContext) => Promise<T>
  ): Promise<T> {
    return await this.db.drizzle.transaction(async (drizzleTx) => {
      return await this.db.kysely.transaction().execute(async (kyselyTx) => {
        const context: TransactionContext = {
          drizzle: drizzleTx,
          kysely: kyselyTx,
        };
        
        return await callback(context);
      });
    });
  }

  /**
   * Execute a function within a Drizzle-only transaction
   */
  async executeWithDrizzle<T>(
    callback: (tx: ReturnType<DatabaseConnection['drizzle']['transaction']>) => Promise<T>
  ): Promise<T> {
    return await this.db.drizzle.transaction(callback);
  }

  /**
   * Execute a function within a Kysely-only transaction
   */
  async executeWithKysely<T>(
    callback: (tx: ReturnType<DatabaseConnection['kysely']['transaction']>) => Promise<T>
  ): Promise<T> {
    return await this.db.kysely.transaction().execute(callback);
  }
}

export function createTransactionManager(db: DatabaseConnection): TransactionManager {
  return new TransactionManager(db);
}