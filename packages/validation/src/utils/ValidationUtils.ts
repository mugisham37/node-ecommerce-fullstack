/**
 * Validation utility functions
 */

import { z } from 'zod';
import { ValidationError } from '@ecommerce/shared/errors';

/**
 * Validate data against a Zod schema and throw ValidationError on failure
 */
export const validateOrThrow = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const validationErrors: Record<string, string> = {};
    
    result.error.errors.forEach((error) => {
      const path = error.path.join('.');
      validationErrors[path] = error.message;
    });
    
    throw ValidationError.forFields(validationErrors);
  }
  
  return result.data;
};

/**
 * Validate data and return validation result
 */
export const validateSafely = <T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((error) => {
    const path = error.path.join('.');
    errors[path] = error.message;
  });
  
  return { success: false, errors };
};

/**
 * Create a validation function that returns a promise
 */
export const createAsyncValidator = <T>(
  schema: z.ZodSchema<T>
) => {
  return async (data: unknown): Promise<T> => {
    return validateOrThrow(schema, data);
  };
};

/**
 * Combine multiple validation schemas
 */
export const combineSchemas = <T extends Record<string, z.ZodSchema>>(
  schemas: T
): z.ZodObject<T> => {
  return z.object(schemas);
};

/**
 * Create a conditional validation schema
 */
export const conditionalSchema = <T, U>(
  condition: (data: any) => boolean,
  trueSchema: z.ZodSchema<T>,
  falseSchema: z.ZodSchema<U>
): z.ZodSchema<T | U> => {
  return z.union([trueSchema, falseSchema]).refine((data) => {
    if (condition(data)) {
      return trueSchema.safeParse(data).success;
    } else {
      return falseSchema.safeParse(data).success;
    }
  });
};

/**
 * Create a schema that validates array items
 */
export const arrayItemSchema = <T>(
  itemSchema: z.ZodSchema<T>,
  minItems: number = 0,
  maxItems?: number
): z.ZodArray<z.ZodSchema<T>> => {
  let schema = z.array(itemSchema).min(minItems);
  
  if (maxItems !== undefined) {
    schema = schema.max(maxItems);
  }
  
  return schema;
};

/**
 * Create a schema for partial updates (all fields optional)
 */
export const createUpdateSchema = <T extends z.ZodRawShape>(
  baseSchema: z.ZodObject<T>
): z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }> => {
  return baseSchema.partial();
};

/**
 * Sanitize input data by removing undefined values and trimming strings
 */
export const sanitizeInput = (data: any): any => {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    return data.trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined) {
        sanitized[key] = sanitizeInput(value);
      }
    });
    
    return sanitized;
  }
  
  return data;
};

/**
 * Transform validation errors to a more user-friendly format
 */
export const formatValidationErrors = (errors: Record<string, string>): Record<string, string> => {
  const formatted: Record<string, string> = {};
  
  Object.entries(errors).forEach(([field, message]) => {
    // Convert field paths to more readable format
    const readableField = field
      .split('.')
      .map(part => {
        // Convert camelCase to Title Case
        return part.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      })
      .join(' > ');
    
    formatted[readableField] = message;
  });
  
  return formatted;
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
};

/**
 * Create a debounced validation function
 */
export const createDebouncedValidator = <T>(
  validator: (data: unknown) => Promise<T>,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;
  
  return (data: unknown): Promise<T> => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        try {
          const result = await validator(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
};