import { Request, Response, NextFunction } from 'express';
import { JwtService } from './JwtService';
import { UserDetailsService } from './UserDetailsService';
import { AuthContext, UserPrincipal } from './types';

/**
 * Extended Request interface with authentication context
 */
export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
  user?: UserPrincipal;
}

/**
 * Authentication middleware configuration
 */
export interface AuthMiddlewareConfig {
  jwtService: JwtService;
  userDetailsService: UserDetailsService;
  publicPaths?: string[];
  skipAuthPaths?: string[];
}

/**
 * Authentication Middleware for validating JWT tokens and setting user context
 */
export class AuthMiddleware {
  private jwtService: JwtService;
  private userDetailsService: UserDetailsService;
  private publicPaths: Set<string>;
  private skipAuthPaths: Set<string>;

  constructor(config: AuthMiddlewareConfig) {
    this.jwtService = config.jwtService;
    this.userDetailsService = config.userDetailsService;
    this.publicPaths = new Set(config.publicPaths || []);
    this.skipAuthPaths = new Set(config.skipAuthPaths || []);
  }

  /**
   * Express middleware function for JWT authentication
   */
  authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Skip authentication for public paths
      if (this.shouldSkipAuth(req.path)) {
        return next();
      }

      const token = this.extractTokenFromRequest(req);

      if (!token) {
        if (this.isPublicPath(req.path)) {
          return next();
        }
        return this.sendUnauthorizedResponse(res, 'No authentication token provided');
      }

      // Validate token
      if (!this.jwtService.validateToken(token)) {
        return this.sendUnauthorizedResponse(res, 'Invalid or expired token');
      }

      // Only process access tokens for authentication
      if (!this.jwtService.isAccessToken(token)) {
        return this.sendUnauthorizedResponse(res, 'Invalid token type');
      }

      // Get user from token
      const userId = this.jwtService.getUserIdFromToken(token);
      const userPrincipal = await this.userDetailsService.loadUserById(userId);

      // Set authentication context
      req.auth = {
        user: userPrincipal,
        isAuthenticated: true,
      };
      req.user = userPrincipal;

      console.debug(`Authenticated user: ${userPrincipal.email} with role: ${userPrincipal.role}`);
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return this.sendUnauthorizedResponse(res, 'Authentication failed');
    }
  };

  /**
   * Middleware to require authentication
   */
  requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth?.isAuthenticated || !req.user) {
      return this.sendUnauthorizedResponse(res, 'Authentication required');
    }
    next();
  };

  /**
   * Middleware to require specific role
   */
  requireRole = (roles: string | string[]) => {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.auth?.isAuthenticated || !req.user) {
        return this.sendUnauthorizedResponse(res, 'Authentication required');
      }

      if (!requiredRoles.includes(req.user.role)) {
        return this.sendForbiddenResponse(res, 'Insufficient permissions');
      }

      next();
    };
  };

  /**
   * Middleware to require any of the specified roles
   */
  requireAnyRole = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.auth?.isAuthenticated || !req.user) {
        return this.sendUnauthorizedResponse(res, 'Authentication required');
      }

      if (!roles.includes(req.user.role)) {
        return this.sendForbiddenResponse(res, 'Insufficient permissions');
      }

      next();
    };
  };

  /**
   * Extract JWT token from Authorization header
   */
  private extractTokenFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return null;
  }

  /**
   * Check if path should skip authentication entirely
   */
  private shouldSkipAuth(path: string): boolean {
    return this.skipAuthPaths.has(path) || 
           Array.from(this.skipAuthPaths).some(skipPath => 
             path.startsWith(skipPath)
           );
  }

  /**
   * Check if path is public (authentication optional)
   */
  private isPublicPath(path: string): boolean {
    return this.publicPaths.has(path) || 
           Array.from(this.publicPaths).some(publicPath => 
             path.startsWith(publicPath)
           );
  }

  /**
   * Send unauthorized response
   */
  private sendUnauthorizedResponse(res: Response, message: string): void {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send forbidden response
   */
  private sendForbiddenResponse(res: Response, message: string): void {
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add public path
   */
  addPublicPath(path: string): void {
    this.publicPaths.add(path);
  }

  /**
   * Add skip auth path
   */
  addSkipAuthPath(path: string): void {
    this.skipAuthPaths.add(path);
  }

  /**
   * Remove public path
   */
  removePublicPath(path: string): void {
    this.publicPaths.delete(path);
  }

  /**
   * Remove skip auth path
   */
  removeSkipAuthPath(path: string): void {
    this.skipAuthPaths.delete(path);
  }
}