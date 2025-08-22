// import { z } from 'zod';
const z = {} as any;

// Tax validation schemas converted from Joi to Zod

export const createTaxRateSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  rate: z.number().min(0).max(100),
  country: z.string().min(2).max(3).toUpperCase().trim(),
  state: z.string().min(1).max(50).trim().optional(),
  postalCode: z.string().min(1).max(20).trim().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
  productCategories: z.array(
    z.string().regex(/^[0-9a-fA-F]{24}$/, "Product category must be a valid ObjectId")
  ).default([]),
});

export const updateTaxRateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  rate: z.number().min(0).max(100).optional(),
  country: z.string().min(2).max(3).toUpperCase().trim().optional(),
  state: z.string().min(1).max(50).trim().optional(),
  postalCode: z.string().min(1).max(20).trim().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
  productCategories: z.array(
    z.string().regex(/^[0-9a-fA-F]{24}$/, "Product category must be a valid ObjectId")
  ).optional(),
});

export const getApplicableTaxRateQuerySchema = z.object({
  country: z.string().min(2).max(3).toUpperCase().trim(),
  state: z.string().min(1).max(50).trim().optional(),
  postalCode: z.string().min(1).max(20).trim().optional(),
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Category ID must be a valid ObjectId").optional(),
});

export const calculateTaxQuerySchema = z.object({
  amount: z.number().min(0),
  country: z.string().min(2).max(3).toUpperCase().trim(),
  state: z.string().min(1).max(50).trim().optional(),
  postalCode: z.string().min(1).max(20).trim().optional(),
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Category ID must be a valid ObjectId").optional(),
});

export const taxRateIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Tax rate ID must be a valid ObjectId"),
});

// Type exports
export type CreateTaxRateInput = z.infer<typeof createTaxRateSchema>;
export type UpdateTaxRateInput = z.infer<typeof updateTaxRateSchema>;
export type GetApplicableTaxRateQuery = z.infer<typeof getApplicableTaxRateQuerySchema>;
export type CalculateTaxQuery = z.infer<typeof calculateTaxQuerySchema>;
export type TaxRateIdParam = z.infer<typeof taxRateIdParamSchema>;