import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { getCache, setCache } from '../config/redis'
import { ApiError } from '../utils/api-error'
import crypto from 'crypto'

// Cache TTL in seconds
const CACHE_TTL = {
  LOYALTY_PROGRAM: 3600, // 1 hour
  LOYALTY_TIERS: 86400, // 24 hours
  AVAILABLE_REWARDS: 1800, // 30 minutes
  REWARD_DETAILS: 3600, // 1 hour
  LOYALTY_STATISTICS: 1800, // 30 minutes
}

/**
 * Generate a unique referral code for a user
 * @param userId User ID
 * @returns Referral code
 */
const generateReferralCode = (userId: string): string => {
  const hash = crypto.createHash("sha256")
  hash.update(userId + Date.now().toString())
  return hash.digest("hex").substring(0, 8).toUpperCase()
}

/**
 * Generate a unique redemption code
 * @returns Redemption code
 */
const generateRedemptionCode = (): string => {
  const hash = crypto.createHash("sha256")
  hash.update(Date.now().toString() + Math.random().toString())
  return hash.digest("hex").substring(0, 12).toUpperCase()
}

/**
 * Get customer loyalty program
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns Customer loyalty program
 */
export const getCustomerLoyaltyProgram = async (userId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Getting loyalty program for user ID: ${userId}`)

  // Try to get from cache
  const cacheKey = `loyalty:program:${userId}`
  const cachedProgram = await getCache<any>(cacheKey)

  if (cachedProgram) {
    logger.info(`Retrieved loyalty program from cache for user ID: ${userId}`)
    return cachedProgram
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new ApiError("User not found", 404)
    }

    // Get loyalty history
    const loyaltyHistory = await prisma.loyaltyHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
          },
        },
      },
    })

    // Get total lifetime points
    const lifetimePoints = await prisma.loyaltyHistory.aggregate({
      where: {
        userId,
        type: { in: ['ORDER', 'REFERRAL', 'MANUAL', 'OTHER'] },
      },
      _sum: {
        points: true,
      },
    })

    // Calculate tier based on lifetime points
    const totalLifetimePoints = Number(lifetimePoints._sum.points) || 0
    let currentTier = 'Bronze'
    let nextTier: string | null = 'Silver'
    let pointsForNextTier = 1000

    if (totalLifetimePoints >= 10000) {
      currentTier = 'Platinum'
      nextTier = null
      pointsForNextTier = 0
    } else if (totalLifetimePoints >= 5000) {
      currentTier = 'Gold'
      nextTier = 'Platinum'
      pointsForNextTier = 10000 - totalLifetimePoints
    } else if (totalLifetimePoints >= 1000) {
      currentTier = 'Silver'
      nextTier = 'Gold'
      pointsForNextTier = 5000 - totalLifetimePoints
    }

    // Get referral code (generate if doesn't exist)
    let referralCode = await prisma.loyaltyReferral.findFirst({
      where: { referrerId: userId },
      select: { code: true },
    })

    if (!referralCode) {
      const newReferralCode = generateReferralCode(userId)
      await prisma.loyaltyReferral.create({
        data: {
          referrerId: userId,
          code: newReferralCode,
        },
      })
      referralCode = { code: newReferralCode }
    }

    // Get referral count
    const referralCount = await prisma.loyaltyReferral.count({
      where: { referrerId: userId, isUsed: true },
    })

    // Compile result
    const result = {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      points: {
        current: user.loyaltyPoints || 0,
        lifetime: totalLifetimePoints,
      },
      tier: {
        current: currentTier,
        next: nextTier as string | null,
        pointsForNext: pointsForNextTier,
      },
      referral: {
        code: referralCode.code,
        count: referralCount,
      },
      recentHistory: loyaltyHistory.map(history => ({
        id: history.id,
        type: history.type,
        points: history.points,
        description: history.description,
        createdAt: history.createdAt,
        order: history.order,
      })),
    }

    // Cache the result
    await setCache(cacheKey, result, CACHE_TTL.LOYALTY_PROGRAM)

    return result
  } catch (error: any) {
    logger.error(`Error getting loyalty program: ${error.message}`)
    throw error
  }
}

/**
 * Add loyalty points to a user
 * @param userId User ID
 * @param points Points to add
 * @param description Description of the points
 * @param referenceId Reference ID (order ID, etc.)
 * @param type Type of points
 * @param requestId Request ID for logging
 * @returns Updated user points
 */
export const addLoyaltyPoints = async (
  userId: string,
  points: number,
  description: string,
  referenceId?: string,
  type: 'ORDER' | 'REFERRAL' | 'MANUAL' | 'OTHER' = 'OTHER',
  requestId?: string,
): Promise<number> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Adding ${points} loyalty points to user ${userId}`)

  try {
    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update user's loyalty points
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: {
            increment: points,
          },
        },
        select: {
          loyaltyPoints: true,
        },
      })

      // Create loyalty history record
      await tx.loyaltyHistory.create({
        data: {
          userId,
          type,
          points,
          description,
          orderId: referenceId,
        },
      })

      return updatedUser.loyaltyPoints || 0
    })

    // Clear cache
    await setCache(`loyalty:program:${userId}`, null, 1)

    logger.info(`Successfully added ${points} points to user ${userId}. New balance: ${result}`)
    return result
  } catch (error: any) {
    logger.error(`Error adding loyalty points: ${error.message}`)
    throw error
  }
}

/**
 * Redeem loyalty points
 * @param userId User ID
 * @param points Points to redeem
 * @param description Description of the redemption
 * @param requestId Request ID for logging
 * @returns Updated user points
 */
export const redeemLoyaltyPoints = async (
  userId: string,
  points: number,
  description: string,
  requestId?: string,
): Promise<number> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Redeeming ${points} loyalty points for user ${userId}`)

  try {
    // Check if user has enough points
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    })

    if (!user) {
      throw new ApiError("User not found", 404)
    }

    const currentPoints = user.loyaltyPoints || 0
    if (currentPoints < points) {
      throw new ApiError(`Insufficient points. Current: ${currentPoints}, Required: ${points}`, 400)
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update user's loyalty points
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: {
            decrement: points,
          },
        },
        select: {
          loyaltyPoints: true,
        },
      })

      // Create loyalty history record
      await tx.loyaltyHistory.create({
        data: {
          userId,
          type: 'REDEMPTION',
          points: -points,
          description,
        },
      })

      return updatedUser.loyaltyPoints || 0
    })

    // Clear cache
    await setCache(`loyalty:program:${userId}`, null, 1)

    logger.info(`Successfully redeemed ${points} points for user ${userId}. New balance: ${result}`)
    return result
  } catch (error: any) {
    logger.error(`Error redeeming loyalty points: ${error.message}`)
    throw error
  }
}

/**
 * Process order points
 * @param orderId Order ID
 * @param requestId Request ID for logging
 * @returns Points awarded
 */
export const processOrderPoints = async (orderId: string, requestId?: string): Promise<number> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Processing loyalty points for order ${orderId}`)

  try {
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        total: true,
        status: true,
        orderNumber: true,
      },
    })

    if (!order) {
      throw new ApiError("Order not found", 404)
    }

    if (!order.userId) {
      logger.info(`Order ${orderId} has no user, skipping loyalty points`)
      return 0
    }

    // Check if points already awarded
    const existingHistory = await prisma.loyaltyHistory.findFirst({
      where: {
        orderId: orderId,
        type: 'ORDER',
      },
    })

    if (existingHistory) {
      logger.info(`Points already awarded for order ${orderId}`)
      return existingHistory.points
    }

    // Calculate points (1 point per $1 spent, minimum 1 point)
    const points = Math.max(1, Math.floor(Number(order.total)))

    // Award points
    await addLoyaltyPoints(
      order.userId,
      points,
      `Points earned from order ${order.orderNumber || orderId}`,
      orderId,
      'ORDER',
      requestId
    )

    return points
  } catch (error: any) {
    logger.error(`Error processing order points: ${error.message}`)
    throw error
  }
}

/**
 * Process referral points
 * @param referralCode Referral code
 * @param newUserId New user ID
 * @param requestId Request ID for logging
 * @returns Points awarded to referrer
 */
export const processReferralPoints = async (
  referralCode: string,
  newUserId: string,
  requestId?: string,
): Promise<number> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Processing referral points for code ${referralCode}`)

  try {
    // Find referral
    const referral = await prisma.loyaltyReferral.findFirst({
      where: {
        code: referralCode,
        isUsed: false,
      },
      include: {
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!referral) {
      throw new ApiError("Invalid or already used referral code", 400)
    }

    // Check if new user is different from referrer
    if (referral.referrerId === newUserId) {
      throw new ApiError("Cannot refer yourself", 400)
    }

    // Use transaction to process referral
    const result = await prisma.$transaction(async (tx) => {
      // Mark referral as used
      await tx.loyaltyReferral.update({
        where: { id: referral.id },
        data: {
          isUsed: true,
          referredUserId: newUserId,
          usedAt: new Date(),
        },
      })

      // Award points to referrer (500 points)
      const referrerPoints = 500
      await tx.user.update({
        where: { id: referral.referrerId },
        data: {
          loyaltyPoints: {
            increment: referrerPoints,
          },
        },
      })

      // Create history for referrer
      await tx.loyaltyHistory.create({
        data: {
          userId: referral.referrerId,
          type: 'REFERRAL',
          points: referrerPoints,
          description: `Referral bonus for referring user ${newUserId}`,
        },
      })

      // Award welcome points to new user (100 points)
      const newUserPoints = 100
      await tx.user.update({
        where: { id: newUserId },
        data: {
          loyaltyPoints: {
            increment: newUserPoints,
          },
        },
      })

      // Create history for new user
      await tx.loyaltyHistory.create({
        data: {
          userId: newUserId,
          type: 'REFERRAL',
          points: newUserPoints,
          description: `Welcome bonus for using referral code ${referralCode}`,
        },
      })

      return referrerPoints
    })

    // Clear cache for both users
    await Promise.all([
      setCache(`loyalty:program:${referral.referrerId}`, null, 1),
      setCache(`loyalty:program:${newUserId}`, null, 1),
    ])

    logger.info(`Successfully processed referral. Referrer got ${result} points, new user got 100 points`)
    return result
  } catch (error: any) {
    logger.error(`Error processing referral points: ${error.message}`)
    throw error
  }
}

/**
 * Get loyalty statistics
 * @param userId User ID
 * @param period Period for statistics
 * @param requestId Request ID for logging
 * @returns Loyalty statistics
 */
export const getLoyaltyStatistics = async (
  userId: string,
  period: 'week' | 'month' | 'year' | 'all' = 'all',
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Getting loyalty statistics for user ${userId} and period ${period}`)

  // Try to get from cache
  const cacheKey = `loyalty:stats:${userId}:${period}`
  const cachedStats = await getCache<any>(cacheKey)

  if (cachedStats) {
    logger.info('Retrieved loyalty statistics from cache')
    return cachedStats
  }

  try {
    // Calculate date range
    let startDate: Date | undefined
    const now = new Date()

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (period === 'year') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }

    // Build where clause
    const where: Prisma.LoyaltyHistoryWhereInput = { userId }
    if (startDate) {
      where.createdAt = { gte: startDate }
    }

    // Get points by type
    const pointsByType = await prisma.loyaltyHistory.groupBy({
      by: ['type'],
      where,
      _sum: {
        points: true,
      },
      _count: {
        id: true,
      },
    })

    // Get points by day for chart
    const pointsByDay = await prisma.loyaltyHistory.groupBy({
      by: ['createdAt'],
      where,
      _sum: {
        points: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Format points by day for chart
    const chartData = pointsByDay.map(item => ({
      date: item.createdAt.toISOString().split('T')[0],
      points: Number(item._sum.points) || 0,
    }))

    // Calculate totals
    const totalEarned = pointsByType
      .filter(item => item.type !== 'REDEMPTION')
      .reduce((sum, item) => sum + (Number(item._sum.points) || 0), 0)

    const totalRedeemed = Math.abs(
      pointsByType
        .filter(item => item.type === 'REDEMPTION')
        .reduce((sum, item) => sum + (Number(item._sum.points) || 0), 0)
    )

    const result = {
      period,
      totalEarned,
      totalRedeemed,
      netPoints: totalEarned - totalRedeemed,
      pointsByType: pointsByType.map(item => ({
        type: item.type,
        points: Number(item._sum.points) || 0,
        count: item._count.id,
      })),
      chartData,
    }

    // Cache the result
    await setCache(cacheKey, result, CACHE_TTL.LOYALTY_STATISTICS)

    return result
  } catch (error: any) {
    logger.error(`Error getting loyalty statistics: ${error.message}`)
    throw error
  }
}

/**
 * Get available rewards
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns Available rewards
 */
export const getAvailableRewards = async (userId: string, requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Getting available rewards for user ${userId}`)

  // Try to get from cache
  const cacheKey = `loyalty:rewards:${userId}`
  const cachedRewards = await getCache<any[]>(cacheKey)

  if (cachedRewards) {
    logger.info('Retrieved available rewards from cache')
    return cachedRewards
  }

  try {
    // Get user's current points
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    })

    if (!user) {
      throw new ApiError("User not found", 404)
    }

    const currentPoints = user.loyaltyPoints || 0

    // Define available rewards (in a real app, this would come from a database)
    const rewards = [
      {
        id: 'discount-5',
        name: '5% Discount',
        description: 'Get 5% off your next order',
        pointsCost: 100,
        type: 'discount',
        value: 5,
        available: currentPoints >= 100,
      },
      {
        id: 'discount-10',
        name: '10% Discount',
        description: 'Get 10% off your next order',
        pointsCost: 200,
        type: 'discount',
        value: 10,
        available: currentPoints >= 200,
      },
      {
        id: 'free-shipping',
        name: 'Free Shipping',
        description: 'Free shipping on your next order',
        pointsCost: 150,
        type: 'shipping',
        value: 0,
        available: currentPoints >= 150,
      },
      {
        id: 'discount-20',
        name: '20% Discount',
        description: 'Get 20% off your next order',
        pointsCost: 500,
        type: 'discount',
        value: 20,
        available: currentPoints >= 500,
      },
      {
        id: 'gift-card-10',
        name: '$10 Gift Card',
        description: '$10 gift card for future purchases',
        pointsCost: 1000,
        type: 'gift_card',
        value: 10,
        available: currentPoints >= 1000,
      },
      {
        id: 'gift-card-25',
        name: '$25 Gift Card',
        description: '$25 gift card for future purchases',
        pointsCost: 2500,
        type: 'gift_card',
        value: 25,
        available: currentPoints >= 2500,
      },
    ]

    // Cache the result
    await setCache(cacheKey, rewards, CACHE_TTL.AVAILABLE_REWARDS)

    return rewards
  } catch (error: any) {
    logger.error(`Error getting available rewards: ${error.message}`)
    throw error
  }
}

/**
 * Redeem a reward
 * @param userId User ID
 * @param rewardId Reward ID
 * @param requestId Request ID for logging
 * @returns Redemption details
 */
export const redeemReward = async (userId: string, rewardId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Redeeming reward ${rewardId} for user ${userId}`)

  try {
    // Get available rewards
    const rewards = await getAvailableRewards(userId, requestId)
    const reward = rewards.find(r => r.id === rewardId)

    if (!reward) {
      throw new ApiError("Reward not found", 404)
    }

    if (!reward.available) {
      throw new ApiError("Insufficient points for this reward", 400)
    }

    // Redeem points
    const newBalance = await redeemLoyaltyPoints(
      userId,
      reward.pointsCost,
      `Redeemed reward: ${reward.name}`,
      requestId
    )

    // Generate redemption code
    const redemptionCode = generateRedemptionCode()

    // Create redemption record
    const redemption = await prisma.loyaltyRedemption.create({
      data: {
        userId,
        rewardId,
        rewardName: reward.name,
        pointsUsed: reward.pointsCost,
        code: redemptionCode,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    })

    // Clear cache
    await Promise.all([
      setCache(`loyalty:program:${userId}`, null, 1),
      setCache(`loyalty:rewards:${userId}`, null, 1),
    ])

    return {
      redemption: {
        id: redemption.id,
        code: redemption.code,
        reward: reward,
        expiresAt: redemption.expiresAt,
        status: redemption.status,
      },
      newBalance,
    }
  } catch (error: any) {
    logger.error(`Error redeeming reward: ${error.message}`)
    throw error
  }
}

/**
 * Get user's redemptions
 * @param userId User ID
 * @param status Filter by status
 * @param requestId Request ID for logging
 * @returns User's redemptions
 */
export const getUserRedemptions = async (
  userId: string,
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED' | 'EXPIRED',
  requestId?: string,
): Promise<any[]> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Getting redemptions for user ${userId}`)

  try {
    const where: Prisma.LoyaltyRedemptionWhereInput = { userId }
    if (status) {
      where.status = status
    }

    const redemptions = await prisma.loyaltyRedemption.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return redemptions
  } catch (error: any) {
    logger.error(`Error getting user redemptions: ${error.message}`)
    throw error
  }
}

/**
 * Use a redemption code
 * @param code Redemption code
 * @param requestId Request ID for logging
 * @returns Redemption details
 */
export const useRedemptionCode = async (code: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Using redemption code ${code}`)

  try {
    // Find redemption
    const redemption = await prisma.loyaltyRedemption.findFirst({
      where: {
        code,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    })

    if (!redemption) {
      throw new ApiError("Invalid or expired redemption code", 400)
    }

    // Mark as used
    const updatedRedemption = await prisma.loyaltyRedemption.update({
      where: { id: redemption.id },
      data: {
        status: 'USED',
        usedAt: new Date(),
      },
    })

    return updatedRedemption
  } catch (error: any) {
    logger.error(`Error using redemption code: ${error.message}`)
    throw error
  }
}

/**
 * Adjust customer loyalty points (can be positive or negative)
 * @param userId User ID
 * @param pointsAdjustment Points adjustment (positive to add, negative to subtract)
 * @param description Description of the adjustment
 * @param requestId Request ID for logging
 * @returns Updated user points
 */
export const adjustCustomerPoints = async (
  userId: string,
  pointsAdjustment: number,
  description: string,
  requestId?: string
): Promise<number> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Adjusting ${pointsAdjustment} loyalty points for user ${userId}`)

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Update user's loyalty points
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: {
            increment: pointsAdjustment,
          },
        },
        select: {
          loyaltyPoints: true,
        },
      })

      // Create loyalty history record
      await tx.loyaltyHistory.create({
        data: {
          userId,
          type: pointsAdjustment > 0 ? 'OTHER' : 'EXPIRE',
          points: pointsAdjustment,
          description,
        },
      })

      return updatedUser.loyaltyPoints || 0
    })

    // Clear cache
    await setCache(`loyalty:program:${userId}`, null, 1)

    logger.info(`Successfully adjusted ${pointsAdjustment} points for user ${userId}. New balance: ${result}`)
    return result
  } catch (error: any) {
    logger.error(`Error adjusting loyalty points: ${error.message}`)
    throw error
  }
}

/**
 * Expire old redemptions
 * @param requestId Request ID for logging
 * @returns Number of expired redemptions
 */
export const expireOldRedemptions = async (requestId?: string): Promise<number> => {
  const logger = createRequestLogger(requestId)
  logger.info('Expiring old redemptions')

  try {
    const result = await prisma.loyaltyRedemption.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    })

    logger.info(`Expired ${result.count} redemptions`)
    return result.count
  } catch (error: any) {
    logger.error(`Error expiring old redemptions: ${error.message}`)
    throw error
  }
}
