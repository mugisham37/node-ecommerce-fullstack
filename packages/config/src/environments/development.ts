import { BaseConfig } from './base';

export interface DevelopmentConfig extends BaseConfig {
  // Development-specific overrides
}

export const developmentDefaults: Partial<DevelopmentConfig> = {
  NODE_ENV: 'development',
  PORT: 4000,
  
  // Database
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: 5432,
  DATABASE_NAME: 'ecommerce_inventory_dev',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'postgres',
  DATABASE_SSL: false,
  DATABASE_POOL_MIN: 2,
  DATABASE_POOL_MAX: 10,
  DATABASE_IDLE_TIMEOUT: 30000,
  DATABASE_CONNECTION_TIMEOUT: 2000,
  
  // Redis
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  REDIS_PASSWORD: '',
  REDIS_DB: 0,
  REDIS_TTL: 3600,
  REDIS_CONNECT_TIMEOUT: 5000,
  REDIS_COMMAND_TIMEOUT: 5000,
  
  // JWT
  JWT_SECRET: 'dev-jwt-secret-key',
  JWT_ACCESS_TOKEN_EXPIRES_IN: '30m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  JWT_EXPIRE: '7d',
  JWT_REFRESH_SECRET: 'dev-refresh-secret-key',
  JWT_REFRESH_EXPIRE: '30d',
  
  // Client URLs
  CLIENT_URL: 'http://localhost:3000',
  ADMIN_URL: 'http://localhost:3001',
  NEXT_PUBLIC_API_URL: 'http://localhost:4000',
  NEXT_PUBLIC_WS_URL: 'ws://localhost:4000',
  ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001,http://localhost:19006',
  
  // File Storage
  STORAGE_TYPE: 'local',
  STORAGE_LOCAL_PATH: './uploads',
  UPLOAD_DIR: 'uploads',
  MAX_FILE_SIZE: 10485760,
  ALLOWED_FILE_TYPES: 'image/jpeg,image/png,image/gif,image/webp,application/pdf',
  
  // Email
  EMAIL_PROVIDER: 'smtp',
  EMAIL_FROM: 'noreply@ecommerce-dev.local',
  SMTP_HOST: 'localhost',
  SMTP_PORT: 1025, // MailHog default port
  SMTP_USER: '',
  SMTP_PASSWORD: '',
  FROM_EMAIL: 'noreply@ecommerce-dev.local',
  
  // Security
  BCRYPT_ROUNDS: 12,
  SESSION_SECRET: 'dev-session-secret-key',
  SESSION_MAX_AGE: 86400000,
  
  // Logging
  LOG_LEVEL: 'debug',
  LOG_FORMAT: 'simple',
  
  // CORS
  CORS_ORIGIN: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:19006'],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 60000,
  RATE_LIMIT_MAX_REQUESTS: 1000, // Higher limit for development
  RATE_LIMIT_MAX_REQUESTS_AUTH: 1000,
  
  // Monitoring
  ENABLE_METRICS: true,
  METRICS_PORT: 9090,
  HEALTH_CHECK_TIMEOUT: 5000,
  PROMETHEUS_ENABLED: false,
  PROMETHEUS_PORT: 9090,
  
  // Features
  ENABLE_SWAGGER: true,
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
  CACHE_TTL: 3600,
  SESSION_TIMEOUT: 86400,
  
  // Loyalty Program
  DEFAULT_POINTS_PER_DOLLAR: 1,
  LOYALTY_TIER_THRESHOLDS: '100,500,1000,5000',
  
  // A/B Testing
  AB_TEST_DEFAULT_TRAFFIC: 100,
  AB_TEST_MIN_SAMPLE_SIZE: 100,
  
  // Vendor Configuration
  VENDOR_COMMISSION_RATE: 0.15,
  VENDOR_PAYOUT_THRESHOLD: 100,
  VENDOR_PAYOUT_SCHEDULE: 'weekly',
};