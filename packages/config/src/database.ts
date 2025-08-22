import { appConfig } from './index';

/**
 * Database configuration helper
 */
export const getDatabaseConfig = () => {
  const connectionString = process.env.DATABASE_URL || 
    `postgresql://${appConfig.DATABASE_USER}:${appConfig.DATABASE_PASSWORD}@${appConfig.DATABASE_HOST}:${appConfig.DATABASE_PORT}/${appConfig.DATABASE_NAME}`;

  return {
    connectionString,
    host: appConfig.DATABASE_HOST,
    port: appConfig.DATABASE_PORT,
    database: appConfig.DATABASE_NAME,
    user: appConfig.DATABASE_USER,
    password: appConfig.DATABASE_PASSWORD,
    ssl: appConfig.DATABASE_SSL,
    pool: {
      min: appConfig.DATABASE_POOL_MIN,
      max: appConfig.DATABASE_POOL_MAX,
      idleTimeout: appConfig.DATABASE_IDLE_TIMEOUT,
      connectionTimeout: appConfig.DATABASE_CONNECTION_TIMEOUT,
    },
  };
};

/**
 * Database connection configuration for Drizzle ORM
 */
export const getDrizzleConfig = () => {
  const config = getDatabaseConfig();
  
  return {
    connectionString: config.connectionString,
    options: {
      max: config.pool.max,
      idle_timeout: Math.floor(config.pool.idleTimeout / 1000), // Convert to seconds
      connect_timeout: Math.floor(config.pool.connectionTimeout / 1000), // Convert to seconds
      ssl: config.ssl ? 'require' : false,
      onnotice: () => {}, // Disable notices in production
    },
  };
};

/**
 * Database health check configuration
 */
export const getHealthCheckConfig = () => ({
  timeout: appConfig.HEALTH_CHECK_TIMEOUT,
  retries: 3,
  retryDelay: 1000,
});

// Export database configuration
export default getDatabaseConfig;