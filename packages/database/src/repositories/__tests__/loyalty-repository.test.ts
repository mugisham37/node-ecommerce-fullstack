import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  LoyaltyRepository, 
  LoyaltyTierRepository, 
  UserLoyaltyRepository,
  LoyaltyHistoryRepository,
  LoyaltyRewardRepository,
  LoyaltyRedemptionRepository,
  LoyaltyReferralRepository
} from '../loyalty-repository';
import { DatabaseConnection } from '../../connection';
import { LoyaltyHistoryType, RewardType, RedemptionStatus } from '../../schema/loyalty';

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

describe('LoyaltyRepository', () => {
  let loyaltyRepo: LoyaltyRepository;

  beforeEach(() => {
    loyaltyRepo = new LoyaltyRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findActivePrograms', () => {
    it('should find active loyalty programs', async () => {
      const mockPrograms = [
        {
          id: '1',
          name: 'Gold Program',
          isActive: true,
          pointsPerDollar: '1.00',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(loyaltyRepo, 'findBy').mockResolvedValue(mockPrograms as any);

      const result = await loyaltyRepo.findActivePrograms();

      expect(loyaltyRepo.findBy).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockPrograms);
    });
  });

  describe('findByName', () => {
    it('should find program by name', async () => {
      const mockProgram = {
        id: '1',
        name: 'Gold Program',
        isActive: true,
      };

      vi.spyOn(loyaltyRepo, 'findOneBy').mockResolvedValue(mockProgram as any);

      const result = await loyaltyRepo.findByName('Gold Program');

      expect(loyaltyRepo.findOneBy).toHaveBeenCalledWith({ name: 'Gold Program' });
      expect(result).toEqual(mockProgram);
    });
  });

  describe('searchPrograms', () => {
    it('should search programs with text query', async () => {
      const mockResults = {
        data: [{ id: '1', name: 'Gold Program' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.spyOn(loyaltyRepo, 'search').mockResolvedValue(mockResults as any);

      const result = await loyaltyRepo.searchPrograms(
        { search: 'gold', isActive: true },
        { page: 1, limit: 10 }
      );

      expect(loyaltyRepo.search).toHaveBeenCalledWith(
        {
          query: 'gold',
          searchFields: ['name', 'description'],
        },
        { page: 1, limit: 10 },
        { isActive: true }
      );
      expect(result).toEqual(mockResults);
    });

    it('should search programs without text query', async () => {
      const mockResults = {
        data: [{ id: '1', name: 'Gold Program' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.spyOn(loyaltyRepo, 'findAll').mockResolvedValue(mockResults as any);

      const result = await loyaltyRepo.searchPrograms(
        { isActive: true },
        { page: 1, limit: 10 }
      );

      expect(loyaltyRepo.findAll).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        { isActive: true }
      );
      expect(result).toEqual(mockResults);
    });
  });
});

describe('LoyaltyTierRepository', () => {
  let tierRepo: LoyaltyTierRepository;

  beforeEach(() => {
    tierRepo = new LoyaltyTierRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findByProgramId', () => {
    it('should find tiers by program ID', async () => {
      const mockTiers = [
        {
          id: '1',
          programId: 'program-1',
          name: 'Bronze',
          minPoints: 0,
          maxPoints: 1000,
        },
      ];

      vi.spyOn(tierRepo, 'findBy').mockResolvedValue(mockTiers as any);

      const result = await tierRepo.findByProgramId('program-1');

      expect(tierRepo.findBy).toHaveBeenCalledWith({ programId: 'program-1' });
      expect(result).toEqual(mockTiers);
    });
  });

  describe('findTierByPoints', () => {
    it('should find appropriate tier for points amount', async () => {
      const mockTier = {
        id: '1',
        programId: 'program-1',
        name: 'Silver',
        minPoints: 1000,
        maxPoints: 5000,
      };

      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(mockTier);
      vi.spyOn(tierRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      const result = await tierRepo.findTierByPoints('program-1', 2500);

      expect(mockExecuteKyselyQuery).toHaveBeenCalled();
      expect(result).toEqual(mockTier);
    });

    it('should return null if no tier found', async () => {
      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(null);
      vi.spyOn(tierRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      const result = await tierRepo.findTierByPoints('program-1', 10000);

      expect(result).toBeNull();
    });
  });
});

describe('UserLoyaltyRepository', () => {
  let userLoyaltyRepo: UserLoyaltyRepository;

  beforeEach(() => {
    userLoyaltyRepo = new UserLoyaltyRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findByUserAndProgram', () => {
    it('should find user loyalty by user and program', async () => {
      const mockUserLoyalty = {
        id: '1',
        userId: 'user-1',
        programId: 'program-1',
        points: 2500,
      };

      vi.spyOn(userLoyaltyRepo, 'findOneBy').mockResolvedValue(mockUserLoyalty as any);

      const result = await userLoyaltyRepo.findByUserAndProgram('user-1', 'program-1');

      expect(userLoyaltyRepo.findOneBy).toHaveBeenCalledWith({
        userId: 'user-1',
        programId: 'program-1',
      });
      expect(result).toEqual(mockUserLoyalty);
    });
  });

  describe('updatePoints', () => {
    it('should update user points', async () => {
      const mockUpdatedLoyalty = {
        id: '1',
        userId: 'user-1',
        programId: 'program-1',
        points: 2600,
        lifetimePoints: 2600,
      };

      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(mockUpdatedLoyalty);
      vi.spyOn(userLoyaltyRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      const result = await userLoyaltyRepo.updatePoints('user-1', 'program-1', 100);

      expect(mockExecuteKyselyQuery).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedLoyalty);
    });
  });

  describe('getLeaderboard', () => {
    it('should get loyalty leaderboard', async () => {
      const mockLeaderboard = [
        {
          id: '1',
          userId: 'user-1',
          programId: 'program-1',
          points: 5000,
          rank: 1,
        },
        {
          id: '2',
          userId: 'user-2',
          programId: 'program-1',
          points: 3000,
          rank: 2,
        },
      ];

      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(mockLeaderboard);
      vi.spyOn(userLoyaltyRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      const result = await userLoyaltyRepo.getLeaderboard('program-1', 10);

      expect(mockExecuteKyselyQuery).toHaveBeenCalled();
      expect(result).toEqual(mockLeaderboard);
    });
  });
});

describe('LoyaltyHistoryRepository', () => {
  let historyRepo: LoyaltyHistoryRepository;

  beforeEach(() => {
    historyRepo = new LoyaltyHistoryRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('createHistoryEntry', () => {
    it('should create history entry', async () => {
      const historyData = {
        userId: 'user-1',
        programId: 'program-1',
        type: LoyaltyHistoryType.ORDER,
        points: 100,
        description: 'Points earned from order #123',
        orderId: 'order-123',
      };

      const mockCreatedEntry = {
        id: '1',
        ...historyData,
        createdAt: new Date(),
      };

      vi.spyOn(historyRepo, 'create').mockResolvedValue(mockCreatedEntry as any);

      const result = await historyRepo.createHistoryEntry(historyData);

      expect(historyRepo.create).toHaveBeenCalledWith(historyData);
      expect(result).toEqual(mockCreatedEntry);
    });
  });

  describe('getPointsSummary', () => {
    it('should get points summary for user', async () => {
      const mockSummary = {
        totalEarned: 5000,
        totalRedeemed: 1000,
        totalExpired: 200,
        currentBalance: 3800,
      };

      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(mockSummary);
      vi.spyOn(historyRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      const result = await historyRepo.getPointsSummary('user-1', 'program-1');

      expect(mockExecuteKyselyQuery).toHaveBeenCalled();
      expect(result).toEqual(mockSummary);
    });
  });
});

describe('LoyaltyRewardRepository', () => {
  let rewardRepo: LoyaltyRewardRepository;

  beforeEach(() => {
    rewardRepo = new LoyaltyRewardRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findActiveRewardsByProgram', () => {
    it('should find active rewards by program', async () => {
      const mockRewards = [
        {
          id: '1',
          programId: 'program-1',
          name: '10% Discount',
          type: RewardType.DISCOUNT,
          pointsCost: 1000,
          isActive: true,
        },
      ];

      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(mockRewards);
      vi.spyOn(rewardRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      const result = await rewardRepo.findActiveRewardsByProgram('program-1');

      expect(mockExecuteKyselyQuery).toHaveBeenCalled();
      expect(result).toEqual(mockRewards);
    });
  });

  describe('isRewardAvailable', () => {
    it('should return true for available reward', async () => {
      const mockReward = {
        id: '1',
        isActive: true,
        validFrom: null,
        validUntil: null,
        maxRedemptions: null,
        currentRedemptions: 0,
      };

      vi.spyOn(rewardRepo, 'findById').mockResolvedValue(mockReward as any);

      const result = await rewardRepo.isRewardAvailable('1');

      expect(result).toBe(true);
    });

    it('should return false for inactive reward', async () => {
      const mockReward = {
        id: '1',
        isActive: false,
      };

      vi.spyOn(rewardRepo, 'findById').mockResolvedValue(mockReward as any);

      const result = await rewardRepo.isRewardAvailable('1');

      expect(result).toBe(false);
    });

    it('should return false for reward that has reached max redemptions', async () => {
      const mockReward = {
        id: '1',
        isActive: true,
        validFrom: null,
        validUntil: null,
        maxRedemptions: 100,
        currentRedemptions: 100,
      };

      vi.spyOn(rewardRepo, 'findById').mockResolvedValue(mockReward as any);

      const result = await rewardRepo.isRewardAvailable('1');

      expect(result).toBe(false);
    });
  });
});

describe('LoyaltyRedemptionRepository', () => {
  let redemptionRepo: LoyaltyRedemptionRepository;

  beforeEach(() => {
    redemptionRepo = new LoyaltyRedemptionRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findByCode', () => {
    it('should find redemption by code', async () => {
      const mockRedemption = {
        id: '1',
        code: 'REDEEM123',
        status: RedemptionStatus.PENDING,
      };

      vi.spyOn(redemptionRepo, 'findOneBy').mockResolvedValue(mockRedemption as any);

      const result = await redemptionRepo.findByCode('REDEEM123');

      expect(redemptionRepo.findOneBy).toHaveBeenCalledWith({ code: 'REDEEM123' });
      expect(result).toEqual(mockRedemption);
    });
  });

  describe('generateUniqueCode', () => {
    it('should generate unique redemption code', async () => {
      vi.spyOn(redemptionRepo, 'exists')
        .mockResolvedValueOnce(true) // First code exists
        .mockResolvedValueOnce(false); // Second code is unique

      const result = await redemptionRepo.generateUniqueCode();

      expect(typeof result).toBe('string');
      expect(result.length).toBe(10);
      expect(redemptionRepo.exists).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateStatus', () => {
    it('should update redemption status', async () => {
      const mockUpdatedRedemption = {
        id: '1',
        status: RedemptionStatus.APPROVED,
        notes: 'Approved by admin',
      };

      vi.spyOn(redemptionRepo, 'update').mockResolvedValue(mockUpdatedRedemption as any);

      const result = await redemptionRepo.updateStatus('1', RedemptionStatus.APPROVED, 'Approved by admin');

      expect(redemptionRepo.update).toHaveBeenCalledWith('1', {
        status: RedemptionStatus.APPROVED,
        notes: 'Approved by admin',
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual(mockUpdatedRedemption);
    });
  });
});

describe('LoyaltyReferralRepository', () => {
  let referralRepo: LoyaltyReferralRepository;

  beforeEach(() => {
    referralRepo = new LoyaltyReferralRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findByCode', () => {
    it('should find referral by code', async () => {
      const mockReferral = {
        id: '1',
        code: 'REF123',
        referrerId: 'user-1',
        isUsed: false,
      };

      vi.spyOn(referralRepo, 'findOneBy').mockResolvedValue(mockReferral as any);

      const result = await referralRepo.findByCode('REF123');

      expect(referralRepo.findOneBy).toHaveBeenCalledWith({ code: 'REF123' });
      expect(result).toEqual(mockReferral);
    });
  });

  describe('generateUniqueCode', () => {
    it('should generate unique referral code', async () => {
      vi.spyOn(referralRepo, 'exists')
        .mockResolvedValueOnce(true) // First code exists
        .mockResolvedValueOnce(false); // Second code is unique

      const result = await referralRepo.generateUniqueCode();

      expect(typeof result).toBe('string');
      expect(result.length).toBe(8);
      expect(referralRepo.exists).toHaveBeenCalledTimes(2);
    });
  });

  describe('useReferralCode', () => {
    it('should use referral code successfully', async () => {
      const mockUsedReferral = {
        id: '1',
        code: 'REF123',
        referrerId: 'user-1',
        referredUserId: 'user-2',
        isUsed: true,
        usedAt: new Date(),
      };

      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(mockUsedReferral);
      vi.spyOn(referralRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      const result = await referralRepo.useReferralCode('REF123', 'user-2');

      expect(mockExecuteKyselyQuery).toHaveBeenCalled();
      expect(result).toEqual(mockUsedReferral);
    });

    it('should return null if referral code already used', async () => {
      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(null);
      vi.spyOn(referralRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      const result = await referralRepo.useReferralCode('REF123', 'user-2');

      expect(result).toBeNull();
    });
  });

  describe('getReferralStats', () => {
    it('should get referral statistics', async () => {
      const mockStats = {
        totalReferrals: 10,
        usedReferrals: 7,
        totalPointsEarned: 700,
      };

      const mockExecuteKyselyQuery = vi.fn().mockResolvedValue(mockStats);
      vi.spyOn(referralRepo, 'executeKyselyQuery').mockImplementation(mockExecuteKyselyQuery);

      const result = await referralRepo.getReferralStats('user-1');

      expect(mockExecuteKyselyQuery).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });
});