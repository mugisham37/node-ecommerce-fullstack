import { Request, Response } from 'express';
import { inferAsyncReturnType } from '@trpc/server';
import jwt from 'jsonwebtoken';
import { DatabaseLayer } from '../database/connection';
import { CacheService } from '../services/cache/CacheService';
import { Logger } from '../utils/logger';

export interface UserPrincipal {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  authorities: string[];
}

export interface AuthenticatedUser extends UserPrincipal {
  isAuthenticated: true;
}

export interface UnauthenticatedUser {
  isAuthenticated: false;
}

export type User = AuthenticatedUser | UnauthenticatedUser;

/**
 * Creates the tRPC context for each request
 * Provides access to database, cache, user authentication, and request/response objects
 */
export const createContext = async ({
  req,
  res,
}: {
  req: Request;
  res: Response;
}) => {
  const logger = Logger.getInstance();
  
  // Extract JWT token from Authorization header
  const getUser = async (): Promise<User> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { isAuthenticated: false };
      }

      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        logger.error('JWT_SECRET not configured');
        return { isAuthenticated: false };
      }

      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Extract user information from JWT payload
      const user: AuthenticatedUser = {
        isAuthenticated: true,
        id: decoded.sub || decoded.userId,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        fullName: decoded.fullName || `${decoded.firstName} ${decoded.lastName}`,
        role: decoded.role,
        authorities: decoded.authorities || [`ROLE_${decoded.role}`],
      };

      return user;
    } catch (error) {
      logger.warn('Invalid JWT token:', error);
      return { isAuthenticated: false };
    }
  };

  const user = await getUser();

  // Get client IP address
  const getClientIp = (): string => {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  };

  // Get user agent
  const getUserAgent = (): string => {
    return req.headers['user-agent'] || 'unknown';
  };



  return {
    req,
    res,
    user,
    db: DatabaseLayer.getInstance(),
    cache: CacheService.getInstance(),
    logger,
    clientIp: getClientIp(),
    userAgent: getUserAgent(),
    // Helper methods
    requireAuth: () => {
      if (!user.isAuthenticated) {
        throw new Error('Authentication required');
      }
      return user;
    },
    requireRole: (requiredRole: string) => {
      if (!user.isAuthenticated) {
        throw new Error('Authentication required');
      }
      if (user.role !== requiredRole && user.role !== 'ADMIN') {
        throw new Error(`${requiredRole} role required`);
      }
      return user;
    },
    requireAnyRole: (requiredRoles: string[]) => {
      if (!user.isAuthenticated) {
        throw new Error('Authentication required');
      }
      if (!requiredRoles.includes(user.role) && user.role !== 'ADMIN') {
        throw new Error(`One of the following roles required: ${requiredRoles.join(', ')}`);
      }
      return user;
    },
    hasRole: (role: string): boolean => {
      return user.isAuthenticated && (user.role === role || user.role === 'ADMIN');
    },
    hasAnyRole: (roles: string[]): boolean => {
      return user.isAuthenticated && (roles.includes(user.role) || user.role === 'ADMIN');
    },
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;