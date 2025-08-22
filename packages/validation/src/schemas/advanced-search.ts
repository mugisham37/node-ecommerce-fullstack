// import { z } from 'zod';
const z = {} as any;

// Advanced search validation schemas converted from Joi to Zod

export const advancedSearchQuerySchema = z.object({
  q: z.string().trim().max(500).optional().default(''),
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort: z.enum([
    'relevance',
    'price_asc',
    'price_desc',
    'name_asc',
    'name_desc',
    'created_desc',
    'created_asc',
    'rating_desc'
  ]).default('relevance'),
  includeFacets: z.boolean().default(true),
  category: z.string().regex(/^[0-9a-fA-F]{24}$/, "Category must be a valid ObjectId").optional(),
  vendor: z.string().regex(/^[0-9a-fA-F]{24}$/, "Vendor must be a valid ObjectId").optional(),
  minPrice: z.number().min(0).max(1000000).optional(),
  maxPrice: z.number().min(0).max(1000000).optional(),
  rating: z.number().min(0).max(5).optional(),
  inStock: z.boolean().optional(),
  featured: z.boolean().optional(),
  onSale: z.boolean().optional(),
  attributes: z.string().transform((val, ctx) => {
    try {
      return JSON.parse(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Attributes must be valid JSON",
      });
      return z.NEVER;
    }
  }).optional(),
  tags: z.union([
    z.string().trim(),
    z.array(z.string().trim().max(50)).max(20)
  ]).optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
}).refine((data) => {
  if (data.minPrice && data.maxPrice && data.minPrice > data.maxPrice) {
    return false;
  }
  return true;
}, {
  message: "Minimum price cannot be greater than maximum price",
  path: ["minPrice"],
}).refine((data) => {
  if (data.createdAfter && data.createdBefore && data.createdAfter > data.createdBefore) {
    return false;
  }
  return true;
}, {
  message: "Created after date cannot be after created before date",
  path: ["createdAfter"],
});

export const productSuggestionsQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.number().int().min(1).max(20).default(5),
  includeCategories: z.boolean().default(true),
  includeVendors: z.boolean().default(true),
});

export const popularSearchesQuerySchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('week'),
});

const filtersSchema = z.object({
  category: z.string().regex(/^[0-9a-fA-F]{24}$/, "Category must be a valid ObjectId").optional(),
  vendor: z.string().regex(/^[0-9a-fA-F]{24}$/, "Vendor must be a valid ObjectId").optional(),
  minPrice: z.number().min(0).max(1000000).optional(),
  maxPrice: z.number().min(0).max(1000000).optional(),
  rating: z.number().min(0).max(5).optional(),
  inStock: z.boolean().optional(),
  featured: z.boolean().optional(),
  onSale: z.boolean().optional(),
  attributes: z.record(z.any()).optional(),
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
}).refine((data) => {
  if (data.minPrice && data.maxPrice && data.minPrice > data.maxPrice) {
    return false;
  }
  return true;
}, {
  message: "Minimum price cannot be greater than maximum price",
  path: ["minPrice"],
}).refine((data) => {
  if (data.createdAfter && data.createdBefore && data.createdAfter > data.createdBefore) {
    return false;
  }
  return true;
}, {
  message: "Created after date cannot be after created before date",
  path: ["createdAfter"],
});

export const filteredSearchSchema = z.object({
  query: z.string().trim().max(500).default(''),
  filters: filtersSchema.default({}),
  sort: z.enum([
    'relevance',
    'price_asc',
    'price_desc',
    'name_asc',
    'name_desc',
    'created_desc',
    'created_asc',
    'rating_desc'
  ]).default('relevance'),
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  includeFacets: z.boolean().default(true),
});

export const searchFacetsQuerySchema = z.object({
  q: z.string().trim().max(500).default(''),
  filters: z.string().transform((val, ctx) => {
    try {
      return JSON.parse(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Filters must be valid JSON",
      });
      return z.NEVER;
    }
  }).default('{}'),
});

// Type exports
export type AdvancedSearchQuery = any; // z.infer<typeof advancedSearchQuerySchema>;
export type ProductSuggestionsQuery = any; // z.infer<typeof productSuggestionsQuerySchema>;
export type PopularSearchesQuery = any; // z.infer<typeof popularSearchesQuerySchema>;
export type FilteredSearchInput = any; // z.infer<typeof filteredSearchSchema>;
export type SearchFacetsQuery = any; // z.infer<typeof searchFacetsQuerySchema>;