import { useCallback, useEffect } from 'react';
import { api } from '@/lib/trpc';
import { useSupplierStore, useSupplierActions, type Supplier, type SupplierFilters } from '@/store/supplierStore';

// Supplier creation and update DTOs
interface SupplierCreateDTO {
  name: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactPerson?: {
    name: string;
    email: string;
    phone: string;
  };
  website?: string;
  taxId?: string;
  paymentTerms?: string;
  status: 'active' | 'inactive' | 'pending';
}

interface SupplierUpdateDTO extends Partial<SupplierCreateDTO> {}

export const useSuppliers = () => {
  const { 
    suppliers, 
    selectedSupplier, 
    filters, 
    pagination, 
    isLoading, 
    error 
  } = useSupplierStore();
  
  const {
    setSuppliers,
    setSelectedSupplier,
    setFilters,
    setPagination,
    setLoading,
    setError,
    clearFilters,
    addSupplier,
    updateSupplier,
    removeSupplier,
  } = useSupplierActions();

  // Fetch suppliers with filters and pagination
  const {
    data: suppliersData,
    isLoading: isFetching,
    error: fetchError,
    refetch,
  } = api.suppliers?.getAll?.useQuery({
    page: pagination.page,
    limit: pagination.limit,
    filters,
  }) || { data: null, isLoading: false, error: null, refetch: () => {} };

  // Create supplier mutation
  const createSupplierMutation = api.suppliers?.create?.useMutation({
    onSuccess: (newSupplier: any) => {
      addSupplier(newSupplier);
      // Invalidate and refetch the suppliers list
      utils.suppliers.getAll.invalidate();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create supplier');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Update supplier mutation
  const updateSupplierMutation = api.suppliers?.update?.useMutation({
    onSuccess: (updatedSupplier: any) => {
      updateSupplier(updatedSupplier.id, updatedSupplier);
      // Invalidate and refetch the suppliers list
      utils.suppliers.getAll.invalidate();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update supplier');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Delete supplier mutation
  const deleteSupplierMutation = api.suppliers?.delete?.useMutation({
    onSuccess: (_: any, variables: any) => {
      removeSupplier(variables.id);
      // Invalidate and refetch the suppliers list
      utils.suppliers.getAll.invalidate();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to delete supplier');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Get single supplier
  const getSupplierQuery = (id: string) => api.suppliers?.getById?.useQuery(
    { id },
    { enabled: !!id }
  ) || { data: null, isLoading: false, error: null };

  // tRPC utils for cache invalidation
  const utils = api.useUtils?.() || {};

  // Update store when data changes
  useEffect(() => {
    if (suppliersData) {
      setSuppliers(suppliersData.data || []);
      setPagination({
        page: suppliersData.pagination?.page || 1,
        limit: suppliersData.pagination?.limit || 20,
        total: suppliersData.pagination?.total || 0,
        totalPages: suppliersData.pagination?.totalPages || 0,
      });
    }
  }, [suppliersData, setSuppliers, setPagination]);

  // Update loading state
  useEffect(() => {
    setLoading(isFetching);
  }, [isFetching, setLoading]);

  // Update error state
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message || 'Failed to fetch suppliers');
    } else {
      setError(null);
    }
  }, [fetchError, setError]);

  // Actions
  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      await refetch();
    } catch (error: any) {
      setError(error.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [refetch, setLoading, setError]);

  const createSupplier = useCallback(async (data: SupplierCreateDTO): Promise<Supplier | null> => {
    try {
      setError(null);
      const result = await createSupplierMutation.mutateAsync(data);
      return result;
    } catch (error: any) {
      setError(error.message || 'Failed to create supplier');
      throw error;
    }
  }, [createSupplierMutation, setError]);

  const updateSupplierById = useCallback(async (id: string, data: SupplierUpdateDTO): Promise<Supplier | null> => {
    try {
      setError(null);
      const result = await updateSupplierMutation.mutateAsync({ id, ...data });
      return result;
    } catch (error: any) {
      setError(error.message || 'Failed to update supplier');
      throw error;
    }
  }, [updateSupplierMutation, setError]);

  const deleteSupplier = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await deleteSupplierMutation.mutateAsync({ id });
    } catch (error: any) {
      setError(error.message || 'Failed to delete supplier');
      throw error;
    }
  }, [deleteSupplierMutation, setError]);

  const getSupplier = useCallback((id: string) => {
    return getSupplierQuery(id);
  }, []);

  const applyFilters = useCallback((newFilters: SupplierFilters) => {
    setFilters(newFilters);
  }, [setFilters]);

  const changePage = useCallback((page: number) => {
    setPagination({ ...pagination, page });
  }, [pagination, setPagination]);

  const changePageSize = useCallback((limit: number) => {
    setPagination({ ...pagination, limit, page: 1 });
  }, [pagination, setPagination]);

  const resetFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const selectSupplier = useCallback((supplier: Supplier | null) => {
    setSelectedSupplier(supplier);
  }, [setSelectedSupplier]);

  return {
    // Data
    suppliers,
    selectedSupplier,
    filters,
    pagination,
    
    // Loading states
    isLoading: isLoading || isFetching,
    isCreating: createSupplierMutation.isPending,
    isUpdating: updateSupplierMutation.isPending,
    isDeleting: deleteSupplierMutation.isPending,
    
    // Error state
    error,
    
    // Actions
    loadSuppliers,
    createSupplier,
    updateSupplier: updateSupplierById,
    deleteSupplier,
    getSupplier,
    selectSupplier,
    
    // Filtering and pagination
    applyFilters,
    resetFilters,
    changePage,
    changePageSize,
    
    // Utilities
    refetch,
  };
};

export type { SupplierCreateDTO, SupplierUpdateDTO };