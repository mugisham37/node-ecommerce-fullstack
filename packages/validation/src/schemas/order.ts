import { z } from 'zod';
// import { OrderStatus } from '@ecommerce/shared/types';
type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

// Base order item schema
export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  totalPrice: z.number().positive(),
});

// Order item creation schema
export const OrderItemCreateSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive').optional(),
});

// Base order schema
export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string().min(1),
  userId: z.string().uuid(),
  status: z.nativeEnum(OrderStatus),
  totalAmount: z.number().positive(),
  items: z.array(OrderItemSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Order creation schema
export const OrderCreateSchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  items: z.array(OrderItemCreateSchema).min(1, 'At least one item is required'),
  notes: z.string().max(1000, 'Notes too long').optional(),
}).refine((data) => {
  // Validate that all product IDs are unique
  const productIds = data.items.map(item => item.productId);
  return new Set(productIds).size === productIds.length;
}, {
  message: "Duplicate products in order items",
  path: ["items"],
});

// Order update schema
export const OrderUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  notes: z.string().max(1000).optional(),
});

// Order status update schema
export const OrderStatusUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  reason: z.string().max(500, 'Reason too long').optional(),
  notifyCustomer: z.boolean().default(true),
});

// Order filters schema
export const OrderFiltersSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  search: z.string().max(255).optional(),
});

// Order item update schema
export const OrderItemUpdateSchema = z.object({
  quantity: z.number().int().positive().optional(),
  unitPrice: z.number().positive().optional(),
});

// Bulk order update schema
export const BulkOrderUpdateSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1, 'At least one order ID is required'),
  updates: z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    notes: z.string().max(1000).optional(),
  }),
  notifyCustomers: z.boolean().default(false),
});

// Order report schema
export const OrderReportSchema = z.object({
  dateFrom: z.date(),
  dateTo: z.date(),
  status: z.array(z.nativeEnum(OrderStatus)).optional(),
  userIds: z.array(z.string().uuid()).optional(),
  includeItems: z.boolean().default(false),
  groupBy: z.enum(['day', 'week', 'month', 'status', 'user']).default('day'),
  format: z.enum(['json', 'csv', 'excel']).default('json'),
});

// Order analytics schema
export const OrderAnalyticsSchema = z.object({
  dateFrom: z.date(),
  dateTo: z.date(),
  metrics: z.array(z.enum(['revenue', 'count', 'averageValue', 'topProducts', 'topCustomers'])).default(['revenue', 'count']),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

// Type exports
export type OrderItemCreateDTO = z.infer<typeof OrderItemCreateSchema>;
export type OrderCreateDTO = z.infer<typeof OrderCreateSchema>;
export type OrderUpdateDTO = z.infer<typeof OrderUpdateSchema>;
export type OrderStatusUpdateDTO = z.infer<typeof OrderStatusUpdateSchema>;
export type OrderFiltersDTO = z.infer<typeof OrderFiltersSchema>;
export type OrderItemUpdateDTO = z.infer<typeof OrderItemUpdateSchema>;
export type BulkOrderUpdateDTO = z.infer<typeof BulkOrderUpdateSchema>;
export type OrderReportDTO = z.infer<typeof OrderReportSchema>;
export type OrderAnalyticsDTO = z.infer<typeof OrderAnalyticsSchema>;