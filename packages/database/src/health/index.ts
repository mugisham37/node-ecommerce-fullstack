import { DatabaseConnection } from '../connection';
import { DatabaseHealthChecker, HealthCheckResult } from '../connection/health';

// Re-export existing health checker
export { DatabaseHealthChecker, HealthCheckResult } from '../connection/health';

/**
 * Extended health check result with additional details
 */
export interface ExtendedHealthCheckResult extends HealthCheckResult {
  checks: {
    connectivity: HealthCheckResult;
    performance: HealthCheckResult;
    resources: HealthCheckResult;
    replication?: HealthCheckResult;
  };
  recommendations?: string[];
}

/**
 * Database health check thresholds
 */
export interface HealthCheckThresholds {
  maxResponseTime: number;
  maxConnectionUtilization: number;
  maxCpuUsage: number;
  maxMemoryUsage: number;
  minDiskSpace: number;
  maxReplicationLag?: number;
}

/**
 * Comprehensive database health monitor
 */
export class DatabaseHealthMonitor {
  private db: DatabaseConnection;
  private healthChecker: DatabaseHealthChecker;
  private thresholds: HealthCheckThresholds;

  constructor(
    db: DatabaseConnection,
    thresholds: Partial<HealthCheckThresholds> = {}
  ) {
    this.db = db;
    this.healthChecker = new DatabaseHealthChecker(db);
    this.thresholds = {
      maxResponseTime: 1000,
      maxConnectionUtilization: 80,
      maxCpuUsage: 80,
      maxMemoryUsage: 80,
      minDiskSpace: 10, // GB
      maxReplicationLag: 5000, // ms
      ...thresholds,
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<ExtendedHealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // Run all health checks in parallel
      const [
        connectivityCheck,
        performanceCheck,
        resourceCheck,
        replicationCheck,
      ] = await Promise.allSettled([
        this.checkConnectivity(),
        this.checkPerformance(),
        this.checkResources(),
        this.checkReplication(),
      ]);

      const checks = {
        connectivity: this.getResultFromSettled(connectivityCheck),
        performance: this.getResultFromSettled(performanceCheck),
        resources: this.getResultFromSettled(resourceCheck),
        replication: this.getResultFromSettled(replicationCheck),
      };

      // Determine overall status
      const overallStatus = this.determineOverallStatus(checks);
      const recommendations = this.generateRecommendations(checks);

      return {
        status: overallStatus,
        timestamp,
        responseTime: Date.now() - startTime,
        checks,
        recommendations,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp,
        responseTime: Date.now() - startTime,
        checks: {
          connectivity: {
            status: 'unhealthy',
            timestamp,
            responseTime: 0,
            details: { error: error instanceof Error ? error.message : String(error) },
          },
          performance: {
            status: 'unhealthy',
            timestamp,
            responseTime: 0,
          },
          resources: {
            status: 'unhealthy',
            timestamp,
            responseTime: 0,
          },
        },
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkConnectivity(): Promise<HealthCheckResult> {
    return await this.healthChecker.check();
  }

  /**
   * Check database performance
   */
  private async checkPerformance(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      const client = await this.db.pgPool.connect();

      // Test query performance
      const queryStart = Date.now();
      await client.query('SELECT COUNT(*) FROM pg_stat_activity');
      const queryTime = Date.now() - queryStart;

      // Get active connections
      const [{ count: activeConnections }] = await client.query(
        'SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = $1',
        ['active']
      );

      // Get long-running queries
      const longRunningQueries = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < NOW() - INTERVAL '5 minutes'
        AND query NOT LIKE '%pg_stat_activity%'
      `);

      client.release();

      const responseTime = Date.now() - startTime;
      const isHealthy = queryTime < this.thresholds.maxResponseTime;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp,
        responseTime,
        details: {
          queryResponseTime: queryTime,
          activeConnections: Number(activeConnections),
          longRunningQueries: Number(longRunningQueries.rows[0].count),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp,
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check database resources
   */
  private async checkResources(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      const client = await this.db.pgPool.connect();

      // Get database size
      const [{ size: dbSize }] = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);

      // Get connection utilization
      const [{ max_connections, current_connections }] = await client.query(`
        SELECT 
          setting::int as max_connections,
          (SELECT COUNT(*) FROM pg_stat_activity) as current_connections
        FROM pg_settings 
        WHERE name = 'max_connections'
      `);

      const connectionUtilization = (current_connections / max_connections) * 100;

      // Get table statistics
      const tableStats = await client.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 5
      `);

      client.release();

      const isHealthy = connectionUtilization < this.thresholds.maxConnectionUtilization;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp,
        responseTime: Date.now() - startTime,
        details: {
          databaseSize: dbSize,
          connectionUtilization: Math.round(connectionUtilization),
          maxConnections: max_connections,
          currentConnections: current_connections,
          topTables: tableStats.rows,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp,
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check replication status (if applicable)
   */
  private async checkReplication(): Promise<HealthCheckResult | undefined> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      const client = await this.db.pgPool.connect();

      // Check if this is a primary server
      const [{ is_primary }] = await client.query(
        'SELECT NOT pg_is_in_recovery() as is_primary'
      );

      if (!is_primary) {
        // This is a replica, check replication lag
        const [replicationInfo] = await client.query(`
          SELECT 
            EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000 as lag_ms,
            pg_last_xact_replay_timestamp() as last_replay
        `);

        const lagMs = Number(replicationInfo.rows[0]?.lag_ms || 0);
        const isHealthy = lagMs < (this.thresholds.maxReplicationLag || 5000);

        client.release();

        return {
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp,
          responseTime: Date.now() - startTime,
          details: {
            role: 'replica',
            replicationLag: lagMs,
            lastReplay: replicationInfo.rows[0]?.last_replay,
          },
        };
      } else {
        // This is a primary, check connected replicas
        const replicas = await client.query(`
          SELECT 
            client_addr,
            state,
            sync_state,
            replay_lag,
            write_lag,
            flush_lag
          FROM pg_stat_replication
        `);

        client.release();

        return {
          status: 'healthy',
          timestamp,
          responseTime: Date.now() - startTime,
          details: {
            role: 'primary',
            connectedReplicas: replicas.rows.length,
            replicas: replicas.rows,
          },
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp,
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get result from Promise.allSettled
   */
  private getResultFromSettled(
    result: PromiseSettledResult<HealthCheckResult>
  ): HealthCheckResult {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: 0,
        details: {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        },
      };
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(checks: ExtendedHealthCheckResult['checks']): 'healthy' | 'unhealthy' {
    const criticalChecks = [checks.connectivity, checks.performance];
    const hasCriticalFailure = criticalChecks.some(check => check.status === 'unhealthy');
    
    if (hasCriticalFailure) {
      return 'unhealthy';
    }

    const allChecks = Object.values(checks).filter(Boolean);
    const hasAnyFailure = allChecks.some(check => check.status === 'unhealthy');
    
    return hasAnyFailure ? 'unhealthy' : 'healthy';
  }

  /**
   * Generate health recommendations
   */
  private generateRecommendations(checks: ExtendedHealthCheckResult['checks']): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (checks.performance.status === 'unhealthy') {
      const details = checks.performance.details;
      
      if (details?.queryResponseTime > this.thresholds.maxResponseTime) {
        recommendations.push('Query response time is high. Consider optimizing slow queries or adding indexes.');
      }
      
      if (details?.longRunningQueries > 0) {
        recommendations.push('Long-running queries detected. Review and optimize these queries.');
      }
    }

    // Resource recommendations
    if (checks.resources.status === 'unhealthy') {
      const details = checks.resources.details;
      
      if (details?.connectionUtilization > this.thresholds.maxConnectionUtilization) {
        recommendations.push('Connection utilization is high. Consider connection pooling or increasing max_connections.');
      }
    }

    // Replication recommendations
    if (checks.replication?.status === 'unhealthy') {
      const details = checks.replication.details;
      
      if (details?.replicationLag > (this.thresholds.maxReplicationLag || 5000)) {
        recommendations.push('Replication lag is high. Check network connectivity and replica performance.');
      }
    }

    return recommendations;
  }

  /**
   * Get health check thresholds
   */
  getThresholds(): HealthCheckThresholds {
    return { ...this.thresholds };
  }

  /**
   * Update health check thresholds
   */
  updateThresholds(newThresholds: Partial<HealthCheckThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }
}

/**
 * Create database health monitor instance
 */
export function createDatabaseHealthMonitor(
  db: DatabaseConnection,
  thresholds?: Partial<HealthCheckThresholds>
): DatabaseHealthMonitor {
  return new DatabaseHealthMonitor(db, thresholds);
}

// Export types
export type { ExtendedHealthCheckResult, HealthCheckThresholds };