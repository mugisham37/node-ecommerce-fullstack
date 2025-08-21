import { useCallback, useEffect } from 'react';
import { api } from '@/lib/trpc';
import { 
  useInventoryStore, 
  useInventoryActions, 
  type InventoryItem, 
  type InventoryAdjustment, 
  type InventoryFilters,
  type StockMovement 
} from '@/store/inventoryStore';

export const useInventory = () => {
  const { 
    inventory, 
    stockMovements,
    selectedItem, 
    filters, 
    pagination, 
    isLoading, 
    error,
    lowStockAlerts
  } = useInventoryStore();
  
  const {
    setInventory,
    setStockMovements,
    setSelectedItem,
    setFilters,
    setPagination,
    setLoading,
    setError,
    setLowStockAlerts,
    clearFilters,
    updateInventoryItem,
    addStockMovement,
  } = useInventoryActions();

  // Fetch inventory with filters and pagination
  const {
    data: inventoryData,
    isLoading: isFetching,
    error: fetchError,
    refetch,
  } = api.inventory?.getAll?.useQuery({
    page: pagination.page,
    limit: pagination.limit,
    filters,
  }) || { data: null, isLoading: false, error: null, refetch: () => {} };

  // Fetch stock movements
  const {
    data: movementsData,
    isLoading: isLoadingMovements,
  } = api.inventory?.getStockMovements?.useQuery({
    page: 1,
    limit: 50,
    productId: selectedItem?.productId,
  }) || { data: null, isLoading: false };

  // Fetch low stock alerts
  const {
    data: alertsData,
  } = api.inventory?.getLowStockAlerts?.useQuery() || { data: null };

  // Adjust inventory mutation
  const adjustInventoryMutation = api.inventory?.adjustStock?.useMutation({
    onSuccess: (result: any) => {
      // Update the inventory item
      updateInventoryItem(result.inventoryItem.id, result.inventoryItem);
      // Add the stock movement
      addStockMovement(result.stockMovement);
      // Invalidate and refetch
      utils.inventory.getAll.invalidate();
      utils.inventory.getLowStockAlerts.invalidate();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to adjust inventory');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Update inventory item mutation
  const updateInventoryMutation = api.inventory?.updateItem?.useMutation({
    onSuccess: (updatedItem: any) => {
      updateInventoryItem(updatedItem.id, updatedItem);
      utils.inventory.getAll.invalidate();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update inventory item');
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // tRPC utils for cache invalidation
  const utils = api.useUtils?.() || {};

  // Update store when data changes
  useEffect(() => {
    if (inventoryData) {
      setInventory(inventoryData.data || []);
      setPagination({
        page: inventoryData.pagination?.page || 1,
        limit: inventoryData.pagination?.limit || 20,
        total: inventoryData.pagination?.total || 0,
        totalPages: inventoryData.pagination?.totalPages || 0,
      });
    }
  }, [inventoryData, setInventory, setPagination]);

  // Update stock movements when data changes
  useEffect(() => {
    if (movementsData) {
      setStockMovements(movementsData.data || []);
    }
  }, [movementsData, setStockMovements]);

  // Update low stock alerts when data changes
  useEffect(() => {
    if (alertsData) {
      setLowStockAlerts(alertsData || []);
    }
  }, [alertsData, setLowStockAlerts]);

  // Update loading state
  useEffect(() => {
    setLoading(isFetching);
  }, [isFetching, setLoading]);

  // Update error state
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message || 'Failed to fetch inventory');
    } else {
      setError(null);
    }
  }, [fetchError, setError]);

  // Actions
  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      await refetch();
    } catch (error: any) {
      setError(error.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [refetch, setLoading, setError]);

  const adjustStock = useCallback(async (adjustment: InventoryAdjustment): Promise<void> => {
    try {
      setError(null);
      await adjustInventoryMutation.mutateAsync(adjustment);
    } catch (error: any) {
      setError(error.message || 'Failed to adjust stock');
      throw error;
    }
  }, [adjustInventoryMutation, setError]);

  const updateItem = useCallback(async (id: string, data: Partial<InventoryItem>): Promise<void> => {
    try {
      setError(null);
      await updateInventoryMutation.mutateAsync({ id, ...data });
    } catch (error: any) {
      setError(error.message || 'Failed to update inventory item');
      throw error;
    }
  }, [updateInventoryMutation, setError]);

  const applyFilters = useCallback((newFilters: InventoryFilters) => {
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

  const selectItem = useCallback((item: InventoryItem | null) => {
    setSelectedItem(item);
  }, [setSelectedItem]);

  const getStockStatus = useCallback((item: InventoryItem) => {
    if (item.quantity === 0) {
      return { status: 'Out of Stock', color: 'text-red-600 bg-red-100', severity: 'critical' };
    } else if (item.quantity <= item.lowStockThreshold) {
      return { status: 'Low Stock', color: 'text-yellow-600 bg-yellow-100', severity: 'warning' };
    } else if (item.quantity <= item.reorderPoint) {
      return { status: 'Reorder Soon', color: 'text-orange-600 bg-orange-100', severity: 'info' };
    } else {
      return { status: 'In Stock', color: 'text-green-600 bg-green-100', severity: 'success' };
    }
  }, []);

  const getStockLevel = useCallback((item: InventoryItem) => {
    if (item.maxStockLevel > 0) {
      return (item.quantity / item.maxStockLevel) * 100;
    }
    return 0;
  }, []);

  return {
    // Data
    inventory,
    stockMovements,
    selectedItem,
    filters,
    pagination,
    lowStockAlerts,
    
    // Loading states
    isLoading: isLoading || isFetching,
    isLoadingMovements,
    isAdjusting: adjustInventoryMutation.isPending,
    isUpdating: updateInventoryMutation.isPending,
    
    // Error state
    error,
    
    // Actions
    loadInventory,
    adjustStock,
    updateItem,
    selectItem,
    
    // Filtering and pagination
    applyFilters,
    resetFilters,
    changePage,
    changePageSize,
    
    // Utilities
    getStockStatus,
    getStockLevel,
    refetch,
  };
};