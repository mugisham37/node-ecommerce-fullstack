import { DatabaseConnection } from './index';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  responseTime: number;
  details?: {
    connectionPool?: {
      totalConnections: number;
      idleConnections: number;
      waitingClients: number;
    };
    error?: string;
  };
}

export class DatabaseHealthChecker {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // Test basic connectivity
      const client = await this.db.pgPool.connect();
      
      // Test a simple query
      await client.query('SELECT 1 as health_check');
      
      // Get connection pool stats
      const poolStats = {
        totalConnections: this.db.pgPool.totalCount,
        idleConnections: this.db.pgPool.idleCount,
        waitingClients: this.db.pgPool.waitingCount,
      };

      client.release();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        timestamp,
        responseTime,
        details: {
          connectionPool: poolStats,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        timestamp,
        responseTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async checkDetailed(): Promise<HealthCheckResult & { queries?: any[] }> {
    const basicCheck = await this.check();
    
    if (basicCheck.status === 'unhealthy') {
      return basicCheck;
    }

    try {
      // Additional detailed checks
      const queries = await Promise.all([
        this.testTableAccess(),
        this.testIndexPerformance(),
        this.testConnectionLatency(),
      ]);

      return {
        ...basicCheck,
        queries,
      };
    } catch (error) {
      return {
        ...basicCheck,
        status: 'unhealthy',
        details: {
          ...basicCheck.details,
          error: `Detailed check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  private async testTableAccess(): Promise<{ test: string; result: boolean; time: number }> {
    const start = Date.now();
    try {
      const client = await this.db.pgPool.connect();
      await client.query('SELECT COUNT(*) FROM users LIMIT 1');
      client.release();
      return { test: 'table_access', result: true, time: Date.now() - start };
    } catch (error) {
      return { test: 'table_access', result: false, time: Date.now() - start };
    }
  }

  private async testIndexPerformance(): Promise<{ test: string; result: boolean; time: number }> {
    const start = Date.now();
    try {
      const client = await this.db.pgPool.connect();
      await client.query('SELECT * FROM users WHERE email = $1 LIMIT 1', ['test@example.com']);
      client.release();
      return { test: 'index_performance', result: true, time: Date.now() - start };
    } catch (error) {
      return { test: 'index_performance', result: false, time: Date.now() - start };
    }
  }

  private async testConnectionLatency(): Promise<{ test: string; result: boolean; time: number }> {
    const start = Date.now();
    try {
      const client = await this.db.pgPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      const time = Date.now() - start;
      return { test: 'connection_latency', result: time < 100, time };
    } catch (error) {
      return { test: 'connection_latency', result: false, time: Date.now() - start };
    }
  }
}

export function createHealthChecker(db: DatabaseConnection): DatabaseHealthChecker {
  return new DatabaseHealthChecker(db);
}