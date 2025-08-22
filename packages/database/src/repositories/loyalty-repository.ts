import { eq, and, or, desc, asc, sql, gte, lte, inArray } from 'drizzle-orm';
import { 
  loyaltyPrograms, 
  loyaltyTiers, 
  userLoyaltyPoints, 
  loyaltyHistory, 
  loyaltyRewards, 
  loyaltyRedemptions,
  loyaltyReferrals,
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
} from '../schema/loyalty';
import { BaseRepository, FilterOptions, PaginationOptions, PagedResult } from './base/base-repository';
import { DatabaseConnection } from '../connection';

export interface LoyaltyProgramFilters extends FilterOptions {
  name?: string;
  isActive?: boolean;
  search?: string;
}

export interface UserLoyaltyFilters extends FilterOptions {
  userId?: string;
  programId?: string;
  tierId?: string;
  minPoints?: number;
  maxPoints?: number;
}

export interface LoyaltyHistoryFilters extends FilterOptions {
  userId?: string;
  programId?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface RedemptionFilters extends FilterOptions {
  userId?: string;
  programId?: string;
  rewardId?: string;
  status?: string;
  code?: string;
}

export interface LoyaltyProgramWithStats extends LoyaltyProgram {
  totalUsers?: number;
  totalPoints?: number;
  totalRedemptions?: number;
  tiers?: LoyaltyTier[];
}

export interface UserLoyaltyWithDetails extends UserLoyaltyPoints {
  tier?: LoyaltyTier;
  program?: LoyaltyProgram;
  recentHistory?: LoyaltyHistory[];
}

/**
 * Repository for loyalty program operations
 */
export class LoyaltyRepository extends BaseRepository<
  typeof loyaltyPrograms,
  LoyaltyProgram,
  NewLoyaltyProgram
> {
  protected table = loyaltyPrograms;
  protected tableName = 'loyalty_programs';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find active loyalty programs
   */
  async findActivePrograms(): Promise<LoyaltyProgram[]> {
    return await this.findBy({ isActive: true });
  }

  /**
   * Find program by name
   */
  async findByName(name: string): Promise<LoyaltyProgram | null> {
    return await this.findOneBy({ name });
  }

  /**
   * Get program with statistics
   */
  async getProgramWithStats(programId: string): Promise<LoyaltyProgramWithStats | null> {
    const program = await this.findById(programId);
    if (!program) return null;

    return await this.executeKyselyQuery(async (db) => {
      const stats = await db
        .selectFrom('loyalty_programs')
        .leftJoin('user_loyalty_points', 'loyalty_programs.id', 'user_loyalty_points.program_id')
        .leftJoin('loyalty_redemptions', 'loyalty_programs.id', 'loyalty_redemptions.program_id')
        .select([
          'loyalty_programs.id',
          'loyalty_programs.name',
          'loyalty_programs.description',
          'loyalty_programs.points_per_dollar as pointsPerDollar',
          'loyalty_programs.is_active as isActive',
          'loyalty_programs.start_date as startDate',
          'loyalty_programs.end_date as endDate',
          'loyalty_programs.terms_and_conditions as termsAndConditions',
          'loyalty_programs.created_at as createdAt',
          'loyalty_programs.updated_at as updatedAt',
          db.fn.count('user_loyalty_points.id').as('totalUsers'),
          db.fn.sum('user_loyalty_points.points').as('totalPoints'),
          db.fn.count('loyalty_redemptions.id').as('totalRedemptions'),
        ])
        .where('loyalty_programs.id', '=', programId)
        .groupBy([
          'loyalty_programs.id',
          'loyalty_programs.name',
          'loyalty_programs.description',
          'loyalty_programs.points_per_dollar',
          'loyalty_programs.is_active',
          'loyalty_programs.start_date',
          'loyalty_programs.end_date',
          'loyalty_programs.terms_and_conditions',
          'loyalty_programs.created_at',
          'loyalty_programs.updated_at',
        ])
        .executeTakeFirst();

      if (!stats) return null;

      // Get tiers
      const tiers = await db
        .selectFrom('loyalty_tiers')
        .selectAll()
        .where('program_id', '=', programId)
        .orderBy('min_points', 'asc')
        .execute();

      return {
        ...stats,
        totalUsers: Number(stats.totalUsers),
        totalPoints: Number(stats.totalPoints) || 0,
        totalRedemptions: Number(stats.totalRedemptions),
        tiers: tiers.map(tier => ({
          id: tier.id,
          programId: tier.program_id,
          name: tier.name,
          minPoints: tier.min_points,
          maxPoints: tier.max_points,
          benefits: tier.benefits,
          multiplier: tier.multiplier,
          color: tier.color,
          icon: tier.icon,
          createdAt: tier.created_at,
          updatedAt: tier.updated_at,
        })),
      } as LoyaltyProgramWithStats;
    });
  }

  /**
   * Search programs with filters
   */
  async searchPrograms(
    filters: LoyaltyProgramFilters,
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PagedResult<LoyaltyProgram>> {
    if (filters.search) {
      return await this.search(
        {
          query: filters.search,
          searchFields: ['name', 'description'],
        },
        pagination,
        { isActive: filters.isActive }
      );
    }

    return await this.findAll(pagination, filters);
  }
}

/**
 * Repository for loyalty tiers
 */
export class LoyaltyTierRepository extends BaseRepository<
  typeof loyaltyTiers,
  LoyaltyTier,
  NewLoyaltyTier
> {
  protected table = loyaltyTiers;
  protected tableName = 'loyalty_tiers';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find tiers by program ID
   */
  async findByProgramId(programId: string): Promise<LoyaltyTier[]> {
    return await this.findBy({ programId });
  }

  /**
   * Find tier by points
   */
  async findTierByPoints(programId: string, points: number): Promise<LoyaltyTier | null> {
    return await this.executeKyselyQuery(async (db) => {
      const tier = await db
        .selectFrom('loyalty_tiers')
        .selectAll()
        .where('program_id', '=', programId)
        .where('min_points', '<=', points)
        .where((eb) => eb.or([
          eb('max_points', 'is', null),
          eb('max_points', '>=', points)
        ]))
        .orderBy('min_points', 'desc')
        .executeTakeFirst();

      if (!tier) return null;

      return {
        id: tier.id,
        programId: tier.program_id,
        name: tier.name,
        minPoints: tier.min_points,
        maxPoints: tier.max_points,
        benefits: tier.benefits,
        multiplier: tier.multiplier,
        color: tier.color,
        icon: tier.icon,
        createdAt: tier.created_at,
        updatedAt: tier.updated_at,
      } as LoyaltyTier;
    });
  }

  /**
   * Get tiers ordered by points
   */
  async getTiersOrderedByPoints(programId: string): Promise<LoyaltyTier[]> {
    return await this.executeKyselyQuery(async (db) => {
      const tiers = await db
        .selectFrom('loyalty_tiers')
        .selectAll()
        .where('program_id', '=', programId)
        .orderBy('min_points', 'asc')
        .execute();

      return tiers.map(tier => ({
        id: tier.id,
        programId: tier.program_id,
        name: tier.name,
        minPoints: tier.min_points,
        maxPoints: tier.max_points,
        benefits: tier.benefits,
        multiplier: tier.multiplier,
        color: tier.color,
        icon: tier.icon,
        createdAt: tier.created_at,
        updatedAt: tier.updated_at,
      })) as LoyaltyTier[];
    });
  }
}

/**
 * Repository for user loyalty points
 */
export class UserLoyaltyRepository extends BaseRepository<
  typeof userLoyaltyPoints,
  UserLoyaltyPoints,
  NewUserLoyaltyPoints
> {
  protected table = userLoyaltyPoints;
  protected tableName = 'user_loyalty_points';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find user loyalty by user and program
   */
  async findByUserAndProgram(userId: string, programId: string): Promise<UserLoyaltyPoints | null> {
    return await this.findOneBy({ userId, programId });
  }

  /**
   * Get user loyalty with details
   */
  async getUserLoyaltyWithDetails(userId: string, programId: string): Promise<UserLoyaltyWithDetails | null> {
    return await this.executeKyselyQuery(async (db) => {
      const userLoyalty = await db
        .selectFrom('user_loyalty_points')
        .leftJoin('loyalty_tiers', 'user_loyalty_points.tier_id', 'loyalty_tiers.id')
        .leftJoin('loyalty_programs', 'user_loyalty_points.program_id', 'loyalty_programs.id')
        .select([
          'user_loyalty_points.id',
          'user_loyalty_points.user_id as userId',
          'user_loyalty_points.program_id as programId',
          'user_loyalty_points.points',
          'user_loyalty_points.tier_id as tierId',
          'user_loyalty_points.lifetime_points as lifetimePoints',
          'user_loyalty_points.last_earned_at as lastEarnedAt',
          'user_loyalty_points.created_at as createdAt',
          'user_loyalty_points.updated_at as updatedAt',
          'loyalty_tiers.name as tierName',
          'loyalty_tiers.min_points as tierMinPoints',
          'loyalty_tiers.max_points as tierMaxPoints',
          'loyalty_tiers.benefits as tierBenefits',
          'loyalty_tiers.multiplier as tierMultiplier',
          'loyalty_tiers.color as tierColor',
          'loyalty_tiers.icon as tierIcon',
          'loyalty_programs.name as programName',
          'loyalty_programs.description as programDescription',
          'loyalty_programs.points_per_dollar as programPointsPerDollar',
        ])
        .where('user_loyalty_points.user_id', '=', userId)
        .where('user_loyalty_points.program_id', '=', programId)
        .executeTakeFirst();

      if (!userLoyalty) return null;

      // Get recent history
      const recentHistory = await db
        .selectFrom('loyalty_history')
        .selectAll()
        .where('user_id', '=', userId)
        .where('program_id', '=', programId)
        .orderBy('created_at', 'desc')
        .limit(10)
        .execute();

      return {
        id: userLoyalty.id,
        userId: userLoyalty.userId,
        programId: userLoyalty.programId,
        points: userLoyalty.points,
        tierId: userLoyalty.tierId,
        lifetimePoints: userLoyalty.lifetimePoints,
        lastEarnedAt: userLoyalty.lastEarnedAt,
        createdAt: userLoyalty.createdAt,
        updatedAt: userLoyalty.updatedAt,
        tier: userLoyalty.tierName ? {
          id: userLoyalty.tierId!,
          programId: userLoyalty.programId,
          name: userLoyalty.tierName,
          minPoints: userLoyalty.tierMinPoints,
          maxPoints: userLoyalty.tierMaxPoints,
          benefits: userLoyalty.tierBenefits,
          multiplier: userLoyalty.tierMultiplier,
          color: userLoyalty.tierColor,
          icon: userLoyalty.tierIcon,
          createdAt: userLoyalty.createdAt,
          updatedAt: userLoyalty.updatedAt,
        } : undefined,
        program: {
          id: userLoyalty.programId,
          name: userLoyalty.programName,
          description: userLoyalty.programDescription,
          pointsPerDollar: userLoyalty.programPointsPerDollar,
          isActive: true,
          startDate: null,
          endDate: null,
          termsAndConditions: null,
          createdAt: userLoyalty.createdAt,
          updatedAt: userLoyalty.updatedAt,
        },
        recentHistory: recentHistory.map(h => ({
          id: h.id,
          userId: h.user_id,
          programId: h.program_id,
          type: h.type,
          points: h.points,
          description: h.description,
          orderId: h.order_id,
          referenceId: h.reference_id,
          referenceType: h.reference_type,
          expiresAt: h.expires_at,
          createdAt: h.created_at,
        })),
      } as UserLoyaltyWithDetails;
    });
  }

  /**
   * Update user points
   */
  async updatePoints(userId: string, programId: string, pointsChange: number): Promise<UserLoyaltyPoints | null> {
    return await this.executeKyselyQuery(async (db) => {
      const updated = await db
        .updateTable('user_loyalty_points')
        .set({
          points: sql`points + ${pointsChange}`,
          lifetime_points: sql`lifetime_points + ${Math.max(0, pointsChange)}`,
          last_earned_at: pointsChange > 0 ? new Date() : undefined,
          updated_at: new Date(),
        })
        .where('user_id', '=', userId)
        .where('program_id', '=', programId)
        .returningAll()
        .executeTakeFirst();

      if (!updated) return null;

      return {
        id: updated.id,
        userId: updated.user_id,
        programId: updated.program_id,
        points: updated.points,
        tierId: updated.tier_id,
        lifetimePoints: updated.lifetime_points,
        lastEarnedAt: updated.last_earned_at,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      } as UserLoyaltyPoints;
    });
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(programId: string, limit: number = 10): Promise<Array<UserLoyaltyPoints & { rank: number }>> {
    return await this.executeKyselyQuery(async (db) => {
      const leaderboard = await db
        .selectFrom('user_loyalty_points')
        .select([
          'id',
          'user_id as userId',
          'program_id as programId',
          'points',
          'tier_id as tierId',
          'lifetime_points as lifetimePoints',
          'last_earned_at as lastEarnedAt',
          'created_at as createdAt',
          'updated_at as updatedAt',
          sql<number>`ROW_NUMBER() OVER (ORDER BY points DESC)`.as('rank'),
        ])
        .where('program_id', '=', programId)
        .orderBy('points', 'desc')
        .limit(limit)
        .execute();

      return leaderboard as Array<UserLoyaltyPoints & { rank: number }>;
    });
  }
}

/**
 * Repository for loyalty history
 */
export class LoyaltyHistoryRepository extends BaseRepository<
  typeof loyaltyHistory,
  LoyaltyHistory,
  NewLoyaltyHistory
> {
  protected table = loyaltyHistory;
  protected tableName = 'loyalty_history';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
      },
    });
  }

  /**
   * Find history by user and program
   */
  async findByUserAndProgram(
    userId: string,
    programId: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PagedResult<LoyaltyHistory>> {
    return await this.findAll(pagination, { userId, programId });
  }

  /**
   * Create history entry
   */
  async createHistoryEntry(data: {
    userId: string;
    programId: string;
    type: string;
    points: number;
    description: string;
    orderId?: string;
    referenceId?: string;
    referenceType?: string;
    expiresAt?: Date;
  }): Promise<LoyaltyHistory> {
    return await this.create(data as NewLoyaltyHistory);
  }

  /**
   * Get points summary for user
   */
  async getPointsSummary(userId: string, programId: string): Promise<{
    totalEarned: number;
    totalRedeemed: number;
    totalExpired: number;
    currentBalance: number;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const summary = await db
        .selectFrom('loyalty_history')
        .select([
          db.fn.sum(
            db.case()
              .when('points', '>', 0)
              .then('points')
              .else(0)
              .end()
          ).as('totalEarned'),
          db.fn.sum(
            db.case()
              .when('type', '=', LoyaltyHistoryType.REDEMPTION)
              .then(sql`ABS(points)`)
              .else(0)
              .end()
          ).as('totalRedeemed'),
          db.fn.sum(
            db.case()
              .when('type', '=', LoyaltyHistoryType.EXPIRE)
              .then(sql`ABS(points)`)
              .else(0)
              .end()
          ).as('totalExpired'),
          db.fn.sum('points').as('currentBalance'),
        ])
        .where('user_id', '=', userId)
        .where('program_id', '=', programId)
        .executeTakeFirst();

      return {
        totalEarned: Number(summary?.totalEarned) || 0,
        totalRedeemed: Number(summary?.totalRedeemed) || 0,
        totalExpired: Number(summary?.totalExpired) || 0,
        currentBalance: Number(summary?.currentBalance) || 0,
      };
    });
  }
}

/**
 * Repository for loyalty rewards
 */
export class LoyaltyRewardRepository extends BaseRepository<
  typeof loyaltyRewards,
  LoyaltyReward,
  NewLoyaltyReward
> {
  protected table = loyaltyRewards;
  protected tableName = 'loyalty_rewards';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find active rewards by program
   */
  async findActiveRewardsByProgram(programId: string): Promise<LoyaltyReward[]> {
    const now = new Date();
    return await this.executeKyselyQuery(async (db) => {
      const rewards = await db
        .selectFrom('loyalty_rewards')
        .selectAll()
        .where('program_id', '=', programId)
        .where('is_active', '=', true)
        .where((eb) => eb.or([
          eb('valid_from', 'is', null),
          eb('valid_from', '<=', now)
        ]))
        .where((eb) => eb.or([
          eb('valid_until', 'is', null),
          eb('valid_until', '>=', now)
        ]))
        .where((eb) => eb.or([
          eb('max_redemptions', 'is', null),
          eb('current_redemptions', '<', eb.ref('max_redemptions'))
        ]))
        .orderBy('points_cost', 'asc')
        .execute();

      return rewards.map(reward => ({
        id: reward.id,
        programId: reward.program_id,
        name: reward.name,
        description: reward.description,
        type: reward.type,
        pointsCost: reward.points_cost,
        value: reward.value,
        maxRedemptions: reward.max_redemptions,
        currentRedemptions: reward.current_redemptions,
        isActive: reward.is_active,
        validFrom: reward.valid_from,
        validUntil: reward.valid_until,
        termsAndConditions: reward.terms_and_conditions,
        imageUrl: reward.image_url,
        createdAt: reward.created_at,
        updatedAt: reward.updated_at,
      })) as LoyaltyReward[];
    });
  }

  /**
   * Check if reward is available for redemption
   */
  async isRewardAvailable(rewardId: string): Promise<boolean> {
    const reward = await this.findById(rewardId);
    if (!reward || !reward.isActive) return false;

    const now = new Date();
    
    // Check date validity
    if (reward.validFrom && reward.validFrom > now) return false;
    if (reward.validUntil && reward.validUntil < now) return false;
    
    // Check redemption limits
    if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
      return false;
    }

    return true;
  }

  /**
   * Increment redemption count
   */
  async incrementRedemptionCount(rewardId: string): Promise<boolean> {
    return await this.executeKyselyQuery(async (db) => {
      const result = await db
        .updateTable('loyalty_rewards')
        .set({
          current_redemptions: sql`current_redemptions + 1`,
          updated_at: new Date(),
        })
        .where('id', '=', rewardId)
        .where((eb) => eb.or([
          eb('max_redemptions', 'is', null),
          eb('current_redemptions', '<', eb.ref('max_redemptions'))
        ]))
        .executeTakeFirst();

      return result.numUpdatedRows > 0;
    });
  }
}

/**
 * Repository for loyalty redemptions
 */
export class LoyaltyRedemptionRepository extends BaseRepository<
  typeof loyaltyRedemptions,
  LoyaltyRedemption,
  NewLoyaltyRedemption
> {
  protected table = loyaltyRedemptions;
  protected tableName = 'loyalty_redemptions';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find redemption by code
   */
  async findByCode(code: string): Promise<LoyaltyRedemption | null> {
    return await this.findOneBy({ code });
  }

  /**
   * Find user redemptions
   */
  async findUserRedemptions(
    userId: string,
    programId?: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PagedResult<LoyaltyRedemption>> {
    const filters: RedemptionFilters = { userId };
    if (programId) filters.programId = programId;
    
    return await this.findAll(pagination, filters);
  }

  /**
   * Generate unique redemption code
   */
  async generateUniqueCode(): Promise<string> {
    let code: string;
    let exists: boolean;
    
    do {
      code = Math.random().toString(36).substring(2, 12).toUpperCase();
      exists = await this.exists({ code });
    } while (exists);
    
    return code;
  }

  /**
   * Update redemption status
   */
  async updateStatus(id: string, status: string, notes?: string): Promise<LoyaltyRedemption | null> {
    const updateData: any = { status, updatedAt: new Date() };
    if (notes) updateData.notes = notes;
    if (status === RedemptionStatus.USED) updateData.usedAt = new Date();
    
    return await this.update(id, updateData);
  }

  /**
   * Get redemption statistics
   */
  async getRedemptionStats(programId: string): Promise<{
    totalRedemptions: number;
    totalPointsRedeemed: number;
    pendingRedemptions: number;
    approvedRedemptions: number;
    usedRedemptions: number;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const stats = await db
        .selectFrom('loyalty_redemptions')
        .select([
          db.fn.count('id').as('totalRedemptions'),
          db.fn.sum('points_used').as('totalPointsRedeemed'),
          db.fn.count('id').filterWhere('status', '=', RedemptionStatus.PENDING).as('pendingRedemptions'),
          db.fn.count('id').filterWhere('status', '=', RedemptionStatus.APPROVED).as('approvedRedemptions'),
          db.fn.count('id').filterWhere('status', '=', RedemptionStatus.USED).as('usedRedemptions'),
        ])
        .where('program_id', '=', programId)
        .executeTakeFirst();

      return {
        totalRedemptions: Number(stats?.totalRedemptions) || 0,
        totalPointsRedeemed: Number(stats?.totalPointsRedeemed) || 0,
        pendingRedemptions: Number(stats?.pendingRedemptions) || 0,
        approvedRedemptions: Number(stats?.approvedRedemptions) || 0,
        usedRedemptions: Number(stats?.usedRedemptions) || 0,
      };
    });
  }
}

/**
 * Repository for loyalty referrals
 */
export class LoyaltyReferralRepository extends BaseRepository<
  typeof loyaltyReferrals,
  LoyaltyReferral,
  NewLoyaltyReferral
> {
  protected table = loyaltyReferrals;
  protected tableName = 'loyalty_referrals';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
      },
    });
  }

  /**
   * Find referral by code
   */
  async findByCode(code: string): Promise<LoyaltyReferral | null> {
    return await this.findOneBy({ code });
  }

  /**
   * Find referrals by referrer
   */
  async findByReferrer(referrerId: string): Promise<LoyaltyReferral[]> {
    return await this.findBy({ referrerId });
  }

  /**
   * Generate unique referral code
   */
  async generateUniqueCode(): Promise<string> {
    let code: string;
    let exists: boolean;
    
    do {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      exists = await this.exists({ code });
    } while (exists);
    
    return code;
  }

  /**
   * Use referral code
   */
  async useReferralCode(code: string, referredUserId: string): Promise<LoyaltyReferral | null> {
    return await this.executeKyselyQuery(async (db) => {
      const updated = await db
        .updateTable('loyalty_referrals')
        .set({
          referred_user_id: referredUserId,
          is_used: true,
          used_at: new Date(),
        })
        .where('code', '=', code)
        .where('is_used', '=', false)
        .returningAll()
        .executeTakeFirst();

      if (!updated) return null;

      return {
        id: updated.id,
        referrerId: updated.referrer_id,
        referredUserId: updated.referred_user_id,
        code: updated.code,
        isUsed: updated.is_used,
        usedAt: updated.used_at,
        referrerPoints: updated.referrer_points,
        referredPoints: updated.referred_points,
        createdAt: updated.created_at,
      } as LoyaltyReferral;
    });
  }

  /**
   * Get referral statistics
   */
  async getReferralStats(referrerId: string): Promise<{
    totalReferrals: number;
    usedReferrals: number;
    totalPointsEarned: number;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const stats = await db
        .selectFrom('loyalty_referrals')
        .select([
          db.fn.count('id').as('totalReferrals'),
          db.fn.count('id').filterWhere('is_used', '=', true).as('usedReferrals'),
          db.fn.sum('referrer_points').as('totalPointsEarned'),
        ])
        .where('referrer_id', '=', referrerId)
        .executeTakeFirst();

      return {
        totalReferrals: Number(stats?.totalReferrals) || 0,
        usedReferrals: Number(stats?.usedReferrals) || 0,
        totalPointsEarned: Number(stats?.totalPointsEarned) || 0,
      };
    });
  }
}