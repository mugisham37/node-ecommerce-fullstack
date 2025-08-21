'use client';

import { useRouter } from 'next/navigation';
import { useSuppliers } from '@/hooks/useSuppliers';
import { SupplierForm } from '@/components/forms/SupplierForm';
import { type SupplierCreateDTO } from '@/hooks/useSuppliers';

export default function NewSupplierPage() {
  const router = useRouter();
  const { createSupplier, isCreating } = useSuppliers();

  const handleSubmit = async (data: SupplierCreateDTO) => {
    try {
      const newSupplier = await createSupplier(data);
      if (newSupplier) {
        // Redirect to the supplier detail page
        router.push(`/suppliers/${newSupplier.id}`);
      }
    } catch (error) {
      // Error is handled by the hook and displayed in the form
      console.error('Failed to create supplier:', error);
    }
  };

  const handleCancel = () => {
    router.push('/suppliers');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <div>
                  <button
                    onClick={() => router.push('/suppliers')}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="flex-shrink-0 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="sr-only">Back to suppliers</span>
                  </button>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 5.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <button
                    onClick={() => router.push('/suppliers')}
                    className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Suppliers
                  </button>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 5.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">New Supplier</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Add New Supplier
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new supplier profile with contact information and business details.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <SupplierForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isCreating}
            submitLabel="Create Supplier"
          />
        </div>
      </div>
    </div>
  );
}