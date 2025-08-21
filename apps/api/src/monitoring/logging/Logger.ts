/**
 * Structured logging service using Winston
 * Provides centralized logging with multiple transports and formatting
 */

import winston, { Logger as WinstonLogger } from 'winston';
import path from 'path';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

interface LogContext {
  userId?: string;
  requestId?: string;
  sessionId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

class StructuredLogger {
  private winston: WinstonLogger;
  private defaultContext: LogContext = {};

  constructor() {
    this.winston = this.createLogger();
  }

  /**
   * Set default context that will be included in all log entries
   */
  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  /**
   * Clear default context
   */
  clearDefaultContext(): void {
    this.defaultContext = {};
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log HTTP request/response
   */
  http(message: string, context?: LogContext): void {
    this.log(LogLevel.HTTP, message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger();
    childLogger.setDefaultContext({ ...this.defaultContext, ...context });
    return childLogger;
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      operation,
      duration,
      type: 'performance',
    });
  }

  /**
   * Log business events
   */
  business(event: string, context?: LogContext): void {
    this.info(`Business Event: ${event}`, {
      ...context,
      event,
      type: 'business',
    });
  }

  /**
   * Log security events
   */
  security(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, {
      ...context,
      event,
      type: 'security',
    });
  }

  /**
   * Log audit events
   */
  audit(action: string, context?: LogContext): void {
    this.info(`Audit: ${action}`, {
      ...context,
      action,
      type: 'audit',
    });
  }

  private log(level: LogLevel, message: string, context?: LogContext | Error): void {
    let logContext: LogContext = { ...this.defaultContext };

    if (context instanceof Error) {
      logContext = {
        ...logContext,
        error: {
          name: context.name,
          message: context.message,
          stack: context.stack,
        },
      };
    } else if (context) {
      logContext = { ...logContext, ...context };
    }

    this.winston.log(level, message, {
      timestamp: new Date().toISOString(),
      ...logContext,
    });
  }

  private createLogger(): WinstonLogger {
    const logDir = process.env.LOG_DIR || 'logs';
    const logLevel = process.env.LOG_LEVEL || 'info';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Custom format for structured logging
    const structuredFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta,
        });
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    );

    const transports: winston.transport[] = [];

    // Console transport for development
    if (nodeEnv === 'development') {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: 'debug',
        })
      );
    } else {
      // Structured console output for production
      transports.push(
        new winston.transports.Console({
          format: structuredFormat,
          level: logLevel,
        })
      );
    }

    // File transports
    transports.push(
      // All logs
      new winston.transports.File({
        filename: path.join(logDir, 'app.log'),
        format: structuredFormat,
        level: logLevel,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),
      // Error logs
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        format: structuredFormat,
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),
      // HTTP logs
      new winston.transports.File({
        filename: path.join(logDir, 'http.log'),
        format: structuredFormat,
        level: 'http',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      })
    );

    return winston.createLogger({
      level: logLevel,
      format: structuredFormat,
      transports,
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'exceptions.log'),
          format: structuredFormat,
        }),
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'rejections.log'),
          format: structuredFormat,
        }),
      ],
    });
  }
}

// Export singleton instance
export const logger = new StructuredLogger();

// Export class for creating child loggers
export { StructuredLogger };