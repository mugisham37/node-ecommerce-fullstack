import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Order types - these will be imported from @ecommerce/shared once available
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderFilters {
  search?: string;
  status?: OrderStatus;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  filters: OrderFilters;
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
}

interface OrderActions {
  setOrders: (orders: Order[]) => void;
  setSelectedOrder: (order: Order | null) => void;
  setFilters: (filters: OrderFilters) => void;
  setPagination: (pagination: PaginationState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearFilters: () => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  removeOrder: (id: string) => void;
}

type OrderStore = OrderState & OrderActions;

const initialState: OrderState = {
  orders: [],
  selectedOrder: null,
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

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOrders: (orders: Order[]) => {
        set({ orders, error: null });
      },

      setSelectedOrder: (selectedOrder: Order | null) => {
        set({ selectedOrder });
      },

      setFilters: (filters: OrderFilters) => {
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

      addOrder: (order: Order) => {
        set({ 
          orders: [order, ...get().orders],
          pagination: {
            ...get().pagination,
            total: get().pagination.total + 1,
          }
        });
      },

      updateOrder: (id: string, updatedOrder: Partial<Order>) => {
        set({
          orders: get().orders.map(order =>
            order.id === id ? { ...order, ...updatedOrder } : order
          ),
          selectedOrder: get().selectedOrder?.id === id 
            ? { ...get().selectedOrder!, ...updatedOrder }
            : get().selectedOrder
        });
      },

      removeOrder: (id: string) => {
        set({
          orders: get().orders.filter(order => order.id !== id),
          selectedOrder: get().selectedOrder?.id === id ? null : get().selectedOrder,
          pagination: {
            ...get().pagination,
            total: Math.max(0, get().pagination.total - 1),
          }
        });
      },
    }),
    {
      name: 'order-storage',
      partialize: (state) => ({
        filters: state.filters,
        pagination: state.pagination,
      }),
    }
  )
);

// Selectors for better performance
export const useOrderState = () => useOrderStore((state) => ({
  orders: state.orders,
  selectedOrder: state.selectedOrder,
  filters: state.filters,
  pagination: state.pagination,
  isLoading: state.isLoading,
  error: state.error,
}));

export const useOrderActions = () => useOrderStore((state) => ({
  setOrders: state.setOrders,
  setSelectedOrder: state.setSelectedOrder,
  setFilters: state.setFilters,
  setPagination: state.setPagination,
  setLoading: state.setLoading,
  setError: state.setError,
  clearFilters: state.clearFilters,
  addOrder: state.addOrder,
  updateOrder: state.updateOrder,
  removeOrder: state.removeOrder,
}));