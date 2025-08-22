import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  ABTestRepository, 
  ABTestVariantRepository, 
  UserTestAssignmentRepository,
  ABTestAnalyticsRepository
} from '../ab-test-repository';
import { DatabaseConnection } from '../../connection';
import { ABTestStatus } from '../../schema/ab-tests';

// Mock the database connection
const mockDb = {
  drizzle: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  kysely: {
    selectFrom: vi.fn(),
    insertInto: vi.fn(),
    updateTable: vi.fn(),
    deleteFrom: vi.fn(),
    transaction: vi.fn(),
  },
} as unknown as DatabaseConnection;

describe('ABTestRepository', () => {
  let abTestRepo: ABTestRepository;

  beforeEach(() => {
    abTestRepo = new ABTestRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findActiveTests', () => {
    it('should find active A/B tests', async () => {
      const mockTests = [
        {
          id: '1',
          name: 'Homepage Button Test',
          status: ABTestStatus.RUNNING,
          type: 'ui',
          createdAt: new Date(),
        },
      ];

      vi.spyOn(abTestRepo, 'findBy').mockResolvedValue(mockTests as any);

      const result = await abTestRepo.findActiveTests();

      expect(abTestRepo.findBy).toHaveBeenCalledWith({ status: ABTestStatus.RUNNING });
      expect(result).toEqual(mockTests);
    });
  });

  describe('searchTests', () => {
    it('should search tests with text query', async () => {
      const mockResults = {
        data: [{ id: '1', name: 'Homepage Button Test' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.spyOn(abTestRepo, 'search').mockResolvedValue(mockResults as any);

      const result = await abTestRepo.searchTests(
        { search: 'homepage', status: ABTestStatus.RUNNING },
        { page: 1, limit: 10 }
      );

      expect(abTestRepo.search).toHaveBeenCalledWith(
        {
          query: 'homepage',
          searchFields: ['name', 'description'],
        },
        { page: 1, limit: 10 },
        { 
          status: ABTestStatus.RUNNING,
          type: undefined,
          createdBy: undefined 
        }
      );
      expect(result).toEqual(mockResults);
    });
  });
});

describe('ABTestVariantRepository', () => {
  let variantRepo: ABTestVariantRepository;

  beforeEach(() => {
    variantRepo = new ABTestVariantRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findByTestId', () => {
    it('should find variants by test ID', async () => {
      const mockVariants = [
        {
          id: '1',
          testId: 'test-1',
          name: 'Control',
          isControl: true,
          trafficAllocation: '50.00',
        },
        {
          id: '2',
          testId: 'test-1',
          name: 'Variant A',
          isControl: false,
          trafficAllocation: '50.00',
        },
      ];

      vi.spyOn(variantRepo, 'findBy').mockResolvedValue(mockVariants as any);

      const result = await variantRepo.findByTestId('test-1');

      expect(variantRepo.findBy).toHaveBeenCalledWith({ testId: 'test-1' });
      expect(result).toEqual(mockVariants);
    });
  });

  describe('findControlVariant', () => {
    it('should find control variant', async () => {
      const mockControlVariant = {
        id: '1',
        testId: 'test-1',
        name: 'Control',
        isControl: true,
      };

      vi.spyOn(variantRepo, 'findOneBy').mockResolvedValue(mockControlVariant as any);

      const result = await variantRepo.findControlVariant('test-1');

      expect(variantRepo.findOneBy).toHaveBeenCalledWith({ testId: 'test-1', isControl: true });
      expect(result).toEqual(mockControlVariant);
    });
  });

  describe('getVariantForAssignment', () => {
    it('should return variant based on traffic allocation', async () => {
      const mockVariant = {
        id: '1',
        testId: 'test-1',
        name: 'Control',
        isControl: true,
        trafficAllocation: '50.00',
      };

      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(mockVariant);
      vi.spyOn(variantRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      // Mock Math.random to return a predictable value
      vi.spyOn(Math, 'random').mockReturnValue(0.25); // 25%

      const result = await variantRepo.getVariantForAssignment('test-1');

      expect(mockExecuteKyselyQuery).toHaveBeenCalled();
      expect(result).toEqual(mockVariant);
    });

    it('should return null if no variants exist', async () => {
      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(null);
      vi.spyOn(variantRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      const result = await variantRepo.getVariantForAssignment('test-1');

      expect(result).toBeNull();
    });
  });
});

describe('UserTestAssignmentRepository', () => {
  let assignmentRepo: UserTestAssignmentRepository;

  beforeEach(() => {
    assignmentRepo = new UserTestAssignmentRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findByUserAndTest', () => {
    it('should find assignment by user and test', async () => {
      const mockAssignment = {
        id: '1',
        userId: 'user-1',
        testId: 'test-1',
        variantId: 'variant-1',
        assignedAt: new Date(),
      };

      vi.spyOn(assignmentRepo, 'findOneBy').mockResolvedValue(mockAssignment as any);

      const result = await assignmentRepo.findByUserAndTest('user-1', 'test-1');

      expect(assignmentRepo.findOneBy).toHaveBeenCalledWith({ userId: 'user-1', testId: 'test-1' });
      expect(result).toEqual(mockAssignment);
    });
  });

  describe('createOrGetAssignment', () => {
    it('should return existing assignment if found', async () => {
      const mockExistingAssignment = {
        id: '1',
        userId: 'user-1',
        testId: 'test-1',
        variantId: 'variant-1',
      };

      vi.spyOn(assignmentRepo, 'findByUserAndTest').mockResolvedValue(mockExistingAssignment as any);

      const result = await assignmentRepo.createOrGetAssignment({
        userId: 'user-1',
        testId: 'test-1',
        variantId: 'variant-2', // Different variant, but should return existing
      });

      expect(result).toEqual(mockExistingAssignment);
      expect(assignmentRepo.findByUserAndTest).toHaveBeenCalledWith('user-1', 'test-1');
    });

    it('should create new assignment if none exists', async () => {
      const mockNewAssignment = {
        id: '2',
        userId: 'user-1',
        testId: 'test-1',
        variantId: 'variant-1',
      };

      vi.spyOn(assignmentRepo, 'findByUserAndTest').mockResolvedValue(null);
      vi.spyOn(assignmentRepo, 'create').mockResolvedValue(mockNewAssignment as any);

      const result = await assignmentRepo.createOrGetAssignment({
        userId: 'user-1',
        testId: 'test-1',
        variantId: 'variant-1',
      });

      expect(result).toEqual(mockNewAssignment);
      expect(assignmentRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        testId: 'test-1',
        variantId: 'variant-1',
      });
    });
  });

  describe('recordImpression', () => {
    it('should record impression for assignment', async () => {
      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(assignmentRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      await assignmentRepo.recordImpression('assignment-1');

      expect(mockExecuteKyselyQuery).toHaveBeenCalled();
    });
  });

  describe('recordConversion', () => {
    it('should record conversion for assignment', async () => {
      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(assignmentRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      await assignmentRepo.recordConversion('assignment-1', 100);

      expect(mockExecuteKyselyQuery).toHaveBeenCalled();
    });
  });
});

describe('ABTestAnalyticsRepository', () => {
  let analyticsRepo: ABTestAnalyticsRepository;

  beforeEach(() => {
    analyticsRepo = new ABTestAnalyticsRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('getTestResults', () => {
    it('should get comprehensive test results', async () => {
      const mockResults = {
        testId: 'test-1',
        variants: [
          {
            variantId: 'variant-1',
            variantName: 'Control',
            assignments: 1000,
            conversions: 50,
            conversionRate: 5.0,
            revenue: 5000,
            averageRevenue: 100,
          },
          {
            variantId: 'variant-2',
            variantName: 'Variant A',
            assignments: 1000,
            conversions: 75,
            conversionRate: 7.5,
            revenue: 7500,
            averageRevenue: 100,
          },
        ],
        winner: 'variant-2',
        statisticalSignificance: 95,
      };

      // Mock the Kysely transaction
      const mockTransaction = {
        execute: vi.fn().mockImplementation(async (callback) => {
          return await callback({
            selectFrom: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue([
              {
                variantId: 'variant-1',
                variantName: 'Control',
                assignments: '1000',
                conversions: '50',
                revenue: '5000',
              },
              {
                variantId: 'variant-2',
                variantName: 'Variant A',
                assignments: '1000',
                conversions: '75',
                revenue: '7500',
              },
            ]),
          });
        }),
      };

      mockDb.kysely.transaction = vi.fn().mockReturnValue(mockTransaction);

      const result = await analyticsRepo.getTestResults('test-1');

      expect(result.testId).toBe('test-1');
      expect(result.variants).toHaveLength(2);
      expect(result.winner).toBe('variant-2');
    });
  });

  describe('getTestPerformanceOverTime', () => {
    it('should get test performance over time', async () => {
      const mockPerformanceData = [
        {
          date: '2024-01-01',
          assignments: 100,
          conversions: 5,
          conversionRate: 5.0,
        },
        {
          date: '2024-01-02',
          assignments: 120,
          conversions: 8,
          conversionRate: 6.67,
        },
      ];

      const mockKyselyQuery = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([
          {
            date: '2024-01-01',
            assignments: '100',
            conversions: '5',
          },
          {
            date: '2024-01-02',
            assignments: '120',
            conversions: '8',
          },
        ]),
      };

      mockDb.kysely.selectFrom = vi.fn().mockReturnValue(mockKyselyQuery);

      const result = await analyticsRepo.getTestPerformanceOverTime('test-1', 30);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].assignments).toBe(100);
      expect(result[0].conversions).toBe(5);
      expect(result[0].conversionRate).toBe(5.0);
    });
  });
});