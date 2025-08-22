import { BaseConfig } from './base';

export interface ProductionConfig extends BaseConfig {
  // Production-specific overrides
}

export const productionDefaults: Partial<ProductionConfig> = {
  NODE_ENV: 'production',
  PORT: 4000,
  
  // Database
  DATABASE_SSL: true,
  DATABASE_POOL_MIN: 10,
  DATABASE_POOL_MAX: 50,
  DATABASE_IDLE_TIMEOUT: 30000,
  DATABASE_CONNECTION_TIMEOUT: 2000,
  
  // Redis
  REDIS_TTL: 3600, // 1 hour
  REDIS_CONNECT_TIMEOUT: 10000,
  REDIS_COMMAND_TIMEOUT: 5000,
  
  // JWT
  JWT_ACCESS_TOKEN_EXPIRES_IN: '15m', // Shorter in production
  JWT_REFRESH_EXPIRES_IN: '7d',
  JWT_EXPIRE: '7d',
  JWT_REFRESH_EXPIRE: '30d',
  
  // File Storage
  STORAGE_TYPE: 's3',
  MAX_FILE_SIZE: 20971520, // 20MB in production
  ALLOWED_FILE_TYPES: 'image/jpeg,image/png,image/gif,image/webp,application/pdf',
  
  // Email
  EMAIL_PROVIDER: 'ses',
  
  // Security
  BCRYPT_ROUNDS: 14, // Higher in production
  SESSION_MAX_AGE: 86400000,
  
  // Logging
  LOG_LEVEL: 'warn',
  LOG_FORMAT: 'json',
  
  // CORS
  CORS_ORIGIN: ['https://ecommerce.com', 'https://admin.ecommerce.com'],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  RATE_LIMIT_MAX_REQUESTS_AUTH: 500,
  
  // Monitoring
  ENABLE_METRICS: true,
  METRICS_PORT: 9090,
  HEALTH_CHECK_TIMEOUT: 15000,
  PROMETHEUS_ENABLED: true,
  PROMETHEUS_PORT: 9090,
  
  // Features
  ENABLE_SWAGGER: false, // Disabled in production
  ENABLE_WEBSOCKETS: true,
  ENABLE_BACKGROUND_JOBS: true,
  
  // External APIs
  EXTERNAL_API_TIMEOUT: 30000,
  EXTERNAL_API_RETRIES: 3,
  
  // API Configuration
  API_VERSION: 'v1',
  API_PREFIX: '/api',
  
  // Business Configuration
  DEFAULT_CURRENCY: 'USD',
  TAX_RATE: 0.10,
  FREE_SHIPPING_THRESHOLD: 100,
  DEFAULT_WAREHOUSE_LOCATION: 'MAIN',
  
  // Internationalization
  DEFAULT_LANGUAGE: 'en',
  SUPPORTED_LANGUAGES: 'en,es,fr,de,zh',
  
  // Cache
  CACHE_TTL: 7200, // 2 hours in production
  SESSION_TIMEOUT: 86400,
  
  // Loyalty Program
  DEFAULT_POINTS_PER_DOLLAR: 1,
  LOYALTY_TIER_THRESHOLDS: '100,500,1000,5000',
  
  // A/B Testing
  AB_TEST_DEFAULT_TRAFFIC: 100,
  AB_TEST_MIN_SAMPLE_SIZE: 1000, // Higher sample size in production
  
  // Vendor Configuration
  VENDOR_COMMISSION_RATE: 0.15,
  VENDOR_PAYOUT_THRESHOLD: 100,
  VENDOR_PAYOUT_SCHEDULE: 'weekly',
};