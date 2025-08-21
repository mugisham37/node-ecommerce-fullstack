'use client';

import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { ProductForm, type ProductFormData } from '@/components/forms/ProductForm';

export default function NewProductPage() {
  const router = useRouter();
  const { createProduct, isCreating, error } = useProducts();

  const handleSave = async (data: ProductFormData) => {
    try {
      const newProduct = await createProduct(data);
      if (newProduct) {
        // Redirect to the product detail page
        router.push(`/products/${newProduct.id}`);
      }
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const handleCancel = () => {
    router.push('/products');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCancel}
            className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Product</h1>
            <p className="mt-1 text-sm text-gray-500">
              Add a new product to your inventory catalog.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error creating product</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Product Information
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Fill in the details below to create a new product. All fields marked with * are required.
            </p>
          </div>
          
          <ProductForm
            onSubmit={handleSave}
            onCancel={handleCancel}
            isLoading={isCreating}
            submitLabel="Create Product"
          />
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Product Creation Tips
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Use a unique SKU that follows your naming convention (e.g., PROD-001, ELEC-2024-001)</li>
                <li>Set competitive pricing based on your cost analysis and market research</li>
                <li>Choose the appropriate category and supplier for better organization</li>
                <li>Write clear, descriptive product descriptions to help with searchability</li>
                <li>You can set up inventory levels after creating the product</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}