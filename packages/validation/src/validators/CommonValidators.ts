/**
 * Common validation schemas used across the application
 */

import { z } from 'zod';

/**
 * UUID validation
 */
export const UUIDSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * Slug validation (URL-friendly strings)
 */
export const SlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(100, 'Slug cannot exceed 100 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

/**
 * SKU validation (Stock Keeping Unit)
 */
export const SKUSchema = z
  .string()
  .min(1, 'SKU is required')
  .max(50, 'SKU cannot exceed 50 characters')
  .regex(/^[A-Z0-9-]+$/, 'SKU must contain only uppercase letters, numbers, and hyphens');

/**
 * Quantity validation
 */
export const QuantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .min(0, 'Quantity cannot be negative');

/**
 * Positive quantity validation (for orders, stock adjustments)
 */
export const PositiveQuantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1');

/**
 * Password validation
 */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character');

/**
 * Role validation
 */
export const RoleSchema = z.enum(['ADMIN', 'MANAGER', 'USER', 'VIEWER'], {
  errorMap: () => ({ message: 'Invalid role' }),
});

/**
 * Order status validation
 */
export const OrderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED'
], {
  errorMap: () => ({ message: 'Invalid order status' }),
});

/**
 * Product name validation
 */
export const ProductNameSchema = z
  .string()
  .min(1, 'Product name is required')
  .max(255, 'Product name cannot exceed 255 characters')
  .regex(/^[a-zA-Z0-9\s\-_.,()&]+$/, 'Product name contains invalid characters');

/**
 * Description validation
 */
export const DescriptionSchema = z
  .string()
  .max(2000, 'Description cannot exceed 2000 characters')
  .optional();

/**
 * URL validation
 */
export const URLSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL cannot exceed 2048 characters');

/**
 * Optional URL validation
 */
export const OptionalURLSchema = URLSchema.optional().or(z.literal(''));

/**
 * Date validation
 */
export const DateSchema = z
  .string()
  .datetime('Invalid date format')
  .or(z.date())
  .transform((val) => new Date(val));

/**
 * Future date validation
 */
export const FutureDateSchema = DateSchema
  .refine((date) => date > new Date(), 'Date must be in the future');

/**
 * Past date validation
 */
export const PastDateSchema = DateSchema
  .refine((date) => date < new Date(), 'Date must be in the past');

/**
 * Pagination validation
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
});

/**
 * Sort order validation
 */
export const SortOrderSchema = z.enum(['asc', 'desc'], {
  errorMap: () => ({ message: 'Sort order must be either "asc" or "desc"' }),
});

/**
 * Search query validation
 */
export const SearchQuerySchema = z
  .string()
  .min(1, 'Search query cannot be empty')
  .max(100, 'Search query cannot exceed 100 characters')
  .trim();

/**
 * File validation
 */
export const FileTypeSchema = z.enum([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
], {
  errorMap: () => ({ message: 'Invalid file type' }),
});

/**
 * Image file validation
 */
export const ImageFileTypeSchema = z.enum([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
], {
  errorMap: () => ({ message: 'Invalid image file type' }),
});

/**
 * File size validation (in bytes)
 */
export const FileSizeSchema = z
  .number()
  .int()
  .min(1, 'File size must be at least 1 byte')
  .max(10 * 1024 * 1024, 'File size cannot exceed 10MB'); // 10MB limit

/**
 * Image dimensions validation
 */
export const ImageDimensionsSchema = z.object({
  width: z.number().int().min(1, 'Width must be at least 1 pixel').max(4096, 'Width cannot exceed 4096 pixels'),
  height: z.number().int().min(1, 'Height must be at least 1 pixel').max(4096, 'Height cannot exceed 4096 pixels'),
});

// Export types
export type UUID = z.infer<typeof UUIDSchema>;
export type Slug = z.infer<typeof SlugSchema>;
export type SKU = z.infer<typeof SKUSchema>;
export type Quantity = z.infer<typeof QuantitySchema>;
export type PositiveQuantity = z.infer<typeof PositiveQuantitySchema>;
export type Password = z.infer<typeof PasswordSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type ProductName = z.infer<typeof ProductNameSchema>;
export type Description = z.infer<typeof DescriptionSchema>;
export type URL = z.infer<typeof URLSchema>;
export type OptionalURL = z.infer<typeof OptionalURLSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type SortOrder = z.infer<typeof SortOrderSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type FileType = z.infer<typeof FileTypeSchema>;
export type ImageFileType = z.infer<typeof ImageFileTypeSchema>;
export type FileSize = z.infer<typeof FileSizeSchema>;
export type ImageDimensions = z.infer<typeof ImageDimensionsSchema>;