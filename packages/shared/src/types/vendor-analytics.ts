// Vendor analytics types for tRPC compatibility
// Migrated from other-backend/src/types/vendor-analytics.types.ts

// Product with images and category for analytics
export interface ProductWithImagesAndCategory {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  quantity: number;
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    name: string;
  };
  images: Array<{
    id: string;
    url: string;
    altText?: string;
  }>;
}

// Raw query result types for products with images
export interface RawProductWithImages {
  id: string;
  name: string;
  sku: string | null;
  price: string | number;
  images: Array<{
    url: string;
    altText?: string;
  }> | null;
  quantity_sold?: string | number;
  revenue?: string | number;
  order_count?: string | number;
}

// Vendor dashboard summary types
export interface VendorSalesSummary {
  totalSales: number;
  totalItems: number;
  orderCount: number;
  averageOrderValue: number;
  commission: number;
  netSales: number;
  growth: {
    salesGrowth: number;
    itemsGrowth: number;
    orderCountGrowth: number;
  };
}

export interface VendorProductSummary {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryValue: number;
  totalItems: number;
}

export interface VendorOrderSummary {
  totalOrders: number;
  statusCounts: Record<string, number>;
}

export interface VendorPayoutSummary {
  totalPayouts: number;
  pendingPayouts: number;
  completedPayouts: number;
  totalSales: number;
  commission: number;
  availableBalance: number;
  payoutCount: number;
}

export interface VendorRecentOrder {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
  } | null;
  status: string; // Changed from OrderStatus enum to string for tRPC compatibility
  vendorTotal: number;
  itemCount: number;
  createdAt: Date;
  paymentStatus: string; // Changed from PaymentStatus enum to string for tRPC compatibility
}

export interface VendorTopProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  image: string | null;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface VendorSalesTrend {
  date: Date;
  sales: number;
  items: number;
  orderCount: number;
}

export interface VendorDashboardSummary {
  salesSummary: VendorSalesSummary;
  productSummary: VendorProductSummary;
  orderSummary: VendorOrderSummary;
  payoutSummary: VendorPayoutSummary;
  recentOrders: VendorRecentOrder[];
  topProducts: VendorTopProduct[];
  salesTrend: VendorSalesTrend[];
  period: {
    type: string;
    startDate: Date;
    endDate: Date;
  };
}

// Sales analytics types
export interface VendorSalesAnalytics {
  summary: VendorSalesSummary;
  trend: {
    current: VendorSalesTrend[];
    previous: VendorSalesTrend[] | null;
  };
  groupedBy: {
    type: string;
    data: any[];
  };
  period: {
    startDate: Date;
    endDate: Date;
    interval: string;
  };
}

export interface VendorSalesByProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  image: string | null;
  sales: number;
  quantity: number;
  orderCount: number;
  percentage: number;
}

export interface VendorSalesByCategory {
  id: string;
  name: string;
  sales: number;
  quantity: number;
  orderCount: number;
  percentage: number;
}

export interface VendorSalesByCustomer {
  id: string;
  name: string;
  email: string;
  sales: number;
  quantity: number;
  orderCount: number;
  percentage: number;
}

// Product analytics types
export interface VendorProductAnalytics {
  summary: VendorProductSummary;
  topSellingProducts: VendorTopProduct[];
  lowStockProducts: VendorLowStockProduct[];
  outOfStockProducts: VendorOutOfStockProduct[];
  inventoryByCategory: VendorInventoryByCategory[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface VendorLowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  price: number;
  category: string;
  image: string | null;
  inventoryValue: number;
}

export interface VendorOutOfStockProduct {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  price: number;
  category: string;
  image: string | null;
  lastUpdated: Date;
}

export interface VendorInventoryByCategory {
  id: string;
  name: string;
  value: number;
  items: number;
  products: number;
  percentage: number;
}

// Order analytics types
export interface VendorOrderAnalytics {
  summary: VendorOrderSummary;
  trend: VendorOrderTrend[];
  byStatus: VendorOrdersByStatus[];
  recentOrders: VendorRecentOrder[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface VendorOrderTrend {
  date: Date;
  orderCount: number;
  items: number;
}

export interface VendorOrdersByStatus {
  status: string;
  orderCount: number;
  items: number;
  sales: number;
}

// Utility types for safe operations
export type SafeNumericValue = number | string | null | undefined;

export interface VendorAnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  interval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  compareWithPrevious?: boolean;
  groupBy?: 'product' | 'category' | 'customer';
  categoryId?: string;
  limit?: number;
  status?: string;
}