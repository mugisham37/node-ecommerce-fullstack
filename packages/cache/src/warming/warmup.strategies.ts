import { CacheProvider } from '../types';
import { WarmupStrategy } from './cache.warmer';

/**
 * Collection of predefined warmup strategies for e-commerce inventory system
 */
export class WarmupStrategies {
  
  /**
   * Warm up product categories
   */
  static createCategoriesWarmup(
    dataLoader: () => Promise<Array<{ id: string; data: any }>>,
    ttl: number = 4 * 60 * 60 * 1000 // 4 hours
  ): WarmupStrategy {
    return {
      name: 'categories',
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const categories = await dataLoader();
        
        const promises = categories.map(({ id, data }) =>
          cacheProvider.set(`inventory:categories:${id}`, data, ttl)
        );

        await Promise.all(promises);
        console.log(`Warmed up ${categories.length} categories`);
      }
    };
  }

  /**
   * Warm up popular products
   */
  static createPopularProductsWarmup(
    dataLoader: () => Promise<Array<{ id: string; data: any }>>,
    ttl: number = 2 * 60 * 60 * 1000 // 2 hours
  ): WarmupStrategy {
    return {
      name: 'popular-products',
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const products = await dataLoader();
        
        const promises = products.map(({ id, data }) =>
          cacheProvider.set(`inventory:products:${id}`, data, ttl)
        );

        await Promise.all(promises);
        console.log(`Warmed up ${products.length} popular products`);
      }
    };
  }

  /**
   * Warm up suppliers
   */
  static createSuppliersWarmup(
    dataLoader: () => Promise<Array<{ id: string; data: any }>>,
    ttl: number = 6 * 60 * 60 * 1000 // 6 hours
  ): WarmupStrategy {
    return {
      name: 'suppliers',
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const suppliers = await dataLoader();
        
        const promises = suppliers.map(({ id, data }) =>
          cacheProvider.set(`inventory:suppliers:${id}`, data, ttl)
        );

        await Promise.all(promises);
        console.log(`Warmed up ${suppliers.length} suppliers`);
      }
    };
  }

  /**
   * Warm up inventory levels for critical products
   */
  static createCriticalInventoryWarmup(
    dataLoader: () => Promise<Array<{ productId: string; inventory: any }>>,
    ttl: number = 30 * 60 * 1000 // 30 minutes
  ): WarmupStrategy {
    return {
      name: 'critical-inventory',
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const inventoryItems = await dataLoader();
        
        const promises = inventoryItems.map(({ productId, inventory }) =>
          cacheProvider.set(`inventory:inventory:${productId}`, inventory, ttl)
        );

        await Promise.all(promises);
        console.log(`Warmed up ${inventoryItems.length} critical inventory items`);
      }
    };
  }

  /**
   * Warm up user sessions for active users
   */
  static createActiveUsersWarmup(
    dataLoader: () => Promise<Array<{ userId: string; session: any }>>,
    ttl: number = 60 * 60 * 1000 // 1 hour
  ): WarmupStrategy {
    return {
      name: 'active-users',
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const users = await dataLoader();
        
        const promises = users.map(({ userId, session }) =>
          cacheProvider.set(`inventory:users:${userId}`, session, ttl)
        );

        await Promise.all(promises);
        console.log(`Warmed up ${users.length} active user sessions`);
      }
    };
  }

  /**
   * Warm up search results for common queries
   */
  static createSearchResultsWarmup(
    dataLoader: () => Promise<Array<{ query: string; results: any }>>,
    ttl: number = 15 * 60 * 1000 // 15 minutes
  ): WarmupStrategy {
    return {
      name: 'search-results',
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const searches = await dataLoader();
        
        const promises = searches.map(({ query, results }) => {
          const searchKey = `inventory:search:${Buffer.from(query).toString('base64')}`;
          return cacheProvider.set(searchKey, results, ttl);
        });

        await Promise.all(promises);
        console.log(`Warmed up ${searches.length} search results`);
      }
    };
  }

  /**
   * Warm up configuration and settings
   */
  static createConfigWarmup(
    dataLoader: () => Promise<Array<{ key: string; value: any }>>,
    ttl: number = 12 * 60 * 60 * 1000 // 12 hours
  ): WarmupStrategy {
    return {
      name: 'config',
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const configs = await dataLoader();
        
        const promises = configs.map(({ key, value }) =>
          cacheProvider.set(`inventory:config:${key}`, value, ttl)
        );

        await Promise.all(promises);
        console.log(`Warmed up ${configs.length} configuration items`);
      }
    };
  }

  /**
   * Warm up recent orders
   */
  static createRecentOrdersWarmup(
    dataLoader: () => Promise<Array<{ orderId: string; order: any }>>,
    ttl: number = 60 * 60 * 1000 // 1 hour
  ): WarmupStrategy {
    return {
      name: 'recent-orders',
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const orders = await dataLoader();
        
        const promises = orders.map(({ orderId, order }) =>
          cacheProvider.set(`inventory:orders:${orderId}`, order, ttl)
        );

        await Promise.all(promises);
        console.log(`Warmed up ${orders.length} recent orders`);
      }
    };
  }

  /**
   * Warm up analytics reports
   */
  static createAnalyticsWarmup(
    dataLoader: () => Promise<Array<{ reportId: string; data: any }>>,
    ttl: number = 4 * 60 * 60 * 1000 // 4 hours
  ): WarmupStrategy {
    return {
      name: 'analytics',
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const reports = await dataLoader();
        
        const promises = reports.map(({ reportId, data }) =>
          cacheProvider.set(`inventory:reports:${reportId}`, data, ttl)
        );

        await Promise.all(promises);
        console.log(`Warmed up ${reports.length} analytics reports`);
      }
    };
  }

  /**
   * Create a composite warmup strategy that runs multiple strategies
   */
  static createCompositeWarmup(
    strategies: WarmupStrategy[],
    options: {
      parallel?: boolean;
      continueOnError?: boolean;
    } = {}
  ): WarmupStrategy {
    return {
      name: 'composite',
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const { parallel = false, continueOnError = true } = options;

        if (parallel) {
          const promises = strategies.map(async (strategy) => {
            try {
              await strategy.execute(cacheProvider);
            } catch (error) {
              console.error(`Strategy ${strategy.name} failed:`, error);
              if (!continueOnError) {
                throw error;
              }
            }
          });

          await Promise.allSettled(promises);
        } else {
          for (const strategy of strategies) {
            try {
              await strategy.execute(cacheProvider);
            } catch (error) {
              console.error(`Strategy ${strategy.name} failed:`, error);
              if (!continueOnError) {
                throw error;
              }
            }
          }
        }

        console.log(`Composite warmup completed with ${strategies.length} strategies`);
      }
    };
  }

  /**
   * Create a conditional warmup strategy
   */
  static createConditionalWarmup(
    strategy: WarmupStrategy,
    condition: () => Promise<boolean> | boolean
  ): WarmupStrategy {
    return {
      name: `conditional-${strategy.name}`,
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const shouldExecute = await condition();
        
        if (shouldExecute) {
          await strategy.execute(cacheProvider);
        } else {
          console.log(`Skipping warmup strategy ${strategy.name} due to condition`);
        }
      }
    };
  }

  /**
   * Create a time-based warmup strategy
   */
  static createTimeBasedWarmup(
    strategy: WarmupStrategy,
    timeRanges: Array<{ start: string; end: string }> // HH:MM format
  ): WarmupStrategy {
    return {
      name: `time-based-${strategy.name}`,
      async execute(cacheProvider: CacheProvider): Promise<void> {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const isInTimeRange = timeRanges.some(range => {
          return currentTime >= range.start && currentTime <= range.end;
        });

        if (isInTimeRange) {
          await strategy.execute(cacheProvider);
        } else {
          console.log(`Skipping warmup strategy ${strategy.name} - outside time range`);
        }
      }
    };
  }
}