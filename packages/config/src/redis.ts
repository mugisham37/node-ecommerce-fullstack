import { appConfig } from './index';

/**
 * Redis configuration helper
 */
export const getRedisConfig = () => {
  const redisUrl = process.env.REDIS_URL || `redis://${appConfig.REDIS_HOST}:${appConfig.REDIS_PORT}`;
  
  return {
    url: redisUrl,
    host: appConfig.REDIS_HOST,
    port: appConfig.REDIS_PORT,
    password: appConfig.REDIS_PASSWORD || undefined,
    database: appConfig.REDIS_DB,
    ttl: appConfig.REDIS_TTL,
    socket: {
      connectTimeout: appConfig.REDIS_CONNECT_TIMEOUT,
      commandTimeout: appConfig.REDIS_COMMAND_TIMEOUT,
      reconnectStrategy: (retries: number) => {
        // Exponential backoff with max delay of 30 seconds
        const delay = Math.min(Math.pow(2, retries) * 100, 30000);
        console.log(`Redis reconnecting in ${delay}ms... (attempt ${retries + 1})`);
        return delay;
      },
    },
  };
};

/**
 * Redis connection constants
 */
export const REDIS_CONSTANTS = {
  MAX_RECONNECT_ATTEMPTS: 10,
  RECONNECT_DELAY_MS: 5000,
  DEFAULT_TTL: 3600,
  CACHE_PREFIXES: {
    USER: 'user:',
    SESSION: 'session:',
    PRODUCT: 'product:',
    ANALYTICS: 'analytics:',
    LOYALTY: 'loyalty:',
    AB_TEST: 'ab_test:',
  },
} as const;

/**
 * Cache key builders
 */
export const buildCacheKey = {
  user: (id: string) => `${REDIS_CONSTANTS.CACHE_PREFIXES.USER}${id}`,
  session: (id: string) => `${REDIS_CONSTANTS.CACHE_PREFIXES.SESSION}${id}`,
  product: (id: string) => `${REDIS_CONSTANTS.CACHE_PREFIXES.PRODUCT}${id}`,
  analytics: (key: string) => `${REDIS_CONSTANTS.CACHE_PREFIXES.ANALYTICS}${key}`,
  loyalty: (userId: string, programId: string) => `${REDIS_CONSTANTS.CACHE_PREFIXES.LOYALTY}${userId}:${programId}`,
  abTest: (testId: string, userId: string) => `${REDIS_CONSTANTS.CACHE_PREFIXES.AB_TEST}${testId}:${userId}`,
};

/**
 * Redis health check configuration
 */
export const getRedisHealthCheckConfig = () => ({
  timeout: appConfig.HEALTH_CHECK_TIMEOUT,
  retries: 3,
  retryDelay: 1000,
});

// Export Redis configuration
export default getRedisConfig;