import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AnalyticsService } from '../analytics.service';
import { 
  OrderRepository, 
  ProductRepository, 
  UserRepository, 
  LoyaltyRepository,
  OrderItemRepository,
  CategoryRepository,
  VendorRepository
} from '@packages/database';
import { CacheManager } from '@packages/cache';

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

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockOrderRepository: OrderRepository;
  let mockProductRepository: ProductRepository;
  let mockUserRepository: UserRepository;
  let mockLoyaltyRepository: LoyaltyRepository;
  let mockOrderItemRepository: OrderItemRepository;
  let mockCategoryRepository: CategoryRepository;
  let mockVendorRepository: VendorRepository;
  let mockCacheManager: CacheManager;

  beforeEach(() => {
    // Create mock instances
    mockOrderRepository = {
      db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
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

    mockUserRepository = {
      db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        execute: vi.fn(),
      },
    } as any;

    mockLoyaltyRepository = {} as any;
    mockOrderItemRepository = {
      db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        execute: vi.fn(),
      },
    } as any;
    mockCategoryRepository = {} as any;
    mockVendorRepository = {} as any;

    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
    } as any;

    analyticsService = new AnalyticsService(
      mockOrderRepository,
      mockProductRepository,
      mockUserRepository,
      mockLoyaltyRepository,
      mockOrderItemRepository,
      mockCategoryRepository,
      mockVendorRepository,
      mockCacheManager
    );
  });

  describe('getDashboardAnalytics', () => {
    it('should return cached data when available', async () => {
      const cachedData = {
        salesSummary: { totalSales: 1000, totalOrders: 10 },
        customerSummary: { totalCustomers: 100 },
        productSummary: { totalProducts: 50 },
        orderSummary: { totalOrders: 10 },
        recentOrders: [],
        topProducts: [],
        salesByCategory: [],
        salesByVendor: [],
        salesTrend: [],
        period: { startDate: new Date(), endDate: new Date() },
      };

      (mockCacheManager.get as Mock).mockResolvedValue(cachedData);

      const result = await analyticsService.getDashboardAnalytics();

      expect(result).toEqual(cachedData);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining('dashboard_analytics')
      );
    });

    it('should generate analytics when not cached', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);

      // Mock database responses for sales summary
      (mockOrderRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { totalSales: 1000, orderCount: 10, avgOrderValue: 100 }
        ]),
      });

      (mockOrderItemRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { totalItems: 50 }
        ]),
      });

      // Mock database responses for customer summary
      (mockUserRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 100 }]),
        innerJoin: vi.fn().mockReturnThis(),
      });

      // Mock database responses for product summary
      (mockProductRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 50 }]),
      });

      // Mock execute for raw SQL queries
      (mockOrderRepository.db.execute as Mock).mockResolvedValue({
        rows: [{ date: new Date(), sales: 100, orders: 5, items: 25 }]
      });

      (mockOrderItemRepository.db.execute as Mock).mockResolvedValue({
        rows: []
      });

      const result = await analyticsService.getDashboardAnalytics();

      expect(result).toBeDefined();
      expect(result.salesSummary).toBeDefined();
      expect(result.customerSummary).toBeDefined();
      expect(result.productSummary).toBeDefined();
      expect(result.orderSummary).toBeDefined();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should handle date range options', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      // Mock all required database calls
      (mockOrderRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { totalSales: 1000, orderCount: 10, avgOrderValue: 100 }
        ]),
      });

      (mockOrderItemRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ totalItems: 50 }]),
      });

      (mockUserRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 100 }]),
        innerJoin: vi.fn().mockReturnThis(),
      });

      (mockProductRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 50 }]),
      });

      (mockOrderRepository.db.execute as Mock).mockResolvedValue({
        rows: []
      });

      (mockOrderItemRepository.db.execute as Mock).mockResolvedValue({
        rows: []
      });

      const result = await analyticsService.getDashboardAnalytics({
        startDate,
        endDate,
        compareWithPrevious: false,
      });

      expect(result.period.startDate).toEqual(startDate);
      expect(result.period.endDate).toEqual(endDate);
    });
  });

  describe('getSalesAnalytics', () => {
    it('should return detailed sales analytics', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);

      // Mock sales summary
      (mockOrderRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { totalSales: 1000, orderCount: 10, avgOrderValue: 100 }
        ]),
      });

      (mockOrderItemRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ totalItems: 50 }]),
      });

      // Mock sales trend
      (mockOrderRepository.db.execute as Mock).mockResolvedValue({
        rows: [
          { date: new Date('2023-01-01'), sales: 100, orders: 2, items: 10 },
          { date: new Date('2023-01-02'), sales: 150, orders: 3, items: 15 },
        ]
      });

      const result = await analyticsService.getSalesAnalytics({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        interval: 'daily',
        groupBy: 'product',
      });

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.trend.current).toHaveLength(2);
      expect(result.options.interval).toBe('daily');
      expect(result.options.groupBy).toBe('product');
    });

    it('should include previous period comparison when requested', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);

      // Mock current period
      (mockOrderRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { totalSales: 1000, orderCount: 10, avgOrderValue: 100 }
        ]),
      });

      (mockOrderItemRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ totalItems: 50 }]),
      });

      // Mock execute calls for trends
      (mockOrderRepository.db.execute as Mock)
        .mockResolvedValueOnce({
          rows: [{ date: new Date(), sales: 100, orders: 2, items: 10 }]
        })
        .mockResolvedValueOnce({
          rows: [{ date: new Date(), sales: 80, orders: 1, items: 8 }]
        });

      const result = await analyticsService.getSalesAnalytics({
        compareWithPrevious: true,
      });

      expect(result.trend.current).toBeDefined();
      expect(result.trend.previous).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockCacheManager.get as Mock).mockResolvedValue(null);
      (mockOrderRepository.db.select as Mock).mockRejectedValue(new Error('Database error'));

      await expect(analyticsService.getDashboardAnalytics()).rejects.toThrow('Failed to get dashboard analytics');
    });

    it('should handle cache errors gracefully', async () => {
      (mockCacheManager.get as Mock).mockRejectedValue(new Error('Cache error'));

      // Mock successful database calls
      (mockOrderRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { totalSales: 1000, orderCount: 10, avgOrderValue: 100 }
        ]),
      });

      (mockOrderItemRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ totalItems: 50 }]),
      });

      (mockUserRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 100 }]),
        innerJoin: vi.fn().mockReturnThis(),
      });

      (mockProductRepository.db.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 50 }]),
      });

      (mockOrderRepository.db.execute as Mock).mockResolvedValue({
        rows: []
      });

      (mockOrderItemRepository.db.execute as Mock).mockResolvedValue({
        rows: []
      });

      // Should still work even if cache fails
      const result = await analyticsService.getDashboardAnalytics();
      expect(result).toBeDefined();
    });
  });
});