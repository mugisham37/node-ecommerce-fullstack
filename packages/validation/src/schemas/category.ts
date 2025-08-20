import { z } from 'zod';

// Base category schema
export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9\-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  parentId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Category creation schema
export const CategoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255, 'Category name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  slug: z.string().regex(/^[a-z0-9\-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  parentId: z.string().uuid('Invalid parent category ID').optional(),
});

// Category update schema
export const CategoryUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  slug: z.string().regex(/^[a-z0-9\-]+$/).optional(),
  parentId: z.string().uuid().optional(),
});

// Category filters schema
export const CategoryFiltersSchema = z.object({
  parentId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
  includeChildren: z.boolean().default(false),
});

// Category tree schema
export const CategoryTreeSchema = z.object({
  includeProductCount: z.boolean().default(false),
  maxDepth: z.number().int().positive().max(10).default(5),
});

// Type exports
export type CategoryCreateDTO = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdateDTO = z.infer<typeof CategoryUpdateSchema>;
export type CategoryFiltersDTO = z.infer<typeof CategoryFiltersSchema>;
export type CategoryTreeDTO = z.infer<typeof CategoryTreeSchema>;