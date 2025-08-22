// Analytics types for tRPC compatibility
// Migrated from other-backend/src/types/analytics.types.ts

// Base analytics interfaces
export interface SalesAnalytics {
  currentPeriod: {
    totalSales: number;
    orderCount: number;
    averageOrderValue: number;
    totalItems: number;
  };
  previousPeriod?: {
    totalSales: number;
    orderCount: number;
    averageOrderValue: number;
    totalItems: number;
  };
  growth: {
    totalSales: number;
    orderCount: number;
    averageOrderValue: number;
    totalItems: number;
  };
}

export interface MonthlySalesData {
  month: number;
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface VendorAnalytics {
  vendorId: string | null;
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface RecentOrderSummary {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
  totalAmount: number;
  status: string; // Changed from OrderStatus enum to string for tRPC compatibility
  paymentStatus: string; // Changed from PaymentStatus enum to string for tRPC compatibility
  createdAt: Date;
  itemCount: number;
}

export interface ProductSalesData {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  image: string | null;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface CategorySalesData {
  id: string;
  name: string;
  sales: number;
  items: number;
  percentage: number;
}

export interface VendorSalesData {
  id: string;
  name: string;
  sales: number;
  items: number;
  percentage: number;
}

export interface SalesTrendData {
  date: Date;
  sales: number;
  orders: number;
  items: number;
}

export interface CustomerSummary {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  retentionRate: number;
  growth: {
    newCustomers: number;
    activeCustomers: number;
    retentionRate: number;
  };
}

export interface ProductSummary {
  totalProducts: number;
  activeProducts: number;
  featuredProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryValue: number;
  newProducts: number;
  updatedProducts: number;
}

export interface OrderSummary {
  statusCounts: Record<string, number>;
  paymentCounts: {
    paid: number;
    unpaid: number;
    paidTotal: number;
    unpaidTotal: number;
  };
  totalOrders: number;
}

export interface DashboardAnalytics {
  salesSummary: SalesAnalytics;
  customerSummary: CustomerSummary;
  productSummary: ProductSummary;
  orderSummary: OrderSummary;
  recentOrders: RecentOrderSummary[];
  topProducts: ProductSalesData[];
  salesByCategory: CategorySalesData[];
  salesByVendor: VendorSalesData[];
  salesTrend: SalesTrendData[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

// Database aggregation result types (adapted for tRPC)
export interface OrderAggregateResult {
  _sum: {
    total?: number | null;
    subtotal?: number | null;
    taxAmount?: number | null;
    shippingAmount?: number | null;
    discountAmount?: number | null;
  } | null;
  _avg: {
    total?: number | null;
    subtotal?: number | null;
    taxAmount?: number | null;
    shippingAmount?: number | null;
    discountAmount?: number | null;
  } | null;
  _count: {
    id?: number;
    _all?: number;
  } | null;
}

export interface OrderItemAggregateResult {
  _sum: {
    quantity?: number | null;
    price?: number | null;
    total?: number | null;
  } | null;
  _count: {
    id?: number;
    orderId?: number;
    _all?: number;
  } | null;
}

// Utility types
export type AnalyticsInterval = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type AnalyticsGroupBy = 'product' | 'category' | 'vendor' | 'customer' | 'paymentMethod' | 'country';

export interface AnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  interval?: AnalyticsInterval;
  compareWithPrevious?: boolean;
  groupBy?: AnalyticsGroupBy;
}