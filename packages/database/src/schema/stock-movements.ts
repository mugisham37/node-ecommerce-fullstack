import { pgTable, bigserial, bigint, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { products } from './products';
import { users } from './users';

export const stockMovements = pgTable('stock_movements', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productId: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  movementType: varchar('movement_type', { length: 20 }).notNull(),
  quantity: integer('quantity').notNull(),
  referenceId: varchar('reference_id', { length: 100 }),
  referenceType: varchar('reference_type', { length: 50 }),
  reason: varchar('reason', { length: 255 }),
  warehouseLocation: varchar('warehouse_location', { length: 50 }).default('MAIN'),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
}, (table) => ({
  productIdIdx: index('idx_stock_movements_product_id').on(table.productId),
  movementTypeIdx: index('idx_stock_movements_movement_type').on(table.movementType),
  referenceIdIdx: index('idx_stock_movements_reference_id').on(table.referenceId),
  createdAtIdx: index('idx_stock_movements_created_at').on(table.createdAt),
  userIdIdx: index('idx_stock_movements_user_id').on(table.userId),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
}));

export type StockMovement = InferSelectModel<typeof stockMovements>;
export type NewStockMovement = InferInsertModel<typeof stockMovements>;

// Stock movement type enum for type safety
export const StockMovementType = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
  ADJUSTMENT: 'ADJUSTMENT',
  ALLOCATION: 'ALLOCATION',
  RELEASE: 'RELEASE',
  TRANSFER: 'TRANSFER',
  DAMAGED: 'DAMAGED',
  EXPIRED: 'EXPIRED',
  RETURNED: 'RETURNED',
  CYCLE_COUNT: 'CYCLE_COUNT',
} as const;

export type StockMovementTypeType = typeof StockMovementType[keyof typeof StockMovementType];

// Reference type enum for type safety
export const ReferenceType = {
  ORDER: 'ORDER',
  ADJUSTMENT: 'ADJUSTMENT',
  MANUAL: 'MANUAL',
  TRANSFER: 'TRANSFER',
  RETURN: 'RETURN',
  INITIAL_STOCK: 'INITIAL_STOCK',
  STOCK_ADJUSTMENT: 'STOCK_ADJUSTMENT',
} as const;

export type ReferenceTypeType = typeof ReferenceType[keyof typeof ReferenceType];