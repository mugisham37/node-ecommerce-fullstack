import dotenv from 'dotenv';
import { BaseConfig, baseConfigSchema } from './environments/base';
import { developmentDefaults } from './environments/development';
import { stagingDefaults } from './environments/staging';
import { productionDefaults } from './environments/production';
import { testDefaults } from './environments/test';

// Load environment variables
dotenv.config();

// Environment-specific defaults
const environmentDefaults = {
  development: developmentDefaults,
  staging: stagingDefaults,
  production: productionDefaults,
  test: testDefaults,
};

// Get current environment
const currentEnv = (process.env.NODE_ENV as keyof typeof environmentDefaults) || 'development';

// Merge environment defaults with process.env
const rawConfig = {
  ...environmentDefaults[currentEnv],
  ...process.env,
};

// Validate and parse configuration
const { error, value: config } = baseConfigSchema.validate(rawConfig, {
  allowUnknown: true,
  stripUnknown: true,
});

if (error) {
  throw new Error(`Configuration validation error: ${error.message}`);
}

// Export validated configuration
export const appConfig: BaseConfig = config;

// Export environment-specific configurations
export { BaseConfig } from './environments/base';
export { DevelopmentConfig } from './environments/development';
export { StagingConfig } from './environments/staging';
export { ProductionConfig } from './environments/production';
export { TestConfig } from './environments/test';

// Utility functions
export const isDevelopment = () => appConfig.NODE_ENV === 'development';
export const isStaging = () => appConfig.NODE_ENV === 'staging';
export const isProduction = () => appConfig.NODE_ENV === 'production';
export const isTest = () => appConfig.NODE_ENV === 'test';

// Database configuration helper
export const getDatabaseConfig = () => ({
  host: appConfig.DATABASE_HOST,
  port: appConfig.DATABASE_PORT,
  database: appConfig.DATABASE_NAME,
  user: appConfig.DATABASE_USER,
  password: appConfig.DATABASE_PASSWORD,
  ssl: appConfig.DATABASE_SSL,
  pool: {
    min: appConfig.DATABASE_POOL_MIN,
    max: appConfig.DATABASE_POOL_MAX,
  },
});

// Redis configuration helper
export const getRedisConfig = () => ({
  host: appConfig.REDIS_HOST,
  port: appConfig.REDIS_PORT,
  password: appConfig.REDIS_PASSWORD || undefined,
  db: appConfig.REDIS_DB,
  ttl: appConfig.REDIS_TTL,
});

// JWT configuration helper
export const getJWTConfig = () => ({
  secret: appConfig.JWT_SECRET,
  expiresIn: appConfig.JWT_EXPIRES_IN,
  refreshSecret: appConfig.JWT_REFRESH_SECRET,
  refreshExpiresIn: appConfig.JWT_REFRESH_EXPIRES_IN,
});

// Storage configuration helper
export const getStorageConfig = () => ({
  type: appConfig.STORAGE_TYPE,
  localPath: appConfig.STORAGE_LOCAL_PATH,
  aws: {
    region: appConfig.AWS_REGION,
    accessKeyId: appConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: appConfig.AWS_SECRET_ACCESS_KEY,
    bucket: appConfig.AWS_S3_BUCKET,
  },
});

// Email configuration helper
export const getEmailConfig = () => ({
  provider: appConfig.EMAIL_PROVIDER,
  from: appConfig.EMAIL_FROM,
  smtp: {
    host: appConfig.SMTP_HOST,
    port: appConfig.SMTP_PORT,
    user: appConfig.SMTP_USER,
    password: appConfig.SMTP_PASSWORD,
  },
  sendgrid: {
    apiKey: appConfig.SENDGRID_API_KEY,
  },
});

// CORS configuration helper
export const getCORSConfig = () => ({
  origin: appConfig.CORS_ORIGIN,
  credentials: true,
});

// Rate limiting configuration helper
export const getRateLimitConfig = () => ({
  windowMs: appConfig.RATE_LIMIT_WINDOW,
  max: appConfig.RATE_LIMIT_MAX,
});

// Export all environments
export * from './environments';