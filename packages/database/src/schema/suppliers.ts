import { pgTable, bigserial, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';

export const suppliers = pgTable('suppliers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  contactPerson: varchar('contact_person', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  paymentTerms: varchar('payment_terms', { length: 100 }),
  status: varchar('status', { length: 20 }).default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
}, (table) => ({
  nameIdx: index('idx_suppliers_name').on(table.name),
  emailIdx: index('idx_suppliers_email').on(table.email),
  statusIdx: index('idx_suppliers_status').on(table.status),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
}));

export type Supplier = InferSelectModel<typeof suppliers>;
export type NewSupplier = InferInsertModel<typeof suppliers>;

// Supplier status enum for type safety
export const SupplierStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type SupplierStatusType = typeof SupplierStatus[keyof typeof SupplierStatus];

// Import products for relations (will be defined in products.ts)
import { products } from './products';