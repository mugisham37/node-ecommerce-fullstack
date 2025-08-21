'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/trpc';
import { type Product } from '@/store/productStore';

// Validation schema for product form
const ProductFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().optional(),
  sku: z.string()
    .min(1, 'SKU is required')
    .max(100, 'SKU must be less than 100 characters')
    .regex(/^[A-Z0-9-]+$/, 'SKU must contain only uppercase letters, numbers, and hyphens'),
  price: z.number()
    .min(0.01, 'Price must be greater than 0')
    .max(999999.99, 'Price must be less than 1,000,000'),
  categoryId: z.string().min(1, 'Category is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
});

type ProductFormData = z.infer<typeof ProductFormSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export const ProductForm = ({
  product,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Product',
}: ProductFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      price: 0,
      categoryId: '',
      supplierId: '',
    },
  });

  // Fetch categories and suppliers for dropdowns
  const { data: categories } = api.categories?.getAll?.useQuery() || { data: [] };
  const { data: suppliers } = api.suppliers?.getAll?.useQuery() || { data: [] };

  // Populate form when editing existing product
  useEffect(() => {
    if (product) {
      setValue('name', product.name);
      setValue('description', product.description || '');
      setValue('sku', product.sku);
      setValue('price', product.price);
      setValue('categoryId', product.categoryId);
      setValue('supplierId', product.supplierId);
    } else {
      reset();
    }
  }, [product, setValue, reset]);

  const handleFormSubmit = async (data: ProductFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error);
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Product Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Product Name *
        </label>
        <div className="mt-1">
          <input
            {...register('name')}
            type="text"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter product name"
            disabled={isFormLoading}
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
      </div>

      {/* Product Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <div className="mt-1">
          <textarea
            {...register('description')}
            rows={3}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter product description"
            disabled={isFormLoading}
          />
          {errors.description && (
            <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>
      </div>

      {/* SKU and Price Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* SKU */}
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
            SKU *
          </label>
          <div className="mt-1">
            <input
              {...register('sku')}
              type="text"
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., PROD-001"
              disabled={isFormLoading}
            />
            {errors.sku && (
              <p className="mt-2 text-sm text-red-600">{errors.sku.message}</p>
            )}
          </div>
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Price ($) *
          </label>
          <div className="mt-1">
            <input
              {...register('price', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="0.00"
              disabled={isFormLoading}
            />
            {errors.price && (
              <p className="mt-2 text-sm text-red-600">{errors.price.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Category and Supplier Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Category */}
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
            Category *
          </label>
          <div className="mt-1">
            <select
              {...register('categoryId')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isFormLoading}
            >
              <option value="">Select a category</option>
              {categories?.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-2 text-sm text-red-600">{errors.categoryId.message}</p>
            )}
          </div>
        </div>

        {/* Supplier */}
        <div>
          <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700">
            Supplier *
          </label>
          <div className="mt-1">
            <select
              {...register('supplierId')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isFormLoading}
            >
              <option value="">Select a supplier</option>
              {suppliers?.map((supplier: any) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {errors.supplierId && (
              <p className="mt-2 text-sm text-red-600">{errors.supplierId.message}</p>
            )}
          </div>
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

export type { ProductFormData };