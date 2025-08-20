import { pgTable, bigserial, bigint, varchar, integer, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { products } from './products';

export const inventory = pgTable('inventory', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productId: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  warehouseLocation: varchar('warehouse_location', { length: 50 }).default('MAIN'),
  quantityOnHand: integer('quantity_on_hand').default(0),
  quantityAllocated: integer('quantity_allocated').default(0),
  lastCountedAt: timestamp('last_counted_at', { withTimezone: false }),
  version: bigint('version', { mode: 'number' }).default(0), // For optimistic locking
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
}, (table) => ({
  productIdIdx: index('idx_inventory_product_id').on(table.productId),
  warehouseLocationIdx: index('idx_inventory_warehouse_location').on(table.warehouseLocation),
  quantityOnHandIdx: index('idx_inventory_quantity_on_hand').on(table.quantityOnHand),
  productWarehouseUnique: unique('inventory_product_warehouse_unique').on(table.productId, table.warehouseLocation),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
  stockMovements: many(stockMovements),
}));

export type Inventory = InferSelectModel<typeof inventory>;
export type NewInventory = InferInsertModel<typeof inventory>;

// Computed fields helper
export type InventoryWithAvailable = Inventory & {
  quantityAvailable: number;
};

// Import related tables for relations
import { stockMovements } from './stock-movements';