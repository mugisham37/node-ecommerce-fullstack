'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { ProductForm, type ProductFormData } from '@/components/forms/ProductForm';
import { type Product } from '@/store/productStore';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const {
    selectedProduct,
    updateProduct,
    getProduct,
    selectProduct,
    isUpdating,
    error,
  } = useProducts();

  const [isEditing, setIsEditing] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);

  // Fetch product data
  const { data: productData, isLoading } = getProduct(productId);

  useEffect(() => {
    if (productData) {
      setProduct(productData);
      selectProduct(productData);
    }
  }, [productData, selectProduct]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async (data: ProductFormData) => {
    try {
      const updatedProduct = await updateProduct(productId, data);
      if (updatedProduct) {
        setProduct(updatedProduct);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleBack = () => {
    router.push('/products');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
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

  const getStockStatus = (product: Product) => {
    if (!product.inventory) return { status: 'Unknown', color: 'text-gray-600 bg-gray-100' };
    
    const { quantity, lowStockThreshold } = product.inventory;
    
    if (quantity === 0) {
      return { status: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    } else if (quantity <= lowStockThreshold) {
      return { status: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    } else {
      return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
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

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-12 sm:px-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Product not found</h3>
            <p className="mt-1 text-sm text-gray-500">
              The product you're looking for doesn't exist or has been deleted.
            </p>
            <div className="mt-6">
              <button
                onClick={handleBack}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Products
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus(product);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="mt-1 text-sm text-gray-500">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          {!isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Product
            </button>
          )}
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
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {isEditing ? (
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                Edit Product
              </h3>
              <ProductForm
                product={product}
                onSubmit={handleSave}
                onCancel={handleCancelEdit}
                isLoading={isUpdating}
                submitLabel="Update Product"
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Product Overview */}
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Product Details
                </h3>
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">SKU</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{product.sku}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Price</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-semibold">
                      {formatPrice(product.price)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Stock Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {product.category?.name || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {product.supplier?.name || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(product.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(product.updatedAt)}
                    </dd>
                  </div>
                </div>
                {product.description && (
                  <div className="mt-6">
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.description}</dd>
                  </div>
                )}
              </div>

              {/* Inventory Information */}
              {product.inventory && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Inventory Information
                  </h3>
                  <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Current Stock</dt>
                      <dd className="mt-1 text-2xl font-semibold text-gray-900">
                        {product.inventory.quantity}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Low Stock Threshold</dt>
                      <dd className="mt-1 text-2xl font-semibold text-gray-900">
                        {product.inventory.lowStockThreshold}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Stock Value</dt>
                      <dd className="mt-1 text-2xl font-semibold text-gray-900">
                        {formatPrice(product.price * product.inventory.quantity)}
                      </dd>
                    </div>
                  </div>
                </div>
              )}

              {/* Supplier Information */}
              {product.supplier && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Supplier Information
                  </h3>
                  <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Supplier Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{product.supplier.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a
                          href={`mailto:${product.supplier.email}`}
                          className="text-blue-600 hover:text-blue-500"
                        >
                          {product.supplier.email}
                        </a>
                      </dd>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}