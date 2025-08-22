import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { VendorAnalyticsService } from '../vendor-analytics.service';
import { 
  VendorRepository,
  VendorAnalyticsRepository,
  OrderRepository,
  OrderItemRepository,
  ProductRepository,
  UserRepository
} from '@packages/database';
import { CacheManager } from '@packages/cache';
import { ApiError } from '@packages/shared/utils/api-error';

// Mock dependencies
vi.mock('@packages/database');
vi.mock('@packages/cache');
vi.mock('@packages/shared/utils/logger', () => ({
  createRequestLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('VendorAnalyticsService', () => {
  let vendorAnalyticsService: VendorAnalyticsService;
  let mockVendorRepository: VendorRepository;
  let mockVendorAnalyticsRepository: VendorAnalyticsRepository;
  let mockOrderRepository: OrderRepository;
  let mockOrderItemRepository: OrderItemRepository;
  let mockProductRepository: ProductRepository;
  let mockUserRepository: UserRepository;
  let mockCacheManager: CacheManager;

  const mockVendorId = 'vendor-123';
  const mockVendor = {
    id: mockVendorId,
    businessName: 'Test Vendor',
    commissionRate: 10,
  };

  beforeEach(() => {
    // Create mock instances
    mockVendorRepository = {
      findById: vi.fn(),
    } as any;

    mockVendorAnalyticsRepository = {} as any;

    mockOrderRepository = {
      db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn(),
      },
    } as any;

    mockOrderItemRepository = {
      db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn(),
      },
    } as any;

    mockProductRepository = {
      db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn(),
      },
    } as any;

    mockUserRepository = {} as any;

    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
    } as any;

    vendorAnalyticsService = new VendorAnalyticsService(
      mockVendorRepository,
      mockVendorAnalyticsRepository,
      mockOrderRepository,
      mockOrderItemRepository,
      mockProductRepository,
      mockUserRepository,
      mockCacheManager
    );
  });

  describe('getVendorDashboardSummary', () => {
    it('should return cached data when available', async () => {
      const cachedData = {
        salesSummary: { totalSales: 1000, orderCount: 10 },
        productSummary: { totalProducts: 50 },
        orderSummary: { totalOrders: 10 },
        payoutSummary: { totalPayouts: 500 },
        recentOrders: [],
        topProducts: [],
        salesTrend: [],
        period: { type: 'month', startDate: new Date(), endDate: new Date() },
      };

      (mockCacheManager.get as Mock).mockResolvedValue(cachedData);

      const result = await vendorAnalyticsService.getVendorDashboardSummary(mockVendorId);

      expect(result).toEqual(cachedData);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining('vendor_dashboard')
      );
    });

    it('should throw error when vendor not found', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);
      (mockVendorRepository.findById as Mock).mockResolvedValue(null);

      await expect(
        vendorAnalyticsService.getVendorDashboardSummary(mockVendorId)
      ).rejects.toThrow(ApiError);
    });

    it('should generate dashboard summary when not cached', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);
      (mockVendorRepository.findById as Mock).mockResolvedValue(mockVendor);

      // Mock sales data
      (mockOrderRepository.db.execute as Mock)
        .mockResolvedValueOnce({
          rows: [{ total_sales: 1000, total_items: 50, order_count: 10 }]
        })
        .mockResolvedValueOnce({
          rows: [{ total_sales: 800, total_items: 40, order_count: 8 }]
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'DELIVERED', count: 5 }, { status: 'SHIPPED', count: 3 }]
        })
        .mockResolvedValueOnce({
          rows: [{ total_sales: 1000 }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        });

      // Mock product counts
      (mockProductRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 50 }]),
      });

      // Mock payout data
      (mockOrderRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      });

      const result = await vendorAnalyticsService.getVendorDashboardSummary(mockVendorId);

      expect(result).toBeDefined();
      expect(result.salesSummary).toBeDefined();
      expect(result.productSummary).toBeDefined();
      expect(result.orderSummary).toBeDefined();
      expect(result.payoutSummary).toBeDefined();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should handle different period types', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);
      (mockVendorRepository.findById as Mock).mockResolvedValue(mockVendor);

      // Mock all required database calls
      (mockOrderRepository.db.execute as Mock).mockResolvedValue({
        rows: [{ total_sales: 1000, total_items: 50, order_count: 10 }]
      });

      (mockProductRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 50 }]),
      });

      (mockOrderRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      });

      const result = await vendorAnalyticsService.getVendorDashboardSummary(mockVendorId, 'week');

      expect(result.period.type).toBe('week');
    });
  });

  describe('getVendorSalesAnalytics', () => {
    it('should return vendor sales analytics', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);
      (mockVendorRepository.findById as Mock).mockResolvedValue(mockVendor);

      // Mock sales summary data
      (mockOrderRepository.db.execute as Mock)
        .mockResolvedValueOnce({
          rows: [{ total_sales: 1000, total_items: 50, order_count: 10 }]
        })
        .mockResolvedValueOnce({
          rows: [{ total_sales: 800, total_items: 40, order_count: 8 }]
        })
        .mockResolvedValueOnce({
          rows: [
            { date: new Date('2023-01-01'), sales: 100, items: 5, order_count: 2 },
            { date: new Date('2023-01-02'), sales: 150, items: 8, order_count: 3 },
          ]
        })
        .mockResolvedValueOnce({
          rows: []
        });

      const result = await vendorAnalyticsService.getVendorSalesAnalytics(mockVendorId, {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        interval: 'daily',
        groupBy: 'product',
      });

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.trend.current).toHaveLength(2);
      expect(result.period.interval).toBe('daily');
    });

    it('should include previous period comparison when requested', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);
      (mockVendorRepository.findById as Mock).mockResolvedValue(mockVendor);

      // Mock current and previous period data
      (mockOrderRepository.db.execute as Mock)
        .mockResolvedValueOnce({
          rows: [{ total_sales: 1000, total_items: 50, order_count: 10 }]
        })
        .mockResolvedValueOnce({
          rows: [{ total_sales: 800, total_items: 40, order_count: 8 }]
        })
        .mockResolvedValueOnce({
          rows: [{ date: new Date(), sales: 100, items: 5, order_count: 2 }]
        })
        .mockResolvedValueOnce({
          rows: [{ date: new Date(), sales: 80, items: 4, order_count: 1 }]
        })
        .mockResolvedValueOnce({
          rows: []
        });

      const result = await vendorAnalyticsService.getVendorSalesAnalytics(mockVendorId, {
        compareWithPrevious: true,
      });

      expect(result.trend.current).toBeDefined();
      expect(result.trend.previous).toBeDefined();
    });

    it('should handle different groupBy options', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);
      (mockVendorRepository.findById as Mock).mockResolvedValue(mockVendor);

      // Mock required database calls
      (mockOrderRepository.db.execute as Mock)
        .mockResolvedValueOnce({
          rows: [{ total_sales: 1000, total_items: 50, order_count: 10 }]
        })
        .mockResolvedValueOnce({
          rows: [{ total_sales: 800, total_items: 40, order_count: 8 }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 'cat-1', name: 'Category 1', sales: 500, quantity: 25, order_count: 5 }
          ]
        });

      const result = await vendorAnalyticsService.getVendorSalesAnalytics(mockVendorId, {
        groupBy: 'category',
      });

      expect(result.groupedBy.type).toBe('category');
      expect(result.groupedBy.data).toHaveLength(1);
    });
  });

  describe('commission calculations', () => {
    it('should calculate commission correctly', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);
      (mockVendorRepository.findById as Mock).mockResolvedValue({
        ...mockVendor,
        commissionRate: 15, // 15% commission
      });

      // Mock sales data
      (mockOrderRepository.db.execute as Mock)
        .mockResolvedValueOnce({
          rows: [{ total_sales: 1000, total_items: 50, order_count: 10 }]
        })
        .mockResolvedValueOnce({
          rows: [{ total_sales: 800, total_items: 40, order_count: 8 }]
        });

      const result = await vendorAnalyticsService.getVendorDashboardSummary(mockVendorId);

      expect(result.salesSummary.totalSales).toBe(1000);
      expect(result.salesSummary.commission).toBe(150); // 15% of 1000
      expect(result.salesSummary.netSales).toBe(850); // 1000 - 150
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);
      (mockVendorRepository.findById as Mock).mockResolvedValue(mockVendor);
      (mockOrderRepository.db.execute as Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        vendorAnalyticsService.getVendorDashboardSummary(mockVendorId)
      ).rejects.toThrow('Database error');
    });

    it('should handle cache errors gracefully', async () => {
      (mockCacheManager.get as Mock).mockRejectedValue(new Error('Cache error'));
      (mockVendorRepository.findById as Mock).mockResolvedValue(mockVendor);

      // Mock successful database calls
      (mockOrderRepository.db.execute as Mock).mockResolvedValue({
        rows: [{ total_sales: 1000, total_items: 50, order_count: 10 }]
      });

      (mockProductRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 50 }]),
      });

      (mockOrderRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      });

      // Should still work even if cache fails
      const result = await vendorAnalyticsService.getVendorDashboardSummary(mockVendorId);
      expect(result).toBeDefined();
    });
  });

  describe('date range handling', () => {
    it('should handle different period calculations correctly', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);
      (mockVendorRepository.findById as Mock).mockResolvedValue(mockVendor);

      // Mock database calls
      (mockOrderRepository.db.execute as Mock).mockResolvedValue({
        rows: [{ total_sales: 1000, total_items: 50, order_count: 10 }]
      });

      (mockProductRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 50 }]),
      });

      (mockOrderRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      });

      const result = await vendorAnalyticsService.getVendorDashboardSummary(mockVendorId, 'day');

      expect(result.period.type).toBe('day');
      expect(result.period.startDate).toBeDefined();
      expect(result.period.endDate).toBeDefined();
    });
  });
});