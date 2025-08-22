import winston from 'winston';
import path from 'path';
import fs from 'fs';

const { combine, timestamp, errors, json, colorize, simple, printf } = winston.format;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, requestId, ...meta }) => {
  const requestInfo = requestId ? `[${requestId}] ` : '';
  const metaInfo = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level}: ${requestInfo}${message}${metaInfo}`;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // Do not exit on handled exceptions
  exitOnError: false,
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        consoleFormat
      ),
    })
  );
}

/**
 * Create a request-specific logger
 * @param requestId Request ID (optional)
 * @returns Logger with request ID context
 */
export const createRequestLogger = (requestId?: string) => {
  const safeRequestId = requestId || `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    error: (message: string, meta?: any) => logger.error(message, { requestId: safeRequestId, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { requestId: safeRequestId, ...meta }),
    info: (message: string, meta?: any) => logger.info(message, { requestId: safeRequestId, ...meta }),
    http: (message: string, meta?: any) => logger.http(message, { requestId: safeRequestId, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { requestId: safeRequestId, ...meta }),
  };
};

export default logger;
