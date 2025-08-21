import { useCallback, useEffect } from 'react';
import { api } from '@/lib/trpc';
import { useProductStore, useProductActions, type Product, type ProductFilters } from '@/store/productStore';

// Product creation and update DTOs
interface ProductCreateDTO {
  name: string;
  description?: string;
  sku: string;
  price: number;
  categoryId: string;
  supplierId: string;
}

interface ProductUpdateDTO extends Partial<ProductCreateDTO> {}

export const useProducts = () => {
  const { 
    products, 
    selectedProduct, 
    filters, 
    pagination, 
    isLoading, 
    error 
  } = useProductStore();
  
  const {
    setProducts,
    setSelectedProduct,
    setFilters,
    setPagination,
    setLoading,
    setError,
    clearFilters,
    addProduct,
    updateProduct,
    removeProduct,
  } = useProductActions();

  // Fetch products with filters and pagination
  const {
    data: productsData,
    isLoading: isFetching,
    error: fetchError,
    refetch,
  } = api.products?.getAll?.useQuery({
    page: pagination.page,
    limit: pagination.limit,
    filters,
  }) || { data: null, isLoading: false, error: null, refetch: () => {} };

  // Create product mutation
  const createProductMutation = api.products?.create?.useMutation({
    onSuccess: (newProduct) => {
      addProduct(newProduct);
      // Invalidate and refetch the products list
      utils.products.getAll.invalidate();
    },
    onError: (error) => {
      setError(error.message || 'Failed to create product');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Update product mutation
  const updateProductMutation = api.products?.update?.useMutation({
    onSuccess: (updatedProduct) => {
      updateProduct(updatedProduct.id, updatedProduct);
      // Invalidate and refetch the products list
      utils.products.getAll.invalidate();
    },
    onError: (error) => {
      setError(error.message || 'Failed to update product');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Delete product mutation
  const deleteProductMutation = api.products?.delete?.useMutation({
    onSuccess: (_, variables) => {
      removeProduct(variables.id);
      // Invalidate and refetch the products list
      utils.products.getAll.invalidate();
    },
    onError: (error) => {
      setError(error.message || 'Failed to delete product');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Get single product
  const getProductQuery = (id: string) => api.products?.getById?.useQuery(
    { id },
    { enabled: !!id }
  ) || { data: null, isLoading: false, error: null };

  // tRPC utils for cache invalidation
  const utils = api.useUtils?.() || {};

  // Update store when data changes
  useEffect(() => {
    if (productsData) {
      setProducts(productsData.data || []);
      setPagination({
        page: productsData.pagination?.page || 1,
        limit: productsData.pagination?.limit || 20,
        total: productsData.pagination?.total || 0,
        totalPages: productsData.pagination?.totalPages || 0,
      });
    }
  }, [productsData, setProducts, setPagination]);

  // Update loading state
  useEffect(() => {
    setLoading(isFetching);
  }, [isFetching, setLoading]);

  // Update error state
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message || 'Failed to fetch products');
    } else {
      setError(null);
    }
  }, [fetchError, setError]);

  // Actions
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      await refetch();
    } catch (error: any) {
      setError(error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [refetch, setLoading, setError]);

  const createProduct = useCallback(async (data: ProductCreateDTO): Promise<Product | null> => {
    try {
      setError(null);
      const result = await createProductMutation.mutateAsync(data);
      return result;
    } catch (error: any) {
      setError(error.message || 'Failed to create product');
      throw error;
    }
  }, [createProductMutation, setError]);

  const updateProductById = useCallback(async (id: string, data: ProductUpdateDTO): Promise<Product | null> => {
    try {
      setError(null);
      const result = await updateProductMutation.mutateAsync({ id, ...data });
      return result;
    } catch (error: any) {
      setError(error.message || 'Failed to update product');
      throw error;
    }
  }, [updateProductMutation, setError]);

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await deleteProductMutation.mutateAsync({ id });
    } catch (error: any) {
      setError(error.message || 'Failed to delete product');
      throw error;
    }
  }, [deleteProductMutation, setError]);

  const getProduct = useCallback((id: string) => {
    return getProductQuery(id);
  }, []);

  const applyFilters = useCallback((newFilters: ProductFilters) => {
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

  const selectProduct = useCallback((product: Product | null) => {
    setSelectedProduct(product);
  }, [setSelectedProduct]);

  return {
    // Data
    products,
    selectedProduct,
    filters,
    pagination,
    
    // Loading states
    isLoading: isLoading || isFetching,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    
    // Error state
    error,
    
    // Actions
    loadProducts,
    createProduct,
    updateProduct: updateProductById,
    deleteProduct,
    getProduct,
    selectProduct,
    
    // Filtering and pagination
    applyFilters,
    resetFilters,
    changePage,
    changePageSize,
    
    // Utilities
    refetch,
  };
};

export type { ProductCreateDTO, ProductUpdateDTO };