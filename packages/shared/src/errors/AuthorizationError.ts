/**
 * Authorization-related errors
 */

import { AppError } from './index';

export class AuthorizationError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'AUTHORIZATION_ERROR', 'AUTHORIZATION', 403, cause);
  }
}

/**
 * Exception thrown when access is forbidden
 */
export class ForbiddenError extends AuthorizationError {
  constructor(resource?: string, action?: string) {
    const message = resource && action 
      ? `Access denied: insufficient permissions to ${action} ${resource}`
      : 'Access denied: insufficient permissions';
    
    super(message);
    this.errorCode = 'FORBIDDEN';
    
    if (resource) {
      this.addContext('resource', resource);
    }
    if (action) {
      this.addContext('action', action);
    }
  }
}

/**
 * Exception thrown when a role is insufficient for an operation
 */
export class InsufficientRoleError extends AuthorizationError {
  constructor(requiredRole: string, currentRole: string) {
    super(`Insufficient role: ${requiredRole} required, but user has ${currentRole}`);
    this.errorCode = 'INSUFFICIENT_ROLE';
    this.addContext('requiredRole', requiredRole);
    this.addContext('currentRole', currentRole);
  }
}

/**
 * Exception thrown when a permission is missing
 */
export class MissingPermissionError extends AuthorizationError {
  constructor(permission: string, resource?: string) {
    const message = resource 
      ? `Missing permission '${permission}' for resource '${resource}'`
      : `Missing permission '${permission}'`;
    
    super(message);
    this.errorCode = 'MISSING_PERMISSION';
    this.addContext('permission', permission);
    
    if (resource) {
      this.addContext('resource', resource);
    }
  }
}