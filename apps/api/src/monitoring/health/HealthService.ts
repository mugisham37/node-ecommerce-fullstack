/**
 * Main health check service that coordinates all health indicators
 * Provides endpoints for health checks and aggregates results
 */

import { HealthIndicator, HealthCheckResult, HealthStatus } from './types';
import { DatabaseHealthIndicator } from './DatabaseHealth';
import { RedisHealthIndicator } from './RedisHealth';
import { BusinessHealthIndicator } from './BusinessHealth';
import { logger } from '../logging/Logger';

export class HealthService {
  private indicators: Map<string, HealthIndicator> = new Map();
  private startTime: Date = new Date();

  constructor() {
    // Health indicators will be registered by the application
  }

  /**
   * Register a health indicator
   */
  registerIndicator(indicator: HealthIndicator): void {
    this.indicators.set(indicator.name, indicator);
    logger.info(`Registered health indicator: ${indicator.name}`);
  }

  /**
   * Perform health check on all registered indicators
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date();
    const checks: Record<string, HealthStatus> = {};
    
    // Run all health checks in parallel
    const healthPromises = Array.from(this.indicators.entries()).map(
      async ([name, indicator]) => {
        try {
          const result = await indicator.check();
          return { name, result };
        } catch (error) {
          logger.error(`Health check failed for ${name}:`, error);
          return {
            name,
            result: {
              status: 'DOWN' as const,
              timestamp,
              details: {},
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      }
    );

    const results = await Promise.all(healthPromises);
    
    // Collect results
    results.forEach(({ name, result }) => {
      checks[name] = result;
    });

    // Determine overall status
    const overallStatus = this.determineOverallStatus(checks);
    
    // Calculate uptime
    const uptime = Math.floor((timestamp.getTime() - this.startTime.getTime()) / 1000);

    return {
      status: overallStatus,
      timestamp,
      checks,
      overall: {
        status: this.getStatusDescription(overallStatus),
        uptime,
        version: process.env.APP_VERSION || '1.0.0',
      },
    };
  }

  /**
   * Check health of a specific indicator
   */
  async checkSpecificHealth(indicatorName: string): Promise<HealthStatus | null> {
    const indicator = this.indicators.get(indicatorName);
    if (!indicator) {
      return null;
    }

    try {
      return await indicator.check();
    } catch (error) {
      logger.error(`Health check failed for ${indicatorName}:`, error);
      return {
        status: 'DOWN',
        timestamp: new Date(),
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get list of registered health indicators
   */
  getRegisteredIndicators(): string[] {
    return Array.from(this.indicators.keys());
  }

  /**
   * Check if service is ready (basic readiness check)
   */
  async isReady(): Promise<boolean> {
    try {
      const healthResult = await this.checkHealth();
      return healthResult.status !== 'DOWN';
    } catch {
      return false;
    }
  }

  /**
   * Check if service is alive (basic liveness check)
   */
  isAlive(): boolean {
    return true; // If this method is called, the service is alive
  }

  private determineOverallStatus(checks: Record<string, HealthStatus>): 'UP' | 'DOWN' | 'WARNING' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('DOWN')) {
      return 'DOWN';
    }
    
    if (statuses.includes('WARNING')) {
      return 'WARNING';
    }
    
    return 'UP';
  }

  private getStatusDescription(status: 'UP' | 'DOWN' | 'WARNING'): string {
    switch (status) {
      case 'UP':
        return 'All systems operational';
      case 'WARNING':
        return 'Some systems require attention';
      case 'DOWN':
        return 'Critical systems are down';
      default:
        return 'Unknown status';
    }
  }
}