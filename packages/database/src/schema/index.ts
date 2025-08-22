// Export all tables
export * from './users';
export * from './categories';
export * from './suppliers';
export * from './products';
export * from './inventory';
export * from './stock-movements';
export * from './orders';
export * from './order-items';
export * from './user-activities';
export * from './loyalty';
export * from './ab-tests';
export * from './vendor-analytics';
export * from './advanced-search';
export * from './notifications';
export * from './settings';

// Export all relations
import { categoriesRelations } from './categories';
import { suppliersRelations } from './suppliers';
import { productsRelations } from './products';
import { inventoryRelations } from './inventory';
import { stockMovementsRelations } from './stock-movements';
import { ordersRelations } from './orders';
import { orderItemsRelations } from './order-items';
import { userActivitiesRelations } from './user-activities';
import { 
  loyaltyProgramsRelations, 
  loyaltyTiersRelations, 
  userLoyaltyPointsRelations, 
  loyaltyHistoryRelations, 
  loyaltyRewardsRelations, 
  loyaltyRedemptionsRelations, 
  loyaltyReferralsRelations 
} from './loyalty';
import { 
  abTestsRelations, 
  abTestVariantsRelations, 
  userTestAssignmentsRelations, 
  abTestEventsRelations, 
  abTestSegmentsRelations, 
  abTestConversionsRelations 
} from './ab-tests';
import { 
  vendorsRelations, 
  vendorAnalyticsRelations, 
  vendorProductAnalyticsRelations, 
  vendorPayoutsRelations, 
  vendorReviewsRelations, 
  vendorPerformanceMetricsRelations 
} from './vendor-analytics';
import { 
  searchIndexesRelations, 
  searchQueriesRelations, 
  searchSuggestionsRelations, 
  searchFiltersRelations, 
  searchAnalyticsRelations, 
  searchResultClicksRelations, 
  savedSearchesRelations 
} from './advanced-search';
import { 
  notificationTemplatesRelations, 
  notificationsRelations, 
  userNotificationPreferencesRelations, 
  pushNotificationDevicesRelations, 
  notificationCampaignsRelations, 
  notificationEventsRelations 
} from './notifications';
import { 
  settingsRelations, 
  settingHistoryRelations, 
  userSettingsRelations, 
  featureFlagsRelations, 
  configurationTemplatesRelations 
} from './settings';

export const relations = {
  categoriesRelations,
  suppliersRelations,
  productsRelations,
  inventoryRelations,
  stockMovementsRelations,
  ordersRelations,
  orderItemsRelations,
  userActivitiesRelations,
  loyaltyProgramsRelations,
  loyaltyTiersRelations,
  userLoyaltyPointsRelations,
  loyaltyHistoryRelations,
  loyaltyRewardsRelations,
  loyaltyRedemptionsRelations,
  loyaltyReferralsRelations,
  abTestsRelations,
  abTestVariantsRelations,
  userTestAssignmentsRelations,
  abTestEventsRelations,
  abTestSegmentsRelations,
  abTestConversionsRelations,
  vendorsRelations,
  vendorAnalyticsRelations,
  vendorProductAnalyticsRelations,
  vendorPayoutsRelations,
  vendorReviewsRelations,
  vendorPerformanceMetricsRelations,
  searchIndexesRelations,
  searchQueriesRelations,
  searchSuggestionsRelations,
  searchFiltersRelations,
  searchAnalyticsRelations,
  searchResultClicksRelations,
  savedSearchesRelations,
  notificationTemplatesRelations,
  notificationsRelations,
  userNotificationPreferencesRelations,
  pushNotificationDevicesRelations,
  notificationCampaignsRelations,
  notificationEventsRelations,
  settingsRelations,
  settingHistoryRelations,
  userSettingsRelations,
  featureFlagsRelations,
  configurationTemplatesRelations,
};

// Export all tables for Drizzle schema
import { users } from './users';
import { categories } from './categories';
import { suppliers } from './suppliers';
import { products } from './products';
import { inventory } from './inventory';
import { stockMovements } from './stock-movements';
import { orders } from './orders';
import { orderItems } from './order-items';
import { userActivities } from './user-activities';
import { 
  loyaltyPrograms, 
  loyaltyTiers, 
  userLoyaltyPoints, 
  loyaltyHistory, 
  loyaltyRewards, 
  loyaltyRedemptions, 
  loyaltyReferrals 
} from './loyalty';
import { 
  abTests, 
  abTestVariants, 
  userTestAssignments, 
  abTestEvents, 
  abTestSegments, 
  abTestConversions 
} from './ab-tests';
import { 
  vendors, 
  vendorAnalytics, 
  vendorProductAnalytics, 
  vendorPayouts, 
  vendorReviews, 
  vendorPerformanceMetrics 
} from './vendor-analytics';
import { 
  searchIndexes, 
  searchQueries, 
  searchSuggestions, 
  searchFilters, 
  searchAnalytics, 
  searchResultClicks, 
  savedSearches 
} from './advanced-search';
import { 
  notificationTemplates, 
  notifications, 
  userNotificationPreferences, 
  pushNotificationDevices, 
  notificationCampaigns, 
  notificationEvents 
} from './notifications';
import { 
  settings, 
  settingHistory, 
  userSettings, 
  featureFlags, 
  configurationTemplates 
} from './settings';

export const schema = {
  users,
  categories,
  suppliers,
  products,
  inventory,
  stockMovements,
  orders,
  orderItems,
  userActivities,
  loyaltyPrograms,
  loyaltyTiers,
  userLoyaltyPoints,
  loyaltyHistory,
  loyaltyRewards,
  loyaltyRedemptions,
  loyaltyReferrals,
  abTests,
  abTestVariants,
  userTestAssignments,
  abTestEvents,
  abTestSegments,
  abTestConversions,
  vendors,
  vendorAnalytics,
  vendorProductAnalytics,
  vendorPayouts,
  vendorReviews,
  vendorPerformanceMetrics,
  searchIndexes,
  searchQueries,
  searchSuggestions,
  searchFilters,
  searchAnalytics,
  searchResultClicks,
  savedSearches,
  notificationTemplates,
  notifications,
  userNotificationPreferences,
  pushNotificationDevices,
  notificationCampaigns,
  notificationEvents,
  settings,
  settingHistory,
  userSettings,
  featureFlags,
  configurationTemplates,
  ...relations,
};

// Database schema type for Kysely
export interface DatabaseSchema {
  users: {
    id: number;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: string;
    active: boolean;
    last_login: Date | null;
    created_at: Date;
    updated_at: Date;
  };
  categories: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    parent_id: number | null;
    sort_order: number;
    active: boolean;
    created_at: Date;
    updated_at: Date;
  };
  suppliers: {
    id: number;
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    payment_terms: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
  };
  products: {
    id: number;
    name: string;
    slug: string;
    sku: string;
    description: string | null;
    category_id: number;
    supplier_id: number;
    cost_price: string;
    selling_price: string;
    reorder_level: number;
    reorder_quantity: number;
    active: boolean;
    created_at: Date;
    updated_at: Date;
  };
  inventory: {
    id: number;
    product_id: number;
    warehouse_location: string;
    quantity_on_hand: number;
    quantity_allocated: number;
    last_counted_at: Date | null;
    version: number;
    created_at: Date;
    updated_at: Date;
  };
  stock_movements: {
    id: number;
    product_id: number;
    movement_type: string;
    quantity: number;
    reference_id: string | null;
    reference_type: string | null;
    reason: string | null;
    warehouse_location: string;
    user_id: number | null;
    created_at: Date;
  };
  orders: {
    id: number;
    order_number: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    shipping_address: string;
    billing_address: string | null;
    status: string;
    subtotal: string;
    tax_amount: string;
    shipping_cost: string;
    total_amount: string;
    created_by: number | null;
    created_at: Date;
    updated_at: Date;
  };
  order_items: {
    id: number;
    order_id: number;
    product_id: number;
    quantity: number;
    unit_price: string;
    total_price: string;
    created_at: Date;
    updated_at: Date;
  };
  user_activities: {
    id: number;
    user_id: number;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    details: string | null;
    created_at: Date;
    session_id: string | null;
    status: string;
    error_message: string | null;
  };
}