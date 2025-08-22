import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { users } from './users';

// Loyalty Programs
export const loyaltyPrograms = pgTable('loyalty_programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  pointsPerDollar: decimal('points_per_dollar', { precision: 10, scale: 2 }).notNull().default('1.00'),
  isActive: boolean('is_active').default(true),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  termsAndConditions: text('terms_and_conditions'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  nameIdx: index('idx_loyalty_programs_name').on(table.name),
  activeIdx: index('idx_loyalty_programs_active').on(table.isActive),
}));

// Loyalty Tiers
export const loyaltyTiers = pgTable('loyalty_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id').notNull().references(() => loyaltyPrograms.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  minPoints: integer('min_points').notNull(),
  maxPoints: integer('max_points'),
  benefits: jsonb('benefits'),
  multiplier: decimal('multiplier', { precision: 5, scale: 2 }).default('1.00'),
  color: varchar('color', { length: 7 }), // Hex color code
  icon: varchar('icon', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  programIdIdx: index('idx_loyalty_tiers_program_id').on(table.programId),
  minPointsIdx: index('idx_loyalty_tiers_min_points').on(table.minPoints),
  programTierUnique: unique('unique_program_tier').on(table.programId, table.name),
}));

// User Loyalty Points
export const userLoyaltyPoints = pgTable('user_loyalty_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  programId: uuid('program_id').notNull().references(() => loyaltyPrograms.id, { onDelete: 'cascade' }),
  points: integer('points').default(0),
  tierId: uuid('tier_id').references(() => loyaltyTiers.id, { onDelete: 'set null' }),
  lifetimePoints: integer('lifetime_points').default(0),
  lastEarnedAt: timestamp('last_earned_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_user_loyalty_points_user_id').on(table.userId),
  programIdIdx: index('idx_user_loyalty_points_program_id').on(table.programId),
  tierIdIdx: index('idx_user_loyalty_points_tier_id').on(table.tierId),
  userProgramUnique: unique('unique_user_program').on(table.userId, table.programId),
}));

// Loyalty History/Transactions
export const loyaltyHistory = pgTable('loyalty_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  programId: uuid('program_id').notNull().references(() => loyaltyPrograms.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // 'ORDER', 'REFERRAL', 'MANUAL', 'REDEMPTION', 'EXPIRE', 'OTHER'
  points: integer('points').notNull(),
  description: text('description').notNull(),
  orderId: uuid('order_id'), // Reference to order if applicable
  referenceId: varchar('reference_id', { length: 255 }), // Generic reference
  referenceType: varchar('reference_type', { length: 100 }), // Type of reference
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_loyalty_history_user_id').on(table.userId),
  programIdIdx: index('idx_loyalty_history_program_id').on(table.programId),
  typeIdx: index('idx_loyalty_history_type').on(table.type),
  orderIdIdx: index('idx_loyalty_history_order_id').on(table.orderId),
  createdAtIdx: index('idx_loyalty_history_created_at').on(table.createdAt),
}));

// Loyalty Rewards
export const loyaltyRewards = pgTable('loyalty_rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id').notNull().references(() => loyaltyPrograms.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // 'discount', 'gift_card', 'shipping', 'product'
  pointsCost: integer('points_cost').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }), // Monetary value or percentage
  maxRedemptions: integer('max_redemptions'), // Null for unlimited
  currentRedemptions: integer('current_redemptions').default(0),
  isActive: boolean('is_active').default(true),
  validFrom: timestamp('valid_from', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  termsAndConditions: text('terms_and_conditions'),
  imageUrl: varchar('image_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  programIdIdx: index('idx_loyalty_rewards_program_id').on(table.programId),
  typeIdx: index('idx_loyalty_rewards_type').on(table.type),
  activeIdx: index('idx_loyalty_rewards_active').on(table.isActive),
  pointsCostIdx: index('idx_loyalty_rewards_points_cost').on(table.pointsCost),
}));

// Loyalty Redemptions
export const loyaltyRedemptions = pgTable('loyalty_redemptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  programId: uuid('program_id').notNull().references(() => loyaltyPrograms.id, { onDelete: 'cascade' }),
  rewardId: uuid('reward_id').notNull().references(() => loyaltyRewards.id, { onDelete: 'cascade' }),
  rewardName: varchar('reward_name', { length: 255 }).notNull(), // Snapshot of reward name
  pointsUsed: integer('points_used').notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // 'PENDING', 'APPROVED', 'REJECTED', 'USED', 'EXPIRED'
  orderId: uuid('order_id'), // If used in an order
  usedAt: timestamp('used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_loyalty_redemptions_user_id').on(table.userId),
  programIdIdx: index('idx_loyalty_redemptions_program_id').on(table.programId),
  rewardIdIdx: index('idx_loyalty_redemptions_reward_id').on(table.rewardId),
  codeIdx: index('idx_loyalty_redemptions_code').on(table.code),
  statusIdx: index('idx_loyalty_redemptions_status').on(table.status),
  orderIdIdx: index('idx_loyalty_redemptions_order_id').on(table.orderId),
}));

// Loyalty Referrals
export const loyaltyReferrals = pgTable('loyalty_referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerId: uuid('referrer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredUserId: uuid('referred_user_id').references(() => users.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull().unique(),
  isUsed: boolean('is_used').default(false),
  usedAt: timestamp('used_at', { withTimezone: true }),
  referrerPoints: integer('referrer_points').default(0),
  referredPoints: integer('referred_points').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  referrerIdIdx: index('idx_loyalty_referrals_referrer_id').on(table.referrerId),
  referredUserIdIdx: index('idx_loyalty_referrals_referred_user_id').on(table.referredUserId),
  codeIdx: index('idx_loyalty_referrals_code').on(table.code),
  isUsedIdx: index('idx_loyalty_referrals_is_used').on(table.isUsed),
}));

// Relations
export const loyaltyProgramsRelations = relations(loyaltyPrograms, ({ many }) => ({
  tiers: many(loyaltyTiers),
  userPoints: many(userLoyaltyPoints),
  history: many(loyaltyHistory),
  rewards: many(loyaltyRewards),
  redemptions: many(loyaltyRedemptions),
}));

export const loyaltyTiersRelations = relations(loyaltyTiers, ({ one, many }) => ({
  program: one(loyaltyPrograms, {
    fields: [loyaltyTiers.programId],
    references: [loyaltyPrograms.id],
  }),
  userPoints: many(userLoyaltyPoints),
}));

export const userLoyaltyPointsRelations = relations(userLoyaltyPoints, ({ one, many }) => ({
  user: one(users, {
    fields: [userLoyaltyPoints.userId],
    references: [users.id],
  }),
  program: one(loyaltyPrograms, {
    fields: [userLoyaltyPoints.programId],
    references: [loyaltyPrograms.id],
  }),
  tier: one(loyaltyTiers, {
    fields: [userLoyaltyPoints.tierId],
    references: [loyaltyTiers.id],
  }),
  history: many(loyaltyHistory),
}));

export const loyaltyHistoryRelations = relations(loyaltyHistory, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyHistory.userId],
    references: [users.id],
  }),
  program: one(loyaltyPrograms, {
    fields: [loyaltyHistory.programId],
    references: [loyaltyPrograms.id],
  }),
}));

export const loyaltyRewardsRelations = relations(loyaltyRewards, ({ one, many }) => ({
  program: one(loyaltyPrograms, {
    fields: [loyaltyRewards.programId],
    references: [loyaltyPrograms.id],
  }),
  redemptions: many(loyaltyRedemptions),
}));

export const loyaltyRedemptionsRelations = relations(loyaltyRedemptions, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyRedemptions.userId],
    references: [users.id],
  }),
  program: one(loyaltyPrograms, {
    fields: [loyaltyRedemptions.programId],
    references: [loyaltyPrograms.id],
  }),
  reward: one(loyaltyRewards, {
    fields: [loyaltyRedemptions.rewardId],
    references: [loyaltyRewards.id],
  }),
}));

export const loyaltyReferralsRelations = relations(loyaltyReferrals, ({ one }) => ({
  referrer: one(users, {
    fields: [loyaltyReferrals.referrerId],
    references: [users.id],
  }),
  referredUser: one(users, {
    fields: [loyaltyReferrals.referredUserId],
    references: [users.id],
  }),
}));

// Type exports
export type LoyaltyProgram = InferSelectModel<typeof loyaltyPrograms>;
export type NewLoyaltyProgram = InferInsertModel<typeof loyaltyPrograms>;

export type LoyaltyTier = InferSelectModel<typeof loyaltyTiers>;
export type NewLoyaltyTier = InferInsertModel<typeof loyaltyTiers>;

export type UserLoyaltyPoints = InferSelectModel<typeof userLoyaltyPoints>;
export type NewUserLoyaltyPoints = InferInsertModel<typeof userLoyaltyPoints>;

export type LoyaltyHistory = InferSelectModel<typeof loyaltyHistory>;
export type NewLoyaltyHistory = InferInsertModel<typeof loyaltyHistory>;

export type LoyaltyReward = InferSelectModel<typeof loyaltyRewards>;
export type NewLoyaltyReward = InferInsertModel<typeof loyaltyRewards>;

export type LoyaltyRedemption = InferSelectModel<typeof loyaltyRedemptions>;
export type NewLoyaltyRedemption = InferInsertModel<typeof loyaltyRedemptions>;

export type LoyaltyReferral = InferSelectModel<typeof loyaltyReferrals>;
export type NewLoyaltyReferral = InferInsertModel<typeof loyaltyReferrals>;

// Enums for type safety
export const LoyaltyHistoryType = {
  ORDER: 'ORDER',
  REFERRAL: 'REFERRAL',
  MANUAL: 'MANUAL',
  REDEMPTION: 'REDEMPTION',
  EXPIRE: 'EXPIRE',
  OTHER: 'OTHER',
} as const;

export const RewardType = {
  DISCOUNT: 'discount',
  GIFT_CARD: 'gift_card',
  SHIPPING: 'shipping',
  PRODUCT: 'product',
} as const;

export const RedemptionStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
} as const;

export type LoyaltyHistoryTypeType = typeof LoyaltyHistoryType[keyof typeof LoyaltyHistoryType];
export type RewardTypeType = typeof RewardType[keyof typeof RewardType];
export type RedemptionStatusType = typeof RedemptionStatus[keyof typeof RedemptionStatus];