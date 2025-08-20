import { pgTable, bigserial, varchar, text, bigint, decimal, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { categories } from './categories';
import { suppliers } from './suppliers';

export const products = pgTable('products', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  description: text('description'),
  categoryId: bigint('category_id', { mode: 'number' }).notNull().references(() => categories.id, { onDelete: 'restrict' }),
  supplierId: bigint('supplier_id', { mode: 'number' }).notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }).notNull(),
  reorderLevel: integer('reorder_level').default(10),
  reorderQuantity: integer('reorder_quantity').default(50),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
}, (table) => ({
  nameIdx: index('idx_products_name').on(table.name),
  slugIdx: index('idx_products_slug').on(table.slug),
  skuIdx: index('idx_products_sku').on(table.sku),
  categoryIdIdx: index('idx_products_category_id').on(table.categoryId),
  supplierIdIdx: index('idx_products_supplier_id').on(table.supplierId),
  activeIdx: index('idx_products_active').on(table.active),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  inventory: many(inventory),
  stockMovements: many(stockMovements),
  orderItems: many(orderItems),
}));

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

// Import related tables for relations
import { inventory } from './inventory';
import { stockMovements } from './stock-movements';
import { orderItems } from './order-items';