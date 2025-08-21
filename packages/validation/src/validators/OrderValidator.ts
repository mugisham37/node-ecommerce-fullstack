/**
 * Order validation schemas
 */

import { z } from 'zod';
import { 
  UUIDSchema, 
  OrderStatusSchema, 
  QuantitySchema, 
  PositiveQuantitySchema 
} from './CommonValidators';
import { PriceSchema } from './PriceValidator';

/**
 * Order item validation
 */
export const OrderItemSchema = z.object({
  productId: UUIDSchema,
  quantity: PositiveQuantitySchema,
  unitPrice: PriceSchema,
  discount: z.number().min(0, 'Discount cannot be negative').max(1, 'Discount cannot exceed 100%').default(0),
});

/**
 * Shipping address validation
 */
export const ShippingAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  company: z.string().max(100).optional(),
  street: z.string().min(1, 'Street address is required').max(100),
  street2: z.string().max(100).optional(),
  city: z.string().min(1, 'City is required').max(50),
  state: z.string().min(1, 'State is required').max(50),
  zipCode: z.string().min(1, 'ZIP code is required').max(20),
  country: z.string().min(1, 'Country is required').max(50),
  phoneNumber: z.string().optional(),
});

/**
 * Order creation validation
 */
export const OrderCreateSchema = z.object({
  customerId: UUIDSchema,
  items: z.array(OrderItemSchema).min(1, 'Order must contain at least one item'),
  shippingAddress: ShippingAddressSchema,
  billingAddress: ShippingAddressSchema.optional(), // If not provided, use shipping address
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  requestedDeliveryDate: z.string().datetime().optional(),
  shippingMethod: z.enum(['standard', 'express', 'overnight', 'pickup']).default('standard'),
  paymentMethod: z.enum(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']),
});

/**
 * Order update validation
 */
export const OrderUpdateSchema = z.object({
  id: UUIDSchema,
  status: OrderStatusSchema.optional(),
  notes: z.string().max(500).optional(),
  shippingAddress: ShippingAddressSchema.optional(),
  billingAddress: ShippingAddressSchema.optional(),
  requestedDeliveryDate: z.string().datetime().optional(),
  shippingMethod: z.enum(['standard', 'express', 'overnight', 'pickup']).optional(),
  trackingNumber: z.string().max(100).optional(),
  shippedAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
});

/**
 * Order status transition validation
 */
export const OrderStatusUpdateSchema = z.object({
  orderId: UUIDSchema,
  newStatus: OrderStatusSchema,
  reason: z.string().max(200).optional(),
  notifyCustomer: z.boolean().default(true),
});

/**
 * Order query/filter validation
 */
export const OrderQuerySchema = z.object({
  customerId: UUIDSchema.optional(),
  status: OrderStatusSchema.optional(),
  minTotal: PriceSchema.optional(),
  maxTotal: PriceSchema.optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  shippedAfter: z.string().datetime().optional(),
  shippedBefore: z.string().datetime().optional(),
  search: z.string().min(1).max(100).optional(), // Search by order number or customer name
  shippingMethod: z.enum(['standard', 'express', 'overnight', 'pickup']).optional(),
  paymentMethod: z.enum(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']).optional(),
});

/**
 * Order cancellation validation
 */
export const OrderCancellationSchema = z.object({
  orderId: UUIDSchema,
  reason: z.enum([
    'customer_request',
    'out_of_stock',
    'payment_failed',
    'fraud_detected',
    'shipping_issues',
    'other'
  ]),
  reasonDetails: z.string().max(500).optional(),
  refundAmount: PriceSchema.optional(),
  notifyCustomer: z.boolean().default(true),
});

/**
 * Order refund validation
 */
export const OrderRefundSchema = z.object({
  orderId: UUIDSchema,
  items: z.array(z.object({
    orderItemId: UUIDSchema,
    quantity: PositiveQuantitySchema,
    reason: z.enum([
      'defective',
      'wrong_item',
      'not_as_described',
      'damaged_in_shipping',
      'customer_changed_mind',
      'other'
    ]),
  })).min(1, 'At least one item must be selected for refund'),
  refundShipping: z.boolean().default(false),
  reason: z.string().max(500).optional(),
  refundMethod: z.enum(['original_payment', 'store_credit', 'bank_transfer']).default('original_payment'),
});

/**
 * Order fulfillment validation
 */
export const OrderFulfillmentSchema = z.object({
  orderId: UUIDSchema,
  items: z.array(z.object({
    orderItemId: UUIDSchema,
    quantity: PositiveQuantitySchema,
    serialNumbers: z.array(z.string()).optional(),
  })).min(1, 'At least one item must be fulfilled'),
  trackingNumber: z.string().max(100).optional(),
  carrier: z.string().max(50).optional(),
  shippedAt: z.string().datetime().optional(),
  estimatedDelivery: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Bulk order operation validation
 */
export const BulkOrderOperationSchema = z.object({
  orderIds: z.array(UUIDSchema).min(1, 'At least one order ID is required').max(100, 'Cannot process more than 100 orders at once'),
  operation: z.enum(['update_status', 'cancel', 'export', 'print_labels', 'send_notification']),
  data: z.record(z.any()).optional(),
});

/**
 * Order analytics validation
 */
export const OrderAnalyticsSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('day'),
  metrics: z.array(z.enum([
    'total_orders',
    'total_revenue',
    'average_order_value',
    'order_count_by_status',
    'top_products',
    'top_customers'
  ])).min(1, 'At least one metric must be selected'),
  filters: OrderQuerySchema.optional(),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: 'Start date must be before end date',
  path: ['endDate'],
});

// Export types
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
export type OrderCreate = z.infer<typeof OrderCreateSchema>;
export type OrderUpdate = z.infer<typeof OrderUpdateSchema>;
export type OrderStatusUpdate = z.infer<typeof OrderStatusUpdateSchema>;
export type OrderQuery = z.infer<typeof OrderQuerySchema>;
export type OrderCancellation = z.infer<typeof OrderCancellationSchema>;
export type OrderRefund = z.infer<typeof OrderRefundSchema>;
export type OrderFulfillment = z.infer<typeof OrderFulfillmentSchema>;
export type BulkOrderOperation = z.infer<typeof BulkOrderOperationSchema>;
export type OrderAnalytics = z.infer<typeof OrderAnalyticsSchema>;