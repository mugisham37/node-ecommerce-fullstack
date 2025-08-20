import { z } from 'zod';

// Base product schema
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().regex(/^[A-Z0-9\-]{3,20}$/, 'SKU must be 3-20 characters, uppercase letters, numbers, and hyphens only'),
  price: z.number().positive('Price must be positive'),
  categoryId: z.string().uuid(),
  supplierId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Product creation schema
export const ProductCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Product name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  sku: z.string().regex(/^[A-Z0-9\-]{3,20}$/, 'SKU must be 3-20 characters, uppercase letters, numbers, and hyphens only'),
  price: z.number().positive('Price must be positive').max(999999.99, 'Price too high'),
  categoryId: z.string().uuid('Invalid category ID'),
  supplierId: z.string().uuid('Invalid supplier ID'),
});

// Product update schema
export const ProductUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  sku: z.string().regex(/^[A-Z0-9\-]{3,20}$/).optional(),
  price: z.number().positive().max(999999.99).optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
});

// Product filters schema
export const ProductFiltersSchema = z.object({
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  inStock: z.boolean().optional(),
  search: z.string().max(255).optional(),
});

// Product bulk update schema
export const ProductBulkUpdateSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, 'At least one product ID is required'),
  updates: z.object({
    categoryId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    price: z.number().positive().optional(),
  }),
});

// Product import schema
export const ProductImportSchema = z.object({
  products: z.array(ProductCreateSchema).min(1, 'At least one product is required'),
  validateOnly: z.boolean().default(false),
});

// Type exports
export type ProductCreateDTO = z.infer<typeof ProductCreateSchema>;
export type ProductUpdateDTO = z.infer<typeof ProductUpdateSchema>;
export type ProductFiltersDTO = z.infer<typeof ProductFiltersSchema>;
export type ProductBulkUpdateDTO = z.infer<typeof ProductBulkUpdateSchema>;
export type ProductImportDTO = z.infer<typeof ProductImportSchema>;