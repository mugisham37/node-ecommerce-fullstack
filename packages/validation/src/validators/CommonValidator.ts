import { z } from 'zod';

/**
 * Common validation utilities and schemas
 */

/**
 * UUID validator
 */
export const UuidValidator = z.string().uuid('Invalid UUID format');

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).optional(),
});

/**
 * Sort schema
 */
export const SortSchema = z.object({
  sortBy: z.string().min(1),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Date range schema
 */
export const DateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start < end;
}, {
  message: 'Start date must be before end date',
  path: ['endDate'],
});

/**
 * Search schema
 */
export const SearchSchema = z.object({
  query: z.string().max(255).optional(),
  filters: z.record(z.any()).optional(),
}).merge(PaginationSchema).merge(SortSchema);

/**
 * File upload schema
 */
export const FileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.string().min(1, 'MIME type is required'),
  size: z.number().int().min(1, 'File size must be greater than 0'),
  buffer: z.instanceof(Buffer).optional(),
  path: z.string().optional(),
});

/**
 * Image upload schema with validation
 */
export const ImageUploadSchema = FileUploadSchema.extend({
  mimetype: z.enum([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ], {
    errorMap: () => ({ message: 'Invalid image format. Allowed: JPEG, PNG, GIF, WebP, SVG' }),
  }),
  size: z.number().int().max(10 * 1024 * 1024, 'Image size cannot exceed 10MB'),
});

/**
 * Document upload schema
 */
export const DocumentUploadSchema = FileUploadSchema.extend({
  mimetype: z.enum([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ], {
    errorMap: () => ({ message: 'Invalid document format. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV' }),
  }),
  size: z.number().int().max(50 * 1024 * 1024, 'Document size cannot exceed 50MB'),
});

/**
 * URL validator
 */
export const UrlValidator = z.string().url('Invalid URL format');

/**
 * Slug validator (URL-friendly string)
 */
export const SlugValidator = z
  .string()
  .min(1, 'Slug is required')
  .max(100, 'Slug must not exceed 100 characters')
  .refine((value) => {
    return /^[a-z0-9\-]+$/.test(value);
  }, 'Slug must contain only lowercase letters, numbers, and hyphens')
  .refine((value) => {
    return !value.startsWith('-') && !value.endsWith('-');
  }, 'Slug cannot start or end with a hyphen')
  .refine((value) => {
    return !value.includes('--');
  }, 'Slug cannot contain consecutive hyphens');

/**
 * Color hex validator
 */
export const ColorHexValidator = z
  .string()
  .refine((value) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
  }, 'Invalid hex color format (e.g., #FF0000 or #F00)');

/**
 * JSON string validator
 */
export const JsonStringValidator = z
  .string()
  .refine((value) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid JSON format');

/**
 * Coordinate validator (latitude, longitude)
 */
export const CoordinateValidator = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * Currency code validator (ISO 4217)
 */
export const CurrencyCodeValidator = z
  .string()
  .length(3, 'Currency code must be 3 characters')
  .toUpperCase()
  .refine((value) => {
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
      'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW',
    ];
    return validCurrencies.includes(value);
  }, 'Invalid currency code');

/**
 * Language code validator (ISO 639-1)
 */
export const LanguageCodeValidator = z
  .string()
  .length(2, 'Language code must be 2 characters')
  .toLowerCase()
  .refine((value) => {
    const validLanguages = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
      'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi', 'he',
    ];
    return validLanguages.includes(value);
  }, 'Invalid language code');

/**
 * Country code validator (ISO 3166-1 alpha-2)
 */
export const CountryCodeValidator = z
  .string()
  .length(2, 'Country code must be 2 characters')
  .toUpperCase()
  .refine((value) => {
    const validCountries = [
      'US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'AU', 'JP', 'KR',
      'CN', 'IN', 'BR', 'MX', 'RU', 'TR', 'SA', 'AE', 'SG', 'NL',
    ];
    return validCountries.includes(value);
  }, 'Invalid country code');

/**
 * Timezone validator
 */
export const TimezoneValidator = z
  .string()
  .refine((value) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Invalid timezone');

/**
 * IP address validator
 */
export const IpAddressValidator = z
  .string()
  .refine((value) => {
    // IPv4 pattern
    const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // IPv6 pattern (simplified)
    const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Pattern.test(value) || ipv6Pattern.test(value);
  }, 'Invalid IP address format');

/**
 * Semantic version validator
 */
export const SemanticVersionValidator = z
  .string()
  .refine((value) => {
    return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(value);
  }, 'Invalid semantic version format (e.g., 1.0.0, 1.0.0-alpha.1)');

/**
 * Create enum validator from array
 */
export const createEnumValidator = <T extends readonly string[]>(
  values: T,
  errorMessage?: string
) => {
  return z.enum(values as [T[0], ...T[]], {
    errorMap: () => ({ 
      message: errorMessage || `Invalid value. Must be one of: ${values.join(', ')}` 
    }),
  });
};

/**
 * Create optional field with default
 */
export const optionalWithDefault = <T>(schema: z.ZodType<T>, defaultValue: T) => {
  return schema.optional().default(defaultValue);
};

/**
 * Create conditional validator
 */
export const conditionalValidator = <T>(
  condition: (data: any) => boolean,
  trueSchema: z.ZodType<T>,
  falseSchema: z.ZodType<T>
) => {
  return z.any().superRefine((data, ctx) => {
    const schema = condition(data) ? trueSchema : falseSchema;
    const result = schema.safeParse(data);
    
    if (!result.success) {
      result.error.issues.forEach(issue => {
        ctx.addIssue(issue);
      });
    }
  });
};

export type Pagination = z.infer<typeof PaginationSchema>;
export type Sort = z.infer<typeof SortSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type Search = z.infer<typeof SearchSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type ImageUpload = z.infer<typeof ImageUploadSchema>;
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type Coordinate = z.infer<typeof CoordinateValidator>;