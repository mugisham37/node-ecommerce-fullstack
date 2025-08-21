/**
 * Exception thrown when business validation rules are violated
 * Converted from ValidationException.java
 */

import { AppError } from './index';

export interface ValidationErrorDetails {
  [field: string]: string;
}

export class ValidationError extends AppError {
  private readonly validationErrors: ValidationErrorDetails;

  constructor(message: string, validationErrors?: ValidationErrorDetails) {
    super(message, 'VALIDATION_ERROR', 'VALIDATION', 400);
    this.validationErrors = validationErrors || {};
    
    if (validationErrors) {
      this.addContext('validationErrors', validationErrors);
      this.addContext('errorCount', Object.keys(validationErrors).length);
    }
  }

  /**
   * Create a validation error for a single field
   */
  static forField(field: string, error: string): ValidationError {
    const validationError = new ValidationError(`Validation failed for field: ${field}`, {
      [field]: error,
    });
    validationError.addContext('field', field);
    validationError.addContext('error', error);
    return validationError;
  }

  /**
   * Create a validation error with multiple field errors
   */
  static forFields(validationErrors: ValidationErrorDetails): ValidationError {
    const errorCount = Object.keys(validationErrors).length;
    return new ValidationError(
      `Validation failed for ${errorCount} field${errorCount > 1 ? 's' : ''}`,
      validationErrors
    );
  }

  public getValidationErrors(): ValidationErrorDetails {
    return { ...this.validationErrors };
  }

  public addValidationError(field: string, error: string): void {
    this.validationErrors[field] = error;
    this.addContext('validationErrors', this.validationErrors);
    this.addContext('errorCount', Object.keys(this.validationErrors).length);
  }

  public hasValidationErrors(): boolean {
    return Object.keys(this.validationErrors).length > 0;
  }

  public getFieldError(field: string): string | undefined {
    return this.validationErrors[field];
  }

  public getFieldNames(): string[] {
    return Object.keys(this.validationErrors);
  }
}