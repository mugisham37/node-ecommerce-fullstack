import { BaseConfig } from './base';

export interface StagingConfig extends BaseConfig {
  // Staging-specific overrides
}

export const stagingDefaults: Partial<StagingConfig> = {
  NODE_ENV: 'staging',
  PORT: 3000,
  
  // Database
  DATABASE_SSL: true,
  DATABASE_POOL_MIN: 5,
  DATABASE_POOL_MAX: 20,
  
  // Redis
  REDIS_TTL: 7200, // 2 hours
  
  // File Storage
  STORAGE_TYPE: 's3',
  
  // Email
  EMAIL_PROVIDER: 'sendgrid',
  
  // Logging
  LOG_LEVEL: 'info',
  LOG_FORMAT: 'json',
  
  // Security
  CORS_ORIGIN: ['https://staging.ecommerce.com', 'https://admin-staging.ecommerce.com'],
  RATE_LIMIT_WINDOW: 900000, // 15 minutes
  RATE_LIMIT_MAX: 200,
  
  // Monitoring
  ENABLE_METRICS: true,
  METRICS_PORT: 9090,
  HEALTH_CHECK_TIMEOUT: 10000,
  
  // Features
  ENABLE_SWAGGER: true,
  ENABLE_WEBSOCKETS: true,
  ENABLE_BACKGROUND_JOBS: true,
  
  // External APIs
  EXTERNAL_API_TIMEOUT: 30000,
  EXTERNAL_API_RETRIES: 3,
};