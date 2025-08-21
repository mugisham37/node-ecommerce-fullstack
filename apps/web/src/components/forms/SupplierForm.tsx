'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type Supplier } from '@/store/supplierStore';

// Validation schema for supplier form
const SupplierFormSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255, 'Name must be less than 255 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
  
  // Address fields
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZipCode: z.string().optional(),
  addressCountry: z.string().optional(),
  
  // Contact person fields
  contactPersonName: z.string().optional(),
  contactPersonEmail: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  contactPersonPhone: z.string().optional(),
});

type SupplierFormData = z.infer<typeof SupplierFormSchema>;

interface SupplierFormProps {
  supplier?: Supplier | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export const SupplierForm = ({
  supplier,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Supplier',
}: SupplierFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<SupplierFormData>({
    resolver: zodResolver(SupplierFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      website: '',
      taxId: '',
      paymentTerms: '',
      status: 'active',
      addressStreet: '',
      addressCity: '',
      addressState: '',
      addressZipCode: '',
      addressCountry: '',
      contactPersonName: '',
      contactPersonEmail: '',
      contactPersonPhone: '',
    },
  });

  // Populate form when editing existing supplier
  useEffect(() => {
    if (supplier) {
      setValue('name', supplier.name);
      setValue('email', supplier.email);
      setValue('phone', supplier.phone || '');
      setValue('website', supplier.website || '');
      setValue('taxId', supplier.taxId || '');
      setValue('paymentTerms', supplier.paymentTerms || '');
      setValue('status', supplier.status);
      
      // Address fields
      setValue('addressStreet', supplier.address?.street || '');
      setValue('addressCity', supplier.address?.city || '');
      setValue('addressState', supplier.address?.state || '');
      setValue('addressZipCode', supplier.address?.zipCode || '');
      setValue('addressCountry', supplier.address?.country || '');
      
      // Contact person fields
      setValue('contactPersonName', supplier.contactPerson?.name || '');
      setValue('contactPersonEmail', supplier.contactPerson?.email || '');
      setValue('contactPersonPhone', supplier.contactPerson?.phone || '');
    } else {
      reset();
    }
  }, [supplier, setValue, reset]);

  const handleFormSubmit = async (data: SupplierFormData) => {
    try {
      // Transform form data to match API expectations
      const transformedData = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        website: data.website || undefined,
        taxId: data.taxId || undefined,
        paymentTerms: data.paymentTerms || undefined,
        status: data.status,
        
        // Address object
        address: (data.addressStreet || data.addressCity || data.addressState || data.addressZipCode || data.addressCountry) ? {
          street: data.addressStreet || '',
          city: data.addressCity || '',
          state: data.addressState || '',
          zipCode: data.addressZipCode || '',
          country: data.addressCountry || '',
        } : undefined,
        
        // Contact person object
        contactPerson: (data.contactPersonName || data.contactPersonEmail || data.contactPersonPhone) ? {
          name: data.contactPersonName || '',
          email: data.contactPersonEmail || '',
          phone: data.contactPersonPhone || '',
        } : undefined,
      };
      
      await onSubmit(transformedData);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error);
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Supplier Name */}
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Supplier Name *
            </label>
            <div className="mt-1">
              <input
                {...register('name')}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter supplier name"
                disabled={isFormLoading}
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address *
            </label>
            <div className="mt-1">
              <input
                {...register('email')}
                type="email"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="supplier@example.com"
                disabled={isFormLoading}
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div className="mt-1">
              <input
                {...register('phone')}
                type="tel"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="+1 (555) 123-4567"
                disabled={isFormLoading}
              />
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700">
              Website
            </label>
            <div className="mt-1">
              <input
                {...register('website')}
                type="url"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="https://www.supplier.com"
                disabled={isFormLoading}
              />
              {errors.website && (
                <p className="mt-2 text-sm text-red-600">{errors.website.message}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status *
            </label>
            <div className="mt-1">
              <select
                {...register('status')}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={isFormLoading}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
              {errors.status && (
                <p className="mt-2 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Tax ID */}
          <div>
            <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">
              Tax ID / VAT Number
            </label>
            <div className="mt-1">
              <input
                {...register('taxId')}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter tax ID"
                disabled={isFormLoading}
              />
              {errors.taxId && (
                <p className="mt-2 text-sm text-red-600">{errors.taxId.message}</p>
              )}
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700">
              Payment Terms
            </label>
            <div className="mt-1">
              <input
                {...register('paymentTerms')}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Net 30, 2/10 Net 30"
                disabled={isFormLoading}
              />
              {errors.paymentTerms && (
                <p className="mt-2 text-sm text-red-600">{errors.paymentTerms.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Street Address */}
          <div className="sm:col-span-2">
            <label htmlFor="addressStreet" className="block text-sm font-medium text-gray-700">
              Street Address
            </label>
            <div className="mt-1">
              <input
                {...register('addressStreet')}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter street address"
                disabled={isFormLoading}
              />
              {errors.addressStreet && (
                <p className="mt-2 text-sm text-red-600">{errors.addressStreet.message}</p>
              )}
            </div>
          </div>

          {/* City */}
          <div>
            <label htmlFor="addressCity" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <div className="mt-1">
              <input
                {...register('addressCity')}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter city"
                disabled={isFormLoading}
              />
              {errors.addressCity && (
                <p className="mt-2 text-sm text-red-600">{errors.addressCity.message}</p>
              )}
            </div>
          </div>

          {/* State */}
          <div>
            <label htmlFor="addressState" className="block text-sm font-medium text-gray-700">
              State / Province
            </label>
            <div className="mt-1">
              <input
                {...register('addressState')}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter state or province"
                disabled={isFormLoading}
              />
              {errors.addressState && (
                <p className="mt-2 text-sm text-red-600">{errors.addressState.message}</p>
              )}
            </div>
          </div>

          {/* Zip Code */}
          <div>
            <label htmlFor="addressZipCode" className="block text-sm font-medium text-gray-700">
              ZIP / Postal Code
            </label>
            <div className="mt-1">
              <input
                {...register('addressZipCode')}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter ZIP or postal code"
                disabled={isFormLoading}
              />
              {errors.addressZipCode && (
                <p className="mt-2 text-sm text-red-600">{errors.addressZipCode.message}</p>
              )}
            </div>
          </div>

          {/* Country */}
          <div>
            <label htmlFor="addressCountry" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <div className="mt-1">
              <input
                {...register('addressCountry')}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter country"
                disabled={isFormLoading}
              />
              {errors.addressCountry && (
                <p className="mt-2 text-sm text-red-600">{errors.addressCountry.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Person Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Contact Person</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Contact Name */}
          <div>
            <label htmlFor="contactPersonName" className="block text-sm font-medium text-gray-700">
              Contact Name
            </label>
            <div className="mt-1">
              <input
                {...register('contactPersonName')}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter contact person name"
                disabled={isFormLoading}
              />
              {errors.contactPersonName && (
                <p className="mt-2 text-sm text-red-600">{errors.contactPersonName.message}</p>
              )}
            </div>
          </div>

          {/* Contact Email */}
          <div>
            <label htmlFor="contactPersonEmail" className="block text-sm font-medium text-gray-700">
              Contact Email
            </label>
            <div className="mt-1">
              <input
                {...register('contactPersonEmail')}
                type="email"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="contact@supplier.com"
                disabled={isFormLoading}
              />
              {errors.contactPersonEmail && (
                <p className="mt-2 text-sm text-red-600">{errors.contactPersonEmail.message}</p>
              )}
            </div>
          </div>

          {/* Contact Phone */}
          <div>
            <label htmlFor="contactPersonPhone" className="block text-sm font-medium text-gray-700">
              Contact Phone
            </label>
            <div className="mt-1">
              <input
                {...register('contactPersonPhone')}
                type="tel"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="+1 (555) 123-4567"
                disabled={isFormLoading}
              />
              {errors.contactPersonPhone && (
                <p className="mt-2 text-sm text-red-600">{errors.contactPersonPhone.message}</p>
              )}
            </div>
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

export type { SupplierFormData };