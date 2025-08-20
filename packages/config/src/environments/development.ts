import { BaseConfig } from './base';

export interface DevelopmentConfig extends BaseConfig {
  // Development-specific overrides
}

export const developmentDefaults: Partial<DevelopmentConfig> = {
  NODE_ENV: 'development',
  PORT: 3001,
  
  // Database
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: 5432,
  DATABASE_NAME: 'ecommerce_dev',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'postgres',
  DATABASE_SSL: false,
  DATABASE_POOL_MIN: 2,
  DATABASE_POOL_MAX: 10,
  
  // Redis
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  REDIS_PASSWORD: '',
  REDIS_DB: 0,
  REDIS_TTL: 3600,
  
  // File Storage
  STORAGE_TYPE: 'local',
  STORAGE_LOCAL_PATH: './uploads',
  
  // Email
  EMAIL_PROVIDER: 'smtp',
  EMAIL_FROM: 'noreply@ecommerce-dev.local',
  SMTP_HOST: 'localhost',
  SMTP_PORT: 1025, // MailHog default port
  SMTP_USER: '',
  SMTP_PASSWORD: '',
  
  // Logging
  LOG_LEVEL: 'debug',
  LOG_FORMAT: 'simple',
  
  // Security
  CORS_ORIGIN: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:19006'],
  RATE_LIMIT_WINDOW: 900000, // 15 minutes
  RATE_LIMIT_MAX: 1000, // Higher limit for development
  
  // Monitoring
  ENABLE_METRICS: true,
  METRICS_PORT: 9090,
  HEALTH_CHECK_TIMEOUT: 5000,
  
  // Features
  ENABLE_SWAGGER: true,
  ENABLE_WEBSOCKETS: true,
  ENABLE_BACKGROUND_JOBS: true,
  
  // External APIs
  EXTERNAL_API_TIMEOUT: 30000,
  EXTERNAL_API_RETRIES: 3,
};