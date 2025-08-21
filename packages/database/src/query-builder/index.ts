import { Kysely, PostgresDialect, CamelCasePlugin, DeduplicateJoinsPlugin } from 'kysely';
import { Pool } from 'pg';
import { DatabaseConfig } from '../connection';

// Database schema interface for Kysely
export interface DatabaseSchema {
  users: {
    id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: string;
    created_at: Date;
    updated_at: Date;
  };
  categories: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    parent_id: string | null;
    created_at: Date;
    updated_at: Date;
  };
  suppliers: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    contact_person: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
  };
  products: {
    id: string;
    name: string;
    description: string | null;
    sku: string;
    price: string;
    category_id: string;
    supplier_id: string;
    created_at: Date;
    updated_at: Date;
  };
  inventory: {
    id: string;
    product_id: string;
    quantity: number;
    reserved_quantity: number;
    reorder_level: number;
    reorder_quantity: number;
    created_at: Date;
    updated_at: Date;
  };
  orders: {
    id: string;
    order_number: string;
    user_id: string;
    status: string;
    total_amount: string;
    shipping_address: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  };
  order_items: {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: string;
    total_price: string;
    created_at: Date;
    updated_at: Date;
  };
  stock_movements: {
    id: string;
    product_id: string;
    quantity: number;
    type: string;
    reason: string;
    reference: string | null;
    created_at: Date;
    updated_at: Date;
  };
  user_activities: {
    id: string;
    user_id: string;
    action: string;
    resource: string;
    resource_id: string | null;
    details: Record<string, any> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Configuration options for Kysely query builder
 */
export interface KyselyConfig {
  enableCamelCase?: boolean;
  enableDeduplicateJoins?: boolean;
  enableQueryLogging?: boolean;
  queryTimeout?: number;
}

/**
 * Create a configured Kysely instance
 */
export function createKyselyInstance(
  config: DatabaseConfig,
  kyselyConfig: KyselyConfig = {}
): Kysely<DatabaseSchema> {
  const {
    enableCamelCase = true,
    enableDeduplicateJoins = true,
    enableQueryLogging = false,
    queryTimeout = 30000,
  } = kyselyConfig;

  // Create PostgreSQL connection pool
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    max: config.maxConnections || 20,
    connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
    idleTimeoutMillis: config.idleTimeoutMillis || 30000,
    statement_timeout: queryTimeout,
  });

  // Configure plugins
  const plugins = [];
  
  if (enableCamelCase) {
    plugins.push(new CamelCasePlugin());
  }
  
  if (enableDeduplicateJoins) {
    plugins.push(new DeduplicateJoinsPlugin());
  }

  // Create Kysely instance
  const kysely = new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool,
    }),
    plugins,
    log: enableQueryLogging ? (event) => {
      if (event.level === 'query') {
        console.log('Query:', event.query.sql);
        console.log('Parameters:', event.query.parameters);
        console.log('Duration:', event.queryDurationMillis, 'ms');
      }
    } : undefined,
  });

  return kysely;
}

/**
 * Query builder utilities and helpers
 */
export class QueryBuilderUtils {
  private kysely: Kysely<DatabaseSchema>;

  constructor(kysely: Kysely<DatabaseSchema>) {
    this.kysely = kysely;
  }

  /**
   * Build a paginated query
   */
  paginate<T>(
    query: any,
    page: number = 1,
    limit: number = 10
  ) {
    const offset = (page - 1) * limit;
    return query.limit(limit).offset(offset);
  }

  /**
   * Build a search query with multiple columns
   */
  searchColumns(columns: string[], searchTerm: string) {
    const conditions = columns.map(column => 
      this.kysely.raw(`${column} ILIKE ?`, [`%${searchTerm}%`])
    );
    
    return this.kysely.or(conditions);
  }

  /**
   * Build date range conditions
   */
  dateRange(column: string, from?: Date, to?: Date) {
    const conditions = [];
    
    if (from) {
      conditions.push(this.kysely.raw(`${column} >= ?`, [from]));
    }
    
    if (to) {
      conditions.push(this.kysely.raw(`${column} <= ?`, [to]));
    }
    
    return conditions.length > 0 ? this.kysely.and(conditions) : undefined;
  }

  /**
   * Build aggregation queries
   */
  aggregate() {
    return {
      count: (column: string = '*') => this.kysely.fn.count(column),
      sum: (column: string) => this.kysely.fn.sum(column),
      avg: (column: string) => this.kysely.fn.avg(column),
      min: (column: string) => this.kysely.fn.min(column),
      max: (column: string) => this.kysely.fn.max(column),
      countDistinct: (column: string) => this.kysely.fn.countDistinct(column),
    };
  }

  /**
   * Build conditional aggregations
   */
  conditionalAggregate(column: string, condition: any) {
    return {
      count: () => this.kysely.fn.count(column).filterWhere(condition),
      sum: () => this.kysely.fn.sum(column).filterWhere(condition),
      avg: () => this.kysely.fn.avg(column).filterWhere(condition),
    };
  }

  /**
   * Build JSON operations
   */
  json() {
    return {
      extract: (column: string, path: string) => 
        this.kysely.raw(`${column}->>'${path}'`),
      extractPath: (column: string, path: string[]) => 
        this.kysely.raw(`${column}#>>'{${path.join(',')}}'`),
      contains: (column: string, value: any) => 
        this.kysely.raw(`${column} @> ?`, [JSON.stringify(value)]),
      containedBy: (column: string, value: any) => 
        this.kysely.raw(`${column} <@ ?`, [JSON.stringify(value)]),
    };
  }

  /**
   * Build full-text search queries
   */
  fullTextSearch(column: string, searchTerm: string, language: string = 'english') {
    return this.kysely.raw(
      `to_tsvector('${language}', ${column}) @@ plainto_tsquery('${language}', ?)`,
      [searchTerm]
    );
  }

  /**
   * Build window functions
   */
  window() {
    return {
      rowNumber: (partitionBy?: string[], orderBy?: string[]) => {
        let windowFn = 'ROW_NUMBER() OVER (';
        
        if (partitionBy && partitionBy.length > 0) {
          windowFn += `PARTITION BY ${partitionBy.join(', ')} `;
        }
        
        if (orderBy && orderBy.length > 0) {
          windowFn += `ORDER BY ${orderBy.join(', ')}`;
        }
        
        windowFn += ')';
        return this.kysely.raw(windowFn);
      },
      
      rank: (partitionBy?: string[], orderBy?: string[]) => {
        let windowFn = 'RANK() OVER (';
        
        if (partitionBy && partitionBy.length > 0) {
          windowFn += `PARTITION BY ${partitionBy.join(', ')} `;
        }
        
        if (orderBy && orderBy.length > 0) {
          windowFn += `ORDER BY ${orderBy.join(', ')}`;
        }
        
        windowFn += ')';
        return this.kysely.raw(windowFn);
      },
    };
  }
}

/**
 * Create query builder utils instance
 */
export function createQueryBuilderUtils(kysely: Kysely<DatabaseSchema>): QueryBuilderUtils {
  return new QueryBuilderUtils(kysely);
}

// Export types
export type { DatabaseSchema, KyselyConfig };
export { Kysely } from 'kysely';