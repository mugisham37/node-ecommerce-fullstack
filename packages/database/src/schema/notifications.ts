import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { users } from './users';

// Notification Templates
export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 100 }).notNull(), // 'email', 'push', 'sms', 'in_app'
  category: varchar('category', { length: 100 }).notNull(), // 'order', 'marketing', 'system', 'loyalty', 'vendor'
  subject: varchar('subject', { length: 500 }),
  title: varchar('title', { length: 255 }),
  body: text('body').notNull(),
  htmlBody: text('html_body'), // For email templates
  
  // Template Variables
  variables: jsonb('variables'), // Array of variable names that can be used in the template
  defaultData: jsonb('default_data'), // Default values for variables
  
  // Localization
  language: varchar('language', { length: 10 }).default('en'),
  
  // Settings
  isActive: boolean('is_active').default(true),
  priority: varchar('priority', { length: 20 }).default('normal'), // 'low', 'normal', 'high', 'urgent'
  
  // Delivery Settings
  deliverySettings: jsonb('delivery_settings'), // Channel-specific settings
  
  // Metadata
  description: text('description'),
  tags: jsonb('tags'), // Array of tags for organization
  
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  nameIdx: index('idx_notification_templates_name').on(table.name),
  typeIdx: index('idx_notification_templates_type').on(table.type),
  categoryIdx: index('idx_notification_templates_category').on(table.category),
  languageIdx: index('idx_notification_templates_language').on(table.language),
  isActiveIdx: index('idx_notification_templates_is_active').on(table.isActive),
  priorityIdx: index('idx_notification_templates_priority').on(table.priority),
  createdByIdx: index('idx_notification_templates_created_by').on(table.createdBy),
}));

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => notificationTemplates.id, { onDelete: 'set null' }),
  
  // Notification Content
  type: varchar('type', { length: 100 }).notNull(), // 'email', 'push', 'sms', 'in_app'
  category: varchar('category', { length: 100 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  title: varchar('title', { length: 255 }),
  body: text('body').notNull(),
  htmlBody: text('html_body'),
  
  // Delivery Information
  recipient: varchar('recipient', { length: 255 }).notNull(), // Email, phone, or user ID
  channel: varchar('channel', { length: 100 }).notNull(), // 'email', 'push', 'sms', 'in_app'
  
  // Status and Tracking
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // 'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED'
  priority: varchar('priority', { length: 20 }).default('normal'),
  
  // Scheduling
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  
  // Engagement Tracking
  readAt: timestamp('read_at', { withTimezone: true }),
  clickedAt: timestamp('clicked_at', { withTimezone: true }),
  isRead: boolean('is_read').default(false),
  isClicked: boolean('is_clicked').default(false),
  
  // Error Handling
  failureReason: text('failure_reason'),
  retryCount: varchar('retry_count', { length: 10 }).default('0'),
  maxRetries: varchar('max_retries', { length: 10 }).default('3'),
  
  // Additional Data
  data: jsonb('data'), // Additional data used for the notification
  metadata: jsonb('metadata'), // Tracking and analytics data
  
  // External References
  externalId: varchar('external_id', { length: 255 }), // ID from external service (e.g., SendGrid)
  referenceType: varchar('reference_type', { length: 100 }), // 'order', 'user', 'product', etc.
  referenceId: uuid('reference_id'), // ID of the referenced entity
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_notifications_user_id').on(table.userId),
  templateIdIdx: index('idx_notifications_template_id').on(table.templateId),
  typeIdx: index('idx_notifications_type').on(table.type),
  categoryIdx: index('idx_notifications_category').on(table.category),
  statusIdx: index('idx_notifications_status').on(table.status),
  priorityIdx: index('idx_notifications_priority').on(table.priority),
  scheduledForIdx: index('idx_notifications_scheduled_for').on(table.scheduledFor),
  sentAtIdx: index('idx_notifications_sent_at').on(table.sentAt),
  isReadIdx: index('idx_notifications_is_read').on(table.isRead),
  referenceTypeIdx: index('idx_notifications_reference_type').on(table.referenceType),
  referenceIdIdx: index('idx_notifications_reference_id').on(table.referenceId),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
}));

// User Notification Preferences
export const userNotificationPreferences = pgTable('user_notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Channel Preferences
  emailEnabled: boolean('email_enabled').default(true),
  pushEnabled: boolean('push_enabled').default(true),
  smsEnabled: boolean('sms_enabled').default(false),
  inAppEnabled: boolean('in_app_enabled').default(true),
  
  // Category Preferences
  orderNotifications: boolean('order_notifications').default(true),
  marketingNotifications: boolean('marketing_notifications').default(true),
  systemNotifications: boolean('system_notifications').default(true),
  loyaltyNotifications: boolean('loyalty_notifications').default(true),
  vendorNotifications: boolean('vendor_notifications').default(true),
  
  // Frequency Settings
  emailFrequency: varchar('email_frequency', { length: 50 }).default('immediate'), // 'immediate', 'daily', 'weekly', 'never'
  pushFrequency: varchar('push_frequency', { length: 50 }).default('immediate'),
  smsFrequency: varchar('sms_frequency', { length: 50 }).default('important_only'),
  
  // Quiet Hours
  quietHoursEnabled: boolean('quiet_hours_enabled').default(false),
  quietHoursStart: varchar('quiet_hours_start', { length: 5 }), // HH:MM format
  quietHoursEnd: varchar('quiet_hours_end', { length: 5 }), // HH:MM format
  quietHoursTimezone: varchar('quiet_hours_timezone', { length: 50 }),
  
  // Advanced Settings
  groupSimilarNotifications: boolean('group_similar_notifications').default(true),
  customSettings: jsonb('custom_settings'), // Additional custom preferences
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_user_notification_preferences_user_id').on(table.userId),
  emailEnabledIdx: index('idx_user_notification_preferences_email_enabled').on(table.emailEnabled),
  pushEnabledIdx: index('idx_user_notification_preferences_push_enabled').on(table.pushEnabled),
  smsEnabledIdx: index('idx_user_notification_preferences_sms_enabled').on(table.smsEnabled),
  userIdUnique: unique('unique_user_notification_preferences').on(table.userId),
}));

// Push Notification Devices
export const pushNotificationDevices = pgTable('push_notification_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Device Information
  deviceToken: varchar('device_token', { length: 500 }).notNull(),
  platform: varchar('platform', { length: 50 }).notNull(), // 'ios', 'android', 'web'
  deviceId: varchar('device_id', { length: 255 }),
  deviceName: varchar('device_name', { length: 255 }),
  appVersion: varchar('app_version', { length: 50 }),
  osVersion: varchar('os_version', { length: 50 }),
  
  // Status
  isActive: boolean('is_active').default(true),
  lastUsed: timestamp('last_used', { withTimezone: true }),
  
  // Metadata
  metadata: jsonb('metadata'), // Additional device metadata
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_push_notification_devices_user_id').on(table.userId),
  deviceTokenIdx: index('idx_push_notification_devices_device_token').on(table.deviceToken),
  platformIdx: index('idx_push_notification_devices_platform').on(table.platform),
  isActiveIdx: index('idx_push_notification_devices_is_active').on(table.isActive),
  lastUsedIdx: index('idx_push_notification_devices_last_used').on(table.lastUsed),
  userDeviceTokenUnique: unique('unique_user_device_token').on(table.userId, table.deviceToken),
}));

// Notification Campaigns
export const notificationCampaigns = pgTable('notification_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 100 }).notNull(), // 'email', 'push', 'sms', 'multi_channel'
  category: varchar('category', { length: 100 }).notNull(),
  
  // Campaign Content
  templateId: uuid('template_id').references(() => notificationTemplates.id, { onDelete: 'set null' }),
  subject: varchar('subject', { length: 500 }),
  title: varchar('title', { length: 255 }),
  body: text('body'),
  htmlBody: text('html_body'),
  
  // Targeting
  targetAudience: jsonb('target_audience'), // Audience criteria
  segmentIds: jsonb('segment_ids'), // Array of segment IDs
  userIds: jsonb('user_ids'), // Specific user IDs (for small campaigns)
  
  // Scheduling
  status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // 'DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  
  // Performance Metrics
  totalRecipients: varchar('total_recipients', { length: 20 }).default('0'),
  sentCount: varchar('sent_count', { length: 20 }).default('0'),
  deliveredCount: varchar('delivered_count', { length: 20 }).default('0'),
  readCount: varchar('read_count', { length: 20 }).default('0'),
  clickCount: varchar('click_count', { length: 20 }).default('0'),
  unsubscribeCount: varchar('unsubscribe_count', { length: 20 }).default('0'),
  
  // Settings
  priority: varchar('priority', { length: 20 }).default('normal'),
  maxRetries: varchar('max_retries', { length: 10 }).default('3'),
  
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  nameIdx: index('idx_notification_campaigns_name').on(table.name),
  typeIdx: index('idx_notification_campaigns_type').on(table.type),
  categoryIdx: index('idx_notification_campaigns_category').on(table.category),
  statusIdx: index('idx_notification_campaigns_status').on(table.status),
  scheduledForIdx: index('idx_notification_campaigns_scheduled_for').on(table.scheduledFor),
  createdByIdx: index('idx_notification_campaigns_created_by').on(table.createdBy),
  createdAtIdx: index('idx_notification_campaigns_created_at').on(table.createdAt),
}));

// Notification Events (for tracking notification lifecycle)
export const notificationEvents = pgTable('notification_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  notificationId: uuid('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').references(() => notificationCampaigns.id, { onDelete: 'set null' }),
  
  // Event Information
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'sent', 'delivered', 'read', 'clicked', 'bounced', 'unsubscribed'
  eventData: jsonb('event_data'), // Additional event data
  
  // External Service Data
  externalEventId: varchar('external_event_id', { length: 255 }),
  serviceProvider: varchar('service_provider', { length: 100 }), // 'sendgrid', 'firebase', 'twilio'
  
  // Metadata
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  location: jsonb('location'), // Geographic location data
  
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
}, (table) => ({
  notificationIdIdx: index('idx_notification_events_notification_id').on(table.notificationId),
  campaignIdIdx: index('idx_notification_events_campaign_id').on(table.campaignId),
  eventTypeIdx: index('idx_notification_events_event_type').on(table.eventType),
  timestampIdx: index('idx_notification_events_timestamp').on(table.timestamp),
  serviceProviderIdx: index('idx_notification_events_service_provider').on(table.serviceProvider),
}));

// Relations
export const notificationTemplatesRelations = relations(notificationTemplates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [notificationTemplates.createdBy],
    references: [users.id],
  }),
  notifications: many(notifications),
  campaigns: many(notificationCampaigns),
}));

export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  template: one(notificationTemplates, {
    fields: [notifications.templateId],
    references: [notificationTemplates.id],
  }),
  events: many(notificationEvents),
}));

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userNotificationPreferences.userId],
    references: [users.id],
  }),
}));

export const pushNotificationDevicesRelations = relations(pushNotificationDevices, ({ one }) => ({
  user: one(users, {
    fields: [pushNotificationDevices.userId],
    references: [users.id],
  }),
}));

export const notificationCampaignsRelations = relations(notificationCampaigns, ({ one, many }) => ({
  template: one(notificationTemplates, {
    fields: [notificationCampaigns.templateId],
    references: [notificationTemplates.id],
  }),
  createdBy: one(users, {
    fields: [notificationCampaigns.createdBy],
    references: [users.id],
  }),
  events: many(notificationEvents),
}));

export const notificationEventsRelations = relations(notificationEvents, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationEvents.notificationId],
    references: [notifications.id],
  }),
  campaign: one(notificationCampaigns, {
    fields: [notificationEvents.campaignId],
    references: [notificationCampaigns.id],
  }),
}));

// Type exports
export type NotificationTemplate = InferSelectModel<typeof notificationTemplates>;
export type NewNotificationTemplate = InferInsertModel<typeof notificationTemplates>;

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

export type UserNotificationPreferences = InferSelectModel<typeof userNotificationPreferences>;
export type NewUserNotificationPreferences = InferInsertModel<typeof userNotificationPreferences>;

export type PushNotificationDevice = InferSelectModel<typeof pushNotificationDevices>;
export type NewPushNotificationDevice = InferInsertModel<typeof pushNotificationDevices>;

export type NotificationCampaign = InferSelectModel<typeof notificationCampaigns>;
export type NewNotificationCampaign = InferInsertModel<typeof notificationCampaigns>;

export type NotificationEvent = InferSelectModel<typeof notificationEvents>;
export type NewNotificationEvent = InferInsertModel<typeof notificationEvents>;

// Enums for type safety
export const NotificationType = {
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms',
  IN_APP: 'in_app',
} as const;

export const NotificationCategory = {
  ORDER: 'order',
  MARKETING: 'marketing',
  SYSTEM: 'system',
  LOYALTY: 'loyalty',
  VENDOR: 'vendor',
} as const;

export const NotificationStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export const NotificationPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const CampaignStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const NotificationFrequency = {
  IMMEDIATE: 'immediate',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  NEVER: 'never',
  IMPORTANT_ONLY: 'important_only',
} as const;

export const EventType = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  CLICKED: 'clicked',
  BOUNCED: 'bounced',
  UNSUBSCRIBED: 'unsubscribed',
} as const;

export const Platform = {
  IOS: 'ios',
  ANDROID: 'android',
  WEB: 'web',
} as const;

export type NotificationTypeType = typeof NotificationType[keyof typeof NotificationType];
export type NotificationCategoryType = typeof NotificationCategory[keyof typeof NotificationCategory];
export type NotificationStatusType = typeof NotificationStatus[keyof typeof NotificationStatus];
export type NotificationPriorityType = typeof NotificationPriority[keyof typeof NotificationPriority];
export type CampaignStatusType = typeof CampaignStatus[keyof typeof CampaignStatus];
export type NotificationFrequencyType = typeof NotificationFrequency[keyof typeof NotificationFrequency];
export type EventTypeType = typeof EventType[keyof typeof EventType];
export type PlatformType = typeof Platform[keyof typeof Platform];