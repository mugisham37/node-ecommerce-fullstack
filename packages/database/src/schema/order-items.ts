import { pgTable, bigserial, bigint, integer, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { orders } from './orders';
import { products } from './products';

export const orderItems = pgTable('order_items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  orderId: bigint('order_id', { mode: 'number' }).notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
}, (table) => ({
  orderIdIdx: index('idx_order_items_order_id').on(table.orderId),
  productIdIdx: index('idx_order_items_product_id').on(table.productId),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export type OrderItem = InferSelectModel<typeof orderItems>;
export type NewOrderItem = InferInsertModel<typeof orderItems>;