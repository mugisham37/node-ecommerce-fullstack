import Joi from 'joi';

// Base configuration schema
export const baseConfigSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(4000),
  
  // Database
  DATABASE_URL: Joi.string().allow('').default(''),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_NAME: Joi.string().default('ecommerce_inventory_dev'),
  DATABASE_USER: Joi.string().default('postgres'),
  DATABASE_PASSWORD: Joi.string().default('postgres'),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_POOL_MIN: Joi.number().min(0).default(2),
  DATABASE_POOL_MAX: Joi.number().min(1).default(10),
  DATABASE_IDLE_TIMEOUT: Joi.number().min(1000).default(30000),
  DATABASE_CONNECTION_TIMEOUT: Joi.number().min(1000).default(2000),
  
  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().min(0).default(0),
  REDIS_TTL: Joi.number().min(0).default(3600),
  REDIS_CONNECT_TIMEOUT: Joi.number().min(1000).default(5000),
  REDIS_COMMAND_TIMEOUT: Joi.number().min(1000).default(5000),
  
  // JWT
  JWT_SECRET: Joi.string().default('dev-jwt-secret-key'),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('30m'),
  JWT_REFRESH_SECRET: Joi.string().default('dev-refresh-secret-key'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_EXPIRE: Joi.string().default('7d'),
  JWT_REFRESH_EXPIRE: Joi.string().default('30d'),
  
  // Client URLs
  CLIENT_URL: Joi.string().default('http://localhost:3000'),
  ADMIN_URL: Joi.string().default('http://localhost:3001'),
  NEXT_PUBLIC_API_URL: Joi.string().default('http://localhost:4000'),
  NEXT_PUBLIC_WS_URL: Joi.string().default('ws://localhost:4000'),
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:3001'),
  
  // File Storage
  STORAGE_TYPE: Joi.string().valid('local', 's3').default('local'),
  STORAGE_LOCAL_PATH: Joi.string().default('./uploads'),
  UPLOAD_DIR: Joi.string().default('uploads'),
  MAX_FILE_SIZE: Joi.number().default(10485760),
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/gif,image/webp'),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  AWS_S3_BUCKET: Joi.string().allow('').default(''),
  
  // Email
  EMAIL_PROVIDER: Joi.string().valid('smtp', 'sendgrid', 'ses').default('smtp'),
  EMAIL_FROM: Joi.string().default('noreply@ecommerce-dev.local'),
  FROM_EMAIL: Joi.string().default('noreply@ecommerce-dev.local'),
  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().port().default(1025),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  SENDGRID_API_KEY: Joi.string().allow('').default(''),
  
  // Security
  BCRYPT_ROUNDS: Joi.number().min(10).default(12),
  SESSION_SECRET: Joi.string().default('dev-session-secret-key'),
  SESSION_MAX_AGE: Joi.number().default(86400000),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),
  
  // CORS
  CORS_ORIGIN: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).default(['http://localhost:3000']),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().min(1).default(100),
  RATE_LIMIT_MAX_REQUESTS_AUTH: Joi.number().min(1).default(1000),
  
  // Monitoring
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9090),
  HEALTH_CHECK_TIMEOUT: Joi.number().min(1000).default(5000),
  PROMETHEUS_ENABLED: Joi.boolean().default(false),
  PROMETHEUS_PORT: Joi.number().port().default(9090),
  
  // Features
  ENABLE_SWAGGER: Joi.boolean().default(true),
  ENABLE_WEBSOCKETS: Joi.boolean().default(true),
  ENABLE_BACKGROUND_JOBS: Joi.boolean().default(true),
  
  // External APIs
  EXTERNAL_API_TIMEOUT: Joi.number().min(1000).default(30000),
  EXTERNAL_API_RETRIES: Joi.number().min(0).default(3),
  
  // API Configuration
  API_VERSION: Joi.string().default('v1'),
  API_PREFIX: Joi.string().default('/api'),
  
  // Business Configuration
  DEFAULT_CURRENCY: Joi.string().default('USD'),
  TAX_RATE: Joi.number().min(0).default(0.10),
  FREE_SHIPPING_THRESHOLD: Joi.number().min(0).default(100),
  DEFAULT_WAREHOUSE_LOCATION: Joi.string().default('MAIN'),
  
  // Internationalization
  DEFAULT_LANGUAGE: Joi.string().default('en'),
  SUPPORTED_LANGUAGES: Joi.string().default('en,es,fr,de,zh'),
  
  // Cache
  CACHE_TTL: Joi.number().min(0).default(3600),
  SESSION_TIMEOUT: Joi.number().min(0).default(86400),
  
  // Loyalty Program
  DEFAULT_POINTS_PER_DOLLAR: Joi.number().min(0).default(1),
  LOYALTY_TIER_THRESHOLDS: Joi.string().default('100,500,1000,5000'),
  
  // A/B Testing
  AB_TEST_DEFAULT_TRAFFIC: Joi.number().min(0).max(100).default(100),
  AB_TEST_MIN_SAMPLE_SIZE: Joi.number().min(1).default(100),
  
  // Vendor Configuration
  VENDOR_COMMISSION_RATE: Joi.number().min(0).max(1).default(0.15),
  VENDOR_PAYOUT_THRESHOLD: Joi.number().min(0).default(100),
  VENDOR_PAYOUT_SCHEDULE: Joi.string().valid('daily', 'weekly', 'monthly').default('weekly'),
});

// Base configuration interface
export interface BaseConfig {
  // Environment
  NODE_ENV: 'development' | 'staging' | 'production' | 'test';
  PORT: number;
  
  // Database
  DATABASE_URL: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_SSL: boolean;
  DATABASE_POOL_MIN: number;
  DATABASE_POOL_MAX: number;
  DATABASE_IDLE_TIMEOUT: number;
  DATABASE_CONNECTION_TIMEOUT: number;
  
  // Redis
  REDIS_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_DB: number;
  REDIS_TTL: number;
  REDIS_CONNECT_TIMEOUT: number;
  REDIS_COMMAND_TIMEOUT: number;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_ACCESS_TOKEN_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  JWT_EXPIRE: string;
  JWT_REFRESH_EXPIRE: string;
  
  // Client URLs
  CLIENT_URL: string;
  ADMIN_URL: string;
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_WS_URL: string;
  ALLOWED_ORIGINS: string;
  
  // File Storage
  STORAGE_TYPE: 'local' | 's3';
  STORAGE_LOCAL_PATH: string;
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string;
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_S3_BUCKET: string;
  
  // Email
  EMAIL_PROVIDER: 'smtp' | 'sendgrid' | 'ses';
  EMAIL_FROM: string;
  FROM_EMAIL: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SENDGRID_API_KEY: string;
  
  // Security
  BCRYPT_ROUNDS: number;
  SESSION_SECRET: string;
  SESSION_MAX_AGE: number;
  
  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  LOG_FORMAT: 'json' | 'simple';
  
  // CORS
  CORS_ORIGIN: string | string[];
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  RATE_LIMIT_MAX_REQUESTS_AUTH: number;
  
  // Monitoring
  ENABLE_METRICS: boolean;
  METRICS_PORT: number;
  HEALTH_CHECK_TIMEOUT: number;
  PROMETHEUS_ENABLED: boolean;
  PROMETHEUS_PORT: number;
  
  // Features
  ENABLE_SWAGGER: boolean;
  ENABLE_WEBSOCKETS: boolean;
  ENABLE_BACKGROUND_JOBS: boolean;
  
  // External APIs
  EXTERNAL_API_TIMEOUT: number;
  EXTERNAL_API_RETRIES: number;
  
  // API Configuration
  API_VERSION: string;
  API_PREFIX: string;
  
  // Business Configuration
  DEFAULT_CURRENCY: string;
  TAX_RATE: number;
  FREE_SHIPPING_THRESHOLD: number;
  DEFAULT_WAREHOUSE_LOCATION: string;
  
  // Internationalization
  DEFAULT_LANGUAGE: string;
  SUPPORTED_LANGUAGES: string;
  
  // Cache
  CACHE_TTL: number;
  SESSION_TIMEOUT: number;
  
  // Loyalty Program
  DEFAULT_POINTS_PER_DOLLAR: number;
  LOYALTY_TIER_THRESHOLDS: string;
  
  // A/B Testing
  AB_TEST_DEFAULT_TRAFFIC: number;
  AB_TEST_MIN_SAMPLE_SIZE: number;
  
  // Vendor Configuration
  VENDOR_COMMISSION_RATE: number;
  VENDOR_PAYOUT_THRESHOLD: number;
  VENDOR_PAYOUT_SCHEDULE: 'daily' | 'weekly' | 'monthly';
}