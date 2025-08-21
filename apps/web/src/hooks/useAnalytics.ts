import { useCallback, useEffect, useMemo } from 'react';
import { api } from '@/lib/trpc';

// Analytics data types
export interface SalesData {
  date: string;
  sales: number;
  revenue: number;
  orders: number;
}

export interface InventoryData {
  category: string;
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  value: number;
}

export interface RevenueData {
  period: string;
  revenue: number;
  profit: number;
  growth: number;
}

export interface AnalyticsStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueGrowth: number;
  orderGrowth: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface AnalyticsFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  categories?: string[];
  suppliers?: string[];
}

export const useAnalytics = () => {
  // Mock data for now - in real implementation, these would come from tRPC queries
  const mockSalesData: SalesData[] = useMemo(() => [
    { date: '2024-01-01', sales: 120, revenue: 12000, orders: 45 },
    { date: '2024-01-02', sales: 150, revenue: 15000, orders: 52 },
    { date: '2024-01-03', sales: 180, revenue: 18000, orders: 61 },
    { date: '2024-01-04', sales: 140, revenue: 14000, orders: 48 },
    { date: '2024-01-05', sales: 200, revenue: 20000, orders: 67 },
    { date: '2024-01-06', sales: 160, revenue: 16000, orders: 55 },
    { date: '2024-01-07', sales: 190, revenue: 19000, orders: 63 },
  ], []);

  const mockInventoryData: InventoryData[] = useMemo(() => [
    { category: 'Electronics', totalItems: 450, lowStockItems: 12, outOfStockItems: 3, value: 125000 },
    { category: 'Clothing', totalItems: 320, lowStockItems: 8, outOfStockItems: 2, value: 45000 },
    { category: 'Home & Garden', totalItems: 280, lowStockItems: 15, outOfStockItems: 5, value: 67000 },
    { category: 'Sports', totalItems: 180, lowStockItems: 6, outOfStockItems: 1, value: 32000 },
    { category: 'Books', totalItems: 150, lowStockItems: 4, outOfStockItems: 0, value: 8500 },
  ], []);

  const mockRevenueData: RevenueData[] = useMemo(() => [
    { period: 'Jan', revenue: 45000, profit: 12000, growth: 8.5 },
    { period: 'Feb', revenue: 52000, profit: 14500, growth: 15.6 },
    { period: 'Mar', revenue: 48000, profit: 13200, growth: -7.7 },
    { period: 'Apr', revenue: 61000, profit: 17800, growth: 27.1 },
    { period: 'May', revenue: 58000, profit: 16200, growth: -4.9 },
    { period: 'Jun', revenue: 67000, profit: 19500, growth: 15.5 },
  ], []);

  const mockStats: AnalyticsStats = useMemo(() => ({
    totalRevenue: 331000,
    totalOrders: 1245,
    totalProducts: 1380,
    totalCustomers: 892,
    revenueGrowth: 12.4,
    orderGrowth: 8.7,
    averageOrderValue: 265.86,
    conversionRate: 3.2,
  }), []);

  // In a real implementation, these would be tRPC queries
  // const { data: salesData, isLoading: salesLoading } = api.analytics.getSalesData.useQuery(filters);
  // const { data: inventoryData, isLoading: inventoryLoading } = api.analytics.getInventoryData.useQuery(filters);
  // const { data: revenueData, isLoading: revenueLoading } = api.analytics.getRevenueData.useQuery(filters);
  // const { data: stats, isLoading: statsLoading } = api.analytics.getStats.useQuery(filters);

  // Mock loading states
  const isLoading = false;
  const error = null;

  // Computed analytics
  const computedAnalytics = useMemo(() => {
    const totalSales = mockSalesData.reduce((sum, day) => sum + day.sales, 0);
    const totalRevenue = mockSalesData.reduce((sum, day) => sum + day.revenue, 0);
    const totalOrders = mockSalesData.reduce((sum, day) => sum + day.orders, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const totalInventoryValue = mockInventoryData.reduce((sum, category) => sum + category.value, 0);
    const totalLowStock = mockInventoryData.reduce((sum, category) => sum + category.lowStockItems, 0);
    const totalOutOfStock = mockInventoryData.reduce((sum, category) => sum + category.outOfStockItems, 0);

    return {
      totalSales,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalInventoryValue,
      totalLowStock,
      totalOutOfStock,
    };
  }, [mockSalesData, mockInventoryData]);

  // Actions
  const refreshAnalytics = useCallback(async () => {
    // In real implementation, this would refetch all analytics data
    console.log('Refreshing analytics data...');
  }, []);

  const exportAnalytics = useCallback(async (format: 'csv' | 'pdf' | 'excel') => {
    // In real implementation, this would export analytics data
    console.log(`Exporting analytics data as ${format}...`);
  }, []);

  const getTopPerformingProducts = useCallback(() => {
    // Mock data - in real implementation, this would come from API
    return [
      { id: '1', name: 'Wireless Headphones', sales: 145, revenue: 14500 },
      { id: '2', name: 'Smart Watch', sales: 132, revenue: 26400 },
      { id: '3', name: 'Laptop Stand', sales: 98, revenue: 4900 },
      { id: '4', name: 'USB-C Cable', sales: 87, revenue: 1740 },
      { id: '5', name: 'Bluetooth Speaker', sales: 76, revenue: 7600 },
    ];
  }, []);

  const getTopPerformingCategories = useCallback(() => {
    return mockInventoryData
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(category => ({
        name: category.category,
        value: category.value,
        items: category.totalItems,
      }));
  }, [mockInventoryData]);

  const getSalesGrowthRate = useCallback((period: 'week' | 'month' | 'quarter') => {
    // Mock calculation - in real implementation, this would be calculated from actual data
    const growthRates = {
      week: 5.2,
      month: 12.4,
      quarter: 18.7,
    };
    return growthRates[period];
  }, []);

  const getInventoryTurnover = useCallback(() => {
    // Mock calculation - in real implementation, this would be calculated from actual data
    return {
      overall: 4.2,
      byCategory: mockInventoryData.map(category => ({
        category: category.category,
        turnover: Math.random() * 6 + 2, // Mock turnover rate between 2-8
      })),
    };
  }, [mockInventoryData]);

  return {
    // Data
    salesData: mockSalesData,
    inventoryData: mockInventoryData,
    revenueData: mockRevenueData,
    stats: mockStats,
    computedAnalytics,

    // Loading states
    isLoading,
    error,

    // Actions
    refreshAnalytics,
    exportAnalytics,

    // Computed data
    getTopPerformingProducts,
    getTopPerformingCategories,
    getSalesGrowthRate,
    getInventoryTurnover,
  };
};

export type { AnalyticsFilters };