import { BaseConfig } from './base';

export interface TestConfig extends BaseConfig {
  // Test-specific overrides
}

export const testDefaults: Partial<TestConfig> = {
  NODE_ENV: 'test',
  PORT: 3002,
  
  // Database
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: 5432,
  DATABASE_NAME: 'ecommerce_test',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'postgres',
  DATABASE_SSL: false,
  DATABASE_POOL_MIN: 1,
  DATABASE_POOL_MAX: 5,
  
  // Redis
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  REDIS_PASSWORD: '',
  REDIS_DB: 1, // Different DB for tests
  REDIS_TTL: 300, // 5 minutes
  
  // JWT
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only-32-chars',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing-only-32-chars',
  JWT_REFRESH_EXPIRES_IN: '24h',
  
  // File Storage
  STORAGE_TYPE: 'local',
  STORAGE_LOCAL_PATH: './test-uploads',
  
  // Email
  EMAIL_PROVIDER: 'smtp',
  EMAIL_FROM: 'test@ecommerce.test',
  SMTP_HOST: 'localhost',
  SMTP_PORT: 1025,
  SMTP_USER: '',
  SMTP_PASSWORD: '',
  
  // Logging
  LOG_LEVEL: 'error', // Minimal logging during tests
  LOG_FORMAT: 'simple',
  
  // Security
  CORS_ORIGIN: '*',
  RATE_LIMIT_WINDOW_MS: 900000,
  RATE_LIMIT_MAX_REQUESTS: 10000, // High limit for tests
  
  // Monitoring
  ENABLE_METRICS: false,
  METRICS_PORT: 9091,
  HEALTH_CHECK_TIMEOUT: 1000,
  
  // Features
  ENABLE_SWAGGER: false,
  ENABLE_WEBSOCKETS: false,
  ENABLE_BACKGROUND_JOBS: false,
  
  // External APIs
  EXTERNAL_API_TIMEOUT: 5000, // Shorter timeout for tests
  EXTERNAL_API_RETRIES: 1,
};