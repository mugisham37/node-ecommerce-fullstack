'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type InventoryItem, type InventoryAdjustment } from '@/store/inventoryStore';

// Validation schema for inventory adjustment form
const InventoryAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  adjustmentType: z.enum(['SET', 'ADD', 'SUBTRACT'], {
    required_error: 'Adjustment type is required',
  }),
  quantity: z.number()
    .min(0, 'Quantity must be non-negative')
    .max(999999, 'Quantity must be less than 1,000,000'),
  reason: z.string()
    .min(1, 'Reason is required')
    .max(500, 'Reason must be less than 500 characters'),
  reference: z.string()
    .max(100, 'Reference must be less than 100 characters')
    .optional(),
});

type InventoryAdjustmentFormData = z.infer<typeof InventoryAdjustmentSchema>;

interface InventoryAdjustmentFormProps {
  item?: InventoryItem | null;
  onSubmit: (data: InventoryAdjustment) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const ADJUSTMENT_TYPES = [
  { value: 'SET', label: 'Set to specific amount', description: 'Set the stock to an exact quantity' },
  { value: 'ADD', label: 'Add stock', description: 'Increase stock by the specified amount' },
  { value: 'SUBTRACT', label: 'Remove stock', description: 'Decrease stock by the specified amount' },
] as const;

const COMMON_REASONS = [
  'Stock count correction',
  'Damaged goods removal',
  'Expired products removal',
  'Theft/Loss adjustment',
  'Supplier return',
  'Customer return',
  'Transfer to another location',
  'Promotional giveaway',
  'Sample usage',
  'Quality control rejection',
  'Other',
];

export const InventoryAdjustmentForm = ({
  item,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Adjust Stock',
}: InventoryAdjustmentFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    getValues,
  } = useForm<InventoryAdjustmentFormData>({
    resolver: zodResolver(InventoryAdjustmentSchema),
    defaultValues: {
      productId: '',
      adjustmentType: 'SET',
      quantity: 0,
      reason: '',
      reference: '',
    },
  });

  const watchedAdjustmentType = watch('adjustmentType');
  const watchedQuantity = watch('quantity');

  // Populate form when item is provided
  useEffect(() => {
    if (item) {
      setValue('productId', item.productId);
      setValue('quantity', item.quantity);
    } else {
      reset();
    }
  }, [item, setValue, reset]);

  const handleFormSubmit = async (data: InventoryAdjustmentFormData) => {
    try {
      await onSubmit({
        productId: data.productId,
        adjustmentType: data.adjustmentType,
        quantity: data.quantity,
        reason: data.reason,
        reference: data.reference || undefined,
      });
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error);
    }
  };

  const calculateNewQuantity = () => {
    if (!item) return 0;
    
    const currentQuantity = item.quantity;
    const adjustmentQuantity = watchedQuantity || 0;
    
    switch (watchedAdjustmentType) {
      case 'SET':
        return adjustmentQuantity;
      case 'ADD':
        return currentQuantity + adjustmentQuantity;
      case 'SUBTRACT':
        return Math.max(0, currentQuantity - adjustmentQuantity);
      default:
        return currentQuantity;
    }
  };

  const newQuantity = calculateNewQuantity();
  const isFormLoading = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Current Stock Info */}
      {item && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Current Stock Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Product:</span>
              <div className="font-medium">{item.product?.name || 'Unknown'}</div>
              <div className="text-xs text-gray-500 font-mono">SKU: {item.product?.sku || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-500">Current Quantity:</span>
              <div className="font-medium text-lg">{item.quantity.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-500">Location:</span>
              <div className="font-medium">{item.location || 'Not specified'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Adjustment Type *
        </label>
        <div className="space-y-3">
          {ADJUSTMENT_TYPES.map((type) => (
            <label key={type.value} className="flex items-start">
              <input
                {...register('adjustmentType')}
                type="radio"
                value={type.value}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={isFormLoading}
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">{type.label}</div>
                <div className="text-xs text-gray-500">{type.description}</div>
              </div>
            </label>
          ))}
        </div>
        {errors.adjustmentType && (
          <p className="mt-2 text-sm text-red-600">{errors.adjustmentType.message}</p>
        )}
      </div>

      {/* Quantity */}
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
          {watchedAdjustmentType === 'SET' ? 'New Quantity' : 'Adjustment Quantity'} *
        </label>
        <div className="mt-1">
          <input
            {...register('quantity', { valueAsNumber: true })}
            type="number"
            min="0"
            step="1"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter quantity"
            disabled={isFormLoading}
          />
          {errors.quantity && (
            <p className="mt-2 text-sm text-red-600">{errors.quantity.message}</p>
          )}
        </div>
      </div>

      {/* New Quantity Preview */}
      {item && watchedQuantity > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">New Quantity Preview</h4>
              <p className="text-xs text-blue-700">
                {item.quantity.toLocaleString()} → {newQuantity.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-900">
                {newQuantity.toLocaleString()}
              </div>
              <div className="text-xs text-blue-700">
                {watchedAdjustmentType === 'ADD' && '+'}
                {watchedAdjustmentType === 'SUBTRACT' && '-'}
                {watchedAdjustmentType !== 'SET' && watchedQuantity.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Warning for low stock */}
          {newQuantity <= (item.lowStockThreshold || 0) && (
            <div className="mt-2 flex items-center text-yellow-700">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-xs">This will result in low stock (threshold: {item.lowStockThreshold})</span>
            </div>
          )}
        </div>
      )}

      {/* Reason */}
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
          Reason *
        </label>
        <div className="mt-1">
          <select
            {...register('reason')}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isFormLoading}
          >
            <option value="">Select a reason</option>
            {COMMON_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
          {errors.reason && (
            <p className="mt-2 text-sm text-red-600">{errors.reason.message}</p>
          )}
        </div>
      </div>

      {/* Custom Reason */}
      {watch('reason') === 'Other' && (
        <div>
          <label htmlFor="customReason" className="block text-sm font-medium text-gray-700">
            Custom Reason *
          </label>
          <div className="mt-1">
            <textarea
              {...register('reason')}
              rows={3}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Please specify the reason for this adjustment"
              disabled={isFormLoading}
            />
          </div>
        </div>
      )}

      {/* Reference */}
      <div>
        <label htmlFor="reference" className="block text-sm font-medium text-gray-700">
          Reference (Optional)
        </label>
        <div className="mt-1">
          <input
            {...register('reference')}
            type="text"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., PO#12345, Invoice#67890"
            disabled={isFormLoading}
          />
          {errors.reference && (
            <p className="mt-2 text-sm text-red-600">{errors.reference.message}</p>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Optional reference number or document ID for this adjustment
        </p>
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
              Processing...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
};

export type { InventoryAdjustmentFormData };