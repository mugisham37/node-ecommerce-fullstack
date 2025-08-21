'use client';

import { useMemo } from 'react';
import { type RevenueData } from '@/hooks/useAnalytics';

interface RevenueChartProps {
  data: RevenueData[];
  height?: number;
  className?: string;
  showProfit?: boolean;
  showGrowth?: boolean;
  loading?: boolean;
}

export const RevenueChart = ({
  data,
  height = 300,
  className = '',
  showProfit = true,
  showGrowth = false,
  loading = false,
}: RevenueChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { maxRevenue: 0, maxProfit: 0, bars: [] };

    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const maxProfit = Math.max(...data.map(d => d.profit));
    const maxValue = Math.max(maxRevenue, maxProfit);

    const bars = data.map((item, index) => {
      const revenueHeight = maxValue > 0 ? (item.revenue / maxValue) * 100 : 0;
      const profitHeight = maxValue > 0 ? (item.profit / maxValue) * 100 : 0;
      const x = (index / data.length) * 100;
      const barWidth = 80 / data.length; // 80% of chart width divided by number of bars

      return {
        ...item,
        revenueHeight,
        profitHeight,
        x,
        barWidth,
      };
    });

    return { maxRevenue, maxProfit, maxValue, bars };
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No revenue data</h3>
            <p className="mt-1 text-sm text-gray-500">Revenue data will appear here once available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Revenue & Profit</h3>
          <p className="text-sm text-gray-500">Monthly performance overview</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Revenue</span>
          </div>
          {showProfit && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Profit</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative mb-4" style={{ height: height - 100 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <defs>
            <pattern id="revenue-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#revenue-grid)" />

          {/* Bars */}
          {chartData.bars.map((bar, index) => {
            const barX = (index + 0.5) * (100 / data.length) - bar.barWidth / 2;
            
            return (
              <g key={bar.period}>
                {/* Revenue bar */}
                <rect
                  x={barX}
                  y={100 - bar.revenueHeight}
                  width={bar.barWidth * 0.4}
                  height={bar.revenueHeight}
                  fill="#3b82f6"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <title>{`${bar.period} Revenue: ${formatCurrency(bar.revenue)}`}</title>
                </rect>

                {/* Profit bar */}
                {showProfit && (
                  <rect
                    x={barX + bar.barWidth * 0.5}
                    y={100 - bar.profitHeight}
                    width={bar.barWidth * 0.4}
                    height={bar.profitHeight}
                    fill="#10b981"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <title>{`${bar.period} Profit: ${formatCurrency(bar.profit)}`}</title>
                  </rect>
                )}
              </g>
            );
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 -ml-12">
          <span>{formatCurrency(chartData.maxValue)}</span>
          <span>{formatCurrency(chartData.maxValue * 0.75)}</span>
          <span>{formatCurrency(chartData.maxValue * 0.5)}</span>
          <span>{formatCurrency(chartData.maxValue * 0.25)}</span>
          <span>$0</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-500 mb-4">
        {chartData.bars.map((bar) => (
          <span key={bar.period} className="text-center flex-1">
            {bar.period}
          </span>
        ))}
      </div>

      {/* Growth indicators */}
      {showGrowth && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Growth Rate</h4>
          <div className="flex justify-between">
            {chartData.bars.map((bar) => (
              <div key={`growth-${bar.period}`} className="text-center flex-1">
                <div
                  className={`text-xs font-medium ${
                    bar.growth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatPercentage(bar.growth)}
                </div>
                <div className="flex justify-center mt-1">
                  {bar.growth >= 0 ? (
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))}
          </p>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(data.reduce((sum, item) => sum + item.profit, 0))}
          </p>
          <p className="text-sm text-gray-500">Total Profit</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {formatPercentage(
              data.reduce((sum, item) => sum + item.growth, 0) / data.length
            )}
          </p>
          <p className="text-sm text-gray-500">Avg Growth</p>
        </div>
      </div>
    </div>
  );
};