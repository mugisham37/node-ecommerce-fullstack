import { BaseConfig } from './base';

export interface ProductionConfig extends BaseConfig {
  // Production-specific overrides
}

export const productionDefaults: Partial<ProductionConfig> = {
  NODE_ENV: 'production',
  PORT: 3000,
  
  // Database
  DATABASE_SSL: true,
  DATABASE_POOL_MIN: 10,
  DATABASE_POOL_MAX: 50,
  
  // Redis
  REDIS_TTL: 3600, // 1 hour
  
  // File Storage
  STORAGE_TYPE: 's3',
  
  // Email
  EMAIL_PROVIDER: 'ses',
  
  // Logging
  LOG_LEVEL: 'warn',
  LOG_FORMAT: 'json',
  
  // Security
  CORS_ORIGIN: ['https://ecommerce.com', 'https://admin.ecommerce.com'],
  RATE_LIMIT_WINDOW: 900000, // 15 minutes
  RATE_LIMIT_MAX: 100,
  
  // Monitoring
  ENABLE_METRICS: true,
  METRICS_PORT: 9090,
  HEALTH_CHECK_TIMEOUT: 15000,
  
  // Features
  ENABLE_SWAGGER: false, // Disabled in production
  ENABLE_WEBSOCKETS: true,
  ENABLE_BACKGROUND_JOBS: true,
  
  // External APIs
  EXTERNAL_API_TIMEOUT: 30000,
  EXTERNAL_API_RETRIES: 3,
};