import { useCallback, useEffect } from 'react';
import { api } from '@/lib/trpc';
import { 
  useOrderStore, 
  useOrderActions, 
  type Order, 
  type OrderFilters,
  type OrderStatus 
} from '@/store/orderStore';

// Order creation and update DTOs
export interface OrderItemCreateDTO {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface OrderCreateDTO {
  userId?: string;
  items: OrderItemCreateDTO[];
  notes?: string;
}

export interface OrderUpdateDTO {
  status?: OrderStatus;
  notes?: string;
}

export interface OrderStatusUpdateDTO {
  status: OrderStatus;
  reason?: string;
  notifyCustomer?: boolean;
}

export const useOrders = () => {
  const { 
    orders, 
    selectedOrder, 
    filters, 
    pagination, 
    isLoading, 
    error 
  } = useOrderStore();
  
  const {
    setOrders,
    setSelectedOrder,
    setFilters,
    setPagination,
    setLoading,
    setError,
    clearFilters,
    addOrder,
    updateOrder,
    removeOrder,
  } = useOrderActions();

  // Fetch orders with filters and pagination
  const {
    data: ordersData,
    isLoading: isFetching,
    error: fetchError,
    refetch,
  } = api.orders?.getAll?.useQuery({
    page: pagination.page,
    limit: pagination.limit,
    filters,
  }) || { data: null, isLoading: false, error: null, refetch: () => {} };

  // Create order mutation
  const createOrderMutation = api.orders?.create?.useMutation({
    onSuccess: (newOrder: any) => {
      addOrder(newOrder);
      // Invalidate and refetch the orders list
      utils.orders.getAll.invalidate();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create order');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Update order mutation
  const updateOrderMutation = api.orders?.update?.useMutation({
    onSuccess: (updatedOrder: any) => {
      updateOrder(updatedOrder.id, updatedOrder);
      // Invalidate and refetch the orders list
      utils.orders.getAll.invalidate();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update order');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Update order status mutation
  const updateOrderStatusMutation = api.orders?.updateStatus?.useMutation({
    onSuccess: (updatedOrder: any) => {
      updateOrder(updatedOrder.id, updatedOrder);
      // Invalidate and refetch the orders list
      utils.orders.getAll.invalidate();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update order status');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Delete order mutation
  const deleteOrderMutation = api.orders?.delete?.useMutation({
    onSuccess: (_: any, variables: any) => {
      removeOrder(variables.id);
      // Invalidate and refetch the orders list
      utils.orders.getAll.invalidate();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to delete order');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Get single order
  const getOrderQuery = (id: string) => api.orders?.getById?.useQuery(
    { id },
    { enabled: !!id }
  ) || { data: null, isLoading: false, error: null };

  // tRPC utils for cache invalidation
  const utils = api.useUtils?.() || {};

  // Update store when data changes
  useEffect(() => {
    if (ordersData) {
      setOrders(ordersData.data || []);
      setPagination({
        page: ordersData.pagination?.page || 1,
        limit: ordersData.pagination?.limit || 20,
        total: ordersData.pagination?.total || 0,
        totalPages: ordersData.pagination?.totalPages || 0,
      });
    }
  }, [ordersData, setOrders, setPagination]);

  // Update loading state
  useEffect(() => {
    setLoading(isFetching);
  }, [isFetching, setLoading]);

  // Update error state
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message || 'Failed to fetch orders');
    } else {
      setError(null);
    }
  }, [fetchError, setError]);

  // Actions
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      await refetch();
    } catch (error: any) {
      setError(error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [refetch, setLoading, setError]);

  const createOrder = useCallback(async (data: OrderCreateDTO): Promise<Order | null> => {
    try {
      setError(null);
      const result = await createOrderMutation.mutateAsync(data);
      return result;
    } catch (error: any) {
      setError(error.message || 'Failed to create order');
      throw error;
    }
  }, [createOrderMutation, setError]);

  const updateOrderById = useCallback(async (id: string, data: OrderUpdateDTO): Promise<Order | null> => {
    try {
      setError(null);
      const result = await updateOrderMutation.mutateAsync({ id, ...data });
      return result;
    } catch (error: any) {
      setError(error.message || 'Failed to update order');
      throw error;
    }
  }, [updateOrderMutation, setError]);

  const updateOrderStatus = useCallback(async (id: string, data: OrderStatusUpdateDTO): Promise<Order | null> => {
    try {
      setError(null);
      const result = await updateOrderStatusMutation.mutateAsync({ id, ...data });
      return result;
    } catch (error: any) {
      setError(error.message || 'Failed to update order status');
      throw error;
    }
  }, [updateOrderStatusMutation, setError]);

  const deleteOrder = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await deleteOrderMutation.mutateAsync({ id });
    } catch (error: any) {
      setError(error.message || 'Failed to delete order');
      throw error;
    }
  }, [deleteOrderMutation, setError]);

  const getOrder = useCallback((id: string) => {
    return getOrderQuery(id);
  }, []);

  const applyFilters = useCallback((newFilters: OrderFilters) => {
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

  const selectOrder = useCallback((order: Order | null) => {
    setSelectedOrder(order);
  }, [setSelectedOrder]);

  return {
    // Data
    orders,
    selectedOrder,
    filters,
    pagination,
    
    // Loading states
    isLoading: isLoading || isFetching,
    isCreating: createOrderMutation.isPending,
    isUpdating: updateOrderMutation.isPending,
    isUpdatingStatus: updateOrderStatusMutation.isPending,
    isDeleting: deleteOrderMutation.isPending,
    
    // Error state
    error,
    
    // Actions
    loadOrders,
    createOrder,
    updateOrder: updateOrderById,
    updateOrderStatus,
    deleteOrder,
    getOrder,
    selectOrder,
    
    // Filtering and pagination
    applyFilters,
    resetFilters,
    changePage,
    changePageSize,
    
    // Utilities
    refetch,
  };
};