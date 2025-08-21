/**
 * Product validation schemas
 */

import { z } from 'zod';
import { 
  UUIDSchema, 
  SKUSchema, 
  ProductNameSchema, 
  DescriptionSchema, 
  QuantitySchema,
  OptionalURLSchema 
} from './CommonValidators';
import { PriceSchema } from './PriceValidator';

/**
 * Product creation validation
 */
export const ProductCreateSchema = z.object({
  name: ProductNameSchema,
  description: DescriptionSchema,
  sku: SKUSchema,
  price: PriceSchema,
  categoryId: UUIDSchema,
  supplierId: UUIDSchema,
  imageUrl: OptionalURLSchema,
  weight: z.number().min(0, 'Weight cannot be negative').optional(),
  dimensions: z.object({
    length: z.number().min(0, 'Length cannot be negative'),
    width: z.number().min(0, 'Width cannot be negative'),
    height: z.number().min(0, 'Height cannot be negative'),
  }).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10, 'Cannot have more than 10 tags').optional(),
  isActive: z.boolean().default(true),
});

/**
 * Product update validation
 */
export const ProductUpdateSchema = ProductCreateSchema.partial().extend({
  id: UUIDSchema,
});

/**
 * Product query/filter validation
 */
export const ProductQuerySchema = z.object({
  categoryId: UUIDSchema.optional(),
  supplierId: UUIDSchema.optional(),
  minPrice: PriceSchema.optional(),
  maxPrice: PriceSchema.optional(),
  isActive: z.boolean().optional(),
  search: z.string().min(1).max(100).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Bulk product operation validation
 */
export const BulkProductOperationSchema = z.object({
  productIds: z.array(UUIDSchema).min(1, 'At least one product ID is required').max(100, 'Cannot process more than 100 products at once'),
  operation: z.enum(['activate', 'deactivate', 'delete', 'update_category', 'update_supplier']),
  data: z.record(z.any()).optional(), // Additional data for the operation
});

/**
 * Product inventory validation
 */
export const ProductInventorySchema = z.object({
  productId: UUIDSchema,
  quantity: QuantitySchema,
  reservedQuantity: QuantitySchema.default(0),
  reorderLevel: QuantitySchema.default(10),
  maxStockLevel: QuantitySchema.optional(),
  location: z.string().max(100).optional(),
});

/**
 * Product category validation
 */
export const ProductCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name cannot exceed 100 characters'),
  description: DescriptionSchema,
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  parentId: UUIDSchema.optional(),
  imageUrl: OptionalURLSchema,
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * Product variant validation
 */
export const ProductVariantSchema = z.object({
  productId: UUIDSchema,
  name: z.string().min(1, 'Variant name is required').max(100),
  sku: SKUSchema,
  price: PriceSchema,
  attributes: z.record(z.string(), z.string()).optional(), // e.g., { "color": "red", "size": "large" }
  imageUrl: OptionalURLSchema,
  isActive: z.boolean().default(true),
});

/**
 * Product review validation
 */
export const ProductReviewSchema = z.object({
  productId: UUIDSchema,
  userId: UUIDSchema,
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().min(1, 'Review title is required').max(100),
  comment: z.string().min(1, 'Review comment is required').max(1000),
  isVerifiedPurchase: z.boolean().default(false),
});

/**
 * Product import validation (for bulk imports)
 */
export const ProductImportSchema = z.object({
  name: ProductNameSchema,
  description: DescriptionSchema,
  sku: SKUSchema,
  price: z.string().transform((val) => parseFloat(val)).pipe(PriceSchema),
  categoryName: z.string().min(1, 'Category name is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  initialStock: z.string().transform((val) => parseInt(val, 10)).pipe(QuantitySchema).optional(),
  reorderLevel: z.string().transform((val) => parseInt(val, 10)).pipe(QuantitySchema).optional(),
  weight: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0)).optional(),
  tags: z.string().transform((val) => val.split(',').map(tag => tag.trim())).optional(),
});

// Export types
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type ProductQuery = z.infer<typeof ProductQuerySchema>;
export type BulkProductOperation = z.infer<typeof BulkProductOperationSchema>;
export type ProductInventory = z.infer<typeof ProductInventorySchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type ProductReview = z.infer<typeof ProductReviewSchema>;
export type ProductImport = z.infer<typeof ProductImportSchema>;