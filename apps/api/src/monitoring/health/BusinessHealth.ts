/**
 * Business metrics health indicator - converted from BusinessMetricsHealthIndicator.java
 * Monitors business-specific metrics and system performance indicators
 */

import { HealthIndicator, HealthStatus, BusinessHealthDetails } from './types';
import { logger } from '../logging/Logger';

// Service interfaces (these would be imported from actual service implementations)
interface InventoryService {
  findLowStockProducts(): Promise<any[]>;
}

interface OrderService {
  findPendingOrders(): Promise<any[]>;
  findOldPendingOrders(hoursOld: number): Promise<any[]>;
}

interface ProductService {
  findActiveProducts(): Promise<any[]>;
}

interface CacheService {
  getCacheStatistics(): Promise<{
    hitRatio: number;
    missRatio: number;
    evictionCount: number;
  }>;
}

export class BusinessHealthIndicator implements HealthIndicator {
  public readonly name = 'business-metrics';

  constructor(
    private inventoryService: InventoryService,
    private orderService: OrderService,
    private productService: ProductService,
    private cacheService: CacheService
  ) {}

  async check(): Promise<HealthStatus> {
    const timestamp = new Date();
    const details: BusinessHealthDetails = {};

    try {
      return await this.checkBusinessMetrics(details, timestamp);
    } catch (error) {
      logger.error('Business metrics health check failed:', error);
      return {
        status: 'DOWN',
        timestamp,
        details,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkBusinessMetrics(
    details: BusinessHealthDetails,
    timestamp: Date
  ): Promise<HealthStatus> {
    try {
      // Get inventory metrics
      await this.getInventoryMetrics(details);

      // Get order processing metrics
      await this.getOrderMetrics(details);

      // Get cache performance metrics
      await this.getCacheMetrics(details);

      // Get system performance indicators
      this.getSystemMetrics(details);

      // Assess overall health
      const overallStatus = this.assessOverallHealth(details);
      details.overall_status = overallStatus;

      // Determine health status based on assessment
      if (overallStatus.includes('CRITICAL')) {
        return {
          status: 'DOWN',
          timestamp,
          details,
        };
      } else if (overallStatus.includes('WARNING')) {
        return {
          status: 'WARNING',
          timestamp,
          details,
        };
      } else {
        return {
          status: 'UP',
          timestamp,
          details,
        };
      }
    } catch (error) {
      return {
        status: 'DOWN',
        timestamp,
        details,
        error: `Failed to collect business metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async getInventoryMetrics(details: BusinessHealthDetails): Promise<void> {
    try {
      const lowStockProducts = await this.inventoryService.findLowStockProducts();
      const activeProducts = await this.productService.findActiveProducts();

      const lowStockCount = lowStockProducts.length;
      const activeProductsCount = activeProducts.length;

      let status = 'HEALTHY';
      let lowStockPercentage = '0.00';

      if (activeProductsCount > 0) {
        const percentage = (lowStockCount / activeProductsCount) * 100;
        lowStockPercentage = percentage.toFixed(2);

        if (percentage > 20) {
          status = 'CRITICAL - High low stock percentage';
        } else if (percentage > 10) {
          status = 'WARNING - Moderate low stock percentage';
        }
      }

      details.inventory = {
        low_stock_count: lowStockCount,
        active_products: activeProductsCount,
        low_stock_percentage: lowStockPercentage,
        status,
      };
    } catch (error) {
      logger.warn('Failed to get inventory metrics:', error);
      details.inventory = {
        low_stock_count: 0,
        active_products: 0,
        low_stock_percentage: '0.00',
        status: 'ERROR - Failed to collect metrics',
      };
    }
  }

  private async getOrderMetrics(details: BusinessHealthDetails): Promise<void> {
    try {
      const pendingOrders = await this.orderService.findPendingOrders();
      const oldPendingOrders = await this.orderService.findOldPendingOrders(24);

      let status = 'HEALTHY';
      if (oldPendingOrders.length > 0) {
        status = 'WARNING - Old pending orders detected';
      }

      details.orders = {
        pending_count: pendingOrders.length,
        old_pending_count: oldPendingOrders.length,
        status,
      };
    } catch (error) {
      logger.warn('Failed to get order metrics:', error);
      details.orders = {
        pending_count: 0,
        old_pending_count: 0,
        status: 'ERROR - Failed to collect metrics',
      };
    }
  }

  private async getCacheMetrics(details: BusinessHealthDetails): Promise<void> {
    try {
      const cacheStats = await this.cacheService.getCacheStatistics();

      let status = 'HEALTHY';
      if (cacheStats.hitRatio < 0.7) {
        status = 'WARNING - Low cache hit ratio';
      }

      details.cache = {
        hit_ratio: cacheStats.hitRatio,
        miss_ratio: cacheStats.missRatio,
        eviction_count: cacheStats.evictionCount,
        status,
      };
    } catch (error) {
      logger.warn('Failed to get cache metrics:', error);
      details.cache = {
        hit_ratio: 0,
        miss_ratio: 0,
        eviction_count: 0,
        status: 'ERROR - Failed to collect metrics',
      };
    }
  }

  private getSystemMetrics(details: BusinessHealthDetails): void {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const memoryUsagePercentage = (usedMemory / totalMemory) * 100;

      let memoryStatus = 'HEALTHY';
      if (memoryUsagePercentage > 90) {
        memoryStatus = 'CRITICAL - High memory usage';
      } else if (memoryUsagePercentage > 80) {
        memoryStatus = 'WARNING - Moderate memory usage';
      }

      details.system = {
        memory_usage_percentage: memoryUsagePercentage.toFixed(2),
        memory_status: memoryStatus,
      };
    } catch (error) {
      logger.warn('Failed to get system metrics:', error);
      details.system = {
        memory_usage_percentage: '0.00',
        memory_status: 'ERROR - Failed to collect metrics',
      };
    }
  }

  private assessOverallHealth(details: BusinessHealthDetails): string {
    const statuses = [
      details.inventory?.status || '',
      details.orders?.status || '',
      details.cache?.status || '',
      details.system?.memory_status || '',
    ];

    const hasCritical = statuses.some((status) => status.includes('CRITICAL'));
    const hasWarning = statuses.some((status) => status.includes('WARNING'));

    if (hasCritical) {
      return 'CRITICAL - Immediate attention required';
    } else if (hasWarning) {
      return 'WARNING - Monitoring recommended';
    } else {
      return 'HEALTHY - All systems operational';
    }
  }
}