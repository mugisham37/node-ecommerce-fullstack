import { DatabaseConnection } from '../connection';
import { EventEmitter } from 'events';

/**
 * Database performance metrics
 */
export interface DatabaseMetrics {
  connections: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  };
  queries: {
    total: number;
    successful: number;
    failed: number;
    averageExecutionTime: number;
    slowQueries: number;
  };
  transactions: {
    total: number;
    committed: number;
    rolledBack: number;
    averageExecutionTime: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictions: number;
  };
  locks: {
    acquired: number;
    waiting: number;
    deadlocks: number;
  };
}

/**
 * Query performance information
 */
export interface QueryPerformance {
  sql: string;
  parameters?: any[];
  executionTime: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  rowsAffected?: number;
}

/**
 * Database performance monitor
 */
export class DatabaseMonitor extends EventEmitter {
  private db: DatabaseConnection;
  private metrics: DatabaseMetrics;
  private queryHistory: QueryPerformance[] = [];
  private slowQueryThreshold: number;
  private maxHistorySize: number;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    db: DatabaseConnection,
    options: {
      slowQueryThreshold?: number;
      maxHistorySize?: number;
      monitoringIntervalMs?: number;
    } = {}
  ) {
    super();
    
    this.db = db;
    this.slowQueryThreshold = options.slowQueryThreshold || 1000;
    this.maxHistorySize = options.maxHistorySize || 1000;
    
    this.metrics = {
      connections: { total: 0, active: 0, idle: 0, waiting: 0 },
      queries: { total: 0, successful: 0, failed: 0, averageExecutionTime: 0, slowQueries: 0 },
      transactions: { total: 0, committed: 0, rolledBack: 0, averageExecutionTime: 0 },
      cache: { hitRate: 0, missRate: 0, evictions: 0 },
      locks: { acquired: 0, waiting: 0, deadlocks: 0 },
    };

    if (options.monitoringIntervalMs) {
      this.startMonitoring(options.monitoringIntervalMs);
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        this.emit('metrics', this.metrics);
      } catch (error) {
        this.emit('error', error);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Record query performance
   */
  recordQuery(performance: QueryPerformance): void {
    // Add to history
    this.queryHistory.push(performance);
    
    // Maintain history size limit
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory.shift();
    }

    // Update metrics
    this.metrics.queries.total++;
    
    if (performance.success) {
      this.metrics.queries.successful++;
    } else {
      this.metrics.queries.failed++;
    }

    if (performance.executionTime > this.slowQueryThreshold) {
      this.metrics.queries.slowQueries++;
      this.emit('slowQuery', performance);
    }

    // Update average execution time
    const totalTime = this.queryHistory.reduce((sum, q) => sum + q.executionTime, 0);
    this.metrics.queries.averageExecutionTime = totalTime / this.queryHistory.length;

    this.emit('query', performance);
  }

  /**
   * Record transaction performance
   */
  recordTransaction(
    executionTime: number,
    success: boolean,
    type: 'commit' | 'rollback' = 'commit'
  ): void {
    this.metrics.transactions.total++;
    
    if (success && type === 'commit') {
      this.metrics.transactions.committed++;
    } else {
      this.metrics.transactions.rolledBack++;
    }

    // Update average transaction time (simplified)
    this.metrics.transactions.averageExecutionTime = 
      (this.metrics.transactions.averageExecutionTime + executionTime) / 2;

    this.emit('transaction', { executionTime, success, type });
  }

  /**
   * Collect current database metrics
   */
  async collectMetrics(): Promise<DatabaseMetrics> {
    try {
      // Get connection pool stats
      const pool = this.db.pgPool;
      this.metrics.connections = {
        total: pool.totalCount,
        active: pool.totalCount - pool.idleCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      };

      // Get database statistics
      const dbStats = await this.getDatabaseStats();
      
      // Update cache metrics (if available)
      // This would typically come from Redis or application cache
      
      return this.metrics;
    } catch (error) {
      this.emit('error', error);
      return this.metrics;
    }
  }

  /**
   * Get database statistics from PostgreSQL
   */
  private async getDatabaseStats(): Promise<any> {
    try {
      const client = await this.db.pgPool.connect();
      
      // Get database activity stats
      const [activityStats] = await client.query(`
        SELECT 
          numbackends as active_connections,
          xact_commit as transactions_committed,
          xact_rollback as transactions_rolled_back,
          blks_read as blocks_read,
          blks_hit as blocks_hit,
          tup_returned as tuples_returned,
          tup_fetched as tuples_fetched,
          tup_inserted as tuples_inserted,
          tup_updated as tuples_updated,
          tup_deleted as tuples_deleted
        FROM pg_stat_database 
        WHERE datname = current_database()
      `);

      // Get lock statistics
      const [lockStats] = await client.query(`
        SELECT 
          COUNT(*) as total_locks,
          COUNT(*) FILTER (WHERE granted = true) as granted_locks,
          COUNT(*) FILTER (WHERE granted = false) as waiting_locks
        FROM pg_locks
      `);

      // Get slow queries (if pg_stat_statements is available)
      let slowQueries = [];
      try {
        const slowQueryResult = await client.query(`
          SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows
          FROM pg_stat_statements 
          WHERE mean_time > $1
          ORDER BY mean_time DESC 
          LIMIT 10
        `, [this.slowQueryThreshold]);
        
        slowQueries = slowQueryResult.rows;
      } catch (error) {
        // pg_stat_statements not available
      }

      client.release();

      return {
        activity: activityStats.rows[0],
        locks: lockStats.rows[0],
        slowQueries,
      };
    } catch (error) {
      console.error('Failed to collect database stats:', error);
      return {};
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  /**
   * Get query history
   */
  getQueryHistory(limit?: number): QueryPerformance[] {
    if (limit) {
      return this.queryHistory.slice(-limit);
    }
    return [...this.queryHistory];
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit?: number): QueryPerformance[] {
    const slowQueries = this.queryHistory.filter(
      q => q.executionTime > this.slowQueryThreshold
    );
    
    if (limit) {
      return slowQueries.slice(-limit);
    }
    
    return slowQueries;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalQueries: number;
    successRate: number;
    averageQueryTime: number;
    slowQueryCount: number;
    connectionUtilization: number;
  } {
    const { queries, connections } = this.metrics;
    
    return {
      totalQueries: queries.total,
      successRate: queries.total > 0 ? (queries.successful / queries.total) * 100 : 0,
      averageQueryTime: queries.averageExecutionTime,
      slowQueryCount: queries.slowQueries,
      connectionUtilization: connections.total > 0 ? 
        ((connections.active + connections.waiting) / connections.total) * 100 : 0,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      connections: { total: 0, active: 0, idle: 0, waiting: 0 },
      queries: { total: 0, successful: 0, failed: 0, averageExecutionTime: 0, slowQueries: 0 },
      transactions: { total: 0, committed: 0, rolledBack: 0, averageExecutionTime: 0 },
      cache: { hitRate: 0, missRate: 0, evictions: 0 },
      locks: { acquired: 0, waiting: 0, deadlocks: 0 },
    };
    
    this.queryHistory = [];
    this.emit('metricsReset');
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
      recentQueries: this.getQueryHistory(10),
      slowQueries: this.getSlowQueries(5),
    }, null, 2);
  }
}

/**
 * Query interceptor for automatic performance monitoring
 */
export class QueryInterceptor {
  private monitor: DatabaseMonitor;

  constructor(monitor: DatabaseMonitor) {
    this.monitor = monitor;
  }

  /**
   * Wrap a query execution with monitoring
   */
  async interceptQuery<T>(
    sql: string,
    parameters: any[] | undefined,
    executor: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    try {
      const result = await executor();
      const executionTime = Date.now() - startTime;
      
      this.monitor.recordQuery({
        sql,
        parameters,
        executionTime,
        timestamp,
        success: true,
        rowsAffected: Array.isArray(result) ? result.length : undefined,
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.monitor.recordQuery({
        sql,
        parameters,
        executionTime,
        timestamp,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
}

/**
 * Create database monitor instance
 */
export function createDatabaseMonitor(
  db: DatabaseConnection,
  options?: Parameters<typeof DatabaseMonitor.prototype.constructor>[1]
): DatabaseMonitor {
  return new DatabaseMonitor(db, options);
}

/**
 * Create query interceptor instance
 */
export function createQueryInterceptor(monitor: DatabaseMonitor): QueryInterceptor {
  return new QueryInterceptor(monitor);
}

// Export types
export type { DatabaseMetrics, QueryPerformance };