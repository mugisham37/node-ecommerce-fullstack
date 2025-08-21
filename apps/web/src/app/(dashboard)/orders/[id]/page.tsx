'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/useOrders';
import { OrderForm } from '@/components/forms/OrderForm';
import { type Order, type OrderStatus } from '@/store/orderStore';
import { type OrderUpdateDTO } from '@/hooks/useOrders';

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  const { getOrder, updateOrder, updateOrderStatus, isUpdating, isUpdatingStatus, error } = useOrders();
  const [isEditing, setIsEditing] = useState(false);
  const [statusUpdateReason, setStatusUpdateReason] = useState('');
  const [showStatusModal, setShowStatusModal] = useState<OrderStatus | null>(null);

  // Get order data
  const { data: order, isLoading, error: fetchError } = getOrder(params.id);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async (data: any) => {
    try {
      const updateData: OrderUpdateDTO = {
        notes: data.notes,
      };
      
      await updateOrder(params.id, updateData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    setShowStatusModal(newStatus);
  };

  const confirmStatusUpdate = async () => {
    if (showStatusModal) {
      try {
        await updateOrderStatus(params.id, {
          status: showStatusModal,
          reason: statusUpdateReason,
          notifyCustomer: true,
        });
        setShowStatusModal(null);
        setStatusUpdateReason('');
      } catch (error) {
        console.error('Failed to update order status:', error);
      }
    }
  };

  const handleBack = () => {
    router.push('/orders');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      case 'CONFIRMED':
        return 'text-blue-600 bg-blue-100';
      case 'PROCESSING':
        return 'text-indigo-600 bg-indigo-100';
      case 'SHIPPED':
        return 'text-purple-600 bg-purple-100';
      case 'DELIVERED':
        return 'text-green-600 bg-green-100';
      case 'CANCELLED':
        return 'text-red-600 bg-red-100';
      case 'REFUNDED':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getNextStatusOptions = (currentStatus: OrderStatus): OrderStatus[] => {
    switch (currentStatus) {
      case 'PENDING':
        return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['PROCESSING', 'CANCELLED'];
      case 'PROCESSING':
        return ['SHIPPED', 'CANCELLED'];
      case 'SHIPPED':
        return ['DELIVERED'];
      case 'DELIVERED':
        return ['REFUNDED'];
      case 'CANCELLED':
        return [];
      case 'REFUNDED':
        return [];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse"></div> <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || !order) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">
                {fetchError?.message || 'Order not found'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ← Back to Orders
        </button>
      </div>
    );
  }

  const nextStatusOptions = getNextStatusOptions(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <button
                  onClick={handleBack}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="flex-shrink-0 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="sr-only">Back</span>
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={handleBack}
                    className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Orders
                  </button>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="text-gray-400">/</span>
                  <span className="ml-4 text-sm font-medium text-gray-900">
                    {order.orderNumber}
                  </span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Order {order.orderNumber}
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          {!isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Order
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isEditing ? (
        /* Edit Form */
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Order</h3>
            <OrderForm
              order={order}
              onSubmit={handleSave}
              onCancel={handleCancelEdit}
              isLoading={isUpdating}
              submitLabel="Update Order"
            />
          </div>
        </div>
      ) : (
        /* Order Details */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Order Info */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    {nextStatusOptions.length > 0 && (
                      <div className="relative">
                        <select
                          className="text-sm border border-gray-300 rounded px-3 py-1 bg-white"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleStatusUpdate(e.target.value as OrderStatus);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Update Status</option>
                          {nextStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{order.orderNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Customer</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {order.user ? `${order.user.firstName} ${order.user.lastName}` : 'N/A'}
                      {order.user?.email && (
                        <div className="text-xs text-gray-500">{order.user.email}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(order.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(order.updatedAt)}</dd>
                  </div>
                </div>

                {order.notes && (
                  <div className="mt-6">
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.notes}</dd>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="mt-6 bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.product?.name || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono">
                              {item.product?.sku || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.quantity}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(item.unitPrice)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(item.totalPrice)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Items ({order.items.length})</span>
                    <span className="text-sm text-gray-900">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} total
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="text-sm text-gray-900">
                      {formatCurrency(order.items.reduce((sum, item) => sum + item.totalPrice, 0))}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">Total</span>
                      <span className="text-base font-medium text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update Order Status
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Change order status from <strong>{order.status}</strong> to <strong>{showStatusModal}</strong>
              </p>
              <div className="mb-4">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  value={statusUpdateReason}
                  onChange={(e) => setStatusUpdateReason(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter reason for status change..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowStatusModal(null);
                    setStatusUpdateReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusUpdate}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}