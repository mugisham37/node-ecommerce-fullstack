import { pgTable, bigserial, varchar, text, decimal, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { users } from './users';

export const orders = pgTable('orders', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  customerName: varchar('customer_name', { length: 200 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 20 }),
  shippingAddress: text('shipping_address').notNull(),
  billingAddress: text('billing_address'),
  status: varchar('status', { length: 20 }).default('PENDING'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  createdBy: bigint('created_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
}, (table) => ({
  orderNumberIdx: index('idx_orders_order_number').on(table.orderNumber),
  customerEmailIdx: index('idx_orders_customer_email').on(table.customerEmail),
  statusIdx: index('idx_orders_status').on(table.status),
  createdAtIdx: index('idx_orders_created_at').on(table.createdAt),
  createdByIdx: index('idx_orders_created_by').on(table.createdBy),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

// Order status enum for type safety
export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

// Import related tables for relations
import { orderItems } from './order-items';