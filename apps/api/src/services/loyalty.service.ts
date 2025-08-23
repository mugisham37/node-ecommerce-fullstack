import { 
  LoyaltyRepository, 
  LoyaltyTierRepository, 
  UserLoyaltyRepository, 
  LoyaltyHistoryRepository,
  LoyaltyRewardRepository,
  LoyaltyRedemptionRepository,
  LoyaltyReferralRepository,
  UserLoyaltyWithDetails,
  LoyaltyProgramWithStats
} from '@packages/database';
import { 
  LoyaltyProgram,
  NewLoyaltyProgram,
  LoyaltyTier,
  NewLoyaltyTier,
  UserLoyaltyPoints,
  NewUserLoyaltyPoints,
  LoyaltyHistory,
  NewLoyaltyHistory,
  LoyaltyReward,
  NewLoyaltyReward,
  LoyaltyRedemption,
  NewLoyaltyRedemption,
  LoyaltyReferral,
  NewLoyaltyReferral,
  LoyaltyHistoryType,
  RedemptionStatus
} from '@packages/database/src/schema/loyalty';
import { CacheService } from '@packages/cache';
import { Logger } from '@packages/shared/src/utils/logger';
import { ApiError } from '@packages/shared/src/utils/api-error';
import { EmailService } from './email.service';
import { EventPublisher } from '../events/event-publisher';
import crypto from 'crypto';

// Cache TTL in seconds
const CACHE_TTL = {
  LOYALTY_PROGRAM: 3600, // 1 hour
  LOYALTY_TIERS: 86400, // 24 hours
  AVAILABLE_REWARDS: 1800, // 30 minutes
  REWARD_DETAILS: 3600, // 1 hour
  LOYALTY_STATISTICS: 1800, // 30 minutes
};

export interface LoyaltyServiceDependencies {
  loyaltyRepository: LoyaltyRepository;
  loyaltyTierRepository: LoyaltyTierRepository;
  userLoyaltyRepository: UserLoyaltyRepository;
  loyaltyHistoryRepository: LoyaltyHistoryRepository;
  loyaltyRewardRepository: LoyaltyRewardRepository;
  loyaltyRedemptionRepository: LoyaltyRedemptionRepository;
  loyaltyReferralRepository: LoyaltyReferralRepository;
  cacheService: CacheService;
  emailService: EmailService;
  eventPublisher: EventPublisher;
  logger: Logger;
}

export interface CustomerLoyaltyProgram {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  points: {
    current: number;
    lifetime: number;
  };
  tier: {
    current: string;
    next: string | null;
    pointsForNext: number;
  };
  referral: {
    code: string;
    count: number;
  };
  recentHistory: Array<{
    id: string;
    type: string;
    points: number;
    description: string;
    createdAt: Date;
    order?: {
      id: string;
      orderNumber: string;
      total: number;
    };
  }>;
}

export interface LoyaltyStatistics {
  period: string;
  totalEarned: number;
  totalRedeemed: number;
  netPoints: number;
  pointsByType: Array<{
    type: string;
    points: number;
    count: number;
  }>;
  chartData: Array<{
    date: string;
    points: number;
  }>;
}

export interface RedemptionResult {
  redemption: {
    id: string;
    code: string;
    reward: LoyaltyReward;
    expiresAt: Date | null;
    status: string;
  };
  newBalance: number;
}

/**
 * Loyalty Service - Handles all loyalty program operations
 * Migrated from other-backend/src/services/loyalty.service.ts
 */
export class LoyaltyService {
  private readonly loyaltyRepository: LoyaltyRepository;
  private readonly loyaltyTierRepository: LoyaltyTierRepository;
  private readonly userLoyaltyRepository: UserLoyaltyRepository;
  private readonly loyaltyHistoryRepository: LoyaltyHistoryRepository;
  private readonly loyaltyRewardRepository: LoyaltyRewardRepository;
  private readonly loyaltyRedemptionRepository: LoyaltyRedemptionRepository;
  private readonly loyaltyReferralRepository: LoyaltyReferralRepository;
  private readonly cacheService: CacheService;
  private readonly emailService: EmailService;
  private readonly eventPublisher: EventPublisher;
  private readonly logger: Logger;

  constructor(dependencies: LoyaltyServiceDependencies) {
    this.loyaltyRepository = dependencies.loyaltyRepository;
    this.loyaltyTierRepository = dependencies.loyaltyTierRepository;
    this.userLoyaltyRepository = dependencies.userLoyaltyRepository;
    this.loyaltyHistoryRepository = dependencies.loyaltyHistoryRepository;
    this.loyaltyRewardRepository = dependencies.loyaltyRewardRepository;
    this.loyaltyRedemptionRepository = dependencies.loyaltyRedemptionRepository;
    this.loyaltyReferralRepository = dependencies.loyaltyReferralRepository;
    this.cacheService = dependencies.cacheService;
    this.emailService = dependencies.emailService;
    this.eventPublisher = dependencies.eventPublisher;
    this.logger = dependencies.logger;
  }

  /**
   * Generate a unique referral code for a user
   */
  private generateReferralCode(userId: string): string {
    const hash = crypto.createHash("sha256");
    hash.update(userId + Date.now().toString());
    return hash.digest("hex").substring(0, 8).toUpperCase();
  }

  /**
   * Generate a unique redemption code
   */
  private generateRedemptionCode(): string {
    const hash = crypto.createHash("sha256");
    hash.update(Date.now().toString() + Math.random().toString());
    return hash.digest("hex").substring(0, 12).toUpperCase();
  }

  /**
   * Get customer loyalty program
   * Migrated from other-backend loyalty service
   */
  async getCustomerLoyaltyProgram(userId: string, requestId?: string): Promise<CustomerLoyaltyProgram> {
    this.logger.info(`Getting loyalty program for user ID: ${userId}`, { requestId });

    // Try to get from cache
    const cacheKey = `loyalty:program:${userId}`;
    const cachedProgram = await this.cacheService.get<CustomerLoyaltyProgram>(cacheKey);

    if (cachedProgram) {
      this.logger.info(`Retrieved loyalty program from cache for user ID: ${userId}`, { requestId });
      return cachedProgram;
    }

    try {
      // Get user loyalty details with program info
      const userLoyalty = await this.userLoyaltyRepository.getUserLoyaltyWithDetails(userId, 'default-program');
      
      if (!userLoyalty) {
        throw new ApiError("User loyalty program not found", 404);
      }

      // Calculate tier based on lifetime points
      const totalLifetimePoints = userLoyalty.lifetimePoints || 0;
      let currentTier = 'Bronze';
      let nextTier: string | null = 'Silver';
      let pointsForNextTier = 1000;

      if (totalLifetimePoints >= 10000) {
        currentTier = 'Platinum';
        nextTier = null;
        pointsForNextTier = 0;
      } else if (totalLifetimePoints >= 5000) {
        currentTier = 'Gold';
        nextTier = 'Platinum';
        pointsForNextTier = 10000 - totalLifetimePoints;
      } else if (totalLifetimePoints >= 1000) {
        currentTier = 'Silver';
        nextTier = 'Gold';
        pointsForNextTier = 5000 - totalLifetimePoints;
      }

      // Get or create referral code
      let referralCode = await this.loyaltyReferralRepository.findByReferrer(userId);
      if (!referralCode.length) {
        const newReferralCode = this.generateReferralCode(userId);
        await this.loyaltyReferralRepository.create({
          referrerId: userId,
          code: newReferralCode,
          isUsed: false,
          referrerPoints: 500,
          referredPoints: 100,
        });
        referralCode = [{ code: newReferralCode }] as any;
      }

      // Get referral count
      const referralStats = await this.loyaltyReferralRepository.getReferralStats(userId);

      // Compile result
      const result: CustomerLoyaltyProgram = {
        user: {
          id: userLoyalty.userId,
          firstName: 'User', // This would come from user service
          lastName: 'Name',
          email: 'user@example.com',
        },
        points: {
          current: userLoyalty.points || 0,
          lifetime: totalLifetimePoints,
        },
        tier: {
          current: currentTier,
          next: nextTier,
          pointsForNext: pointsForNextTier,
        },
        referral: {
          code: referralCode[0]?.code || '',
          count: referralStats.usedReferrals,
        },
        recentHistory: (userLoyalty.recentHistory || []).map(history => ({
          id: history.id,
          type: history.type,
          points: history.points,
          description: history.description,
          createdAt: history.createdAt,
          order: history.orderId ? {
            id: history.orderId,
            orderNumber: history.orderId,
            total: 0, // This would come from order service
          } : undefined,
        })),
      };

      // Cache the result
      await this.cacheService.set(cacheKey, result, CACHE_TTL.LOYALTY_PROGRAM);

      return result;
    } catch (error: any) {
      this.logger.error(`Error getting loyalty program: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Add loyalty points to a user
   * Migrated from other-backend loyalty service
   */
  async addLoyaltyPoints(
    userId: string,
    points: number,
    description: string,
    referenceId?: string,
    type: string = LoyaltyHistoryType.OTHER,
    requestId?: string,
  ): Promise<number> {
    this.logger.info(`Adding ${points} loyalty points to user ${userId}`, { requestId });

    try {
      // Use transaction to ensure consistency
      const result = await this.userLoyaltyRepository.executeTransaction(async (tx) => {
        // Update user's loyalty points
        const updatedUser = await this.userLoyaltyRepository.updatePoints(userId, 'default-program', points);
        
        if (!updatedUser) {
          throw new ApiError("User not found or failed to update points", 404);
        }

        // Create loyalty history record
        await this.loyaltyHistoryRepository.createHistoryEntry({
          userId,
          programId: 'default-program',
          type,
          points,
          description,
          orderId: referenceId,
        });

        return updatedUser.points || 0;
      });

      // Clear cache
      await this.cacheService.delete(`loyalty:program:${userId}`);

      this.logger.info(`Successfully added ${points} points to user ${userId}. New balance: ${result}`, { requestId });
      return result;
    } catch (error: any) {
      this.logger.error(`Error adding loyalty points: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Redeem loyalty points
   * Migrated from other-backend loyalty service
   */
  async redeemLoyaltyPoints(
    userId: string,
    points: number,
    description: string,
    requestId?: string,
  ): Promise<number> {
    this.logger.info(`Redeeming ${points} loyalty points for user ${userId}`, { requestId });

    try {
      // Check if user has enough points
      const userLoyalty = await this.userLoyaltyRepository.findByUserAndProgram(userId, 'default-program');

      if (!userLoyalty) {
        throw new ApiError("User loyalty program not found", 404);
      }

      const currentPoints = userLoyalty.points || 0;
      if (currentPoints < points) {
        throw new ApiError(`Insufficient points. Current: ${currentPoints}, Required: ${points}`, 400);
      }

      // Use transaction to ensure consistency
      const result = await this.userLoyaltyRepository.executeTransaction(async (tx) => {
        // Update user's loyalty points
        const updatedUser = await this.userLoyaltyRepository.updatePoints(userId, 'default-program', -points);
        
        if (!updatedUser) {
          throw new ApiError("Failed to update user points", 500);
        }

        // Create loyalty history record
        await this.loyaltyHistoryRepository.createHistoryEntry({
          userId,
          programId: 'default-program',
          type: LoyaltyHistoryType.REDEMPTION,
          points: -points,
          description,
        });

        return updatedUser.points || 0;
      });

      // Clear cache
      await this.cacheService.delete(`loyalty:program:${userId}`);

      this.logger.info(`Successfully redeemed ${points} points for user ${userId}. New balance: ${result}`, { requestId });
      return result;
    } catch (error: any) {
      this.logger.error(`Error redeeming loyalty points: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Process order points
   * Migrated from other-backend loyalty service
   */
  async processOrderPoints(orderId: string, requestId?: string): Promise<number> {
    this.logger.info(`Processing loyalty points for order ${orderId}`, { requestId });

    try {
      // This would typically get order details from order service
      // For now, we'll simulate order data
      const order = {
        id: orderId,
        userId: 'user-id', // This would come from order service
        total: 100, // This would come from order service
        status: 'completed',
        orderNumber: `ORD-${orderId.substring(0, 8)}`,
      };

      if (!order.userId) {
        this.logger.info(`Order ${orderId} has no user, skipping loyalty points`, { requestId });
        return 0;
      }

      // Check if points already awarded
      const existingHistory = await this.loyaltyHistoryRepository.findBy({
        orderId: orderId,
        type: LoyaltyHistoryType.ORDER,
      });

      if (existingHistory.length > 0) {
        this.logger.info(`Points already awarded for order ${orderId}`, { requestId });
        return existingHistory[0].points;
      }

      // Calculate points (1 point per $1 spent, minimum 1 point)
      const points = Math.max(1, Math.floor(Number(order.total)));

      // Award points
      await this.addLoyaltyPoints(
        order.userId,
        points,
        `Points earned from order ${order.orderNumber || orderId}`,
        orderId,
        LoyaltyHistoryType.ORDER,
        requestId
      );

      return points;
    } catch (error: any) {
      this.logger.error(`Error processing order points: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Process referral points
   * Migrated from other-backend loyalty service
   */
  async processReferralPoints(
    referralCode: string,
    newUserId: string,
    requestId?: string,
  ): Promise<number> {
    this.logger.info(`Processing referral points for code ${referralCode}`, { requestId });

    try {
      // Find referral
      const referral = await this.loyaltyReferralRepository.findByCode(referralCode);

      if (!referral || referral.isUsed) {
        throw new ApiError("Invalid or already used referral code", 400);
      }

      // Check if new user is different from referrer
      if (referral.referrerId === newUserId) {
        throw new ApiError("Cannot refer yourself", 400);
      }

      // Use transaction to process referral
      const result = await this.loyaltyReferralRepository.executeTransaction(async (tx) => {
        // Mark referral as used
        await this.loyaltyReferralRepository.useReferralCode(referralCode, newUserId);

        // Award points to referrer
        const referrerPoints = referral.referrerPoints || 500;
        await this.addLoyaltyPoints(
          referral.referrerId,
          referrerPoints,
          `Referral bonus for referring user ${newUserId}`,
          undefined,
          LoyaltyHistoryType.REFERRAL,
          requestId
        );

        // Award welcome points to new user
        const newUserPoints = referral.referredPoints || 100;
        await this.addLoyaltyPoints(
          newUserId,
          newUserPoints,
          `Welcome bonus for using referral code ${referralCode}`,
          undefined,
          LoyaltyHistoryType.REFERRAL,
          requestId
        );

        return referrerPoints;
      });

      // Clear cache for both users
      await Promise.all([
        this.cacheService.delete(`loyalty:program:${referral.referrerId}`),
        this.cacheService.delete(`loyalty:program:${newUserId}`),
      ]);

      this.logger.info(`Successfully processed referral. Referrer got ${result} points, new user got ${referral.referredPoints || 100} points`, { requestId });
      return result;
    } catch (error: any) {
      this.logger.error(`Error processing referral points: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Get loyalty statistics
   * Migrated from other-backend loyalty service
   */
  async getLoyaltyStatistics(
    userId: string,
    period: 'week' | 'month' | 'year' | 'all' = 'all',
    requestId?: string,
  ): Promise<LoyaltyStatistics> {
    this.logger.info(`Getting loyalty statistics for user ${userId} and period ${period}`, { requestId });

    // Try to get from cache
    const cacheKey = `loyalty:stats:${userId}:${period}`;
    const cachedStats = await this.cacheService.get<LoyaltyStatistics>(cacheKey);

    if (cachedStats) {
      this.logger.info('Retrieved loyalty statistics from cache', { requestId });
      return cachedStats;
    }

    try {
      // Calculate date range
      let startDate: Date | undefined;
      const now = new Date();

      if (period === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (period === 'year') {
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }

      // Get points summary
      const pointsSummary = await this.loyaltyHistoryRepository.getPointsSummary(userId, 'default-program');

      // For now, return simplified statistics
      // In a real implementation, this would aggregate data by type and date
      const result: LoyaltyStatistics = {
        period,
        totalEarned: pointsSummary.totalEarned,
        totalRedeemed: pointsSummary.totalRedeemed,
        netPoints: pointsSummary.currentBalance,
        pointsByType: [
          { type: LoyaltyHistoryType.ORDER, points: pointsSummary.totalEarned, count: 1 },
          { type: LoyaltyHistoryType.REDEMPTION, points: pointsSummary.totalRedeemed, count: 1 },
        ],
        chartData: [
          { date: now.toISOString().split('T')[0], points: pointsSummary.currentBalance },
        ],
      };

      // Cache the result
      await this.cacheService.set(cacheKey, result, CACHE_TTL.LOYALTY_STATISTICS);

      return result;
    } catch (error: any) {
      this.logger.error(`Error getting loyalty statistics: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Get available rewards
   * Migrated from other-backend loyalty service
   */
  async getAvailableRewards(userId: string, requestId?: string): Promise<LoyaltyReward[]> {
    this.logger.info(`Getting available rewards for user ${userId}`, { requestId });

    // Try to get from cache
    const cacheKey = `loyalty:rewards:${userId}`;
    const cachedRewards = await this.cacheService.get<LoyaltyReward[]>(cacheKey);

    if (cachedRewards) {
      this.logger.info('Retrieved available rewards from cache', { requestId });
      return cachedRewards;
    }

    try {
      // Get user's current points
      const userLoyalty = await this.userLoyaltyRepository.findByUserAndProgram(userId, 'default-program');
      const currentPoints = userLoyalty?.points || 0;

      // Get active rewards for the program
      const rewards = await this.loyaltyRewardRepository.findActiveRewardsByProgram('default-program');

      // Filter rewards based on user's points and availability
      const availableRewards = rewards.filter(reward => {
        return currentPoints >= reward.pointsCost && 
               this.loyaltyRewardRepository.isRewardAvailable(reward.id);
      });

      // Cache the result
      await this.cacheService.set(cacheKey, availableRewards, CACHE_TTL.AVAILABLE_REWARDS);

      return availableRewards;
    } catch (error: any) {
      this.logger.error(`Error getting available rewards: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Redeem a reward
   * Migrated from other-backend loyalty service
   */
  async redeemReward(userId: string, rewardId: string, requestId?: string): Promise<RedemptionResult> {
    this.logger.info(`Redeeming reward ${rewardId} for user ${userId}`, { requestId });

    try {
      // Get reward details
      const reward = await this.loyaltyRewardRepository.findById(rewardId);
      if (!reward) {
        throw new ApiError("Reward not found", 404);
      }

      // Check if reward is available
      const isAvailable = await this.loyaltyRewardRepository.isRewardAvailable(rewardId);
      if (!isAvailable) {
        throw new ApiError("Reward is not available", 400);
      }

      // Check user points
      const userLoyalty = await this.userLoyaltyRepository.findByUserAndProgram(userId, 'default-program');
      if (!userLoyalty || userLoyalty.points < reward.pointsCost) {
        throw new ApiError("Insufficient points for this reward", 400);
      }

      // Use transaction to process redemption
      const result = await this.loyaltyRedemptionRepository.executeTransaction(async (tx) => {
        // Redeem points
        const newBalance = await this.redeemLoyaltyPoints(
          userId,
          reward.pointsCost,
          `Redeemed reward: ${reward.name}`,
          requestId
        );

        // Generate redemption code
        const redemptionCode = await this.loyaltyRedemptionRepository.generateUniqueCode();

        // Create redemption record
        const redemption = await this.loyaltyRedemptionRepository.create({
          userId,
          programId: 'default-program',
          rewardId,
          pointsUsed: reward.pointsCost,
          code: redemptionCode,
          status: RedemptionStatus.PENDING,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        // Increment reward redemption count
        await this.loyaltyRewardRepository.incrementRedemptionCount(rewardId);

        return {
          redemption: {
            id: redemption.id,
            code: redemption.code,
            reward: reward,
            expiresAt: redemption.expiresAt,
            status: redemption.status,
          },
          newBalance,
        };
      });

      // Clear cache
      await Promise.all([
        this.cacheService.delete(`loyalty:program:${userId}`),
        this.cacheService.delete(`loyalty:rewards:${userId}`),
      ]);

      return result;
    } catch (error: any) {
      this.logger.error(`Error redeeming reward: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Get user's redemptions
   * Migrated from other-backend loyalty service
   */
  async getUserRedemptions(
    userId: string,
    status?: string,
    requestId?: string,
  ): Promise<LoyaltyRedemption[]> {
    this.logger.info(`Getting redemptions for user ${userId}`, { requestId });

    try {
      const redemptions = await this.loyaltyRedemptionRepository.findUserRedemptions(userId, 'default-program');
      return redemptions.data;
    } catch (error: any) {
      this.logger.error(`Error getting user redemptions: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Use a redemption code
   * Migrated from other-backend loyalty service
   */
  async useRedemptionCode(code: string, requestId?: string): Promise<LoyaltyRedemption> {
    this.logger.info(`Using redemption code ${code}`, { requestId });

    try {
      // Find redemption
      const redemption = await this.loyaltyRedemptionRepository.findByCode(code);

      if (!redemption || redemption.status !== RedemptionStatus.PENDING) {
        throw new ApiError("Invalid or expired redemption code", 400);
      }

      if (redemption.expiresAt && redemption.expiresAt < new Date()) {
        throw new ApiError("Redemption code has expired", 400);
      }

      // Mark as used
      const updatedRedemption = await this.loyaltyRedemptionRepository.updateStatus(
        redemption.id,
        RedemptionStatus.USED
      );

      if (!updatedRedemption) {
        throw new ApiError("Failed to update redemption status", 500);
      }

      return updatedRedemption;
    } catch (error: any) {
      this.logger.error(`Error using redemption code: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Adjust customer loyalty points (can be positive or negative)
   * Migrated from other-backend loyalty service
   */
  async adjustCustomerPoints(
    userId: string,
    pointsAdjustment: number,
    description: string,
    requestId?: string
  ): Promise<number> {
    this.logger.info(`Adjusting ${pointsAdjustment} loyalty points for user ${userId}`, { requestId });

    try {
      const result = await this.userLoyaltyRepository.executeTransaction(async (tx) => {
        // Update user's loyalty points
        const updatedUser = await this.userLoyaltyRepository.updatePoints(userId, 'default-program', pointsAdjustment);
        
        if (!updatedUser) {
          throw new ApiError("User not found or failed to update points", 404);
        }

        // Create loyalty history record
        await this.loyaltyHistoryRepository.createHistoryEntry({
          userId,
          programId: 'default-program',
          type: pointsAdjustment > 0 ? LoyaltyHistoryType.OTHER : LoyaltyHistoryType.EXPIRE,
          points: pointsAdjustment,
          description,
        });

        return updatedUser.points || 0;
      });

      // Clear cache
      await this.cacheService.delete(`loyalty:program:${userId}`);

      this.logger.info(`Successfully adjusted ${pointsAdjustment} points for user ${userId}. New balance: ${result}`, { requestId });
      return result;
    } catch (error: any) {
      this.logger.error(`Error adjusting loyalty points: ${error.message}`, { requestId, error });
      throw error;
    }
  }

  /**
   * Expire old redemptions
   * Migrated from other-backend loyalty service
   */
  async expireOldRedemptions(requestId?: string): Promise<number> {
    this.logger.info('Expiring old redemptions', { requestId });

    try {
      // This would be implemented using a bulk update operation
      // For now, we'll return 0 as a placeholder
      const expiredCount = 0;

      this.logger.info(`Expired ${expiredCount} redemptions`, { requestId });
      return expiredCount;
    } catch (error: any) {
      this.logger.error(`Error expiring old redemptions: ${error.message}`, { requestId, error });
      throw error;
    }
  }
}