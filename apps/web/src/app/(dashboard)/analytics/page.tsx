'use client';

import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { StatsCard, StatsIcons } from '@/components/widgets/StatsCard';
import { SalesChart } from '@/components/charts/SalesChart';
import { InventoryChart } from '@/components/charts/InventoryChart';
import { RevenueChart } from '@/components/charts/RevenueChart';

export default function AnalyticsPage() {
  const {
    salesData,
    inventoryData,
    revenueData,
    stats,
    computedAnalytics,
    isLoading,
    error,
    refreshAnalytics,
    exportAnalytics,
    getTopPerformingProducts,
    getTopPerformingCategories,
    getSalesGrowthRate,
  } = useAnalytics();

  const [dateRange, setDateRange] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAnalytics();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      await exportAnalytics(format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const topProducts = getTopPerformingProducts();
  const topCategories = getTopPerformingCategories();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading analytics</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">
                Comprehensive insights into your business performance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>

              {/* Export Dropdown */}
              <div className="relative inline-block text-left">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleExport(e.target.value as 'csv' | 'pdf' | 'excel');
                      e.target.value = '';
                    }
                  }}
                  className="block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>Export</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg
                  className={`-ml-1 mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Revenue"
            value={stats.totalRevenue}
            change={{
              value: stats.revenueGrowth,
              type: stats.revenueGrowth >= 0 ? 'increase' : 'decrease',
              period: 'last month',
            }}
            icon={<StatsIcons.Revenue />}
            loading={isLoading}
          />
          <StatsCard
            title="Total Orders"
            value={stats.totalOrders}
            change={{
              value: stats.orderGrowth,
              type: stats.orderGrowth >= 0 ? 'increase' : 'decrease',
              period: 'last month',
            }}
            icon={<StatsIcons.Orders />}
            loading={isLoading}
          />
          <StatsCard
            title="Average Order Value"
            value={`$${stats.averageOrderValue.toFixed(2)}`}
            description="Per order"
            icon={<StatsIcons.Growth />}
            loading={isLoading}
          />
          <StatsCard
            title="Conversion Rate"
            value={`${stats.conversionRate}%`}
            description="Visitors to customers"
            icon={<StatsIcons.Conversion />}
            loading={isLoading}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SalesChart
            data={salesData}
            loading={isLoading}
            className="lg:col-span-1"
          />
          <RevenueChart
            data={revenueData}
            loading={isLoading}
            showProfit={true}
            showGrowth={true}
            className="lg:col-span-1"
          />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <InventoryChart
            data={inventoryData}
            loading={isLoading}
            chartType="donut"
            className="lg:col-span-2"
          />
          
          {/* Top Performing Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products</h3>
            <div className="space-y-4">
              {topProducts.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.sales} sales
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    ${product.revenue.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Categories</h3>
            <div className="space-y-4">
              {topCategories.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-green-600">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {category.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {category.items} items
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    ${category.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Growth Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Growth Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Weekly Growth</p>
                  <p className="text-sm text-gray-500">Sales growth rate</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    +{getSalesGrowthRate('week')}%
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Monthly Growth</p>
                  <p className="text-sm text-gray-500">Sales growth rate</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    +{getSalesGrowthRate('month')}%
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Quarterly Growth</p>
                  <p className="text-sm text-gray-500">Sales growth rate</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    +{getSalesGrowthRate('quarter')}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}