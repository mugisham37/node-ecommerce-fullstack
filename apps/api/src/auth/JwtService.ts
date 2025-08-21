import jwt from 'jsonwebtoken';
import { UserPrincipal } from './types';

export interface JwtConfig {
  secret: string;
  accessTokenExpiration: number; // in seconds
  refreshTokenExpiration: number; // in seconds
}

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

/**
 * JWT Service for generating and validating JWT tokens
 * Handles both access tokens and refresh tokens with different expiration times
 */
export class JwtService {
  private readonly config: JwtConfig;

  constructor(config: JwtConfig) {
    this.config = config;
  }

  /**
   * Generate JWT access token from UserPrincipal
   */
  generateAccessToken(userPrincipal: UserPrincipal): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userPrincipal.id,
      email: userPrincipal.email,
      role: userPrincipal.role,
      type: 'access',
    };

    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.accessTokenExpiration,
    });
  }

  /**
   * Generate JWT refresh token from UserPrincipal
   */
  generateRefreshToken(userPrincipal: UserPrincipal): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userPrincipal.id,
      email: userPrincipal.email,
      role: userPrincipal.role,
      type: 'refresh',
    };

    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.refreshTokenExpiration,
    });
  }

  /**
   * Extract user ID from JWT token
   */
  getUserIdFromToken(token: string): string {
    const decoded = this.verifyToken(token);
    return decoded.sub;
  }

  /**
   * Extract UserPrincipal from JWT token
   */
  getUserPrincipalFromToken(token: string): UserPrincipal {
    const decoded = this.verifyToken(token);
    
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      firstName: '', // Will be populated from database
      lastName: '', // Will be populated from database
      active: true,
    };
  }

  /**
   * Get expiration date from JWT token
   */
  getExpirationDateFromToken(token: string): Date {
    const decoded = this.verifyToken(token);
    return new Date(decoded.exp * 1000);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const expiration = this.getExpirationDateFromToken(token);
      return expiration.getTime() < Date.now();
    } catch (error) {
      return true;
    }
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): boolean {
    try {
      jwt.verify(token, this.config.secret);
      return true;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        console.error('Invalid JWT token:', error.message);
      } else if (error instanceof jwt.TokenExpiredError) {
        console.error('Expired JWT token:', error.message);
      } else if (error instanceof jwt.NotBeforeError) {
        console.error('JWT token not active:', error.message);
      } else {
        console.error('JWT token validation error:', error);
      }
      return false;
    }
  }

  /**
   * Validate if token is an access token
   */
  isAccessToken(token: string): boolean {
    try {
      const decoded = this.verifyToken(token);
      return decoded.type === 'access';
    } catch (error) {
      console.error('Error validating token type:', error);
      return false;
    }
  }

  /**
   * Validate if token is a refresh token
   */
  isRefreshToken(token: string): boolean {
    try {
      const decoded = this.verifyToken(token);
      return decoded.type === 'refresh';
    } catch (error) {
      console.error('Error validating token type:', error);
      return false;
    }
  }

  /**
   * Get remaining time until token expiration in milliseconds
   */
  getTokenRemainingTime(token: string): number {
    try {
      const expiration = this.getExpirationDateFromToken(token);
      return Math.max(0, expiration.getTime() - Date.now());
    } catch (error) {
      return 0;
    }
  }

  /**
   * Verify and decode JWT token
   */
  private verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.config.secret) as JwtPayload;
  }

  /**
   * Decode JWT token without verification (for debugging)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }
}