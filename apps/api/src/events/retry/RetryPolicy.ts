/**
 * Retry policy configuration for event processing.
 */
export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

/**
 * Builder for creating retry policies.
 */
export class RetryPolicyBuilder {
  private policy: Partial<RetryPolicy> = {};

  maxAttempts(attempts: number): RetryPolicyBuilder {
    this.policy.maxAttempts = attempts;
    return this;
  }

  initialDelay(delayMs: number): RetryPolicyBuilder {
    this.policy.initialDelayMs = delayMs;
    return this;
  }

  maxDelay(delayMs: number): RetryPolicyBuilder {
    this.policy.maxDelayMs = delayMs;
    return this;
  }

  backoffMultiplier(multiplier: number): RetryPolicyBuilder {
    this.policy.backoffMultiplier = multiplier;
    return this;
  }

  enableJitter(enabled: boolean = true): RetryPolicyBuilder {
    this.policy.jitterEnabled = enabled;
    return this;
  }

  retryableErrors(errors: string[]): RetryPolicyBuilder {
    this.policy.retryableErrors = errors;
    return this;
  }

  nonRetryableErrors(errors: string[]): RetryPolicyBuilder {
    this.policy.nonRetryableErrors = errors;
    return this;
  }

  build(): RetryPolicy {
    return {
      maxAttempts: this.policy.maxAttempts || 3,
      initialDelayMs: this.policy.initialDelayMs || 1000,
      maxDelayMs: this.policy.maxDelayMs || 30000,
      backoffMultiplier: this.policy.backoffMultiplier || 2.0,
      jitterEnabled: this.policy.jitterEnabled || true,
      retryableErrors: this.policy.retryableErrors || [],
      nonRetryableErrors: this.policy.nonRetryableErrors || ['ValidationError', 'AuthenticationError']
    };
  }
}

/**
 * Predefined retry policies for common scenarios.
 */
export class RetryPolicies {
  /**
   * Default retry policy for most events.
   */
  static default(): RetryPolicy {
    return new RetryPolicyBuilder()
      .maxAttempts(3)
      .initialDelay(1000)
      .maxDelay(30000)
      .backoffMultiplier(2.0)
      .enableJitter(true)
      .build();
  }

  /**
   * Aggressive retry policy for critical events.
   */
  static critical(): RetryPolicy {
    return new RetryPolicyBuilder()
      .maxAttempts(5)
      .initialDelay(500)
      .maxDelay(60000)
      .backoffMultiplier(1.5)
      .enableJitter(true)
      .retryableErrors(['TimeoutError', 'ConnectionError', 'ServiceUnavailableError'])
      .build();
  }

  /**
   * Conservative retry policy for non-critical events.
   */
  static conservative(): RetryPolicy {
    return new RetryPolicyBuilder()
      .maxAttempts(2)
      .initialDelay(2000)
      .maxDelay(10000)
      .backoffMultiplier(2.0)
      .enableJitter(false)
      .build();
  }

  /**
   * No retry policy (fail fast).
   */
  static noRetry(): RetryPolicy {
    return new RetryPolicyBuilder()
      .maxAttempts(1)
      .initialDelay(0)
      .maxDelay(0)
      .backoffMultiplier(1.0)
      .enableJitter(false)
      .build();
  }

  /**
   * High-frequency retry policy for real-time events.
   */
  static realTime(): RetryPolicy {
    return new RetryPolicyBuilder()
      .maxAttempts(3)
      .initialDelay(100)
      .maxDelay(1000)
      .backoffMultiplier(2.0)
      .enableJitter(true)
      .build();
  }
}

/**
 * Utility functions for retry policy operations.
 */
export class RetryPolicyUtils {
  /**
   * Calculates the delay for a given attempt using exponential backoff.
   */
  static calculateDelay(attempt: number, policy: RetryPolicy): number {
    let delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, policy.maxDelayMs);

    if (policy.jitterEnabled) {
      // Add random jitter (±25% of the calculated delay)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      delay = Math.max(0, delay + jitter);
    }

    return Math.floor(delay);
  }

  /**
   * Determines if an error is retryable based on the policy.
   */
  static isRetryableError(error: Error, policy: RetryPolicy): boolean {
    const errorName = error.constructor.name;

    // Check non-retryable errors first
    if (policy.nonRetryableErrors.includes(errorName)) {
      return false;
    }

    // If retryable errors are specified, only retry those
    if (policy.retryableErrors.length > 0) {
      return policy.retryableErrors.includes(errorName);
    }

    // Default: retry all errors except non-retryable ones
    return true;
  }

  /**
   * Validates a retry policy configuration.
   */
  static validatePolicy(policy: RetryPolicy): void {
    if (policy.maxAttempts < 1) {
      throw new Error('maxAttempts must be at least 1');
    }

    if (policy.initialDelayMs < 0) {
      throw new Error('initialDelayMs must be non-negative');
    }

    if (policy.maxDelayMs < policy.initialDelayMs) {
      throw new Error('maxDelayMs must be greater than or equal to initialDelayMs');
    }

    if (policy.backoffMultiplier <= 0) {
      throw new Error('backoffMultiplier must be positive');
    }
  }
}

/**
 * Context for retry operations.
 */
export interface RetryContext {
  attempt: number;
  totalAttempts: number;
  lastError?: Error;
  startTime: Date;
  nextRetryTime?: Date;
  metadata: Record<string, any>;
}

/**
 * Result of a retry operation.
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  context: RetryContext;
}