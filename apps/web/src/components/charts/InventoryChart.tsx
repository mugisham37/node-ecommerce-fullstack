'use client';

import { useMemo } from 'react';
import { type InventoryData } from '@/hooks/useAnalytics';

interface InventoryChartProps {
  data: InventoryData[];
  height?: number;
  className?: string;
  chartType?: 'bar' | 'donut';
  loading?: boolean;
}

export const InventoryChart = ({
  data,
  height = 300,
  className = '',
  chartType = 'bar',
  loading = false,
}: InventoryChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { maxValue: 0, items: [], total: 0 };

    const maxValue = Math.max(...data.map(d => d.totalItems));
    const total = data.reduce((sum, item) => sum + item.totalItems, 0);

    const items = data.map((item, index) => {
      const percentage = total > 0 ? (item.totalItems / total) * 100 : 0;
      const barHeight = maxValue > 0 ? (item.totalItems / maxValue) * 100 : 0;
      
      return {
        ...item,
        percentage,
        barHeight,
        color: getColorForIndex(index),
      };
    });

    return { maxValue, items, total };
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  function getColorForIndex(index: number) {
    const colors = [
      { bg: '#3b82f6', light: '#dbeafe' },
      { bg: '#10b981', light: '#d1fae5' },
      { bg: '#f59e0b', light: '#fef3c7' },
      { bg: '#ef4444', light: '#fee2e2' },
      { bg: '#8b5cf6', light: '#ede9fe' },
      { bg: '#06b6d4', light: '#cffafe' },
      { bg: '#84cc16', light: '#ecfccb' },
      { bg: '#f97316', light: '#fed7aa' },
    ];
    return colors[index % colors.length];
  }

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory data</h3>
            <p className="mt-1 text-sm text-gray-500">Inventory data will appear here once available.</p>
          </div>
        </div>
      </div>
    );
  }

  const renderBarChart = () => (
    <div className="space-y-4">
      {chartData.items.map((item, index) => (
        <div key={item.category} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color.bg }}
              ></div>
              <span className="text-sm font-medium text-gray-900">{item.category}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-gray-900">{item.totalItems}</span>
              <span className="text-xs text-gray-500 ml-1">items</span>
            </div>
          </div>
          
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: item.color.bg,
                  width: `${item.barHeight}%`,
                }}
              ></div>
            </div>
            
            {/* Stock status indicators */}
            <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
              <div className="flex items-center space-x-3">
                {item.lowStockItems > 0 && (
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></div>
                    {item.lowStockItems} low
                  </span>
                )}
                {item.outOfStockItems > 0 && (
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-1"></div>
                    {item.outOfStockItems} out
                  </span>
                )}
              </div>
              <span>{formatCurrency(item.value)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDonutChart = () => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    let cumulativePercentage = 0;

    return (
      <div className="flex items-center space-x-8">
        <div className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="10"
            />
            {chartData.items.map((item, index) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativePercentage * circumference / 100;
              cumulativePercentage += item.percentage;

              return (
                <circle
                  key={item.category}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={item.color.bg}
                  strokeWidth="10"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{chartData.total}</div>
              <div className="text-sm text-gray-500">Total Items</div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {chartData.items.map((item) => (
            <div key={item.category} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color.bg }}
                ></div>
                <span className="text-sm text-gray-900">{item.category}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {item.totalItems} ({item.percentage.toFixed(1)}%)
                </div>
                <div className="text-xs text-gray-500">{formatCurrency(item.value)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Inventory Distribution</h3>
          <p className="text-sm text-gray-500">Items by category</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {}}
            className={`px-3 py-1 text-xs rounded-md ${
              chartType === 'bar'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Bar
          </button>
          <button
            onClick={() => {}}
            className={`px-3 py-1 text-xs rounded-md ${
              chartType === 'donut'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Donut
          </button>
        </div>
      </div>

      <div style={{ height }}>
        {chartType === 'bar' ? renderBarChart() : renderDonutChart()}
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{chartData.total}</p>
          <p className="text-sm text-gray-500">Total Items</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {chartData.items.reduce((sum, item) => sum + item.lowStockItems, 0)}
          </p>
          <p className="text-sm text-gray-500">Low Stock</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">
            {chartData.items.reduce((sum, item) => sum + item.outOfStockItems, 0)}
          </p>
          <p className="text-sm text-gray-500">Out of Stock</p>
        </div>
      </div>
    </div>
  );
};