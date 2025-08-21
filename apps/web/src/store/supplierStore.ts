import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Supplier types - these will be imported from @ecommerce/shared once available
interface Supplier {
  id: string;
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
  rating?: number;
  totalOrders?: number;
  totalValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SupplierFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'pending';
  minRating?: number;
  country?: string;
  hasContactPerson?: boolean;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SupplierState {
  suppliers: Supplier[];
  selectedSupplier: Supplier | null;
  filters: SupplierFilters;
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
}

interface SupplierActions {
  setSuppliers: (suppliers: Supplier[]) => void;
  setSelectedSupplier: (supplier: Supplier | null) => void;
  setFilters: (filters: SupplierFilters) => void;
  setPagination: (pagination: PaginationState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearFilters: () => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  removeSupplier: (id: string) => void;
}

type SupplierStore = SupplierState & SupplierActions;

const initialState: SupplierState = {
  suppliers: [],
  selectedSupplier: null,
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

export const useSupplierStore = create<SupplierStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSuppliers: (suppliers: Supplier[]) => {
        set({ suppliers, error: null });
      },

      setSelectedSupplier: (selectedSupplier: Supplier | null) => {
        set({ selectedSupplier });
      },

      setFilters: (filters: SupplierFilters) => {
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

      addSupplier: (supplier: Supplier) => {
        set({ 
          suppliers: [supplier, ...get().suppliers],
          pagination: {
            ...get().pagination,
            total: get().pagination.total + 1,
          }
        });
      },

      updateSupplier: (id: string, updatedSupplier: Partial<Supplier>) => {
        set({
          suppliers: get().suppliers.map(supplier =>
            supplier.id === id ? { ...supplier, ...updatedSupplier } : supplier
          ),
          selectedSupplier: get().selectedSupplier?.id === id 
            ? { ...get().selectedSupplier!, ...updatedSupplier }
            : get().selectedSupplier
        });
      },

      removeSupplier: (id: string) => {
        set({
          suppliers: get().suppliers.filter(supplier => supplier.id !== id),
          selectedSupplier: get().selectedSupplier?.id === id ? null : get().selectedSupplier,
          pagination: {
            ...get().pagination,
            total: Math.max(0, get().pagination.total - 1),
          }
        });
      },
    }),
    {
      name: 'supplier-storage',
      partialize: (state) => ({
        filters: state.filters,
        pagination: state.pagination,
      }),
    }
  )
);

// Selectors for better performance
export const useSupplierState = () => useSupplierStore((state) => ({
  suppliers: state.suppliers,
  selectedSupplier: state.selectedSupplier,
  filters: state.filters,
  pagination: state.pagination,
  isLoading: state.isLoading,
  error: state.error,
}));

export const useSupplierActions = () => useSupplierStore((state) => ({
  setSuppliers: state.setSuppliers,
  setSelectedSupplier: state.setSelectedSupplier,
  setFilters: state.setFilters,
  setPagination: state.setPagination,
  setLoading: state.setLoading,
  setError: state.setError,
  clearFilters: state.clearFilters,
  addSupplier: state.addSupplier,
  updateSupplier: state.updateSupplier,
  removeSupplier: state.removeSupplier,
}));

export type { Supplier, SupplierFilters, PaginationState };