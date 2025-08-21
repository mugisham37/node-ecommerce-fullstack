// Core authentication services
export { JwtService, type JwtConfig, type JwtPayload } from './JwtService';
export { UserDetailsService, type UserRepository, type UserEntity } from './UserDetailsService';
export { PasswordService } from './PasswordService';
export { AuthMiddleware, type AuthenticatedRequest, type AuthMiddlewareConfig } from './AuthMiddleware';
export { PermissionService, Resource, Action } from './PermissionService';
export { 
  SessionService, 
  MemorySessionStorage, 
  RedisSessionStorage,
  type SessionStorage 
} from './SessionService';

// Security configuration
export { 
  SecurityConfigFactory, 
  defaultSecurityConfig,
  type SecurityConfig,
  type SecurityServices 
} from './SecurityConfig';

// Types
export {
  type UserPrincipal,
  type AuthContext,
  type LoginCredentials,
  type TokenPair,
  type SessionData,
  UserRole,
  type Permission,
} from './types';

// Utility functions
export const extractBearerToken = (authHeader?: string): string | null => {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

export const createAuthError = (message: string, statusCode: number = 401) => {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  error.name = 'AuthenticationError';
  return error;
};

export const createAuthorizationError = (message: string) => {
  const error = new Error(message) as any;
  error.statusCode = 403;
  error.name = 'AuthorizationError';
  return error;
};