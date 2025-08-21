# @ecommerce/cache

A comprehensive caching layer infrastructure package with Redis support, multiple caching strategies, monitoring, and warming capabilities.

## Features

- **Multiple Cache Providers**: Redis, Memory, Multi-tier caching
- **Caching Strategies**: LRU, TTL, Cache-aside, Write-through, Write-around, Write-back
- **Middleware Support**: Express, Fastify, tRPC integration
- **Monitoring & Metrics**: Real-time performance monitoring and health checks
- **Cache Warming**: Automated cache preloading with configurable strategies
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @ecommerce/cache
```

## Quick Start

### Basic Redis Cache Setup

```typescript
import { RedisProvider, CacheManager, TTLStrategy } from '@ecommerce/cache';

// Create Redis provider
const redisProvider = new RedisProvider();

// Create TTL strategy
const ttlStrategy = TTLStrategy.createEcommerceRules();

// Create cache manager
const cacheManager = new CacheManager({
  providers: {
    primary: redisProvider
  },
  strategies: [ttlStrategy],
  monitoring: {
    enabled: true,
    interval: 60000
  }
});

// Use the cache
await cacheManager.set('product:123', productData, 3600000); // 1 hour TTL
const product = await cacheManager.get('product:123');
```

### Multi-tier Caching

```typescript
import { RedisProvider, MemoryProvider, MultiTierProvider } from '@ecommerce/cache';

const l1Cache = new MemoryProvider({ stdTTL: 300 }); // 5 minutes
const l2Cache = new RedisProvider();

const multiTierProvider = new MultiTierProvider(l1Cache, l2Cache, {
  l1Ttl: 300000, // 5 minutes
  l2Ttl: 3600000, // 1 hour
  writeThrough: true
});
```

## Cache Providers

### Redis Provider

```typescript
import { RedisProvider, RedisConfig } from '@ecommerce/cache';

const redis = RedisConfig.createRedisConnection({
  host: 'localhost',
  port: 6379,
  password: 'your-password'
});

const provider = new RedisProvider(redis, {
  compression: true,
  serialization: { type: 'json' }
});
```

### Memory Provider

```typescript
import { MemoryProvider } from '@ecommerce/cache';

const provider = new MemoryProvider({
  stdTTL: 3600, // 1 hour
  maxKeys: 10000,
  useClones: true
});
```

## Caching Strategies

### TTL Strategy

```typescript
import { TTLStrategy } from '@ecommerce/cache';

const strategy = new TTLStrategy({
  defaultTtl: 3600000,
  adaptiveTtl: true,
  ttlRules: [
    {
      pattern: /^products:/,
      ttl: 2 * 60 * 60 * 1000 // 2 hours
    },
    {
      pattern: /^inventory:/,
      ttl: 30 * 60 * 1000 // 30 minutes
    }
  ]
});
```

### Cache-Aside Strategy

```typescript
import { CacheAsideStrategy } from '@ecommerce/cache';

const strategy = new CacheAsideStrategy({
  defaultTtl: 3600000,
  maxValueSize: 1024 * 1024, // 1MB
  excludePatterns: [/^temp:/, /^session:/]
});

// Use with data loading
const product = await strategy.getWithFallback(
  'product:123',
  cacheProvider,
  () => productService.getById('123')
);
```

## Middleware Integration

### Express Middleware

```typescript
import { CacheMiddleware } from '@ecommerce/cache';

const cacheMiddleware = new CacheMiddleware(cacheProvider, {
  ttl: 300000, // 5 minutes
  keyGenerator: (req) => `api:${req.method}:${req.path}`,
  condition: (req, res) => res.statusCode === 200
});

app.use('/api/products', cacheMiddleware.express());
```

### tRPC Middleware

```typescript
const cachedProcedure = publicProcedure
  .use(cacheMiddleware.trpc({
    ttl: 600000, // 10 minutes
    skipCache: (req) => req.input?.skipCache === true
  }));
```

## Monitoring & Health Checks

### Cache Monitor

```typescript
import { CacheMonitor } from '@ecommerce/cache';

const providers = new Map([
  ['redis', redisProvider],
  ['memory', memoryProvider]
]);

const monitor = new CacheMonitor(providers, {
  collectionInterval: 60000,
  metricsRetention: 24 * 60 * 60 * 1000
});

monitor.start();

// Get metrics
const stats = monitor.getAggregatedStats();
const trends = monitor.getPerformanceTrends('redis');
```

### Health Checks

```typescript
import { CacheHealthCheck } from '@ecommerce/cache';

const healthCheck = new CacheHealthCheck(providers, {
  interval: 30000,
  timeout: 5000,
  thresholds: {
    maxLatency: 1000,
    minHitRate: 0.5,
    maxErrorRate: 0.1
  }
});

healthCheck.start();

// Check health
const health = healthCheck.getHealthSummary();
```

## Cache Warming

### Basic Warming

```typescript
import { CacheWarmer, WarmupStrategies } from '@ecommerce/cache';

const warmer = new CacheWarmer(cacheProvider, {
  enabled: true,
  strategies: ['categories', 'popular-products'],
  schedule: '0 * * * *', // Every hour
  concurrency: 3
});

// Register strategies
warmer.registerStrategy(
  WarmupStrategies.createCategoriesWarmup(
    () => categoryService.getAll(),
    4 * 60 * 60 * 1000 // 4 hours TTL
  )
);

warmer.registerStrategy(
  WarmupStrategies.createPopularProductsWarmup(
    () => productService.getPopular(100),
    2 * 60 * 60 * 1000 // 2 hours TTL
  )
);

warmer.start();
```

### Custom Warming Strategy

```typescript
const customStrategy = {
  name: 'user-preferences',
  async execute(cacheProvider) {
    const users = await userService.getActiveUsers();
    
    const promises = users.map(user =>
      cacheProvider.set(
        `user:${user.id}:preferences`,
        user.preferences,
        60 * 60 * 1000 // 1 hour
      )
    );
    
    await Promise.all(promises);
    console.log(`Warmed up ${users.length} user preferences`);
  }
};

warmer.registerStrategy(customStrategy);
```

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0

# Cache Configuration
CACHE_DEFAULT_TTL=3600000
CACHE_MONITORING_ENABLED=true
REDIS_HEALTH_CHECK_ENABLED=true
REDIS_HEALTH_CHECK_INTERVAL=30000
```

### Redis Configuration

```typescript
import { RedisConfig } from '@ecommerce/cache';

const config = RedisConfig.getCacheManagerConfig();
// Returns pre-configured cache settings for e-commerce use cases
```

## API Reference

### CacheProvider Interface

```typescript
interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<boolean>;
  getStats(): Promise<CacheStats>;
  isHealthy(): Promise<boolean>;
}
```

### CacheStrategy Interface

```typescript
interface CacheStrategy {
  name: string;
  shouldCache(key: string, value: any): boolean;
  getTtl(key: string, value: any): number;
  onHit?(key: string, value: any): void;
  onMiss?(key: string): void;
  onSet?(key: string, value: any): void;
  onDelete?(key: string): void;
}
```

## Best Practices

1. **Use appropriate TTL values** based on data volatility
2. **Implement cache warming** for critical data
3. **Monitor cache performance** regularly
4. **Use multi-tier caching** for high-traffic applications
5. **Handle cache failures gracefully** with fallback mechanisms
6. **Compress large values** to reduce memory usage
7. **Use consistent key naming** conventions

## Performance Tips

- Use Redis for persistent, shared caching
- Use Memory cache for frequently accessed, small data
- Implement cache warming for predictable access patterns
- Monitor hit rates and adjust TTL values accordingly
- Use compression for large objects
- Implement proper error handling and fallbacks

## License

MIT