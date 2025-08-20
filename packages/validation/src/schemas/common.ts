import { z } from 'zod';

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Search schema
export const SearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(255, 'Search query too long'),
  fields: z.array(z.string()).optional(),
  exact: z.boolean().default(false),
});

// Date range schema
export const DateRangeSchema = z.object({
  from: z.date(),
  to: z.date(),
}).refine((data) => data.from <= data.to, {
  message: "From date must be before or equal to to date",
  path: ["to"],
});

// File upload schema
export const FileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.string().min(1, 'MIME type is required'),
  size: z.number().int().positive().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  buffer: z.instanceof(Buffer).optional(),
  url: z.string().url().optional(),
});

// Bulk operation schema
export const BulkOperationSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required').max(100, 'Too many IDs'),
  operation: z.enum(['delete', 'update', 'export']),
  validateOnly: z.boolean().default(false),
});

// Export schema
export const ExportSchema = z.object({
  format: z.enum(['json', 'csv', 'excel', 'pdf']).default('json'),
  fields: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  filename: z.string().optional(),
});

// Import schema
export const ImportSchema = z.object({
  format: z.enum(['json', 'csv', 'excel']),
  data: z.any(),
  validateOnly: z.boolean().default(false),
  skipErrors: z.boolean().default(false),
  mapping: z.record(z.string()).optional(),
});

// Health check schema
export const HealthCheckSchema = z.object({
  service: z.string().min(1),
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  timestamp: z.date(),
  details: z.record(z.any()).optional(),
});

// API response schema
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.date().default(() => new Date()),
  });

// Paged response schema
export const PagedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
    }),
  });

// Error schema
export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  statusCode: z.number().int().min(100).max(599),
  details: z.any().optional(),
  timestamp: z.date().default(() => new Date()),
});

// Validation error schema
export const ValidationErrorSchema = ErrorSchema.extend({
  code: z.literal('VALIDATION_ERROR'),
  field: z.string().optional(),
  value: z.any().optional(),
});

// Not found error schema
export const NotFoundErrorSchema = ErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
  resource: z.string(),
  id: z.string().optional(),
});

// ID parameter schema
export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// Slug parameter schema
export const SlugParamSchema = z.object({
  slug: z.string().regex(/^[a-z0-9\-]+$/, 'Invalid slug format'),
});

// Type exports
export type PaginationDTO = z.infer<typeof PaginationSchema>;
export type SearchDTO = z.infer<typeof SearchSchema>;
export type DateRangeDTO = z.infer<typeof DateRangeSchema>;
export type FileUploadDTO = z.infer<typeof FileUploadSchema>;
export type BulkOperationDTO = z.infer<typeof BulkOperationSchema>;
export type ExportDTO = z.infer<typeof ExportSchema>;
export type ImportDTO = z.infer<typeof ImportSchema>;
export type HealthCheckDTO = z.infer<typeof HealthCheckSchema>;
export type ErrorDTO = z.infer<typeof ErrorSchema>;
export type ValidationErrorDTO = z.infer<typeof ValidationErrorSchema>;
export type NotFoundErrorDTO = z.infer<typeof NotFoundErrorSchema>;
export type IdParamDTO = z.infer<typeof IdParamSchema>;
export type SlugParamDTO = z.infer<typeof SlugParamSchema>;