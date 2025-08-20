import Joi from 'joi';

// Base configuration schema
export const baseConfigSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  
  // Database
  DATABASE_URL: Joi.string().uri().required(),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_POOL_MIN: Joi.number().min(0).default(2),
  DATABASE_POOL_MAX: Joi.number().min(1).default(10),
  
  // Redis
  REDIS_URL: Joi.string().uri().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().min(0).default(0),
  REDIS_TTL: Joi.number().min(0).default(3600),
  
  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  
  // File Storage
  STORAGE_TYPE: Joi.string().valid('local', 's3').default('local'),
  STORAGE_LOCAL_PATH: Joi.string().default('./uploads'),
  AWS_REGION: Joi.string().when('STORAGE_TYPE', { is: 's3', then: Joi.required() }),
  AWS_ACCESS_KEY_ID: Joi.string().when('STORAGE_TYPE', { is: 's3', then: Joi.required() }),
  AWS_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_TYPE', { is: 's3', then: Joi.required() }),
  AWS_S3_BUCKET: Joi.string().when('STORAGE_TYPE', { is: 's3', then: Joi.required() }),
  
  // Email
  EMAIL_PROVIDER: Joi.string().valid('smtp', 'sendgrid', 'ses').default('smtp'),
  EMAIL_FROM: Joi.string().email().required(),
  SMTP_HOST: Joi.string().when('EMAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  SMTP_PORT: Joi.number().port().when('EMAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  SMTP_USER: Joi.string().when('EMAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  SMTP_PASSWORD: Joi.string().when('EMAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  SENDGRID_API_KEY: Joi.string().when('EMAIL_PROVIDER', { is: 'sendgrid', then: Joi.required() }),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),
  
  // Security
  CORS_ORIGIN: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).default('*'),
  RATE_LIMIT_WINDOW: Joi.number().min(1000).default(900000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().min(1).default(100),
  
  // Monitoring
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9090),
  HEALTH_CHECK_TIMEOUT: Joi.number().min(1000).default(5000),
  
  // Features
  ENABLE_SWAGGER: Joi.boolean().default(true),
  ENABLE_WEBSOCKETS: Joi.boolean().default(true),
  ENABLE_BACKGROUND_JOBS: Joi.boolean().default(true),
  
  // External APIs
  EXTERNAL_API_TIMEOUT: Joi.number().min(1000).default(30000),
  EXTERNAL_API_RETRIES: Joi.number().min(0).default(3),
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
  
  // Redis
  REDIS_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_DB: number;
  REDIS_TTL: number;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // File Storage
  STORAGE_TYPE: 'local' | 's3';
  STORAGE_LOCAL_PATH: string;
  AWS_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_S3_BUCKET?: string;
  
  // Email
  EMAIL_PROVIDER: 'smtp' | 'sendgrid' | 'ses';
  EMAIL_FROM: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SENDGRID_API_KEY?: string;
  
  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  LOG_FORMAT: 'json' | 'simple';
  
  // Security
  CORS_ORIGIN: string | string[];
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX: number;
  
  // Monitoring
  ENABLE_METRICS: boolean;
  METRICS_PORT: number;
  HEALTH_CHECK_TIMEOUT: number;
  
  // Features
  ENABLE_SWAGGER: boolean;
  ENABLE_WEBSOCKETS: boolean;
  ENABLE_BACKGROUND_JOBS: boolean;
  
  // External APIs
  EXTERNAL_API_TIMEOUT: number;
  EXTERNAL_API_RETRIES: number;
}