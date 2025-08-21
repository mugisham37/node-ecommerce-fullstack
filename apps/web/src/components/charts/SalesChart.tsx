'use client';

import { useMemo } from 'react';
import { type SalesData } from '@/hooks/useAnalytics';

interface SalesChartProps {
  data: SalesData[];
  height?: number;
  className?: string;
  showRevenue?: boolean;
  showOrders?: boolean;
  loading?: boolean;
}

export const SalesChart = ({
  data,
  height = 300,
  className = '',
  showRevenue = true,
  showOrders = true,
  loading = false,
}: SalesChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { maxValue: 0, points: [] };

    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const maxOrders = Math.max(...data.map(d => d.orders));
    const maxValue = Math.max(maxRevenue, maxOrders * 100); // Scale orders for visibility

    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const revenueY = 100 - (item.revenue / maxValue) * 100;
      const ordersY = 100 - ((item.orders * 100) / maxValue) * 100;
      
      return {
        x,
        revenueY,
        ordersY,
        date: item.date,
        revenue: item.revenue,
        orders: item.orders,
        sales: item.sales,
      };
    });

    return { maxValue, points };
  }, [data]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sales data</h3>
            <p className="mt-1 text-sm text-gray-500">Sales data will appear here once available.</p>
          </div>
        </div>
      </div>
    );
  }

  const revenuePathData = chartData.points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.revenueY}`)
    .join(' ');

  const ordersPathData = chartData.points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.ordersY}`)
    .join(' ');

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Sales Overview</h3>
          <p className="text-sm text-gray-500">Revenue and orders over time</p>
        </div>
        <div className="flex items-center space-x-4">
          {showRevenue && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Revenue</span>
            </div>
          )}
          {showOrders && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Orders</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative" style={{ height }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Revenue line */}
          {showRevenue && (
            <path
              d={revenuePathData}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Orders line */}
          {showOrders && (
            <path
              d={ordersPathData}
              fill="none"
              stroke="#10b981"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Data points */}
          {chartData.points.map((point, index) => (
            <g key={index}>
              {showRevenue && (
                <circle
                  cx={point.x}
                  cy={point.revenueY}
                  r="0.8"
                  fill="#3b82f6"
                  vectorEffect="non-scaling-stroke"
                  className="hover:r-1.2 transition-all cursor-pointer"
                >
                  <title>{`${formatDate(point.date)}: ${formatCurrency(point.revenue)}`}</title>
                </circle>
              )}
              {showOrders && (
                <circle
                  cx={point.x}
                  cy={point.ordersY}
                  r="0.8"
                  fill="#10b981"
                  vectorEffect="non-scaling-stroke"
                  className="hover:r-1.2 transition-all cursor-pointer"
                >
                  <title>{`${formatDate(point.date)}: ${point.orders} orders`}</title>
                </circle>
              )}
            </g>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 mt-2">
          {chartData.points.map((point, index) => (
            <span key={index} className="transform -translate-x-1/2">
              {formatDate(point.date)}
            </span>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))}
          </p>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {data.reduce((sum, item) => sum + item.orders, 0)}
          </p>
          <p className="text-sm text-gray-500">Total Orders</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {data.reduce((sum, item) => sum + item.sales, 0)}
          </p>
          <p className="text-sm text-gray-500">Total Sales</p>
        </div>
      </div>
    </div>
  );
};