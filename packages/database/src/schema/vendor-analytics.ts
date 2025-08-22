import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp, date, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { users } from './users';

// Vendors
export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  contactPersonName: varchar('contact_person_name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 500 }),
  description: text('description'),
  logo: varchar('logo', { length: 500 }),
  banner: varchar('banner', { length: 500 }),
  
  // Business Information
  businessType: varchar('business_type', { length: 100 }), // 'individual', 'company', 'partnership'
  taxId: varchar('tax_id', { length: 100 }),
  businessRegistrationNumber: varchar('business_registration_number', { length: 100 }),
  
  // Address Information
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  
  // Financial Information
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('10.00'), // Percentage
  paymentMethod: varchar('payment_method', { length: 100 }), // 'bank_transfer', 'paypal', 'stripe'
  bankAccountDetails: jsonb('bank_account_details'), // Encrypted bank details
  payoutSchedule: varchar('payout_schedule', { length: 50 }).default('monthly'), // 'weekly', 'monthly', 'quarterly'
  minimumPayout: decimal('minimum_payout', { precision: 10, scale: 2 }).default('50.00'),
  
  // Status and Verification
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // 'PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'
  isVerified: boolean('is_verified').default(false),
  verificationDocuments: jsonb('verification_documents'), // Array of document URLs
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Performance Metrics (cached for quick access)
  ratingAverage: decimal('rating_average', { precision: 3, scale: 2 }).default('0.00'),
  ratingCount: integer('rating_count').default(0),
  totalSales: decimal('total_sales', { precision: 15, scale: 2 }).default('0.00'),
  totalOrders: integer('total_orders').default(0),
  totalProducts: integer('total_products').default(0),
  
  // Settings
  settings: jsonb('settings'), // Vendor-specific settings
  preferences: jsonb('preferences'), // Notification preferences, etc.
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessNameIdx: index('idx_vendors_business_name').on(table.businessName),
  slugIdx: index('idx_vendors_slug').on(table.slug),
  emailIdx: index('idx_vendors_email').on(table.email),
  statusIdx: index('idx_vendors_status').on(table.status),
  isVerifiedIdx: index('idx_vendors_is_verified').on(table.isVerified),
  ratingAverageIdx: index('idx_vendors_rating_average').on(table.ratingAverage),
  totalSalesIdx: index('idx_vendors_total_sales').on(table.totalSales),
}));

// Vendor Analytics (daily aggregated data)
export const vendorAnalytics = pgTable('vendor_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  
  // Sales Metrics
  totalSales: decimal('total_sales', { precision: 15, scale: 2 }).default('0.00'),
  totalOrders: integer('total_orders').default(0),
  totalItems: integer('total_items').default(0),
  averageOrderValue: decimal('average_order_value', { precision: 10, scale: 2 }).default('0.00'),
  
  // Commission and Payouts
  totalCommission: decimal('total_commission', { precision: 15, scale: 2 }).default('0.00'),
  netRevenue: decimal('net_revenue', { precision: 15, scale: 2 }).default('0.00'),
  
  // Customer Metrics
  uniqueCustomers: integer('unique_customers').default(0),
  newCustomers: integer('new_customers').default(0),
  returningCustomers: integer('returning_customers').default(0),
  
  // Product Metrics
  productsViewed: integer('products_viewed').default(0),
  productsAddedToCart: integer('products_added_to_cart').default(0),
  conversionRate: decimal('conversion_rate', { precision: 5, scale: 4 }).default('0.0000'),
  
  // Traffic Metrics
  pageViews: integer('page_views').default(0),
  uniqueVisitors: integer('unique_visitors').default(0),
  bounceRate: decimal('bounce_rate', { precision: 5, scale: 2 }).default('0.00'),
  
  // Additional Metrics
  refunds: decimal('refunds', { precision: 15, scale: 2 }).default('0.00'),
  refundCount: integer('refund_count').default(0),
  cancellations: integer('cancellations').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  vendorIdIdx: index('idx_vendor_analytics_vendor_id').on(table.vendorId),
  dateIdx: index('idx_vendor_analytics_date').on(table.date),
  totalSalesIdx: index('idx_vendor_analytics_total_sales').on(table.totalSales),
  vendorDateUnique: unique('unique_vendor_date').on(table.vendorId, table.date),
}));

// Vendor Product Analytics (daily aggregated data per product)
export const vendorProductAnalytics = pgTable('vendor_product_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull(), // Reference to products table
  date: date('date').notNull(),
  
  // Sales Metrics
  sales: decimal('sales', { precision: 15, scale: 2 }).default('0.00'),
  orders: integer('orders').default(0),
  quantity: integer('quantity').default(0),
  
  // Traffic Metrics
  views: integer('views').default(0),
  uniqueViews: integer('unique_views').default(0),
  addToCart: integer('add_to_cart').default(0),
  
  // Performance Metrics
  conversionRate: decimal('conversion_rate', { precision: 5, scale: 4 }).default('0.0000'),
  cartConversionRate: decimal('cart_conversion_rate', { precision: 5, scale: 4 }).default('0.0000'),
  
  // Inventory Metrics
  stockLevel: integer('stock_level').default(0),
  stockOuts: integer('stock_outs').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  vendorIdIdx: index('idx_vendor_product_analytics_vendor_id').on(table.vendorId),
  productIdIdx: index('idx_vendor_product_analytics_product_id').on(table.productId),
  dateIdx: index('idx_vendor_product_analytics_date').on(table.date),
  salesIdx: index('idx_vendor_product_analytics_sales').on(table.sales),
  vendorProductDateUnique: unique('unique_vendor_product_date').on(table.vendorId, table.productId, table.date),
}));

// Vendor Payouts
export const vendorPayouts = pgTable('vendor_payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  
  // Payout Details
  payoutNumber: varchar('payout_number', { length: 100 }).notNull().unique(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  commission: decimal('commission', { precision: 15, scale: 2 }).notNull(),
  netAmount: decimal('net_amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  
  // Period Information
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  
  // Payment Information
  paymentMethod: varchar('payment_method', { length: 100 }).notNull(),
  paymentDetails: jsonb('payment_details'), // Payment-specific details
  transactionId: varchar('transaction_id', { length: 255 }),
  
  // Status and Tracking
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
  processedAt: timestamp('processed_at', { withTimezone: true }),
  processedBy: uuid('processed_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Additional Information
  notes: text('notes'),
  failureReason: text('failure_reason'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  vendorIdIdx: index('idx_vendor_payouts_vendor_id').on(table.vendorId),
  payoutNumberIdx: index('idx_vendor_payouts_payout_number').on(table.payoutNumber),
  statusIdx: index('idx_vendor_payouts_status').on(table.status),
  periodStartIdx: index('idx_vendor_payouts_period_start').on(table.periodStart),
  periodEndIdx: index('idx_vendor_payouts_period_end').on(table.periodEnd),
  processedAtIdx: index('idx_vendor_payouts_processed_at').on(table.processedAt),
}));

// Vendor Reviews
export const vendorReviews = pgTable('vendor_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id'), // Reference to the order this review is based on
  
  // Review Content
  rating: integer('rating').notNull(), // 1-5 stars
  title: varchar('title', { length: 255 }),
  comment: text('comment'),
  
  // Review Categories
  communicationRating: integer('communication_rating'), // 1-5 stars
  shippingRating: integer('shipping_rating'), // 1-5 stars
  qualityRating: integer('quality_rating'), // 1-5 stars
  
  // Status and Moderation
  status: varchar('status', { length: 50 }).default('PUBLISHED'), // 'PUBLISHED', 'PENDING', 'REJECTED', 'HIDDEN'
  isVerifiedPurchase: boolean('is_verified_purchase').default(false),
  moderatedBy: uuid('moderated_by').references(() => users.id, { onDelete: 'set null' }),
  moderatedAt: timestamp('moderated_at', { withTimezone: true }),
  moderationNotes: text('moderation_notes'),
  
  // Vendor Response
  vendorResponse: text('vendor_response'),
  vendorResponseAt: timestamp('vendor_response_at', { withTimezone: true }),
  
  // Helpful Votes
  helpfulVotes: integer('helpful_votes').default(0),
  totalVotes: integer('total_votes').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  vendorIdIdx: index('idx_vendor_reviews_vendor_id').on(table.vendorId),
  userIdIdx: index('idx_vendor_reviews_user_id').on(table.userId),
  orderIdIdx: index('idx_vendor_reviews_order_id').on(table.orderId),
  ratingIdx: index('idx_vendor_reviews_rating').on(table.rating),
  statusIdx: index('idx_vendor_reviews_status').on(table.status),
  isVerifiedPurchaseIdx: index('idx_vendor_reviews_is_verified_purchase').on(table.isVerifiedPurchase),
  createdAtIdx: index('idx_vendor_reviews_created_at').on(table.createdAt),
  vendorUserOrderUnique: unique('unique_vendor_user_order').on(table.vendorId, table.userId, table.orderId),
}));

// Vendor Performance Metrics (monthly aggregated)
export const vendorPerformanceMetrics = pgTable('vendor_performance_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  
  // Sales Performance
  totalSales: decimal('total_sales', { precision: 15, scale: 2 }).default('0.00'),
  totalOrders: integer('total_orders').default(0),
  averageOrderValue: decimal('average_order_value', { precision: 10, scale: 2 }).default('0.00'),
  
  // Customer Satisfaction
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0.00'),
  totalReviews: integer('total_reviews').default(0),
  
  // Operational Metrics
  orderFulfillmentRate: decimal('order_fulfillment_rate', { precision: 5, scale: 2 }).default('0.00'),
  averageShippingTime: decimal('average_shipping_time', { precision: 5, scale: 2 }).default('0.00'), // in days
  returnRate: decimal('return_rate', { precision: 5, scale: 2 }).default('0.00'),
  cancellationRate: decimal('cancellation_rate', { precision: 5, scale: 2 }).default('0.00'),
  
  // Quality Metrics
  defectRate: decimal('defect_rate', { precision: 5, scale: 2 }).default('0.00'),
  customerComplaintRate: decimal('customer_complaint_rate', { precision: 5, scale: 2 }).default('0.00'),
  
  // Performance Score (calculated)
  performanceScore: decimal('performance_score', { precision: 5, scale: 2 }).default('0.00'), // 0-100
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  vendorIdIdx: index('idx_vendor_performance_metrics_vendor_id').on(table.vendorId),
  yearIdx: index('idx_vendor_performance_metrics_year').on(table.year),
  monthIdx: index('idx_vendor_performance_metrics_month').on(table.month),
  performanceScoreIdx: index('idx_vendor_performance_metrics_performance_score').on(table.performanceScore),
  vendorYearMonthUnique: unique('unique_vendor_year_month').on(table.vendorId, table.year, table.month),
}));

// Relations
export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  verifiedBy: one(users, {
    fields: [vendors.verifiedBy],
    references: [users.id],
  }),
  analytics: many(vendorAnalytics),
  productAnalytics: many(vendorProductAnalytics),
  payouts: many(vendorPayouts),
  reviews: many(vendorReviews),
  performanceMetrics: many(vendorPerformanceMetrics),
}));

export const vendorAnalyticsRelations = relations(vendorAnalytics, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorAnalytics.vendorId],
    references: [vendors.id],
  }),
}));

export const vendorProductAnalyticsRelations = relations(vendorProductAnalytics, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorProductAnalytics.vendorId],
    references: [vendors.id],
  }),
}));

export const vendorPayoutsRelations = relations(vendorPayouts, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorPayouts.vendorId],
    references: [vendors.id],
  }),
  processedBy: one(users, {
    fields: [vendorPayouts.processedBy],
    references: [users.id],
  }),
}));

export const vendorReviewsRelations = relations(vendorReviews, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorReviews.vendorId],
    references: [vendors.id],
  }),
  user: one(users, {
    fields: [vendorReviews.userId],
    references: [users.id],
  }),
  moderatedBy: one(users, {
    fields: [vendorReviews.moderatedBy],
    references: [users.id],
  }),
}));

export const vendorPerformanceMetricsRelations = relations(vendorPerformanceMetrics, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorPerformanceMetrics.vendorId],
    references: [vendors.id],
  }),
}));

// Type exports
export type Vendor = InferSelectModel<typeof vendors>;
export type NewVendor = InferInsertModel<typeof vendors>;

export type VendorAnalytics = InferSelectModel<typeof vendorAnalytics>;
export type NewVendorAnalytics = InferInsertModel<typeof vendorAnalytics>;

export type VendorProductAnalytics = InferSelectModel<typeof vendorProductAnalytics>;
export type NewVendorProductAnalytics = InferInsertModel<typeof vendorProductAnalytics>;

export type VendorPayout = InferSelectModel<typeof vendorPayouts>;
export type NewVendorPayout = InferInsertModel<typeof vendorPayouts>;

export type VendorReview = InferSelectModel<typeof vendorReviews>;
export type NewVendorReview = InferInsertModel<typeof vendorReviews>;

export type VendorPerformanceMetrics = InferSelectModel<typeof vendorPerformanceMetrics>;
export type NewVendorPerformanceMetrics = InferInsertModel<typeof vendorPerformanceMetrics>;

// Enums for type safety
export const VendorStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
} as const;

export const BusinessType = {
  INDIVIDUAL: 'individual',
  COMPANY: 'company',
  PARTNERSHIP: 'partnership',
} as const;

export const PayoutSchedule = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
} as const;

export const PayoutStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export const ReviewStatus = {
  PUBLISHED: 'PUBLISHED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  HIDDEN: 'HIDDEN',
} as const;

export type VendorStatusType = typeof VendorStatus[keyof typeof VendorStatus];
export type BusinessTypeType = typeof BusinessType[keyof typeof BusinessType];
export type PayoutScheduleType = typeof PayoutSchedule[keyof typeof PayoutSchedule];
export type PayoutStatusType = typeof PayoutStatus[keyof typeof PayoutStatus];
export type ReviewStatusType = typeof ReviewStatus[keyof typeof ReviewStatus];