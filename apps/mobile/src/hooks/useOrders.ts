import {useState, useCallback} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {trpc} from '@/lib/trpc';
import {
  Order,
  OrderStatus,
  SearchOptions,
  PagedResponse,
} from '@ecommerce/shared/types';
import {
  OrderCreateDTO,
  OrderUpdateDTO,
  OrderStatusUpdateDTO,
  OrderFiltersDTO,
} from '@ecommerce/validation';
import Toast from 'react-native-toast-message';

interface UseOrdersOptions {
  filters?: OrderFiltersDTO;
  searchOptions?: SearchOptions;
  enabled?: boolean;
}

interface UseOrdersReturn {
  // Data
  orders: Order[];
  order: Order | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
  
  // Actions
  createOrder: (data: OrderCreateDTO) => Promise<Order>;
  updateOrder: (id: string, data: OrderUpdateDTO) => Promise<Order>;
  updateOrderStatus: (id: string, data: OrderStatusUpdateDTO) => Promise<Order>;
  deleteOrder: (id: string) => Promise<void>;
  fetchOrder: (id: string) => Promise<Order>;
  refreshOrders: () => Promise<void>;
  loadMore: () => void;
  
  // State management
  setFilters: (filters: OrderFiltersDTO) => void;
  setSearchOptions: (options: SearchOptions) => void;
  clearFilters: () => void;
}

export const useOrders = (options: UseOrdersOptions = {}): UseOrdersReturn => {
  const queryClient = useQueryClient();
  const [filters, setFiltersState] = useState<OrderFiltersDTO>(options.filters || {});
  const [searchOptions, setSearchOptionsState] = useState<SearchOptions>(
    options.searchOptions || {page: 1, limit: 20}
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Queries
  const {
    data: ordersResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['orders', filters, searchOptions],
    queryFn: () =>
      trpc.order.getOrders.query({
        ...filters,
        ...searchOptions,
      }),
    enabled: options.enabled !== false,
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });

  const {data: selectedOrder} = useQuery({
    queryKey: ['order', selectedOrderId],
    queryFn: () => trpc.order.getOrder.query({id: selectedOrderId!}),
    enabled: !!selectedOrderId,
    staleTime: 30000,
  });

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: (data: OrderCreateDTO) => trpc.order.createOrder.mutate(data),
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({queryKey: ['orders']});
      Toast.show({
        type: 'success',
        text1: 'Order Created',
        text2: `Order #${newOrder.orderNumber} has been created successfully`,
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Create Order',
        text2: error.message || 'An unexpected error occurred',
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({id, data}: {id: string; data: OrderUpdateDTO}) =>
      trpc.order.updateOrder.mutate({id, ...data}),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({queryKey: ['orders']});
      queryClient.invalidateQueries({queryKey: ['order', updatedOrder.id]});
      Toast.show({
        type: 'success',
        text1: 'Order Updated',
        text2: `Order #${updatedOrder.orderNumber} has been updated`,
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Update Order',
        text2: error.message || 'An unexpected error occurred',
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({id, data}: {id: string; data: OrderStatusUpdateDTO}) =>
      trpc.order.updateOrderStatus.mutate({id, ...data}),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({queryKey: ['orders']});
      queryClient.invalidateQueries({queryKey: ['order', updatedOrder.id]});
      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: `Order #${updatedOrder.orderNumber} status changed to ${updatedOrder.status}`,
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Update Status',
        text2: error.message || 'An unexpected error occurred',
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => trpc.order.deleteOrder.mutate({id}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['orders']});
      Toast.show({
        type: 'success',
        text1: 'Order Deleted',
        text2: 'Order has been deleted successfully',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Delete Order',
        text2: error.message || 'An unexpected error occurred',
      });
    },
  });

  // Actions
  const createOrder = useCallback(
    async (data: OrderCreateDTO): Promise<Order> => {
      return createOrderMutation.mutateAsync(data);
    },
    [createOrderMutation]
  );

  const updateOrder = useCallback(
    async (id: string, data: OrderUpdateDTO): Promise<Order> => {
      return updateOrderMutation.mutateAsync({id, data});
    },
    [updateOrderMutation]
  );

  const updateOrderStatus = useCallback(
    async (id: string, data: OrderStatusUpdateDTO): Promise<Order> => {
      return updateOrderStatusMutation.mutateAsync({id, data});
    },
    [updateOrderStatusMutation]
  );

  const deleteOrder = useCallback(
    async (id: string): Promise<void> => {
      return deleteOrderMutation.mutateAsync(id);
    },
    [deleteOrderMutation]
  );

  const fetchOrder = useCallback(
    async (id: string): Promise<Order> => {
      setSelectedOrderId(id);
      const result = await queryClient.fetchQuery({
        queryKey: ['order', id],
        queryFn: () => trpc.order.getOrder.query({id}),
      });
      return result;
    },
    [queryClient]
  );

  const refreshOrders = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (ordersResponse?.pagination.hasNext) {
      setSearchOptionsState(prev => ({
        ...prev,
        page: (prev.page || 1) + 1,
      }));
    }
  }, [ordersResponse?.pagination.hasNext]);

  const setFilters = useCallback((newFilters: OrderFiltersDTO) => {
    setFiltersState(newFilters);
    setSearchOptionsState(prev => ({...prev, page: 1})); // Reset to first page
  }, []);

  const setSearchOptions = useCallback((options: SearchOptions) => {
    setSearchOptionsState(options);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setSearchOptionsState({page: 1, limit: 20});
  }, []);

  return {
    // Data
    orders: ordersResponse?.data || [],
    order: selectedOrder || null,
    isLoading: isLoading || createOrderMutation.isPending || updateOrderMutation.isPending,
    isRefreshing: isFetching,
    error: error as Error | null,
    hasNextPage: ordersResponse?.pagination.hasNext || false,
    hasPreviousPage: ordersResponse?.pagination.hasPrev || false,
    totalCount: ordersResponse?.pagination.total || 0,
    
    // Actions
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    fetchOrder,
    refreshOrders,
    loadMore,
    
    // State management
    setFilters,
    setSearchOptions,
    clearFilters,
  };
};