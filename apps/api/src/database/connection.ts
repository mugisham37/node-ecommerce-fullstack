import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Logger } from '../utils/logger';

/**
 * Database Layer Interface
 * Provides both ORM and query builder access to the database
 */
export interface DatabaseLayer {
  queryBuilder: Kysely<DatabaseSchema>;
  // orm would be added here when Drizzle is set up
}

/**
 * Database Schema Interface
 * Define your database schema types here
 */
export interface DatabaseSchema {
  users: {
    id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: string;
    active: boolean;
    failed_login_attempts: number;
    locked_until: Date | null;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
  };
  
  products: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description: string | null;
    category_id: string;
    supplier_id: string;
    cost_price: number;
    selling_price: number;
    reorder_level: number;
    reorder_quantity: number;
    active: boolean;
    created_at: Date;
    updated_at: Date;
  };

  categories: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parent_id: string | null;
    sort_order: number;
    level: number;
    path: string;
    created_at: Date;
    updated_at: Date;
  };

  suppliers: {
    id: string;
    name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string; // JSON string
    website: string | null;
    tax_id: string | null;
    payment_terms: string | null;
    notes: string | null;
    active: boolean;
    created_at: Date;
    updated_at: Date;
  };

  inventory: {
    id: string;
    product_id: string;
    quantity_on_hand: number;
    quantity_allocated: number;
    quantity_available: number;
    warehouse_location: string;
    last_movement_at: Date | null;
    created_at: Date;
    updated_at: Date;
  };

  orders: {
    id: string;
    order_number: string;
    status: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    shipping_address: string; // JSON string
    billing_address: string; // JSON string
    subtotal: number;
    tax_amount: number;
    shipping_amount: number;
    total_amount: number;
    notes: string | null;
    tracking_number: string | null;
    shipping_carrier: string | null;
    shipped_at: Date | null;
    delivered_at: Date | null;
    created_by: string;
    created_at: Date;
    updated_at: Date;
  };

  order_items: {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    quantity_shipped: number;
    created_at: Date;
    updated_at: Date;
  };

  stock_movements: {
    id: string;
    product_id: string;
    movement_type: string;
    quantity: number;
    previous_quantity: number;
    new_quantity: number;
    reason: string | null;
    reference_id: string | null;
    warehouse_location: string;
    created_by: string | null;
    created_at: Date;
  };

  user_activities: {
    id: string;
    user_id: string | null;
    action: string;
    resource_type: string;
    resource_id: string;
    details: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
  };
}

/**
 * Database Connection Manager
 * Manages database connections and provides query builder access
 */
export class DatabaseLayer {
  private static instance: DatabaseLayer;
  private _queryBuilder: Kysely<DatabaseSchema>;
  private logger = Logger.getInstance();

  private constructor() {
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ecommerce_inventory',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    });

    this._queryBuilder = new Kysely<DatabaseSchema>({
      dialect: new PostgresDialect({
        pool,
      }),
    });

    this.logger.info('Database connection initialized');
  }

  public static getInstance(): DatabaseLayer {
    if (!DatabaseLayer.instance) {
      DatabaseLayer.instance = new DatabaseLayer();
    }
    return DatabaseLayer.instance;
  }

  public get queryBuilder(): Kysely<DatabaseSchema> {
    return this._queryBuilder;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this._queryBuilder.selectFrom('users').select('id').limit(1).execute();
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this._queryBuilder.destroy();
    this.logger.info('Database connection closed');
  }
}