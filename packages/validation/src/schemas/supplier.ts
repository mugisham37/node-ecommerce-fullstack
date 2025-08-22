import { z } from 'zod';
// import { SupplierStatus } from '@ecommerce/shared/types';
type SupplierStatus = 'active' | 'inactive' | 'pending' | 'suspended';

// Base supplier schema
export const SupplierSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  status: z.nativeEnum(SupplierStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Supplier creation schema
export const SupplierCreateSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255, 'Supplier name too long'),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Invalid phone number format').optional(),
  address: z.string().max(500, 'Address too long').optional(),
  contactPerson: z.string().max(255, 'Contact person name too long').optional(),
  status: z.nativeEnum(SupplierStatus).default(SupplierStatus.ACTIVE),
});

// Supplier update schema
export const SupplierUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]{10,}$/).optional(),
  address: z.string().max(500).optional(),
  contactPerson: z.string().max(255).optional(),
  status: z.nativeEnum(SupplierStatus).optional(),
});

// Supplier filters schema
export const SupplierFiltersSchema = z.object({
  status: z.nativeEnum(SupplierStatus).optional(),
  search: z.string().max(255).optional(),
  hasProducts: z.boolean().optional(),
});

// Supplier performance schema
export const SupplierPerformanceSchema = z.object({
  supplierId: z.string().uuid(),
  dateFrom: z.date(),
  dateTo: z.date(),
  includeMetrics: z.array(z.enum(['orders', 'deliveryTime', 'quality', 'pricing'])).default(['orders']),
});

// Type exports
export type SupplierCreateDTO = z.infer<typeof SupplierCreateSchema>;
export type SupplierUpdateDTO = z.infer<typeof SupplierUpdateSchema>;
export type SupplierFiltersDTO = z.infer<typeof SupplierFiltersSchema>;
export type SupplierPerformanceDTO = z.infer<typeof SupplierPerformanceSchema>;