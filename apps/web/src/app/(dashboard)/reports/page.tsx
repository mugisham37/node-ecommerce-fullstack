'use client';

import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SalesChart } from '@/components/charts/SalesChart';
import { InventoryChart } from '@/components/charts/InventoryChart';
import { RevenueChart } from '@/components/charts/RevenueChart';

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'sales' | 'inventory' | 'revenue' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  enabled: boolean;
}

export default function ReportsPage() {
  const {
    salesData,
    inventoryData,
    revenueData,
    isLoading,
    error,
    exportAnalytics,
    getTopPerformingProducts,
    getInventoryTurnover,
  } = useAnalytics();

  const [selectedReport, setSelectedReport] = useState<string>('sales-overview');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const predefinedReports: ReportConfig[] = [
    {
      id: 'sales-overview',
      name: 'Sales Overview',
      description: 'Comprehensive sales performance analysis',
      type: 'sales',
      frequency: 'daily',
      enabled: true,
    },
    {
      id: 'inventory-status',
      name: 'Inventory Status',
      description: 'Current inventory levels and stock analysis',
      type: 'inventory',
      frequency: 'weekly',
      enabled: true,
    },
    {
      id: 'revenue-analysis',
      name: 'Revenue Analysis',
      description: 'Revenue trends and profitability metrics',
      type: 'revenue',
      frequency: 'monthly',
      enabled: true,
    },
    {
      id: 'product-performance',
      name: 'Product Performance',
      description: 'Top performing products and categories',
      type: 'custom',
      frequency: 'weekly',
      enabled: true,
    },
    {
      id: 'inventory-turnover',
      name: 'Inventory Turnover',
      description: 'Inventory turnover rates by category',
      type: 'inventory',
      frequency: 'monthly',
      enabled: false,
    },
  ];

  const handleGenerateReport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsGenerating(true);
    try {
      await exportAnalytics(format);
      // In a real implementation, this would generate a specific report
      console.log(`Generating ${selectedReport} report in ${format} format`);
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleReport = (reportId: string, frequency: string) => {
    // In a real implementation, this would schedule the report
    console.log(`Scheduling report ${reportId} with frequency ${frequency}`);
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'sales-overview':
        return (
          <div className="space-y-6">
            <SalesChart data={salesData} loading={isLoading} />
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    ${salesData.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {salesData.reduce((sum, item) => sum + item.orders, 0)}
                  </p>
                  <p className="text-sm text-gray-500">Total Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    ${(salesData.reduce((sum, item) => sum + item.revenue, 0) / 
                      salesData.reduce((sum, item) => sum + item.orders, 0)).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">Avg Order Value</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'inventory-status':
        return (
          <div className="space-y-6">
            <InventoryChart data={inventoryData} loading={isLoading} chartType="bar" />
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Alerts</h3>
              <div className="space-y-3">
                {inventoryData.map((category) => (
                  <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{category.category}</p>
                      <p className="text-sm text-gray-500">{category.totalItems} total items</p>
                    </div>
                    <div className="text-right">
                      {category.lowStockItems > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">
                          {category.lowStockItems} low stock
                        </span>
                      )}
                      {category.outOfStockItems > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {category.outOfStockItems} out of stock
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'revenue-analysis':
        return (
          <div className="space-y-6">
            <RevenueChart data={revenueData} loading={isLoading} showProfit={true} showGrowth={true} />
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Monthly Breakdown</h4>
                  <div className="space-y-2">
                    {revenueData.map((month) => (
                      <div key={month.period} className="flex justify-between">
                        <span className="text-sm text-gray-600">{month.period}</span>
                        <span className="text-sm font-medium text-gray-900">
                          ${month.revenue.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Profit Margins</h4>
                  <div className="space-y-2">
                    {revenueData.map((month) => (
                      <div key={month.period} className="flex justify-between">
                        <span className="text-sm text-gray-600">{month.period}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {((month.profit / month.revenue) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'product-performance':
        const topProducts = getTopPerformingProducts();
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Products</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sales
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {topProducts.map((product, index) => (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          #{index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.sales}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${product.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'inventory-turnover':
        const turnoverData = getInventoryTurnover();
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Turnover Analysis</h3>
              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-900">{turnoverData.overall.toFixed(1)}x</p>
                <p className="text-sm text-gray-500">Overall Turnover Rate</p>
              </div>
              <div className="space-y-3">
                {turnoverData.byCategory.map((category) => (
                  <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{category.category}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {category.turnover.toFixed(1)}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <p className="text-gray-500">Select a report to view its content</p>
            </div>
          </div>
        );
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading reports</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
              <p className="mt-2 text-sm text-gray-600">
                Generate and schedule detailed business reports
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Generate Report Buttons */}
              <button
                onClick={() => handleGenerateReport('pdf')}
                disabled={isGenerating}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={() => handleGenerateReport('excel')}
                disabled={isGenerating}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {isGenerating ? 'Generating...' : 'Export Excel'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Report List Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Reports</h3>
                <nav className="space-y-2">
                  {predefinedReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedReport === report.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{report.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            report.enabled 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {report.enabled ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">
                            {report.frequency}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {predefinedReports.find(r => r.id === selectedReport)?.name || 'Report'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {predefinedReports.find(r => r.id === selectedReport)?.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={dateRange.from.toISOString().split('T')[0]}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                      className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={dateRange.to.toISOString().split('T')[0]}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                      className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {renderReportContent()}
          </div>
        </div>
      </div>
    </div>
  );
}