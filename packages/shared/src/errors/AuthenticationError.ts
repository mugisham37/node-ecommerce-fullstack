/**
 * Authentication-related errors
 */

import { AppError } from './index';

export class AuthenticationError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'AUTHENTICATION_ERROR', 'AUTHENTICATION', 401, cause);
  }
}

/**
 * Exception thrown when credentials are invalid
 */
export class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super('Invalid email or password');
    this.errorCode = 'INVALID_CREDENTIALS';
  }
}

/**
 * Exception thrown when a token is invalid or expired
 */
export class InvalidTokenError extends AuthenticationError {
  constructor(tokenType: string = 'access token') {
    super(`Invalid or expired ${tokenType}`);
    this.errorCode = 'INVALID_TOKEN';
    this.addContext('tokenType', tokenType);
  }
}

/**
 * Exception thrown when a user account is locked
 */
export class AccountLockedError extends AuthenticationError {
  constructor(email: string, lockReason?: string) {
    super(`Account ${email} is locked${lockReason ? `: ${lockReason}` : ''}`);
    this.errorCode = 'ACCOUNT_LOCKED';
    this.addContext('email', email);
    if (lockReason) {
      this.addContext('lockReason', lockReason);
    }
  }
}

/**
 * Exception thrown when a user account is not verified
 */
export class AccountNotVerifiedError extends AuthenticationError {
  constructor(email: string) {
    super(`Account ${email} is not verified`);
    this.errorCode = 'ACCOUNT_NOT_VERIFIED';
    this.addContext('email', email);
  }
}