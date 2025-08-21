import { JwtService, JwtConfig } from './JwtService';
import { UserDetailsService, UserRepository } from './UserDetailsService';
import { PasswordService } from './PasswordService';
import { AuthMiddleware, AuthMiddlewareConfig } from './AuthMiddleware';
import { PermissionService } from './PermissionService';
import { SessionService, SessionStorage, MemorySessionStorage } from './SessionService';

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  jwt: JwtConfig;
  password: {
    saltRounds: number;
  };
  session: {
    ttlMs: number;
    storage: 'memory' | 'redis';
    redis?: {
      host: string;
      port: number;
      password?: string;
      db?: number;
    };
  };
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    allowCredentials: boolean;
    maxAge: number;
  };
  publicPaths: string[];
  skipAuthPaths: string[];
}

/**
 * Default security configuration
 */
export const defaultSecurityConfig: SecurityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    accessTokenExpiration: parseInt(process.env.JWT_EXPIRATION || '3600'), // 1 hour
    refreshTokenExpiration: parseInt(process.env.JWT_REFRESH_EXPIRATION || '604800'), // 7 days
  },
  password: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
  },
  session: {
    ttlMs: parseInt(process.env.SESSION_TTL_MS || '3600000'), // 1 hour
    storage: (process.env.SESSION_STORAGE as 'memory' | 'redis') || 'memory',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: [
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
      'Authorization',
      'Content-Disposition',
    ],
    allowCredentials: true,
    maxAge: 3600,
  },
  publicPaths: [
    '/api/v1/auth',
    '/api/v1/health',
    '/api/v1/actuator/health',
    '/api/v1/actuator/info',
    '/swagger-ui',
    '/v3/api-docs',
    '/swagger-resources',
    '/webjars',
  ],
  skipAuthPaths: [
    '/api/v1/auth/',
    '/api/v1/health',
    '/api/v1/actuator/health',
    '/api/v1/actuator/info',
    '/swagger-ui/',
    '/v3/api-docs',
  ],
};

/**
 * Security services container
 */
export interface SecurityServices {
  jwtService: JwtService;
  userDetailsService: UserDetailsService;
  passwordService: PasswordService;
  authMiddleware: AuthMiddleware;
  permissionService: PermissionService;
  sessionService: SessionService;
}

/**
 * Security configuration factory
 */
export class SecurityConfigFactory {
  /**
   * Create security services with configuration
   */
  static createSecurityServices(
    config: SecurityConfig,
    userRepository: UserRepository,
    sessionStorage?: SessionStorage
  ): SecurityServices {
    // Create JWT service
    const jwtService = new JwtService(config.jwt);

    // Create user details service
    const userDetailsService = new UserDetailsService(userRepository);

    // Create password service
    const passwordService = new PasswordService(config.password.saltRounds);

    // Create session storage if not provided
    const storage = sessionStorage || new MemorySessionStorage();

    // Create session service
    const sessionService = new SessionService(storage, config.session.ttlMs);

    // Create permission service
    const permissionService = new PermissionService();

    // Create auth middleware configuration
    const authMiddlewareConfig: AuthMiddlewareConfig = {
      jwtService,
      userDetailsService,
      publicPaths: config.publicPaths,
      skipAuthPaths: config.skipAuthPaths,
    };

    // Create auth middleware
    const authMiddleware = new AuthMiddleware(authMiddlewareConfig);

    return {
      jwtService,
      userDetailsService,
      passwordService,
      authMiddleware,
      permissionService,
      sessionService,
    };
  }

  /**
   * Create CORS configuration for Express
   */
  static createCorsConfig(config: SecurityConfig) {
    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check if origin is allowed
        if (config.cors.allowedOrigins.includes('*') || 
            config.cors.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      methods: config.cors.allowedMethods,
      allowedHeaders: config.cors.allowedHeaders,
      exposedHeaders: config.cors.exposedHeaders,
      credentials: config.cors.allowCredentials,
      maxAge: config.cors.maxAge,
    };
  }

  /**
   * Validate security configuration
   */
  static validateConfig(config: SecurityConfig): void {
    // Validate JWT secret
    if (!config.jwt.secret || config.jwt.secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }

    // Validate expiration times
    if (config.jwt.accessTokenExpiration <= 0) {
      throw new Error('Access token expiration must be positive');
    }

    if (config.jwt.refreshTokenExpiration <= config.jwt.accessTokenExpiration) {
      throw new Error('Refresh token expiration must be greater than access token expiration');
    }

    // Validate salt rounds
    if (config.password.saltRounds < 10 || config.password.saltRounds > 15) {
      throw new Error('Salt rounds should be between 10 and 15 for security and performance');
    }

    // Validate session TTL
    if (config.session.ttlMs <= 0) {
      throw new Error('Session TTL must be positive');
    }

    console.log('Security configuration validated successfully');
  }

  /**
   * Create development security configuration
   */
  static createDevelopmentConfig(): SecurityConfig {
    return {
      ...defaultSecurityConfig,
      jwt: {
        ...defaultSecurityConfig.jwt,
        secret: 'development-jwt-secret-key-not-for-production-use-only',
        accessTokenExpiration: 7200, // 2 hours for development
      },
      cors: {
        ...defaultSecurityConfig.cors,
        allowedOrigins: ['*'], // Allow all origins in development
      },
    };
  }

  /**
   * Create production security configuration
   */
  static createProductionConfig(): SecurityConfig {
    const config = { ...defaultSecurityConfig };

    // Ensure secure settings for production
    if (process.env.NODE_ENV === 'production') {
      // Validate required environment variables
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required in production');
      }

      // Set secure CORS origins
      if (!process.env.CORS_ALLOWED_ORIGINS) {
        throw new Error('CORS_ALLOWED_ORIGINS environment variable is required in production');
      }

      config.cors.allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',');
    }

    return config;
  }
}