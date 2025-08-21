/**
 * User Principal interface representing the authenticated user
 */
export interface UserPrincipal {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}

/**
 * Authentication context interface
 */
export interface AuthContext {
  user: UserPrincipal | null;
  isAuthenticated: boolean;
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Token pair interface
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * User roles enum
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  USER = 'USER',
}

/**
 * Permission interface for role-based access control
 */
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

/**
 * Session data interface
 */
export interface SessionData {
  userId: string;
  email: string;
  role: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}