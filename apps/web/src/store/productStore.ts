import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Product types - these will be imported from @ecommerce/shared once available
interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  price: number;
  categoryId: string;
  supplierId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  supplier?: {
    id: string;
    name: string;
    email: string;
  };
  inventory?: {
    id: string;
    quantity: number;
    lowStockThreshold: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ProductFilters {
  search?: string;
  categoryId?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  lowStock?: boolean;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  filters: ProductFilters;
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
}

interface ProductActions {
  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  setFilters: (filters: ProductFilters) => void;
  setPagination: (pagination: PaginationState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearFilters: () => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  removeProduct: (id: string) => void;
}

type ProductStore = ProductState & ProductActions;

const initialState: ProductState = {
  products: [],
  selectedProduct: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  error: null,
};

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setProducts: (products: Product[]) => {
        set({ products, error: null });
      },

      setSelectedProduct: (selectedProduct: Product | null) => {
        set({ selectedProduct });
      },

      setFilters: (filters: ProductFilters) => {
        set({ 
          filters: { ...get().filters, ...filters },
          pagination: { ...get().pagination, page: 1 } // Reset to first page when filtering
        });
      },

      setPagination: (pagination: PaginationState) => {
        set({ pagination });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearFilters: () => {
        set({ 
          filters: {},
          pagination: { ...get().pagination, page: 1 }
        });
      },

      addProduct: (product: Product) => {
        set({ 
          products: [product, ...get().products],
          pagination: {
            ...get().pagination,
            total: get().pagination.total + 1,
          }
        });
      },

      updateProduct: (id: string, updatedProduct: Partial<Product>) => {
        set({
          products: get().products.map(product =>
            product.id === id ? { ...product, ...updatedProduct } : product
          ),
          selectedProduct: get().selectedProduct?.id === id 
            ? { ...get().selectedProduct!, ...updatedProduct }
            : get().selectedProduct
        });
      },

      removeProduct: (id: string) => {
        set({
          products: get().products.filter(product => product.id !== id),
          selectedProduct: get().selectedProduct?.id === id ? null : get().selectedProduct,
          pagination: {
            ...get().pagination,
            total: Math.max(0, get().pagination.total - 1),
          }
        });
      },
    }),
    {
      name: 'product-storage',
      partialize: (state) => ({
        filters: state.filters,
        pagination: state.pagination,
      }),
    }
  )
);

// Selectors for better performance
export const useProductState = () => useProductStore((state) => ({
  products: state.products,
  selectedProduct: state.selectedProduct,
  filters: state.filters,
  pagination: state.pagination,
  isLoading: state.isLoading,
  error: state.error,
}));

export const useProductActions = () => useProductStore((state) => ({
  setProducts: state.setProducts,
  setSelectedProduct: state.setSelectedProduct,
  setFilters: state.setFilters,
  setPagination: state.setPagination,
  setLoading: state.setLoading,
  setError: state.setError,
  clearFilters: state.clearFilters,
  addProduct: state.addProduct,
  updateProduct: state.updateProduct,
  removeProduct: state.removeProduct,
}));

export type { Product, ProductFilters, PaginationState };