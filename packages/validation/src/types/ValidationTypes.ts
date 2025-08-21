/**
 * Common validation types and interfaces
 */

import { z } from 'zod';

/**
 * Validation result interface
 */
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

/**
 * Validation context for complex validations
 */
export interface ValidationContext {
  userId?: string;
  userRole?: string;
  organizationId?: string;
  requestId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Validation rule interface
 */
export interface ValidationRule<T = any> {
  name: string;
  message: string;
  validate: (value: T, context?: ValidationContext) => boolean | Promise<boolean>;
}

/**
 * Field validation configuration
 */
export interface FieldValidationConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customRules?: ValidationRule[];
}

/**
 * Form validation configuration
 */
export interface FormValidationConfig {
  fields: Record<string, FieldValidationConfig>;
  globalRules?: ValidationRule[];
}

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Bulk validation result
 */
export interface BulkValidationResult<T = any> {
  totalItems: number;
  validItems: T[];
  invalidItems: Array<{
    index: number;
    item: any;
    errors: Record<string, string>;
  }>;
  summary: {
    validCount: number;
    invalidCount: number;
    successRate: number;
  };
}

/**
 * Validation schema registry entry
 */
export interface SchemaRegistryEntry {
  name: string;
  version: string;
  schema: z.ZodSchema;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Validation middleware options
 */
export interface ValidationMiddlewareOptions {
  schema: z.ZodSchema;
  source: 'body' | 'query' | 'params' | 'headers';
  sanitize?: boolean;
  stripUnknown?: boolean;
  errorHandler?: (errors: Record<string, string>) => any;
}

/**
 * Async validation function type
 */
export type AsyncValidator<T = any> = (
  data: unknown,
  context?: ValidationContext
) => Promise<T>;

/**
 * Sync validation function type
 */
export type SyncValidator<T = any> = (
  data: unknown,
  context?: ValidationContext
) => T;

/**
 * Validation function type (sync or async)
 */
export type Validator<T = any> = SyncValidator<T> | AsyncValidator<T>;

/**
 * Schema transformation function type
 */
export type SchemaTransformer<TInput, TOutput> = (
  input: TInput
) => TOutput | Promise<TOutput>;

/**
 * Validation event types
 */
export type ValidationEvent = 
  | 'validation_started'
  | 'validation_completed'
  | 'validation_failed'
  | 'validation_error'
  | 'schema_registered'
  | 'schema_updated';

/**
 * Validation event handler
 */
export interface ValidationEventHandler {
  event: ValidationEvent;
  handler: (data: any) => void | Promise<void>;
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageValidationTime: number;
  errorsByField: Record<string, number>;
  errorsBySchema: Record<string, number>;
}

/**
 * Schema validation options
 */
export interface SchemaValidationOptions {
  strict?: boolean;
  stripUnknown?: boolean;
  abortEarly?: boolean;
  recursive?: boolean;
  context?: ValidationContext;
}

/**
 * Custom validation error class interface
 */
export interface IValidationError extends Error {
  code: string;
  field?: string;
  value?: any;
  context?: ValidationContext;
}

/**
 * Validation pipeline stage
 */
export interface ValidationStage<TInput = any, TOutput = any> {
  name: string;
  validator: Validator<TOutput>;
  transformer?: SchemaTransformer<TInput, TOutput>;
  optional?: boolean;
  condition?: (data: TInput) => boolean;
}

/**
 * Validation pipeline configuration
 */
export interface ValidationPipelineConfig<T = any> {
  stages: ValidationStage[];
  onStageComplete?: (stageName: string, result: T) => void;
  onStageError?: (stageName: string, error: Error) => void;
  onPipelineComplete?: (result: T) => void;
  onPipelineError?: (error: Error) => void;
}