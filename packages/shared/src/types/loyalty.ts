// Loyalty program types for tRPC compatibility

export interface LoyaltyProgram {
  id: string;
  name: string;
  description: string | null;
  pointsPerDollar: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTier {
  id: string;
  programId: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  benefits: any; // JSON object for tRPC compatibility
  multiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLoyaltyPoints {
  id: string;
  userId: string;
  programId: string;
  points: number;
  tierId: string | null;
  lifetimePoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  programId: string;
  points: number;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  reason: string;
  orderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyReward {
  id: string;
  programId: string;
  name: string;
  description: string | null;
  pointsCost: number;
  rewardType: 'discount' | 'product' | 'shipping' | 'custom';
  rewardValue: number | null;
  isActive: boolean;
  maxRedemptions: number | null;
  currentRedemptions: number;
  validFrom: Date | null;
  validTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PointsRedemption {
  id: string;
  userId: string;
  programId: string;
  rewardId: string;
  pointsUsed: number;
  status: 'pending' | 'approved' | 'fulfilled' | 'cancelled';
  orderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Input types
export interface CreateLoyaltyProgramInput {
  name: string;
  description?: string;
  pointsPerDollar: number;
  isActive?: boolean;
}

export interface UpdateLoyaltyProgramInput {
  name?: string;
  description?: string;
  pointsPerDollar?: number;
  isActive?: boolean;
}

export interface CreateLoyaltyTierInput {
  programId: string;
  name: string;
  minPoints: number;
  maxPoints?: number;
  benefits?: any;
  multiplier?: number;
}

export interface UpdateLoyaltyTierInput {
  name?: string;
  minPoints?: number;
  maxPoints?: number;
  benefits?: any;
  multiplier?: number;
}

export interface CreateLoyaltyRewardInput {
  programId: string;
  name: string;
  description?: string;
  pointsCost: number;
  rewardType: 'discount' | 'product' | 'shipping' | 'custom';
  rewardValue?: number;
  isActive?: boolean;
  maxRedemptions?: number;
  validFrom?: Date;
  validTo?: Date;
}

export interface UpdateLoyaltyRewardInput {
  name?: string;
  description?: string;
  pointsCost?: number;
  rewardType?: 'discount' | 'product' | 'shipping' | 'custom';
  rewardValue?: number;
  isActive?: boolean;
  maxRedemptions?: number;
  validFrom?: Date;
  validTo?: Date;
}

// Response types
export interface LeaderboardEntry {
  userId: string;
  points: number;
  lifetimePoints: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface RedemptionResult {
  redemption: PointsRedemption;
  remainingPoints: number;
}

export interface LoyaltyDashboard {
  program: LoyaltyProgram;
  userPoints: UserLoyaltyPoints | null;
  currentTier: LoyaltyTier | null;
  nextTier: LoyaltyTier | null;
  pointsToNextTier: number;
  availableRewards: LoyaltyReward[];
  recentTransactions: PointsTransaction[];
  leaderboard: LeaderboardEntry[];
}

export interface LoyaltyAnalytics {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  averagePointsPerMember: number;
  redemptionRate: number;
  tierDistribution: Array<{
    tierId: string;
    tierName: string;
    memberCount: number;
    percentage: number;
  }>;
  topRewards: Array<{
    rewardId: string;
    rewardName: string;
    redemptionCount: number;
    pointsUsed: number;
  }>;
  pointsIssuedTrend: Array<{
    date: Date;
    pointsIssued: number;
    pointsRedeemed: number;
  }>;
}