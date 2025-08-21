import { eq, and, or, desc, asc, count, SQL, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { Kysely } from 'kysely';
import { DatabaseConnection } from '../../connection';
import { TransactionManager } from '../../connection/transaction';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PagedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FilterOptions {
  [key: string]: any;
}

export interface BaseRepositoryOptions {
  enableSoftDelete?: boolean;
  timestampFields?: {
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
  };
}

/**
 * Base repository class providing common CRUD operations
 * Supports both Drizzle ORM and Kysely query builder
 */
export abstract class BaseRepository<
  TTable extends PgTable,
  TSelect,
  TInsert,
  TUpdate = Partial<TInsert>
> {
  protected db: DatabaseConnection;
  protected transactionManager: TransactionManager;
  protected abstract table: TTable;
  protected abstract tableName: string;
  protected options: BaseRepositoryOptions;

  constructor(
    db: DatabaseConnection,
    options: BaseRepositoryOptions = {}
  ) {
    this.db = db;
    this.transactionManager = new TransactionManager(db);
    this.options = {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
      },
      ...options,
    };
  }

  /**
   * Find all records with pagination and filtering
   */
  async findAll(
    pagination: PaginationOptions = { page: 1, limit: 10 },
    filters: FilterOptions = {}
  ): Promise<PagedResult<TSelect>> {
    const offset = (pagination.page - 1) * pagination.limit;
    
    // Build where conditions
    const whereConditions = this.buildWhereConditions(filters);
    
    // Get total count
    const totalQuery = this.db.drizzle
      .select({ count: count() })
      .from(this.table);
    
    if (whereConditions.length > 0) {
      totalQuery.where(and(...whereConditions));
    }
    
    const [{ count: total }] = await totalQuery;
    
    // Get paginated data
    let query = this.db.drizzle
      .select()
      .from(this.table)
      .limit(pagination.limit)
      .offset(offset);
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    // Apply sorting
    if (pagination.sortBy) {
      const sortColumn = this.table[pagination.sortBy as keyof TTable];
      if (sortColumn) {
        query = query.orderBy(
          pagination.sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn)
        );
      }
    }
    
    const data = await query;
    
    const totalPages = Math.ceil(total / pagination.limit);
    
    return {
      data: data as TSelect[],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
    };
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<TSelect | null> {
    const idColumn = this.table.id;
    const whereConditions = [eq(idColumn, id)];
    
    if (this.options.enableSoftDelete && this.options.timestampFields?.deletedAt) {
      const deletedAtColumn = this.table[this.options.timestampFields.deletedAt as keyof TTable];
      if (deletedAtColumn) {
        whereConditions.push(sql`${deletedAtColumn} IS NULL`);
      }
    }
    
    const result = await this.db.drizzle
      .select()
      .from(this.table)
      .where(and(...whereConditions))
      .limit(1);
    
    return result[0] as TSelect || null;
  }

  /**
   * Find records by specific conditions
   */
  async findBy(filters: FilterOptions): Promise<TSelect[]> {
    const whereConditions = this.buildWhereConditions(filters);
    
    let query = this.db.drizzle.select().from(this.table);
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    return await query as TSelect[];
  }

  /**
   * Find a single record by conditions
   */
  async findOneBy(filters: FilterOptions): Promise<TSelect | null> {
    const results = await this.findBy(filters);
    return results[0] || null;
  }

  /**
   * Create a new record
   */
  async create(data: TInsert): Promise<TSelect> {
    const insertData = this.addTimestamps(data, 'create');
    
    const result = await this.db.drizzle
      .insert(this.table)
      .values(insertData)
      .returning();
    
    return result[0] as TSelect;
  }

  /**
   * Create multiple records
   */
  async createMany(data: TInsert[]): Promise<TSelect[]> {
    const insertData = data.map(item => this.addTimestamps(item, 'create'));
    
    const result = await this.db.drizzle
      .insert(this.table)
      .values(insertData)
      .returning();
    
    return result as TSelect[];
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: TUpdate): Promise<TSelect | null> {
    const updateData = this.addTimestamps(data, 'update');
    const idColumn = this.table.id;
    
    const result = await this.db.drizzle
      .update(this.table)
      .set(updateData)
      .where(eq(idColumn, id))
      .returning();
    
    return result[0] as TSelect || null;
  }

  /**
   * Delete a record by ID (soft delete if enabled)
   */
  async delete(id: string): Promise<boolean> {
    const idColumn = this.table.id;
    
    if (this.options.enableSoftDelete && this.options.timestampFields?.deletedAt) {
      const deletedAtColumn = this.table[this.options.timestampFields.deletedAt as keyof TTable];
      if (deletedAtColumn) {
        const result = await this.db.drizzle
          .update(this.table)
          .set({ [this.options.timestampFields.deletedAt]: new Date() } as any)
          .where(eq(idColumn, id))
          .returning();
        
        return result.length > 0;
      }
    }
    
    const result = await this.db.drizzle
      .delete(this.table)
      .where(eq(idColumn, id))
      .returning();
    
    return result.length > 0;
  }

  /**
   * Hard delete a record (permanent deletion)
   */
  async hardDelete(id: string): Promise<boolean> {
    const idColumn = this.table.id;
    
    const result = await this.db.drizzle
      .delete(this.table)
      .where(eq(idColumn, id))
      .returning();
    
    return result.length > 0;
  }

  /**
   * Count records with optional filters
   */
  async count(filters: FilterOptions = {}): Promise<number> {
    const whereConditions = this.buildWhereConditions(filters);
    
    let query = this.db.drizzle
      .select({ count: count() })
      .from(this.table);
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    const [{ count: total }] = await query;
    return total;
  }

  /**
   * Check if a record exists
   */
  async exists(filters: FilterOptions): Promise<boolean> {
    const count = await this.count(filters);
    return count > 0;
  }

  /**
   * Execute a custom query using Kysely query builder
   */
  protected async executeKyselyQuery<T>(
    queryBuilder: (db: Kysely<any>) => Promise<T>
  ): Promise<T> {
    return await queryBuilder(this.db.kysely);
  }

  /**
   * Execute operations within a transaction
   */
  async withTransaction<T>(
    callback: (repository: this) => Promise<T>
  ): Promise<T> {
    return await this.transactionManager.executeWithDrizzle(async (tx) => {
      // Create a new repository instance with the transaction
      const transactionalRepo = Object.create(this);
      transactionalRepo.db = { ...this.db, drizzle: tx };
      
      return await callback(transactionalRepo);
    });
  }

  /**
   * Build where conditions from filters
   */
  protected buildWhereConditions(filters: FilterOptions): SQL[] {
    const conditions: SQL[] = [];
    
    // Add soft delete filter
    if (this.options.enableSoftDelete && this.options.timestampFields?.deletedAt) {
      const deletedAtColumn = this.table[this.options.timestampFields.deletedAt as keyof TTable];
      if (deletedAtColumn) {
        conditions.push(sql`${deletedAtColumn} IS NULL`);
      }
    }
    
    // Add custom filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        const column = this.table[key as keyof TTable];
        if (column) {
          if (Array.isArray(value)) {
            conditions.push(sql`${column} = ANY(${value})`);
          } else if (typeof value === 'object' && value.operator) {
            // Support for complex operators like { operator: 'like', value: '%search%' }
            switch (value.operator) {
              case 'like':
                conditions.push(sql`${column} ILIKE ${value.value}`);
                break;
              case 'gt':
                conditions.push(sql`${column} > ${value.value}`);
                break;
              case 'gte':
                conditions.push(sql`${column} >= ${value.value}`);
                break;
              case 'lt':
                conditions.push(sql`${column} < ${value.value}`);
                break;
              case 'lte':
                conditions.push(sql`${column} <= ${value.value}`);
                break;
              case 'in':
                conditions.push(sql`${column} = ANY(${value.value})`);
                break;
              case 'not':
                conditions.push(sql`${column} != ${value.value}`);
                break;
            }
          } else {
            conditions.push(eq(column, value));
          }
        }
      }
    }
    
    return conditions;
  }

  /**
   * Add timestamp fields to data
   */
  protected addTimestamps(data: any, operation: 'create' | 'update'): any {
    const result = { ...data };
    const now = new Date();
    
    if (operation === 'create' && this.options.timestampFields?.createdAt) {
      result[this.options.timestampFields.createdAt] = now;
    }
    
    if (this.options.timestampFields?.updatedAt) {
      result[this.options.timestampFields.updatedAt] = now;
    }
    
    return result;
  }
}