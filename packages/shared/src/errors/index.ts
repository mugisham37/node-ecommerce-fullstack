/**
 * Base error classes for the full-stack monolith application
 * Converted from Java exception classes to TypeScript
 */

export interface ErrorContext {
  [key: string]: any;
}

export interface ErrorResponse {
  timestamp: Date;
  status: number;
  error: string;
  message: string;
  path?: string;
  details?: ErrorContext;
}

/**
 * Base class for all application errors
 * Provides common functionality for error context and detailed information
 */
export abstract class AppError extends Error {
  public readonly errorCode: string;
  public readonly category: string;
  public readonly timestamp: Date;
  public readonly context: ErrorContext;
  public readonly statusCode: number;

  protected constructor(
    message: string,
    errorCode: string,
    category: string,
    statusCode: number = 500,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.category = category;
    this.statusCode = statusCode;
    this.timestamp = new Date();
    this.context = {};

    if (cause) {
      this.cause = cause;
    }

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public addContext(key: string, value: any): void {
    this.context[key] = value;
  }

  public addContextMap(additionalContext: ErrorContext): void {
    Object.assign(this.context, additionalContext);
  }

  public getContext(): ErrorContext {
    return { ...this.context };
  }

  public toJSON(): ErrorResponse {
    return {
      timestamp: this.timestamp,
      status: this.statusCode,
      error: this.errorCode,
      message: this.message,
      details: this.getContext(),
    };
  }

  public toString(): string {
    return `${this.constructor.name}{errorCode='${this.errorCode}', category='${this.category}', timestamp=${this.timestamp.toISOString()}, message='${this.message}', context=${JSON.stringify(this.context)}}`;
  }
}

// Export all error types
export * from './BusinessError';
export * from './ValidationError';
export * from './NotFoundError';
export * from './AuthenticationError';
export * from './AuthorizationError';
export * from './FileStorageError';
export * from './InventoryError';
export * from './OrderError';