/**
 * Database health indicator - converted from DatabaseHealthIndicator.java
 * Monitors PostgreSQL database connectivity, connection pool, and basic business metrics
 */

import { Pool, PoolClient } from 'pg';
import { HealthIndicator, HealthStatus, DatabaseHealthDetails } from './types';
import { logger } from '../logging/Logger';

export class DatabaseHealthIndicator implements HealthIndicator {
  public readonly name = 'database';

  constructor(private pool: Pool) {}

  async check(): Promise<HealthStatus> {
    const timestamp = new Date();
    const details: DatabaseHealthDetails = {};

    try {
      return await this.checkDatabaseHealth(details, timestamp);
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'DOWN',
        timestamp,
        details,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkDatabaseHealth(
    details: DatabaseHealthDetails,
    timestamp: Date
  ): Promise<HealthStatus> {
    let client: PoolClient | null = null;

    try {
      // Get connection from pool
      client = await this.pool.connect();

      // Test basic connectivity
      const isValid = await this.testConnection(client);
      if (!isValid) {
        return {
          status: 'DOWN',
          timestamp,
          details: { ...details, status: 'Connection invalid' },
        };
      }

      // Get database information
      await this.getDatabaseInfo(client, details);

      // Get connection pool metrics
      this.getPoolMetrics(details);

      // Get business metrics
      await this.getBusinessMetrics(client, details);

      return {
        status: 'UP',
        timestamp,
        details: { ...details, status: 'Connected and operational' },
      };
    } catch (error) {
      const pgError = error as any;
      return {
        status: 'DOWN',
        timestamp,
        details,
        error: `Database error: ${pgError.message} (Code: ${pgError.code})`,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private async testConnection(client: PoolClient): Promise<boolean> {
    try {
      const result = await client.query('SELECT 1');
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  private async getDatabaseInfo(
    client: PoolClient,
    details: DatabaseHealthDetails
  ): Promise<void> {
    try {
      const result = await client.query(`
        SELECT 
          version() as version,
          current_database() as database_name,
          current_user as current_user
      `);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        details.version = row.version;
        details.name = row.database_name;
        details.user = row.current_user;
      }
    } catch (error) {
      logger.warn('Failed to get database info:', error);
    }
  }

  private getPoolMetrics(details: DatabaseHealthDetails): void {
    try {
      // Get pool statistics
      const poolStats = {
        active_connections: this.pool.totalCount - this.pool.idleCount,
        idle_connections: this.pool.idleCount,
        total_connections: this.pool.totalCount,
        max_pool_size: this.pool.options.max || 10,
        min_idle: this.pool.options.min || 0,
      };

      details.pool = poolStats;
    } catch (error) {
      logger.warn('Failed to get pool metrics:', error);
    }
  }

  private async getBusinessMetrics(
    client: PoolClient,
    details: DatabaseHealthDetails
  ): Promise<void> {
    try {
      const result = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM products WHERE active = true) as active_products,
          (SELECT COUNT(*) FROM orders WHERE status = 'PENDING') as pending_orders,
          (SELECT COUNT(*) FROM inventory WHERE quantity_on_hand < reorder_level) as low_stock_items
      `);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        details.business = {
          active_products: parseInt(row.active_products) || 0,
          pending_orders: parseInt(row.pending_orders) || 0,
          low_stock_items: parseInt(row.low_stock_items) || 0,
        };
      }
    } catch (error) {
      logger.warn('Failed to get business metrics:', error);
      // Don't fail the health check if business metrics fail
    }
  }
}