import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { users } from './users';

// Application Settings
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: jsonb('value').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'string', 'number', 'boolean', 'object', 'array'
  category: varchar('category', { length: 100 }).notNull(), // 'general', 'email', 'payment', 'shipping', 'tax', 'loyalty', 'vendor'
  
  // Metadata
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  defaultValue: jsonb('default_value'),
  
  // Validation and Constraints
  validation: jsonb('validation'), // Validation rules (min, max, pattern, etc.)
  options: jsonb('options'), // Available options for select/radio settings
  
  // Access Control
  isPublic: boolean('is_public').default(false), // Whether setting can be accessed by non-admin users
  isReadonly: boolean('is_readonly').default(false), // Whether setting can be modified
  requiresRestart: boolean('requires_restart').default(false), // Whether changing this setting requires app restart
  
  // Environment and Deployment
  environment: varchar('environment', { length: 50 }), // 'development', 'staging', 'production', null for all
  version: varchar('version', { length: 50 }), // Setting version for migration purposes
  
  // Status
  isActive: boolean('is_active').default(true),
  isDeprecated: boolean('is_deprecated').default(false),
  deprecationMessage: text('deprecation_message'),
  
  // Audit Trail
  lastModifiedBy: uuid('last_modified_by').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  keyIdx: index('idx_settings_key').on(table.key),
  categoryIdx: index('idx_settings_category').on(table.category),
  typeIdx: index('idx_settings_type').on(table.type),
  isPublicIdx: index('idx_settings_is_public').on(table.isPublic),
  isActiveIdx: index('idx_settings_is_active').on(table.isActive),
  environmentIdx: index('idx_settings_environment').on(table.environment),
  lastModifiedByIdx: index('idx_settings_last_modified_by').on(table.lastModifiedBy),
  createdByIdx: index('idx_settings_created_by').on(table.createdBy),
}));

// Setting History (for audit trail and rollback)
export const settingHistory = pgTable('setting_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  settingId: uuid('setting_id').notNull().references(() => settings.id, { onDelete: 'cascade' }),
  settingKey: varchar('setting_key', { length: 255 }).notNull(), // Denormalized for easier querying
  
  // Previous Values
  previousValue: jsonb('previous_value'),
  newValue: jsonb('new_value').notNull(),
  
  // Change Information
  changeType: varchar('change_type', { length: 50 }).notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'RESTORE'
  changeReason: text('change_reason'),
  
  // User and Context
  changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Metadata
  metadata: jsonb('metadata'), // Additional context about the change
  
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
}, (table) => ({
  settingIdIdx: index('idx_setting_history_setting_id').on(table.settingId),
  settingKeyIdx: index('idx_setting_history_setting_key').on(table.settingKey),
  changeTypeIdx: index('idx_setting_history_change_type').on(table.changeType),
  changedByIdx: index('idx_setting_history_changed_by').on(table.changedBy),
  timestampIdx: index('idx_setting_history_timestamp').on(table.timestamp),
}));

// User Settings (user-specific preferences)
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 255 }).notNull(),
  value: jsonb('value').notNull(),
  
  // Metadata
  category: varchar('category', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_user_settings_user_id').on(table.userId),
  keyIdx: index('idx_user_settings_key').on(table.key),
  categoryIdx: index('idx_user_settings_category').on(table.category),
  userKeyUnique: unique('unique_user_key').on(table.userId, table.key),
}));

// Feature Flags
export const featureFlags = pgTable('feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  description: text('description'),
  
  // Flag Configuration
  isEnabled: boolean('is_enabled').default(false),
  type: varchar('type', { length: 50 }).notNull().default('boolean'), // 'boolean', 'string', 'number', 'json'
  value: jsonb('value'), // For non-boolean flags
  
  // Targeting and Rollout
  rolloutPercentage: varchar('rollout_percentage', { length: 10 }).default('0'), // 0-100
  targetUsers: jsonb('target_users'), // Array of user IDs
  targetRoles: jsonb('target_roles'), // Array of user roles
  targetSegments: jsonb('target_segments'), // Array of user segments
  
  // Environment and Conditions
  environment: varchar('environment', { length: 50 }), // null for all environments
  conditions: jsonb('conditions'), // Additional conditions for flag evaluation
  
  // Lifecycle
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  
  // Metadata
  tags: jsonb('tags'), // Array of tags for organization
  owner: uuid('owner').references(() => users.id, { onDelete: 'set null' }),
  
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  nameIdx: index('idx_feature_flags_name').on(table.name),
  keyIdx: index('idx_feature_flags_key').on(table.key),
  isEnabledIdx: index('idx_feature_flags_is_enabled').on(table.isEnabled),
  environmentIdx: index('idx_feature_flags_environment').on(table.environment),
  ownerIdx: index('idx_feature_flags_owner').on(table.owner),
  createdByIdx: index('idx_feature_flags_created_by').on(table.createdBy),
}));

// Configuration Templates (for multi-tenant or environment-specific configs)
export const configurationTemplates = pgTable('configuration_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 100 }).notNull(), // 'environment', 'tenant', 'feature'
  
  // Template Configuration
  configuration: jsonb('configuration').notNull(), // The template configuration
  schema: jsonb('schema'), // JSON schema for validation
  
  // Metadata
  version: varchar('version', { length: 50 }).default('1.0.0'),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  
  // Access Control
  allowedRoles: jsonb('allowed_roles'), // Array of roles that can use this template
  
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  nameIdx: index('idx_configuration_templates_name').on(table.name),
  typeIdx: index('idx_configuration_templates_type').on(table.type),
  isDefaultIdx: index('idx_configuration_templates_is_default').on(table.isDefault),
  isActiveIdx: index('idx_configuration_templates_is_active').on(table.isActive),
  createdByIdx: index('idx_configuration_templates_created_by').on(table.createdBy),
}));

// Relations
export const settingsRelations = relations(settings, ({ one, many }) => ({
  lastModifiedBy: one(users, {
    fields: [settings.lastModifiedBy],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [settings.createdBy],
    references: [users.id],
  }),
  history: many(settingHistory),
}));

export const settingHistoryRelations = relations(settingHistory, ({ one }) => ({
  setting: one(settings, {
    fields: [settingHistory.settingId],
    references: [settings.id],
  }),
  changedBy: one(users, {
    fields: [settingHistory.changedBy],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const featureFlagsRelations = relations(featureFlags, ({ one }) => ({
  owner: one(users, {
    fields: [featureFlags.owner],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [featureFlags.createdBy],
    references: [users.id],
  }),
}));

export const configurationTemplatesRelations = relations(configurationTemplates, ({ one }) => ({
  createdBy: one(users, {
    fields: [configurationTemplates.createdBy],
    references: [users.id],
  }),
}));

// Type exports
export type Setting = InferSelectModel<typeof settings>;
export type NewSetting = InferInsertModel<typeof settings>;

export type SettingHistory = InferSelectModel<typeof settingHistory>;
export type NewSettingHistory = InferInsertModel<typeof settingHistory>;

export type UserSetting = InferSelectModel<typeof userSettings>;
export type NewUserSetting = InferInsertModel<typeof userSettings>;

export type FeatureFlag = InferSelectModel<typeof featureFlags>;
export type NewFeatureFlag = InferInsertModel<typeof featureFlags>;

export type ConfigurationTemplate = InferSelectModel<typeof configurationTemplates>;
export type NewConfigurationTemplate = InferInsertModel<typeof configurationTemplates>;

// Enums for type safety
export const SettingType = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  OBJECT: 'object',
  ARRAY: 'array',
} as const;

export const SettingCategory = {
  GENERAL: 'general',
  EMAIL: 'email',
  PAYMENT: 'payment',
  SHIPPING: 'shipping',
  TAX: 'tax',
  LOYALTY: 'loyalty',
  VENDOR: 'vendor',
  SECURITY: 'security',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
} as const;

export const ChangeType = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  RESTORE: 'RESTORE',
} as const;

export const FlagType = {
  BOOLEAN: 'boolean',
  STRING: 'string',
  NUMBER: 'number',
  JSON: 'json',
} as const;

export const TemplateType = {
  ENVIRONMENT: 'environment',
  TENANT: 'tenant',
  FEATURE: 'feature',
} as const;

export type SettingTypeType = typeof SettingType[keyof typeof SettingType];
export type SettingCategoryType = typeof SettingCategory[keyof typeof SettingCategory];
export type ChangeTypeType = typeof ChangeType[keyof typeof ChangeType];
export type FlagTypeType = typeof FlagType[keyof typeof FlagType];
export type TemplateTypeType = typeof TemplateType[keyof typeof TemplateType];