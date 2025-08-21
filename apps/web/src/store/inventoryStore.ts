import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Inventory types - these will be imported from @ecommerce/shared once available
interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  lowStockThreshold: number;
  reorderPoint: number;
  maxStockLevel: number;
  location?: string;
  lastUpdated: Date;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    category?: {
      id: string;
      name: string;
    };
    supplier?: {
      id: string;
      name: string;
    };
  };
}

interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  reference?: string;
  userId: string;
  createdAt: Date;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

interface InventoryAdjustment {
  productId: string;
  adjustmentType: 'SET' | 'ADD' | 'SUBTRACT';
  quantity: number;
  reason: string;
  reference?: string;
}

interface InventoryFilters {
  search?: string;
  categoryId?: string;
  supplierId?: string;
  stockStatus?: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  location?: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface InventoryState {
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  selectedItem: InventoryItem | null;
  filters: InventoryFilters;
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
  lowStockAlerts: InventoryItem[];
}

interface InventoryActions {
  setInventory: (inventory: InventoryItem[]) => void;
  setStockMovements: (movements: StockMovement[]) => void;
  setSelectedItem: (item: InventoryItem | null) => void;
  setFilters: (filters: InventoryFilters) => void;
  setPagination: (pagination: PaginationState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLowStockAlerts: (alerts: InventoryItem[]) => void;
  clearFilters: () => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  addStockMovement: (movement: StockMovement) => void;
}

type InventoryStore = InventoryState & InventoryActions;

const initialState: InventoryState = {
  inventory: [],
  stockMovements: [],
  selectedItem: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  error: null,
  lowStockAlerts: [],
};

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setInventory: (inventory: InventoryItem[]) => {
        set({ inventory, error: null });
      },

      setStockMovements: (stockMovements: StockMovement[]) => {
        set({ stockMovements });
      },

      setSelectedItem: (selectedItem: InventoryItem | null) => {
        set({ selectedItem });
      },

      setFilters: (filters: InventoryFilters) => {
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

      setLowStockAlerts: (lowStockAlerts: InventoryItem[]) => {
        set({ lowStockAlerts });
      },

      clearFilters: () => {
        set({ 
          filters: {},
          pagination: { ...get().pagination, page: 1 }
        });
      },

      updateInventoryItem: (id: string, updatedItem: Partial<InventoryItem>) => {
        set({
          inventory: get().inventory.map(item =>
            item.id === id ? { ...item, ...updatedItem } : item
          ),
          selectedItem: get().selectedItem?.id === id 
            ? { ...get().selectedItem!, ...updatedItem }
            : get().selectedItem
        });
      },

      addStockMovement: (movement: StockMovement) => {
        set({
          stockMovements: [movement, ...get().stockMovements],
        });
      },
    }),
    {
      name: 'inventory-storage',
      partialize: (state) => ({
        filters: state.filters,
        pagination: state.pagination,
      }),
    }
  )
);

// Selectors for better performance
export const useInventoryState = () => useInventoryStore((state) => ({
  inventory: state.inventory,
  stockMovements: state.stockMovements,
  selectedItem: state.selectedItem,
  filters: state.filters,
  pagination: state.pagination,
  isLoading: state.isLoading,
  error: state.error,
  lowStockAlerts: state.lowStockAlerts,
}));

export const useInventoryActions = () => useInventoryStore((state) => ({
  setInventory: state.setInventory,
  setStockMovements: state.setStockMovements,
  setSelectedItem: state.setSelectedItem,
  setFilters: state.setFilters,
  setPagination: state.setPagination,
  setLoading: state.setLoading,
  setError: state.setError,
  setLowStockAlerts: state.setLowStockAlerts,
  clearFilters: state.clearFilters,
  updateInventoryItem: state.updateInventoryItem,
  addStockMovement: state.addStockMovement,
}));

export type { 
  InventoryItem, 
  StockMovement, 
  InventoryAdjustment, 
  InventoryFilters, 
  PaginationState 
};