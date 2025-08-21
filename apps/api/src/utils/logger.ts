import winston from 'winston';

/**
 * Logger Utility
 * Provides structured logging with different levels and formats
 */
export class Logger {
  private static instance: winston.Logger;

  private constructor() {}

  public static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
          winston.format.prettyPrint()
        ),
        defaultMeta: {
          service: 'ecommerce-api',
          version: process.env.npm_package_version || '1.0.0',
        },
        transports: [
          // Console transport for development
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                return `${timestamp} [${level}]: ${message} ${
                  Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                }`;
              })
            ),
          }),
          
          // File transport for production
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            ),
          }),
          
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            ),
          }),
        ],
        exceptionHandlers: [
          new winston.transports.File({ filename: 'logs/exceptions.log' }),
        ],
        rejectionHandlers: [
          new winston.transports.File({ filename: 'logs/rejections.log' }),
        ],
      });

      // Create logs directory if it doesn't exist
      if (process.env.NODE_ENV === 'production') {
        const fs = require('fs');
        const path = require('path');
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
      }
    }

    return Logger.instance;
  }
}

// Export a default instance for convenience
export const logger = Logger.getInstance();