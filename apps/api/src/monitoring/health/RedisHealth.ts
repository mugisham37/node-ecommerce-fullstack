/**
 * Redis health indicator - converted from RedisHealthIndicator.java
 * Monitors Redis connectivity, performance metrics, and cache operations
 */

import { Redis } from 'ioredis';
import { HealthIndicator, HealthStatus, RedisHealthDetails } from './types';
import { logger } from '../logging/Logger';

export class RedisHealthIndicator implements HealthIndicator {
  public readonly name = 'redis';

  constructor(private redis: Redis) {}

  async check(): Promise<HealthStatus> {
    const timestamp = new Date();
    const details: RedisHealthDetails = {};

    try {
      return await this.checkRedisHealth(details, timestamp);
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'DOWN',
        timestamp,
        details,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedisHealth(
    details: RedisHealthDetails,
    timestamp: Date
  ): Promise<HealthStatus> {
    try {
      // Test basic connectivity with ping
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        return {
          status: 'DOWN',
          timestamp,
          details: { ...details, status: 'Ping failed', response: pong },
        };
      }

      // Get Redis server info
      await this.getRedisInfo(details);

      // Test cache operations
      await this.testCacheOperations(details);

      return {
        status: 'UP',
        timestamp,
        details: { ...details, status: 'Connected and operational' },
      };
    } catch (error) {
      return {
        status: 'DOWN',
        timestamp,
        details,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getRedisInfo(details: RedisHealthDetails): Promise<void> {
    try {
      const info = await this.redis.info();
      const infoLines = info.split('\r\n');
      const infoMap: Record<string, string> = {};

      // Parse info response
      infoLines.forEach((line) => {
        if (line.includes(':') && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          infoMap[key] = value;
        }
      });

      // Extract relevant metrics
      details.version = infoMap.redis_version;
      details.mode = infoMap.redis_mode;
      details.os = infoMap.os;
      details.uptime_in_seconds = infoMap.uptime_in_seconds;
      details.connected_clients = infoMap.connected_clients;
      details.used_memory_human = infoMap.used_memory_human;
      details.used_memory_peak_human = infoMap.used_memory_peak_human;
      details.total_commands_processed = infoMap.total_commands_processed;
      details.keyspace_hits = infoMap.keyspace_hits;
      details.keyspace_misses = infoMap.keyspace_misses;

      // Calculate hit ratio
      const hits = parseInt(infoMap.keyspace_hits || '0');
      const misses = parseInt(infoMap.keyspace_misses || '0');
      const total = hits + misses;
      
      if (total > 0) {
        const hitRatio = (hits / total) * 100;
        details.hit_ratio_percent = hitRatio.toFixed(2);
      }
    } catch (error) {
      logger.warn('Failed to get Redis info:', error);
    }
  }

  private async testCacheOperations(details: RedisHealthDetails): Promise<void> {
    const testKey = `health_check_${Date.now()}`;
    const testValue = 'test_value';

    try {
      // Test set operation
      const setStart = Date.now();
      await this.redis.set(testKey, testValue);
      const setTime = Date.now() - setStart;

      // Test get operation
      const getStart = Date.now();
      const retrievedValue = await this.redis.get(testKey);
      const getTime = Date.now() - getStart;

      // Test delete operation
      const deleteStart = Date.now();
      await this.redis.del(testKey);
      const deleteTime = Date.now() - deleteStart;

      if (retrievedValue === testValue) {
        details.cache = {
          set_operation_ms: setTime,
          get_operation_ms: getTime,
          delete_operation_ms: deleteTime,
          operations_status: 'All operations successful',
        };
      } else {
        throw new Error('Value mismatch in cache operations');
      }
    } catch (error) {
      // Clean up test key if it exists
      try {
        await this.redis.del(testKey);
      } catch {
        // Ignore cleanup errors
      }
      
      throw new Error(`Cache operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}