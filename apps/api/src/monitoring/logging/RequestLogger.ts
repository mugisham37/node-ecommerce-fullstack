/**
 * HTTP request logging middleware
 * Logs all HTTP requests with performance metrics and context
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './Logger';
import { PrometheusMetrics } from '../metrics/PrometheusMetrics';

interface RequestLogContext {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  userId?: string;
  sessionId?: string;
}

export class RequestLogger {
  private metrics: PrometheusMetrics;

  constructor() {
    this.metrics = PrometheusMetrics.getInstance();
  }

  /**
   * Express middleware for request logging
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = uuidv4();

      // Add request ID to request object
      (req as any).requestId = requestId;

      // Create request context
      const context: RequestLogContext = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        userAgent: req.get('User-Agent'),
        ip: this.getClientIP(req),
        userId: this.extractUserId(req),
        sessionId: this.extractSessionId(req),
      };

      // Log request start
      logger.http('HTTP Request Started', {
        ...context,
        headers: this.sanitizeHeaders(req.headers),
        query: req.query,
        body: this.sanitizeBody(req.body),
      });

      // Increment in-flight requests
      this.metrics.httpRequestsInFlight.inc();

      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        const duration = Date.now() - startTime;
        const durationSeconds = duration / 1000;

        // Decrement in-flight requests
        this.metrics.httpRequestsInFlight.dec();

        // Record metrics
        this.metrics.recordHttpRequest(
          req.method,
          this.getRoutePattern(req),
          res.statusCode,
          durationSeconds
        );

        // Log response
        const responseContext = {
          ...context,
          statusCode: res.statusCode,
          duration,
          responseSize: res.get('Content-Length'),
        };

        if (res.statusCode >= 400) {
          logger.error('HTTP Request Failed', responseContext);
        } else if (duration > 1000) {
          logger.warn('Slow HTTP Request', responseContext);
        } else {
          logger.http('HTTP Request Completed', responseContext);
        }

        // Call original end method
        originalEnd.apply(this, args);
      }.bind({ metrics: this.metrics });

      next();
    };
  }

  /**
   * Create a child logger with request context
   */
  createRequestLogger(req: Request): typeof logger {
    const requestId = (req as any).requestId;
    return logger.child({
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      userId: this.extractUserId(req),
    });
  }

  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      'unknown'
    );
  }

  private extractUserId(req: Request): string | undefined {
    // Extract user ID from JWT token or session
    const user = (req as any).user;
    return user?.id || user?.userId;
  }

  private extractSessionId(req: Request): string | undefined {
    // Extract session ID from session or cookies
    const session = (req as any).session;
    return session?.id || req.cookies?.sessionId;
  }

  private getRoutePattern(req: Request): string {
    // Try to get the route pattern from Express
    const route = (req as any).route;
    if (route && route.path) {
      return route.path;
    }

    // Fallback to URL with parameters replaced
    return this.normalizeUrl(req.originalUrl || req.url);
  }

  private normalizeUrl(url: string): string {
    // Replace UUIDs and numbers with placeholders for better grouping
    return url
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .split('?')[0]; // Remove query parameters
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
    ];

    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.some(field => 
            key.toLowerCase().includes(field.toLowerCase())
          )) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(value);
          }
        }
        return result;
      }
      
      return obj;
    };

    return sanitizeObject(sanitized);
  }
}