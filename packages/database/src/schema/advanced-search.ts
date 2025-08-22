import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import { users } from './users';

// Search Indexes (for full-text search optimization)
export const searchIndexes = pgTable('search_indexes', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 100 }).notNull(), // 'product', 'vendor', 'category', 'user'
  entityId: uuid('entity_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  keywords: text('keywords'), // Comma-separated keywords
  tags: jsonb('tags'), // Array of tags
  metadata: jsonb('metadata'), // Additional searchable metadata
  searchVector: text('search_vector'), // PostgreSQL tsvector for full-text search
  language: varchar('language', { length: 10 }).default('english'),
  isActive: boolean('is_active').default(true),
  lastIndexed: timestamp('last_indexed', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  entityTypeIdx: index('idx_search_indexes_entity_type').on(table.entityType),
  entityIdIdx: index('idx_search_indexes_entity_id').on(table.entityId),
  isActiveIdx: index('idx_search_indexes_is_active').on(table.isActive),
  languageIdx: index('idx_search_indexes_language').on(table.language),
  lastIndexedIdx: index('idx_search_indexes_last_indexed').on(table.lastIndexed),
  entityTypeEntityIdUnique: unique('unique_entity_type_entity_id').on(table.entityType, table.entityId),
}));

// Search Queries (for analytics and suggestions)
export const searchQueries = pgTable('search_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }),
  query: text('query').notNull(),
  normalizedQuery: text('normalized_query').notNull(), // Cleaned and normalized version
  filters: jsonb('filters'), // Applied filters
  sortBy: varchar('sort_by', { length: 100 }),
  sortOrder: varchar('sort_order', { length: 10 }), // 'asc', 'desc'
  
  // Results Information
  resultCount: integer('result_count').default(0),
  clickedResults: jsonb('clicked_results'), // Array of clicked result IDs
  firstResultClicked: boolean('first_result_clicked').default(false),
  
  // Performance Metrics
  searchTime: integer('search_time'), // Time in milliseconds
  
  // Context Information
  source: varchar('source', { length: 100 }), // 'web', 'mobile', 'api'
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  referrer: text('referrer'),
  
  // Search Success Metrics
  hasResults: boolean('has_results').default(false),
  hasClicks: boolean('has_clicks').default(false),
  hasConversion: boolean('has_conversion').default(false),
  conversionValue: decimal('conversion_value', { precision: 15, scale: 2 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_search_queries_user_id').on(table.userId),
  sessionIdIdx: index('idx_search_queries_session_id').on(table.sessionId),
  queryIdx: index('idx_search_queries_query').on(table.query),
  normalizedQueryIdx: index('idx_search_queries_normalized_query').on(table.normalizedQuery),
  resultCountIdx: index('idx_search_queries_result_count').on(table.resultCount),
  hasResultsIdx: index('idx_search_queries_has_results').on(table.hasResults),
  hasClicksIdx: index('idx_search_queries_has_clicks').on(table.hasClicks),
  hasConversionIdx: index('idx_search_queries_has_conversion').on(table.hasConversion),
  createdAtIdx: index('idx_search_queries_created_at').on(table.createdAt),
}));

// Search Suggestions (autocomplete and query suggestions)
export const searchSuggestions = pgTable('search_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  suggestion: varchar('suggestion', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'query', 'product', 'category', 'brand', 'vendor'
  entityId: uuid('entity_id'), // ID of the entity if type is not 'query'
  popularity: integer('popularity').default(0), // How often this suggestion is used
  searchCount: integer('search_count').default(0), // How many times this was searched
  clickCount: integer('click_count').default(0), // How many times this was clicked
  conversionCount: integer('conversion_count').default(0), // How many conversions this led to
  language: varchar('language', { length: 10 }).default('english'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  suggestionIdx: index('idx_search_suggestions_suggestion').on(table.suggestion),
  typeIdx: index('idx_search_suggestions_type').on(table.type),
  entityIdIdx: index('idx_search_suggestions_entity_id').on(table.entityId),
  popularityIdx: index('idx_search_suggestions_popularity').on(table.popularity),
  searchCountIdx: index('idx_search_suggestions_search_count').on(table.searchCount),
  clickCountIdx: index('idx_search_suggestions_click_count').on(table.clickCount),
  languageIdx: index('idx_search_suggestions_language').on(table.language),
  isActiveIdx: index('idx_search_suggestions_is_active').on(table.isActive),
  suggestionTypeUnique: unique('unique_suggestion_type').on(table.suggestion, table.type),
}));

// Search Filters (dynamic filter definitions)
export const searchFilters = pgTable('search_filters', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'range', 'checkbox', 'radio', 'select', 'text'
  entityType: varchar('entity_type', { length: 100 }).notNull(), // 'product', 'vendor', etc.
  fieldPath: varchar('field_path', { length: 255 }).notNull(), // JSON path or field name
  options: jsonb('options'), // Available options for select/checkbox filters
  minValue: decimal('min_value', { precision: 15, scale: 2 }), // For range filters
  maxValue: decimal('max_value', { precision: 15, scale: 2 }), // For range filters
  defaultValue: text('default_value'),
  isRequired: boolean('is_required').default(false),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  nameIdx: index('idx_search_filters_name').on(table.name),
  typeIdx: index('idx_search_filters_type').on(table.type),
  entityTypeIdx: index('idx_search_filters_entity_type').on(table.entityType),
  isActiveIdx: index('idx_search_filters_is_active').on(table.isActive),
  sortOrderIdx: index('idx_search_filters_sort_order').on(table.sortOrder),
  nameEntityTypeUnique: unique('unique_name_entity_type').on(table.name, table.entityType),
}));

// Search Analytics (aggregated search data)
export const searchAnalytics = pgTable('search_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  query: text('query'),
  normalizedQuery: text('normalized_query'),
  
  // Aggregated Metrics
  searchCount: integer('search_count').default(0),
  uniqueUsers: integer('unique_users').default(0),
  uniqueSessions: integer('unique_sessions').default(0),
  totalResults: integer('total_results').default(0),
  averageResults: decimal('average_results', { precision: 10, scale: 2 }).default('0.00'),
  
  // Performance Metrics
  averageSearchTime: integer('average_search_time').default(0), // milliseconds
  zeroResultsCount: integer('zero_results_count').default(0),
  
  // Engagement Metrics
  clickThroughRate: decimal('click_through_rate', { precision: 5, scale: 4 }).default('0.0000'),
  totalClicks: integer('total_clicks').default(0),
  averageClickPosition: decimal('average_click_position', { precision: 5, scale: 2 }).default('0.00'),
  
  // Conversion Metrics
  conversionRate: decimal('conversion_rate', { precision: 5, scale: 4 }).default('0.0000'),
  totalConversions: integer('total_conversions').default(0),
  totalConversionValue: decimal('total_conversion_value', { precision: 15, scale: 2 }).default('0.00'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dateIdx: index('idx_search_analytics_date').on(table.date),
  queryIdx: index('idx_search_analytics_query').on(table.query),
  normalizedQueryIdx: index('idx_search_analytics_normalized_query').on(table.normalizedQuery),
  searchCountIdx: index('idx_search_analytics_search_count').on(table.searchCount),
  clickThroughRateIdx: index('idx_search_analytics_click_through_rate').on(table.clickThroughRate),
  conversionRateIdx: index('idx_search_analytics_conversion_rate').on(table.conversionRate),
  dateQueryUnique: unique('unique_date_query').on(table.date, table.normalizedQuery),
}));

// Search Result Clicks (for tracking which results are clicked)
export const searchResultClicks = pgTable('search_result_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  searchQueryId: uuid('search_query_id').notNull().references(() => searchQueries.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }),
  
  // Result Information
  resultType: varchar('result_type', { length: 100 }).notNull(), // 'product', 'vendor', 'category'
  resultId: uuid('result_id').notNull(),
  resultPosition: integer('result_position').notNull(), // Position in search results (1-based)
  resultScore: decimal('result_score', { precision: 10, scale: 6 }), // Search relevance score
  
  // Click Information
  clickedAt: timestamp('clicked_at', { withTimezone: true }).defaultNow(),
  timeOnPage: integer('time_on_page'), // Time spent on the clicked page (seconds)
  bounced: boolean('bounced').default(false), // Whether user bounced from the page
  converted: boolean('converted').default(false), // Whether this click led to a conversion
  conversionValue: decimal('conversion_value', { precision: 15, scale: 2 }),
  
}, (table) => ({
  searchQueryIdIdx: index('idx_search_result_clicks_search_query_id').on(table.searchQueryId),
  userIdIdx: index('idx_search_result_clicks_user_id').on(table.userId),
  sessionIdIdx: index('idx_search_result_clicks_session_id').on(table.sessionId),
  resultTypeIdx: index('idx_search_result_clicks_result_type').on(table.resultType),
  resultIdIdx: index('idx_search_result_clicks_result_id').on(table.resultId),
  resultPositionIdx: index('idx_search_result_clicks_result_position').on(table.resultPosition),
  clickedAtIdx: index('idx_search_result_clicks_clicked_at').on(table.clickedAt),
  convertedIdx: index('idx_search_result_clicks_converted').on(table.converted),
}));

// Saved Searches (user-saved search queries)
export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  query: text('query').notNull(),
  filters: jsonb('filters'),
  sortBy: varchar('sort_by', { length: 100 }),
  sortOrder: varchar('sort_order', { length: 10 }),
  
  // Notification Settings
  emailNotifications: boolean('email_notifications').default(false),
  pushNotifications: boolean('push_notifications').default(false),
  notificationFrequency: varchar('notification_frequency', { length: 50 }).default('daily'), // 'immediate', 'daily', 'weekly'
  
  // Usage Statistics
  lastUsed: timestamp('last_used', { withTimezone: true }),
  useCount: integer('use_count').default(0),
  
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_saved_searches_user_id').on(table.userId),
  nameIdx: index('idx_saved_searches_name').on(table.name),
  isActiveIdx: index('idx_saved_searches_is_active').on(table.isActive),
  lastUsedIdx: index('idx_saved_searches_last_used').on(table.lastUsed),
  useCountIdx: index('idx_saved_searches_use_count').on(table.useCount),
  userNameUnique: unique('unique_user_name').on(table.userId, table.name),
}));

// Relations
export const searchIndexesRelations = relations(searchIndexes, ({ many }) => ({
  // No direct relations, but could be extended
}));

export const searchQueriesRelations = relations(searchQueries, ({ one, many }) => ({
  user: one(users, {
    fields: [searchQueries.userId],
    references: [users.id],
  }),
  resultClicks: many(searchResultClicks),
}));

export const searchSuggestionsRelations = relations(searchSuggestions, ({ many }) => ({
  // No direct relations, but could be extended
}));

export const searchFiltersRelations = relations(searchFilters, ({ many }) => ({
  // No direct relations, but could be extended
}));

export const searchAnalyticsRelations = relations(searchAnalytics, ({ many }) => ({
  // No direct relations, but could be extended
}));

export const searchResultClicksRelations = relations(searchResultClicks, ({ one }) => ({
  searchQuery: one(searchQueries, {
    fields: [searchResultClicks.searchQueryId],
    references: [searchQueries.id],
  }),
  user: one(users, {
    fields: [searchResultClicks.userId],
    references: [users.id],
  }),
}));

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(users, {
    fields: [savedSearches.userId],
    references: [users.id],
  }),
}));

// Type exports
export type SearchIndex = InferSelectModel<typeof searchIndexes>;
export type NewSearchIndex = InferInsertModel<typeof searchIndexes>;

export type SearchQuery = InferSelectModel<typeof searchQueries>;
export type NewSearchQuery = InferInsertModel<typeof searchQueries>;

export type SearchSuggestion = InferSelectModel<typeof searchSuggestions>;
export type NewSearchSuggestion = InferInsertModel<typeof searchSuggestions>;

export type SearchFilter = InferSelectModel<typeof searchFilters>;
export type NewSearchFilter = InferInsertModel<typeof searchFilters>;

export type SearchAnalytics = InferSelectModel<typeof searchAnalytics>;
export type NewSearchAnalytics = InferInsertModel<typeof searchAnalytics>;

export type SearchResultClick = InferSelectModel<typeof searchResultClicks>;
export type NewSearchResultClick = InferInsertModel<typeof searchResultClicks>;

export type SavedSearch = InferSelectModel<typeof savedSearches>;
export type NewSavedSearch = InferInsertModel<typeof savedSearches>;

// Enums for type safety
export const EntityType = {
  PRODUCT: 'product',
  VENDOR: 'vendor',
  CATEGORY: 'category',
  USER: 'user',
} as const;

export const SuggestionType = {
  QUERY: 'query',
  PRODUCT: 'product',
  CATEGORY: 'category',
  BRAND: 'brand',
  VENDOR: 'vendor',
} as const;

export const FilterType = {
  RANGE: 'range',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SELECT: 'select',
  TEXT: 'text',
} as const;

export const NotificationFrequency = {
  IMMEDIATE: 'immediate',
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const;

export type EntityTypeType = typeof EntityType[keyof typeof EntityType];
export type SuggestionTypeType = typeof SuggestionType[keyof typeof SuggestionType];
export type FilterTypeType = typeof FilterType[keyof typeof FilterType];
export type NotificationFrequencyType = typeof NotificationFrequency[keyof typeof NotificationFrequency];