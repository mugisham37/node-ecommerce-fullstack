/**
 * Error reporting service for centralized error handling and reporting
 */

import { AppError, ErrorContext } from '../errors';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    category?: string;
  };
  context: ErrorContext;
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
  environment: {
    userAgent: string;
    url: string;
    referrer: string;
    viewport: {
      width: number;
      height: number;
    };
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorReportingConfig {
  apiEndpoint?: string;
  apiKey?: string;
  environment: 'development' | 'staging' | 'production';
  enableConsoleLogging: boolean;
  enableRemoteReporting: boolean;
  maxReportsPerSession: number;
  reportingThrottle: number; // milliseconds
}

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private reportCount = 0;
  private lastReportTime = 0;
  private reportQueue: ErrorReport[] = [];
  private isOnline = navigator.onLine;

  constructor(config: ErrorReportingConfig) {
    this.config = config;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushReportQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
        promise: event.promise,
      });
    });

    // Listen for global errors
    window.addEventListener('error', (event) => {
      this.reportError(event.error || new Error(event.message), {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
  }

  /**
   * Report an error
   */
  public reportError(
    error: Error | AppError,
    additionalContext: ErrorContext = {},
    user?: ErrorReport['user']
  ): string {
    // Check throttling
    const now = Date.now();
    if (now - this.lastReportTime < this.config.reportingThrottle) {
      return '';
    }

    // Check max reports per session
    if (this.reportCount >= this.config.maxReportsPerSession) {
      console.warn('Max error reports per session reached');
      return '';
    }

    const reportId = this.generateReportId();
    const report = this.createErrorReport(error, additionalContext, user, reportId);

    this.reportCount++;
    this.lastReportTime = now;

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      this.logToConsole(report);
    }

    // Add to queue for remote reporting
    if (this.config.enableRemoteReporting) {
      this.reportQueue.push(report);
      
      if (this.isOnline) {
        this.flushReportQueue();
      }
    }

    return reportId;
  }

  /**
   * Report a validation error
   */
  public reportValidationError(
    validationError: any,
    formData: any,
    additionalContext: ErrorContext = {}
  ): string {
    return this.reportError(validationError, {
      ...additionalContext,
      type: 'validation_error',
      formData: this.sanitizeFormData(formData),
    });
  }

  /**
   * Report an API error
   */
  public reportApiError(
    error: Error | AppError,
    request: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: any;
    },
    response?: {
      status: number;
      statusText: string;
      headers?: Record<string, string>;
      body?: any;
    }
  ): string {
    return this.reportError(error, {
      type: 'api_error',
      request: {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        body: this.sanitizeRequestBody(request.body),
      },
      response: response ? {
        status: response.status,
        statusText: response.statusText,
        headers: this.sanitizeHeaders(response.headers),
        body: this.sanitizeResponseBody(response.body),
      } : undefined,
    });
  }

  /**
   * Report a performance issue
   */
  public reportPerformanceIssue(
    metric: string,
    value: number,
    threshold: number,
    additionalContext: ErrorContext = {}
  ): string {
    const error = new Error(`Performance threshold exceeded: ${metric} (${value}ms > ${threshold}ms)`);
    return this.reportError(error, {
      ...additionalContext,
      type: 'performance_issue',
      metric,
      value,
      threshold,
    });
  }

  private createErrorReport(
    error: Error | AppError,
    additionalContext: ErrorContext,
    user?: ErrorReport['user'],
    id: string
  ): ErrorReport {
    const isAppError = error instanceof AppError;

    return {
      id,
      timestamp: new Date(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: isAppError ? error.errorCode : undefined,
        category: isAppError ? error.category : undefined,
      },
      context: {
        ...additionalContext,
        ...(isAppError ? error.getContext() : {}),
      },
      user,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
      severity: this.determineSeverity(error, additionalContext),
    };
  }

  private determineSeverity(error: Error | AppError, context: ErrorContext): ErrorReport['severity'] {
    if (error instanceof AppError) {
      switch (error.category) {
        case 'AUTHENTICATION':
        case 'AUTHORIZATION':
          return 'high';
        case 'VALIDATION':
          return 'low';
        case 'BUSINESS':
          return 'medium';
        default:
          return 'medium';
      }
    }

    if (context.type === 'unhandled_promise_rejection' || context.type === 'global_error') {
      return 'critical';
    }

    if (context.type === 'api_error') {
      return 'high';
    }

    return 'medium';
  }

  private generateReportId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logToConsole(report: ErrorReport) {
    const logLevel = report.severity === 'critical' || report.severity === 'high' ? 'error' : 'warn';
    
    console.group(`🚨 Error Report [${report.severity.toUpperCase()}]`);
    console[logLevel]('Error:', report.error);
    console.log('Context:', report.context);
    console.log('Environment:', report.environment);
    if (report.user) {
      console.log('User:', report.user);
    }
    console.log('Report ID:', report.id);
    console.groupEnd();
  }

  private async flushReportQueue() {
    if (this.reportQueue.length === 0 || !this.config.apiEndpoint) {
      return;
    }

    const reportsToSend = [...this.reportQueue];
    this.reportQueue = [];

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          reports: reportsToSend,
          environment: this.config.environment,
        }),
      });
    } catch (error) {
      // If sending fails, put reports back in queue
      this.reportQueue.unshift(...reportsToSend);
      console.error('Failed to send error reports:', error);
    }
  }

  private sanitizeFormData(formData: any): any {
    if (!formData || typeof formData !== 'object') {
      return formData;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...formData };

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeRequestBody(body: any): any {
    return this.sanitizeFormData(body);
  }

  private sanitizeResponseBody(body: any): any {
    // For responses, we might want to limit the size
    if (typeof body === 'string' && body.length > 1000) {
      return body.substring(0, 1000) + '... [TRUNCATED]';
    }
    return body;
  }

  /**
   * Get error statistics
   */
  public getStats() {
    return {
      reportCount: this.reportCount,
      queueLength: this.reportQueue.length,
      isOnline: this.isOnline,
      lastReportTime: this.lastReportTime,
    };
  }

  /**
   * Clear error queue and reset counters
   */
  public reset() {
    this.reportCount = 0;
    this.lastReportTime = 0;
    this.reportQueue = [];
  }
}

// Singleton instance
let errorReportingService: ErrorReportingService | null = null;

export const initializeErrorReporting = (config: ErrorReportingConfig): ErrorReportingService => {
  errorReportingService = new ErrorReportingService(config);
  return errorReportingService;
};

export const getErrorReportingService = (): ErrorReportingService => {
  if (!errorReportingService) {
    throw new Error('Error reporting service not initialized. Call initializeErrorReporting first.');
  }
  return errorReportingService;
};

export { ErrorReportingService };