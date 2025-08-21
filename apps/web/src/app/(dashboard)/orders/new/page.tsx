'use client';

import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/useOrders';
import { OrderForm } from '@/components/forms/OrderForm';
import { type OrderCreateDTO } from '@/hooks/useOrders';

export default function NewOrderPage() {
  const router = useRouter();
  const { createOrder, isCreating, error } = useOrders();

  const handleSubmit = async (data: OrderCreateDTO) => {
    try {
      const newOrder = await createOrder(data);
      if (newOrder) {
        router.push(`/orders/${newOrder.id}`);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  const handleCancel = () => {
    router.push('/orders');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <button
                onClick={handleCancel}
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
                  onClick={handleCancel}
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
                  New Order
                </span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Create New Order</h1>
        <p className="mt-2 text-sm text-gray-700">
          Create a new order by selecting a customer and adding products.
        </p>
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

      {/* Order Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <OrderForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isCreating}
            submitLabel="Create Order"
          />
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Creating Orders</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Select a customer from the dropdown list</li>
                <li>Add one or more products to the order</li>
                <li>Unit prices will be auto-filled from product data but can be overridden</li>
                <li>The order total will be calculated automatically</li>
                <li>Add notes if needed for special instructions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}