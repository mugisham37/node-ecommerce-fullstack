import { pgTable, bigserial, varchar, text, bigint, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';

export const categories = pgTable('categories', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  parentId: bigint('parent_id', { mode: 'number' }).references(() => categories.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').default(0),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
}, (table) => ({
  slugIdx: index('idx_categories_slug').on(table.slug),
  parentIdIdx: index('idx_categories_parent_id').on(table.parentId),
  activeIdx: index('idx_categories_active').on(table.active),
  sortOrderIdx: index('idx_categories_sort_order').on(table.sortOrder),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parent_child',
  }),
  children: many(categories, {
    relationName: 'parent_child',
  }),
  products: many(products),
}));

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

// Import products for relations (will be defined in products.ts)
import { products } from './products';