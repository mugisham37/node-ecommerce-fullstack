'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/trpc';
import { type Order, type OrderStatus } from '@/store/orderStore';
import { type OrderCreateDTO, type OrderItemCreateDTO } from '@/hooks/useOrders';

// Validation schema for order form
const OrderItemFormSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative').optional(),
});

const OrderFormSchema = z.object({
  userId: z.string().min(1, 'Customer is required').optional(),
  items: z.array(OrderItemFormSchema).min(1, 'At least one item is required'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
}).refine((data) => {
  // Validate that all product IDs are unique
  const productIds = data.items.map(item => item.productId);
  return new Set(productIds).size === productIds.length;
}, {
  message: "Duplicate products in order items",
  path: ["items"],
});

type OrderFormData = z.infer<typeof OrderFormSchema>;

interface OrderFormProps {
  order?: Order | null;
  onSubmit: (data: OrderCreateDTO) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export const OrderForm = ({
  order,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Order',
}: OrderFormProps) => {
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: any}>({});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    control,
  } = useForm<OrderFormData>({
    resolver: zodResolver(OrderFormSchema),
    defaultValues: {
      userId: '',
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Fetch users for customer dropdown
  const { data: users } = api.users?.getAll?.useQuery() || { data: [] };
  
  // Fetch products for product dropdowns
  const { data: products } = api.products?.getAll?.useQuery() || { data: [] };

  // Watch form values for calculations
  const watchedItems = watch('items');

  // Calculate total amount
  const totalAmount = watchedItems.reduce((sum, item) => {
    const product = selectedProducts[item.productId];
    const unitPrice = item.unitPrice || product?.price || 0;
    return sum + (unitPrice * item.quantity);
  }, 0);

  // Populate form when editing existing order
  useEffect(() => {
    if (order) {
      setValue('userId', order.userId);
      setValue('notes', order.notes || '');
      
      // Set order items
      const orderItems = order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));
      setValue('items', orderItems);

      // Populate selected products for price calculation
      const productMap: {[key: string]: any} = {};
      order.items.forEach(item => {
        if (item.product) {
          productMap[item.productId] = item.product;
        }
      });
      setSelectedProducts(productMap);
    } else {
      reset();
      setSelectedProducts({});
    }
  }, [order, setValue, reset]);

  // Update selected products when product selection changes
  const handleProductChange = (index: number, productId: string) => {
    const product = products?.find((p: any) => p.id === productId);
    if (product) {
      setSelectedProducts(prev => ({
        ...prev,
        [productId]: product,
      }));
      
      // Auto-fill unit price if not manually set
      setValue(`items.${index}.unitPrice`, product.price);
    }
  };

  const handleFormSubmit = async (data: OrderFormData) => {
    try {
      // Transform form data to match API expectations
      const orderData: OrderCreateDTO = {
        userId: data.userId,
        items: data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        notes: data.notes,
      };
      
      await onSubmit(orderData);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error);
    }
  };

  const addOrderItem = () => {
    append({ productId: '', quantity: 1, unitPrice: 0 });
  };

  const removeOrderItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Customer Selection */}
      <div>
        <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
          Customer *
        </label>
        <div className="mt-1">
          <select
            {...register('userId')}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isFormLoading}
          >
            <option value="">Select a customer</option>
            {users?.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName} ({user.email})
              </option>
            ))}
          </select>
          {errors.userId && (
            <p className="mt-2 text-sm text-red-600">{errors.userId.message}</p>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Order Items *
          </label>
          <button
            type="button"
            onClick={addOrderItem}
            disabled={isFormLoading}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Item {index + 1}</h4>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOrderItem(index)}
                    disabled={isFormLoading}
                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product *
                  </label>
                  <select
                    {...register(`items.${index}.productId`)}
                    onChange={(e) => {
                      register(`items.${index}.productId`).onChange(e);
                      handleProductChange(index, e.target.value);
                    }}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    disabled={isFormLoading}
                  >
                    <option value="">Select product</option>
                    {products?.map((product: any) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                  {errors.items?.[index]?.productId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.items[index]?.productId?.message}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity *
                  </label>
                  <input
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    type="number"
                    min="1"
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    disabled={isFormLoading}
                  />
                  {errors.items?.[index]?.quantity && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.items[index]?.quantity?.message}
                    </p>
                  )}
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit Price ($)
                  </label>
                  <input
                    {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    disabled={isFormLoading}
                  />
                  {errors.items?.[index]?.unitPrice && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.items[index]?.unitPrice?.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Item Total */}
              {watchedItems[index]?.productId && (
                <div className="mt-3 text-right">
                  <span className="text-sm text-gray-600">
                    Item Total: {' '}
                    <span className="font-medium">
                      ${((watchedItems[index]?.unitPrice || selectedProducts[watchedItems[index]?.productId]?.price || 0) * watchedItems[index]?.quantity).toFixed(2)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {errors.items && typeof errors.items.message === 'string' && (
          <p className="mt-2 text-sm text-red-600">{errors.items.message}</p>
        )}
      </div>

      {/* Order Total */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium text-gray-900">Order Total:</span>
          <span className="text-xl font-bold text-gray-900">
            ${totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <div className="mt-1">
          <textarea
            {...register('notes')}
            rows={3}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Add any notes about this order..."
            disabled={isFormLoading}
          />
          {errors.notes && (
            <p className="mt-2 text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isFormLoading}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isFormLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFormLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
};

export type { OrderFormData };