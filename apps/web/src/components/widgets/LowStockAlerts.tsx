'use client';

import { useInventory } from '@/hooks/useInventory';
import { type InventoryItem } from '@/store/inventoryStore';

interface LowStockAlertsProps {
  onViewItem?: (item: InventoryItem) => void;
  onAdjustStock?: (item: InventoryItem) => void;
  className?: string;
}

export const LowStockAlerts = ({
  onViewItem,
  onAdjustStock,
  className = '',
}: LowStockAlertsProps) => {
  const { lowStockAlerts, isLoading, getStockStatus } = useInventory();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (lowStockAlerts.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">All Good!</h3>
              <p className="text-sm text-gray-500">No low stock alerts at the moment.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
              <p className="text-sm text-gray-500">
                {lowStockAlerts.length} item{lowStockAlerts.length !== 1 ? 's' : ''} need attention
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {lowStockAlerts.length}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {lowStockAlerts.slice(0, 5).map((item) => {
            const stockStatus = getStockStatus(item);
            
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.product?.name || 'Unknown Product'}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        SKU: {item.product?.sku || 'N/A'}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Current: {item.quantity}</span>
                      <span>Threshold: {item.lowStockThreshold}</span>
                      {item.location && <span>Location: {item.location}</span>}
                    </div>
                    <div className="text-xs text-gray-400">
                      Updated {formatDate(item.lastUpdated)}
                    </div>
                  </div>

                  {/* Stock level bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Stock Level</span>
                      <span>{item.quantity} / {item.maxStockLevel || 'N/A'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.quantity === 0
                            ? 'bg-red-500'
                            : item.quantity <= item.lowStockThreshold
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: item.maxStockLevel > 0 
                            ? `${Math.min((item.quantity / item.maxStockLevel) * 100, 100)}%`
                            : '0%'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0 flex space-x-2">
                  {onViewItem && (
                    <button
                      onClick={() => onViewItem(item)}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      title="View details"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                  {onAdjustStock && (
                    <button
                      onClick={() => onAdjustStock(item)}
                      className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      title="Adjust stock"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {lowStockAlerts.length > 5 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              And {lowStockAlerts.length - 5} more item{lowStockAlerts.length - 5 !== 1 ? 's' : ''} with low stock
            </p>
          </div>
        )}
      </div>
    </div>
  );
};