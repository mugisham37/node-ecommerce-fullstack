import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { users } from './users';

// A/B Tests
export const abTests = pgTable('ab_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 100 }).notNull(), // 'feature', 'ui', 'pricing', 'content', 'email'
  status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // 'DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  primaryGoal: varchar('primary_goal', { length: 100 }).notNull(), // 'conversion', 'revenue', 'engagement', 'retention'
  secondaryGoals: jsonb('secondary_goals'), // Array of secondary goals
  targetAudienceType: varchar('target_audience_type', { length: 50 }).default('all'), // 'all', 'segment', 'custom'
  targetUserIds: jsonb('target_user_ids'), // Array of specific user IDs if custom targeting
  targetSegmentCriteria: jsonb('target_segment_criteria'), // Criteria for segment targeting
  trafficAllocation: decimal('traffic_allocation', { precision: 5, scale: 2 }).default('100.00'), // Percentage of traffic to include
  confidenceLevel: decimal('confidence_level', { precision: 5, scale: 2 }).default('95.00'),
  minimumSampleSize: integer('minimum_sample_size').default(100),
  winner: varchar('winner', { length: 100 }), // Winning variant name
  results: jsonb('results'), // Aggregated results data
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  nameIdx: index('idx_ab_tests_name').on(table.name),
  statusIdx: index('idx_ab_tests_status').on(table.status),
  typeIdx: index('idx_ab_tests_type').on(table.type),
  startDateIdx: index('idx_ab_tests_start_date').on(table.startDate),
  endDateIdx: index('idx_ab_tests_end_date').on(table.endDate),
  createdByIdx: index('idx_ab_tests_created_by').on(table.createdBy),
}));

// A/B Test Variants
export const abTestVariants = pgTable('ab_test_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').notNull().references(() => abTests.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isControl: boolean('is_control').default(false),
  trafficAllocation: decimal('traffic_allocation', { precision: 5, scale: 2 }).notNull(), // Percentage of test traffic
  configuration: jsonb('configuration'), // Variant-specific configuration
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  testIdIdx: index('idx_ab_test_variants_test_id').on(table.testId),
  isControlIdx: index('idx_ab_test_variants_is_control').on(table.isControl),
  testVariantUnique: unique('unique_test_variant').on(table.testId, table.name),
}));

// User Test Assignments
export const userTestAssignments = pgTable('user_test_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }), // For anonymous users
  testId: uuid('test_id').notNull().references(() => abTests.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => abTestVariants.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
  firstExposure: timestamp('first_exposure', { withTimezone: true }),
  lastActivity: timestamp('last_activity', { withTimezone: true }),
  impressions: integer('impressions').default(0),
  conversions: integer('conversions').default(0),
  revenue: decimal('revenue', { precision: 15, scale: 2 }).default('0.00'),
  engagements: integer('engagements').default(0),
  customMetrics: jsonb('custom_metrics'), // Additional custom metrics
}, (table) => ({
  userIdIdx: index('idx_user_test_assignments_user_id').on(table.userId),
  sessionIdIdx: index('idx_user_test_assignments_session_id').on(table.sessionId),
  testIdIdx: index('idx_user_test_assignments_test_id').on(table.testId),
  variantIdIdx: index('idx_user_test_assignments_variant_id').on(table.variantId),
  assignedAtIdx: index('idx_user_test_assignments_assigned_at').on(table.assignedAt),
  userTestUnique: unique('unique_user_test').on(table.userId, table.testId),
  sessionTestUnique: unique('unique_session_test').on(table.sessionId, table.testId),
}));

// A/B Test Events
export const abTestEvents = pgTable('ab_test_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').notNull().references(() => abTests.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => abTestVariants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }),
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'impression', 'conversion', 'revenue', 'engagement', 'custom'
  eventName: varchar('event_name', { length: 255 }), // Specific event name
  eventValue: decimal('event_value', { precision: 15, scale: 2 }), // Numeric value for the event
  eventData: jsonb('event_data'), // Additional event data
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
}, (table) => ({
  testIdIdx: index('idx_ab_test_events_test_id').on(table.testId),
  variantIdIdx: index('idx_ab_test_events_variant_id').on(table.variantId),
  userIdIdx: index('idx_ab_test_events_user_id').on(table.userId),
  sessionIdIdx: index('idx_ab_test_events_session_id').on(table.sessionId),
  eventTypeIdx: index('idx_ab_test_events_event_type').on(table.eventType),
  timestampIdx: index('idx_ab_test_events_timestamp').on(table.timestamp),
}));

// A/B Test Segments (for audience targeting)
export const abTestSegments = pgTable('ab_test_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  criteria: jsonb('criteria').notNull(), // Segment criteria (user properties, behaviors, etc.)
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  nameIdx: index('idx_ab_test_segments_name').on(table.name),
  isActiveIdx: index('idx_ab_test_segments_is_active').on(table.isActive),
  createdByIdx: index('idx_ab_test_segments_created_by').on(table.createdBy),
}));

// A/B Test Conversions (for tracking specific conversion events)
export const abTestConversions = pgTable('ab_test_conversions', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').notNull().references(() => abTests.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => abTestVariants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }),
  conversionType: varchar('conversion_type', { length: 100 }).notNull(), // 'purchase', 'signup', 'click', 'form_submit'
  conversionValue: decimal('conversion_value', { precision: 15, scale: 2 }), // Revenue or other numeric value
  orderId: uuid('order_id'), // Reference to order if applicable
  conversionData: jsonb('conversion_data'), // Additional conversion data
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
}, (table) => ({
  testIdIdx: index('idx_ab_test_conversions_test_id').on(table.testId),
  variantIdIdx: index('idx_ab_test_conversions_variant_id').on(table.variantId),
  userIdIdx: index('idx_ab_test_conversions_user_id').on(table.userId),
  sessionIdIdx: index('idx_ab_test_conversions_session_id').on(table.sessionId),
  conversionTypeIdx: index('idx_ab_test_conversions_conversion_type').on(table.conversionType),
  timestampIdx: index('idx_ab_test_conversions_timestamp').on(table.timestamp),
  orderIdIdx: index('idx_ab_test_conversions_order_id').on(table.orderId),
}));

// Relations
export const abTestsRelations = relations(abTests, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [abTests.createdBy],
    references: [users.id],
  }),
  variants: many(abTestVariants),
  assignments: many(userTestAssignments),
  events: many(abTestEvents),
  conversions: many(abTestConversions),
}));

export const abTestVariantsRelations = relations(abTestVariants, ({ one, many }) => ({
  test: one(abTests, {
    fields: [abTestVariants.testId],
    references: [abTests.id],
  }),
  assignments: many(userTestAssignments),
  events: many(abTestEvents),
  conversions: many(abTestConversions),
}));

export const userTestAssignmentsRelations = relations(userTestAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userTestAssignments.userId],
    references: [users.id],
  }),
  test: one(abTests, {
    fields: [userTestAssignments.testId],
    references: [abTests.id],
  }),
  variant: one(abTestVariants, {
    fields: [userTestAssignments.variantId],
    references: [abTestVariants.id],
  }),
}));

export const abTestEventsRelations = relations(abTestEvents, ({ one }) => ({
  test: one(abTests, {
    fields: [abTestEvents.testId],
    references: [abTests.id],
  }),
  variant: one(abTestVariants, {
    fields: [abTestEvents.variantId],
    references: [abTestVariants.id],
  }),
  user: one(users, {
    fields: [abTestEvents.userId],
    references: [users.id],
  }),
}));

export const abTestSegmentsRelations = relations(abTestSegments, ({ one }) => ({
  createdBy: one(users, {
    fields: [abTestSegments.createdBy],
    references: [users.id],
  }),
}));

export const abTestConversionsRelations = relations(abTestConversions, ({ one }) => ({
  test: one(abTests, {
    fields: [abTestConversions.testId],
    references: [abTests.id],
  }),
  variant: one(abTestVariants, {
    fields: [abTestConversions.variantId],
    references: [abTestVariants.id],
  }),
  user: one(users, {
    fields: [abTestConversions.userId],
    references: [users.id],
  }),
}));

// Type exports
export type ABTest = InferSelectModel<typeof abTests>;
export type NewABTest = InferInsertModel<typeof abTests>;

export type ABTestVariant = InferSelectModel<typeof abTestVariants>;
export type NewABTestVariant = InferInsertModel<typeof abTestVariants>;

export type UserTestAssignment = InferSelectModel<typeof userTestAssignments>;
export type NewUserTestAssignment = InferInsertModel<typeof userTestAssignments>;

export type ABTestEvent = InferSelectModel<typeof abTestEvents>;
export type NewABTestEvent = InferInsertModel<typeof abTestEvents>;

export type ABTestSegment = InferSelectModel<typeof abTestSegments>;
export type NewABTestSegment = InferInsertModel<typeof abTestSegments>;

export type ABTestConversion = InferSelectModel<typeof abTestConversions>;
export type NewABTestConversion = InferInsertModel<typeof abTestConversions>;

// Enums for type safety
export const ABTestStatus = {
  DRAFT: 'DRAFT',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
} as const;

export const ABTestType = {
  FEATURE: 'feature',
  UI: 'ui',
  PRICING: 'pricing',
  CONTENT: 'content',
  EMAIL: 'email',
} as const;

export const ABTestGoal = {
  CONVERSION: 'conversion',
  REVENUE: 'revenue',
  ENGAGEMENT: 'engagement',
  RETENTION: 'retention',
} as const;

export const ABTestEventType = {
  IMPRESSION: 'impression',
  CONVERSION: 'conversion',
  REVENUE: 'revenue',
  ENGAGEMENT: 'engagement',
  CUSTOM: 'custom',
} as const;

export const ConversionType = {
  PURCHASE: 'purchase',
  SIGNUP: 'signup',
  CLICK: 'click',
  FORM_SUBMIT: 'form_submit',
} as const;

export type ABTestStatusType = typeof ABTestStatus[keyof typeof ABTestStatus];
export type ABTestTypeType = typeof ABTestType[keyof typeof ABTestType];
export type ABTestGoalType = typeof ABTestGoal[keyof typeof ABTestGoal];
export type ABTestEventTypeType = typeof ABTestEventType[keyof typeof ABTestEventType];
export type ConversionTypeType = typeof ConversionType[keyof typeof ConversionType];