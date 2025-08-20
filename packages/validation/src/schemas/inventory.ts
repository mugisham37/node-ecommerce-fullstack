import { z } from 'zod';
import { StockMovementType } from '@ecommerce/shared/types';

// Base inventory schema
export const InventorySchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(0),
  reservedQuantity: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  maxStockLevel: z.number().int().positive(),
  lastRestocked: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Inventory creation schema
export const InventoryCreateSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  reservedQuantity: z.number().int().min(0, 'Reserved quantity cannot be negative').default(0),
  reorderLevel: z.number().int().min(0, 'Reorder level cannot be negative').default(10),
  maxStockLevel: z.number().int().positive('Max stock level must be positive').default(1000),
});

// Inventory update schema
export const InventoryUpdateSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  reservedQuantity: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  maxStockLevel: z.number().int().positive().optional(),
  lastRestocked: z.date().optional(),
});

// Stock adjustment schema
export const StockAdjustmentSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  type: z.nativeEnum(StockMovementType),
  quantity: z.number().int().positive('Quantity must be positive'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  referenceId: z.string().uuid().optional(),
});

// Stock movement schema
export const StockMovementSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  type: z.nativeEnum(StockMovementType),
  quantity: z.number().int(),
  reason: z.string().min(1).max(500),
  referenceId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  createdAt: z.date(),
});

// Inventory filters schema
export const InventoryFiltersSchema = z.object({
  lowStock: z.boolean().optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
  minQuantity: z.number().int().min(0).optional(),
  maxQuantity: z.number().int().min(0).optional(),
});

// Bulk stock adjustment schema
export const BulkStockAdjustmentSchema = z.object({
  adjustments: z.array(StockAdjustmentSchema).min(1, 'At least one adjustment is required'),
  validateOnly: z.boolean().default(false),
});

// Inventory report schema
export const InventoryReportSchema = z.object({
  dateFrom: z.date(),
  dateTo: z.date(),
  categoryIds: z.array(z.string().uuid()).optional(),
  supplierIds: z.array(z.string().uuid()).optional(),
  includeMovements: z.boolean().default(false),
  format: z.enum(['json', 'csv', 'excel']).default('json'),
});

// Low stock alert schema
export const LowStockAlertSchema = z.object({
  threshold: z.number().int().min(0).default(10),
  categoryIds: z.array(z.string().uuid()).optional(),
  supplierIds: z.array(z.string().uuid()).optional(),
  includeReserved: z.boolean().default(true),
});

// Type exports
export type InventoryCreateDTO = z.infer<typeof InventoryCreateSchema>;
export type InventoryUpdateDTO = z.infer<typeof InventoryUpdateSchema>;
export type StockAdjustmentDTO = z.infer<typeof StockAdjustmentSchema>;
export type InventoryFiltersDTO = z.infer<typeof InventoryFiltersSchema>;
export type BulkStockAdjustmentDTO = z.infer<typeof BulkStockAdjustmentSchema>;
export type InventoryReportDTO = z.infer<typeof InventoryReportSchema>;
export type LowStockAlertDTO = z.infer<typeof LowStockAlertSchema>;