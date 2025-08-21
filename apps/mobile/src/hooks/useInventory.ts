import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { trpc } from '../lib/trpc';
import type { 
  Inventory, 
  Product, 
  StockMovement, 
  InventoryFiltersDTO, 
  StockAdjustmentDTO,
  SearchOptions 
} from '@ecommerce/shared/types';

interface UseInventoryOptions {
  search?: string;
  filters?: InventoryFiltersDTO;
  page?: number;
  limit?: number;
}

interface UseInventoryReturn {
  // Data
  inventoryItems: Inventory[] | null;
  stockMovements: StockMovement[] | null;
  lowStockItems: Inventory[] | null;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  
  // Error states
  error: Error | null;
  
  // Pagination
  hasNextPage: boolean;
  currentPage: number;
  totalItems: number;
  
  // Actions
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  adjustStock: (adjustment: StockAdjustmentDTO) => Promise<void>;
  getProductById: (productId: string) => Promise<Product>;
  searchProducts: (query: string) => Promise<Product[]>;
  getLowStockItems: () => Promise<Inventory[]>;
  getStockMovements: (productId?: string) => Promise<StockMovement[]>;
  
  // Utility functions
  calculateAvailableStock: (item: Inventory) => number;
  isLowStock: (item: Inventory) => boolean;
  getStockStatus: (item: Inventory) => 'out_of_stock' | 'low_stock' | 'in_stock' | 'well_stocked';
}

export const useInventory = (options: UseInventoryOptions = {}): UseInventoryReturn => {
  const { search = '', filters = {}, page = 1, limit = 20 } = options;
  
  // State
  const [inventoryItems, setInventoryItems] = useState<Inventory[] | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[] | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Inventory[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(page);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // tRPC queries (mock implementation)
  const inventoryQuery = trpc.inventory.getAll.useQuery({
    search,
    filters,
    page: currentPage,
    limit,
  }, {
    enabled: false, // We'll trigger manually
  });

  const stockMovementsQuery = trpc.inventory.getStockMovements.useQuery({
    page: 1,
    limit: 50,
  }, {
    enabled: false,
  });

  // Mock data for development
  const mockInventoryItems: Inventory[] = [
    {
      id: '1',
      productId: 'prod-1',
      quantity: 45,
      reservedQuantity: 5,
      reorderLevel: 10,
      maxStockLevel: 100,
      lastRestocked: new Date('2024-01-15'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      product: {
        id: 'prod-1',
        name: 'Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        sku: 'WH-001',
        price: 99.99,
        categoryId: 'cat-1',
        supplierId: 'sup-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        category: {
          id: 'cat-1',
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        supplier: {
          id: 'sup-1',
          name: 'TechCorp Supplies',
          contactPerson: 'John Smith',
          email: 'john@techcorp.com',
          phone: '+1-555-0123',
          address: '123 Tech Street',
          city: 'San Francisco',
          country: 'USA',
          postalCode: '94105',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      },
    },
    {
      id: '2',
      productId: 'prod-2',
      quantity: 5,
      reservedQuantity: 2,
      reorderLevel: 15,
      maxStockLevel: 50,
      lastRestocked: new Date('2024-01-10'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-10'),
      product: {
        id: 'prod-2',
        name: 'Coffee Mug',
        description: 'Ceramic coffee mug with company logo',
        sku: 'CM-002',
        price: 12.99,
        categoryId: 'cat-2',
        supplierId: 'sup-2',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        category: {
          id: 'cat-2',
          name: 'Kitchen',
          description: 'Kitchen and dining items',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        supplier: {
          id: 'sup-2',
          name: 'Kitchen Supplies Co',
          contactPerson: 'Jane Doe',
          email: 'jane@kitchensupplies.com',
          phone: '+1-555-0456',
          address: '456 Kitchen Ave',
          city: 'Los Angeles',
          country: 'USA',
          postalCode: '90210',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      },
    },
  ];

  // Load initial data
  const loadInventoryData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
        setCurrentPage(1);
      } else {
        setIsLoading(true);
      }
      
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Filter mock data based on search and filters
      let filteredItems = [...mockInventoryItems];
      
      if (search) {
        filteredItems = filteredItems.filter(item =>
          item.product?.name.toLowerCase().includes(search.toLowerCase()) ||
          item.product?.sku.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (filters.lowStock) {
        filteredItems = filteredItems.filter(item => item.quantity <= item.reorderLevel);
      }
      
      if (filters.categoryId) {
        filteredItems = filteredItems.filter(item => item.product?.categoryId === filters.categoryId);
      }
      
      if (filters.supplierId) {
        filteredItems = filteredItems.filter(item => item.product?.supplierId === filters.supplierId);
      }

      setInventoryItems(filteredItems);
      setTotalItems(filteredItems.length);
      setHasNextPage(false); // Mock: no pagination for now
      
      // Set low stock items
      const lowStock = filteredItems.filter(item => item.quantity <= item.reorderLevel);
      setLowStockItems(lowStock);
      
    } catch (err) {
      console.error('Error loading inventory data:', err);
      setError(err as Error);
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load inventory data',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, filters]);

  // Load more data for pagination
  const loadMore = useCallback(async () => {
    if (!hasNextPage || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      // Simulate loading more data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, this would append new items
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      console.error('Error loading more data:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasNextPage, isLoadingMore]);

  // Refetch data
  const refetch = useCallback(async () => {
    await loadInventoryData(true);
  }, [loadInventoryData]);

  // Adjust stock
  const adjustStock = useCallback(async (adjustment: StockAdjustmentDTO) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setInventoryItems(prev => {
        if (!prev) return prev;
        
        return prev.map(item => {
          if (item.productId === adjustment.productId) {
            let newQuantity = item.quantity;
            
            switch (adjustment.type) {
              case 'ADJUSTMENT_INCREASE':
                newQuantity += adjustment.quantity;
                break;
              case 'ADJUSTMENT_DECREASE':
              case 'DAMAGE':
              case 'LOST':
              case 'EXPIRED':
                newQuantity = Math.max(0, newQuantity - adjustment.quantity);
                break;
            }
            
            return {
              ...item,
              quantity: newQuantity,
              updatedAt: new Date(),
            };
          }
          return item;
        });
      });
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Stock adjustment completed',
      });
      
    } catch (err) {
      console.error('Error adjusting stock:', err);
      throw err;
    }
  }, []);

  // Get product by ID
  const getProductById = useCallback(async (productId: string): Promise<Product> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const item = mockInventoryItems.find(item => item.productId === productId);
      if (!item?.product) {
        throw new Error('Product not found');
      }
      
      return item.product;
    } catch (err) {
      console.error('Error getting product:', err);
      throw err;
    }
  }, []);

  // Search products
  const searchProducts = useCallback(async (query: string): Promise<Product[]> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const filtered = mockInventoryItems
        .filter(item => 
          item.product?.name.toLowerCase().includes(query.toLowerCase()) ||
          item.product?.sku.toLowerCase().includes(query.toLowerCase())
        )
        .map(item => item.product!)
        .filter(Boolean);
      
      return filtered;
    } catch (err) {
      console.error('Error searching products:', err);
      throw err;
    }
  }, []);

  // Get low stock items
  const getLowStockItems = useCallback(async (): Promise<Inventory[]> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const lowStock = mockInventoryItems.filter(item => item.quantity <= item.reorderLevel);
      return lowStock;
    } catch (err) {
      console.error('Error getting low stock items:', err);
      throw err;
    }
  }, []);

  // Get stock movements
  const getStockMovements = useCallback(async (productId?: string): Promise<StockMovement[]> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock stock movements data
      const mockMovements: StockMovement[] = [
        {
          id: '1',
          productId: 'prod-1',
          type: 'ADJUSTMENT_INCREASE',
          quantity: 10,
          reason: 'Stock replenishment',
          userId: 'user-1',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: '2',
          productId: 'prod-2',
          type: 'SALE',
          quantity: -3,
          reason: 'Customer purchase',
          userId: 'user-1',
          createdAt: new Date('2024-01-14'),
          updatedAt: new Date('2024-01-14'),
        },
      ];
      
      if (productId) {
        return mockMovements.filter(movement => movement.productId === productId);
      }
      
      return mockMovements;
    } catch (err) {
      console.error('Error getting stock movements:', err);
      throw err;
    }
  }, []);

  // Utility functions
  const calculateAvailableStock = useCallback((item: Inventory): number => {
    return Math.max(0, item.quantity - item.reservedQuantity);
  }, []);

  const isLowStock = useCallback((item: Inventory): boolean => {
    return item.quantity <= item.reorderLevel;
  }, []);

  const getStockStatus = useCallback((item: Inventory): 'out_of_stock' | 'low_stock' | 'in_stock' | 'well_stocked' => {
    if (item.quantity === 0) return 'out_of_stock';
    if (item.quantity <= item.reorderLevel) return 'low_stock';
    if (item.quantity >= item.maxStockLevel * 0.8) return 'well_stocked';
    return 'in_stock';
  }, []);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  return {
    // Data
    inventoryItems,
    stockMovements,
    lowStockItems,
    
    // Loading states
    isLoading,
    isRefreshing,
    isLoadingMore,
    
    // Error states
    error,
    
    // Pagination
    hasNextPage,
    currentPage,
    totalItems,
    
    // Actions
    refetch,
    loadMore,
    adjustStock,
    getProductById,
    searchProducts,
    getLowStockItems,
    getStockMovements,
    
    // Utility functions
    calculateAvailableStock,
    isLowStock,
    getStockStatus,
  };
};