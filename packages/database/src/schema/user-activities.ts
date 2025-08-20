import { pgTable, bigserial, bigint, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { users } from './users';

export const userActivities = pgTable('user_activities', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: varchar('resource_id', { length: 100 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  sessionId: varchar('session_id', { length: 255 }),
  status: varchar('status', { length: 20 }).default('SUCCESS'),
  errorMessage: text('error_message'),
}, (table) => ({
  userIdIdx: index('idx_user_activities_user_id').on(table.userId),
  actionIdx: index('idx_user_activities_action').on(table.action),
  createdAtIdx: index('idx_user_activities_created_at').on(table.createdAt),
  resourceIdx: index('idx_user_activities_resource').on(table.resourceType, table.resourceId),
  ipAddressIdx: index('idx_user_activities_ip_address').on(table.ipAddress),
  statusIdx: index('idx_user_activities_status').on(table.status),
}));

export const userActivitiesRelations = relations(userActivities, ({ one }) => ({
  user: one(users, {
    fields: [userActivities.userId],
    references: [users.id],
  }),
}));

export type UserActivity = InferSelectModel<typeof userActivities>;
export type NewUserActivity = InferInsertModel<typeof userActivities>;

// Activity status enum for type safety
export const ActivityStatus = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  WARNING: 'WARNING',
} as const;

export type ActivityStatusType = typeof ActivityStatus[keyof typeof ActivityStatus];

// Common activity actions enum
export const ActivityAction = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  INVENTORY_ADJUSTED: 'INVENTORY_ADJUSTED',
  STOCK_MOVEMENT: 'STOCK_MOVEMENT',
  SUPPLIER_CREATED: 'SUPPLIER_CREATED',
  SUPPLIER_UPDATED: 'SUPPLIER_UPDATED',
  CATEGORY_CREATED: 'CATEGORY_CREATED',
  CATEGORY_UPDATED: 'CATEGORY_UPDATED',
} as const;

export type ActivityActionType = typeof ActivityAction[keyof typeof ActivityAction];

// Resource type enum
export const ResourceType = {
  USER: 'USER',
  PRODUCT: 'PRODUCT',
  ORDER: 'ORDER',
  INVENTORY: 'INVENTORY',
  SUPPLIER: 'SUPPLIER',
  CATEGORY: 'CATEGORY',
  STOCK_MOVEMENT: 'STOCK_MOVEMENT',
} as const;

export type ResourceTypeType = typeof ResourceType[keyof typeof ResourceType];