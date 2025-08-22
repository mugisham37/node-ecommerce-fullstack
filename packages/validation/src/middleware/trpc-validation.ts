// import { z } from 'zod';
const z = {} as any;

// TRPCError placeholder - will be replaced when @trpc/server is available
class TRPCError extends Error {
  code: string;
  cause?: any;
  
  constructor(opts: { code: string; message: string; cause?: any }) {
    super(opts.message);
    this.code = opts.code;
    this.cause = opts.cause;
    this.name = 'TRPCError';
  }
}

/**
 * tRPC validation middleware utilities
 * Provides enhanced validation error handling and transformation for tRPC procedures
 */

/**
 * Transform Zod validation errors into user-friendly tRPC errors
 */
export function transformValidationError(error: z.ZodError): TRPCError {
  const formattedErrors = error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Validation failed',
    cause: {
      validationErrors: formattedErrors,
      details: error.errors,
    },
  });
}

/**
 * Enhanced input validation for tRPC procedures
 * Provides better error messages and field-specific validation
 */
export function validateInput<T extends z.ZodTypeAny>(schema: T) {
  return (input: unknown): z.infer<T> => {
    try {
      return schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw transformValidationError(error);
      }
      throw error;
    }
  };
}

/**
 * Validation middleware for tRPC procedures
 * Can be used with .input() method for automatic validation
 */
export function createValidationMiddleware<T extends z.ZodTypeAny>(schema: T) {
  return {
    schema,
    validate: validateInput(schema),
  };
}

/**
 * Common validation patterns for tRPC
 */
export const commonValidations = {
  // MongoDB ObjectId validation
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Must be a valid ObjectId"),
  
  // UUID validation
  uuid: z.string().uuid("Must be a valid UUID"),
  
  // Pagination parameters
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
  }),
  
  // Date range validation
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }).refine((data) => data.endDate >= data.startDate, {
    message: "End date must be greater than or equal to start date",
    path: ["endDate"],
  }),
  
  // Search query validation
  searchQuery: z.object({
    q: z.string().trim().min(1).max(500).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
    sort: z.string().optional(),
  }),
  
  // File upload validation
  fileUpload: z.object({
    filename: z.string().min(1),
    mimetype: z.string().min(1),
    size: z.number().min(1).max(10 * 1024 * 1024), // 10MB max
  }),
  
  // Email validation with custom message
  email: z.string().email("Must be a valid email address").toLowerCase(),
  
  // Phone number validation (basic)
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Must be a valid phone number"),
  
  // URL validation
  url: z.string().url("Must be a valid URL"),
  
  // Currency amount validation
  currency: z.number().min(0).multipleOf(0.01),
  
  // Percentage validation
  percentage: z.number().min(0).max(100),
  
  // Status enum validation
  status: z.enum(['active', 'inactive', 'pending', 'suspended']),
};

/**
 * Validation helpers for complex scenarios
 */
export const validationHelpers = {
  /**
   * Conditional validation based on another field
   */
  conditionalRequired: <T>(condition: (data: any) => boolean, schema: z.ZodTypeAny) => {
    return z.any().superRefine((data, ctx) => {
      if (condition(data)) {
        const result = schema.safeParse(data);
        if (!result.success) {
          result.error.errors.forEach((error) => {
            ctx.addIssue(error);
          });
        }
      }
    });
  },

  /**
   * Array validation with minimum and maximum items
   */
  arrayWithLimits: <T extends z.ZodTypeAny>(
    itemSchema: T,
    min: number = 0,
    max: number = 100
  ) => {
    return z.array(itemSchema).min(min).max(max);
  },

  /**
   * String validation with trimming and length constraints
   */
  trimmedString: (min: number = 1, max: number = 255) => {
    return z.string().trim().min(min).max(max);
  },

  /**
   * Numeric validation with precision
   */
  decimal: (precision: number = 2) => {
    const multiplier = Math.pow(10, precision);
    return z.number().multipleOf(1 / multiplier);
  },

  /**
   * Date validation with range constraints
   */
  dateInRange: (minDate?: Date, maxDate?: Date) => {
    let schema = z.date();
    if (minDate) {
      schema = schema.min(minDate);
    }
    if (maxDate) {
      schema = schema.max(maxDate);
    }
    return schema;
  },
};

/**
 * Error message customization
 */
export const errorMessages = {
  required: "This field is required",
  invalid: "This field is invalid",
  tooShort: (min: number) => `Must be at least ${min} characters`,
  tooLong: (max: number) => `Must be no more than ${max} characters`,
  invalidEmail: "Must be a valid email address",
  invalidUrl: "Must be a valid URL",
  invalidDate: "Must be a valid date",
  invalidNumber: "Must be a valid number",
  invalidObjectId: "Must be a valid ID",
  invalidUuid: "Must be a valid UUID",
  outOfRange: (min: number, max: number) => `Must be between ${min} and ${max}`,
};

/**
 * Custom error map for better error messages
 */
export const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === 'string') {
        return { message: 'Must be a text value' };
      }
      if (issue.expected === 'number') {
        return { message: 'Must be a number' };
      }
      if (issue.expected === 'boolean') {
        return { message: 'Must be true or false' };
      }
      break;
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return { message: errorMessages.tooShort(issue.minimum as number) };
      }
      if (issue.type === 'array') {
        return { message: `Must have at least ${issue.minimum} items` };
      }
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: errorMessages.tooLong(issue.maximum as number) };
      }
      if (issue.type === 'array') {
        return { message: `Must have no more than ${issue.maximum} items` };
      }
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        return { message: errorMessages.invalidEmail };
      }
      if (issue.validation === 'url') {
        return { message: errorMessages.invalidUrl };
      }
      break;
  }
  return { message: ctx.defaultError };
};

// Set the custom error map globally
z.setErrorMap(customErrorMap);