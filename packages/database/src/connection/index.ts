import { drizzle } from 'drizzle-orm/postgres-js';
import { Kysely, PostgresDialect } from 'kysely';
import postgres from 'postgres';
import { Pool } from 'pg';
import * as schema from '../schema';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private drizzleDb: ReturnType<typeof drizzle>;
  private kyselyDb: Kysely<any>;
  private pool: Pool;
  private config: DatabaseConfig;

  private constructor(config: DatabaseConfig) {
    this.config = config;
    this.initializeConnections();
  }

  public static getInstance(config?: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new Error('Database configuration is required for first initialization');
      }
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  private initializeConnections(): void {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: this.config.maxConnections || 20,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis || 5000,
      idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
    });

    // Initialize Drizzle ORM
    const postgresClient = postgres({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: this.config.maxConnections || 20,
    });

    this.drizzleDb = drizzle(postgresClient, { schema });

    // Initialize Kysely query builder
    this.kyselyDb = new Kysely({
      dialect: new PostgresDialect({
        pool: this.pool,
      }),
    });
  }

  public get drizzle() {
    return this.drizzleDb;
  }

  public get kysely() {
    return this.kyselyDb;
  }

  public get pgPool() {
    return this.pool;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    await this.kyselyDb.destroy();
  }
}

// Factory function for easy database access
export function createDatabaseConnection(config?: DatabaseConfig) {
  const dbConfig: DatabaseConfig = config || {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ecommerce_inventory',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  };

  return DatabaseConnection.getInstance(dbConfig);
}

export * from './transaction';
export * from './health';