import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import * as loyaltyService from "../services/loyalty.service"
import { translateError } from "../utils/translate"
import prisma from "../database/client"

/**
 * Get customer loyalty program
 * @route GET /api/v1/loyalty
 * @access Protected
 */
export const getCustomerLoyaltyProgram = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)

  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  const userId = req.user._id.toString()
  requestLogger.info(`Getting loyalty program for user ID: ${userId}`)

  const loyaltyProgram = await loyaltyService.getCustomerLoyaltyProgram(userId, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      loyaltyProgram,
    },
  })
})

/**
 * Get loyalty program tiers
 * @route GET /api/v1/loyalty/tiers
 * @access Public
 */
export const getLoyaltyTiers = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting loyalty program tiers")

  // Mock tier data since we don't have a tiers table
  const tiers = [
    {
      id: "bronze",
      name: "Bronze",
      level: 1,
      pointsThreshold: 0,
      benefits: ["1 point per $1 spent", "Birthday discount"],
      color: "#CD7F32"
    },
    {
      id: "silver",
      name: "Silver", 
      level: 2,
      pointsThreshold: 1000,
      benefits: ["1.2 points per $1 spent", "Free shipping", "Birthday discount"],
      color: "#C0C0C0"
    },
    {
      id: "gold",
      name: "Gold",
      level: 3, 
      pointsThreshold: 5000,
      benefits: ["1.5 points per $1 spent", "Free shipping", "Priority support", "Birthday discount"],
      color: "#FFD700"
    },
    {
      id: "platinum",
      name: "Platinum",
      level: 4,
      pointsThreshold: 10000,
      benefits: ["2 points per $1 spent", "Free shipping", "Priority support", "Exclusive access", "Birthday discount"],
      color: "#E5E4E2"
    }
  ]

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: tiers.length,
    data: {
      tiers,
    },
  })
})

/**
 * Get available rewards
 * @route GET /api/v1/loyalty/rewards
 * @access Protected
 */
export const getAvailableRewards = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)

  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  const userId = req.user._id.toString()
  requestLogger.info(`Getting available rewards for user ID: ${userId}`)

  const rewards = await loyaltyService.getAvailableRewards(userId, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: rewards.length,
    data: {
      rewards,
    },
  })
})

/**
 * Get customer loyalty history
 * @route GET /api/v1/loyalty/history
 * @access Protected
 */
export const getLoyaltyHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)

  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  const userId = req.user._id.toString()

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10
  const sort = (req.query.sort as string) || "-createdAt"

  requestLogger.info(`Getting loyalty history for user ID: ${userId}`)

  // Get loyalty history from database
  const history = await prisma.loyaltyHistory.findMany({
    where: { userId },
    orderBy: { createdAt: sort.startsWith('-') ? 'desc' : 'asc' },
    skip: (page - 1) * limit,
    take: limit,
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

  const count = await prisma.loyaltyHistory.count({
    where: { userId },
  })

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: history.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalResults: count,
    },
    data: {
      history,
    },
  })
})

/**
 * Redeem reward
 * @route POST /api/v1/loyalty/redeem
 * @access Protected
 */
export const redeemReward = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)

  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  const userId = req.user._id.toString()
  const { rewardId } = req.body

  if (!rewardId) {
    return next(new ApiError(translateError("rewardIdRequired", {}, req.language), 400))
  }

  requestLogger.info(`Redeeming reward ID: ${rewardId} for user ID: ${userId}`)

  const redemption = await loyaltyService.redeemReward(userId, rewardId, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      redemption,
    },
  })
})

/**
 * Get reward by ID
 * @route GET /api/v1/loyalty/rewards/:id
 * @access Protected
 */
export const getRewardById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  if (!id) {
    return next(new ApiError(translateError("rewardIdRequired", {}, req.language), 400))
  }

  requestLogger.info(`Getting reward with ID: ${id}`)

  // Get available rewards and find the specific one
  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  const rewards = await loyaltyService.getAvailableRewards(req.user._id.toString(), req.id)
  const reward = rewards.find(r => r.id === id)

  if (!reward) {
    return next(new ApiError("Reward not found", 404))
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      reward,
    },
  })
})

/**
 * Get redemption by ID
 * @route GET /api/v1/loyalty/redemptions/:id
 * @access Protected
 */
export const getRedemptionById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)

  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  const userId = req.user._id.toString()
  const { id } = req.params

  if (!id) {
    return next(new ApiError(translateError("redemptionIdRequired", {}, req.language), 400))
  }

  requestLogger.info(`Getting redemption with ID: ${id} for user ID: ${userId}`)

  const redemption = await prisma.loyaltyRedemption.findFirst({
    where: {
      id,
      userId,
    },
  })

  if (!redemption) {
    return next(new ApiError("Redemption not found", 404))
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      redemption,
    },
  })
})

/**
 * Get customer redemptions
 * @route GET /api/v1/loyalty/redemptions
 * @access Protected
 */
export const getCustomerRedemptions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)

  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  const userId = req.user._id.toString()

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10
  const sort = (req.query.sort as string) || "-createdAt"

  requestLogger.info(`Getting redemptions for user ID: ${userId}`)

  const redemptions = await prisma.loyaltyRedemption.findMany({
    where: { userId },
    orderBy: { createdAt: sort.startsWith('-') ? 'desc' : 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  const count = await prisma.loyaltyRedemption.count({
    where: { userId },
  })

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: redemptions.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalResults: count,
    },
    data: {
      redemptions,
    },
  })
})

/**
 * Get referral code
 * @route GET /api/v1/loyalty/referral
 * @access Protected
 */
export const getReferralCode = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)

  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  const userId = req.user._id.toString()
  requestLogger.info(`Getting referral code for user ID: ${userId}`)

  // Get or create referral code
  let referral = await prisma.loyaltyReferral.findFirst({
    where: { referrerId: userId },
  })

  if (!referral) {
    // Generate new referral code
    const code = `REF${userId.slice(-6).toUpperCase()}${Date.now().toString().slice(-4)}`
    referral = await prisma.loyaltyReferral.create({
      data: {
        referrerId: userId,
        code,
      },
    })
  }

  // Get referral statistics
  const totalReferrals = await prisma.loyaltyReferral.count({
    where: {
      referrerId: userId,
      isUsed: true,
    },
  })

  const result = {
    code: referral.code,
    totalReferrals,
    pointsEarned: totalReferrals * 500, // 500 points per referral
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      referral: result,
    },
  })
})

/**
 * Apply referral code
 * @route POST /api/v1/loyalty/referral/apply
 * @access Protected
 */
export const applyReferralCode = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)

  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  const userId = req.user._id.toString()
  const { referralCode } = req.body

  if (!referralCode) {
    return next(new ApiError(translateError("referralCodeRequired", {}, req.language), 400))
  }

  requestLogger.info(`Applying referral code: ${referralCode} for user ID: ${userId}`)

  const result = await loyaltyService.processReferralPoints(referralCode, userId, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      result,
    },
  })
})

// Admin controllers

/**
 * Manually adjust customer points
 * @route POST /api/v1/admin/loyalty/adjust-points
 * @access Protected (Admin)
 */
export const adjustCustomerPoints = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { userId, points, reason } = req.body

  if (!userId) {
    return next(new ApiError(translateError("userIdRequired", {}, req.language), 400))
  }

  if (points === undefined) {
    return next(new ApiError(translateError("pointsRequired", {}, req.language), 400))
  }

  requestLogger.info(`Adjusting points for user ID: ${userId} by ${points}`)

  const result = await loyaltyService.adjustCustomerPoints(userId, points, reason || "Manual adjustment", req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      result,
    },
  })
})

/**
 * Get all loyalty programs
 * @route GET /api/v1/admin/loyalty/programs
 * @access Protected (Admin)
 */
export const getAllLoyaltyPrograms = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting all loyalty programs")

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10
  const sort = (req.query.sort as string) || "-loyaltyPoints"

  // Build filter
  const where: any = {
    role: "CUSTOMER",
  }

  if (req.query.minPoints) {
    where.loyaltyPoints = { gte: Number.parseInt(req.query.minPoints as string, 10) }
  }

  if (req.query.maxPoints) {
    where.loyaltyPoints = { ...where.loyaltyPoints, lte: Number.parseInt(req.query.maxPoints as string, 10) }
  }

  if (req.query.search) {
    where.OR = [
      { firstName: { contains: req.query.search as string, mode: 'insensitive' } },
      { lastName: { contains: req.query.search as string, mode: 'insensitive' } },
      { email: { contains: req.query.search as string, mode: 'insensitive' } },
    ]
  }

  const programs = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      loyaltyPoints: true,
      createdAt: true,
    },
    orderBy: { loyaltyPoints: sort.startsWith('-') ? 'desc' : 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  const count = await prisma.user.count({ where })

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: programs.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalResults: count,
    },
    data: {
      programs,
    },
  })
})

/**
 * Get all redemptions
 * @route GET /api/v1/admin/loyalty/redemptions
 * @access Protected (Admin)
 */
export const getAllRedemptions = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting all redemptions")

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10
  const sort = (req.query.sort as string) || "-createdAt"

  // Build filter
  const where: any = {}

  if (req.query.status) {
    where.status = req.query.status
  }

  if (req.query.startDate && req.query.endDate) {
    where.createdAt = {
      gte: new Date(req.query.startDate as string),
      lte: new Date(req.query.endDate as string),
    }
  }

  const redemptions = await prisma.loyaltyRedemption.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: sort.startsWith('-') ? 'desc' : 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  const count = await prisma.loyaltyRedemption.count({ where })

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: redemptions.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalResults: count,
    },
    data: {
      redemptions,
    },
  })
})

/**
 * Update redemption status
 * @route PATCH /api/v1/admin/loyalty/redemptions/:id/status
 * @access Protected (Admin)
 */
export const updateRedemptionStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params
  const { status, notes } = req.body

  if (!id) {
    return next(new ApiError(translateError("redemptionIdRequired", {}, req.language), 400))
  }

  if (!status) {
    return next(new ApiError(translateError("statusRequired", {}, req.language), 400))
  }

  requestLogger.info(`Updating redemption status for ID: ${id} to ${status}`)

  const redemption = await prisma.loyaltyRedemption.update({
    where: { id },
    data: {
      status,
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      redemption,
    },
  })
})
