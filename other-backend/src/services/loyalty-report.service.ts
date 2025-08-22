import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import * as exportService from './export.service'
import { getCache, setCache } from '../config/redis'

// Cache TTL in seconds
const CACHE_TTL = {
  REPORT_DATA: 1800, // 30 minutes
  AGGREGATED_DATA: 3600, // 1 hour
}

/**
 * Generate loyalty program report
 * @param options Report options
 * @param requestId Request ID for logging
 * @returns Report file path
 */
export const generateLoyaltyReport = async (
  options: {
    format: "csv" | "excel" | "pdf" | "json"
    type: "points" | "redemptions" | "tiers" | "referrals"
    startDate?: Date
    endDate?: Date
    filter?: Record<string, any>
  },
  requestId?: string,
): Promise<string> => {
  const logger = createRequestLogger(requestId || 'loyalty-report-generate')
  logger.info(`Generating loyalty report of type: ${options.type} in format: ${options.format}`)

  try {
    // Set default dates if not provided
    const endDate = options.endDate || new Date()
    const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

    // Generate report based on type
    switch (options.type) {
      case "points":
        return generatePointsReport(options.format, startDate, endDate, options.filter, requestId)
      case "redemptions":
        return generateRedemptionsReport(options.format, startDate, endDate, options.filter, requestId)
      case "tiers":
        return generateTiersReport(options.format, options.filter, requestId)
      case "referrals":
        return generateReferralsReport(options.format, startDate, endDate, options.filter, requestId)
      default:
        throw new ApiError(`Invalid report type: ${options.type}`, 400)
    }
  } catch (error: any) {
    logger.error(`Error generating loyalty report: ${error.message}`)
    throw error
  }
}

/**
 * Generate points report
 * @param format Export format
 * @param startDate Start date
 * @param endDate End date
 * @param filter Additional filters
 * @param requestId Request ID for logging
 * @returns Report file path
 */
async function generatePointsReport(
  format: "csv" | "excel" | "pdf" | "json",
  startDate: Date,
  endDate: Date,
  filter?: Record<string, any>,
  requestId?: string,
): Promise<string> {
  const logger = createRequestLogger(requestId || 'loyalty-points-report')
  logger.info("Generating points report")

  try {
    // Build query filters
    const where: Prisma.LoyaltyHistoryWhereInput = {
      createdAt: { gte: startDate, lte: endDate },
      ...filter,
    }

    // Get points history with user details
    const pointsHistory = await prisma.loyaltyHistory.findMany({
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
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
          },
        },
        redemption: {
          select: {
            id: true,
            code: true,
            reward: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format data for export
    const formattedData = pointsHistory.map((entry) => ({
      userId: entry.user.id,
      userName: `${entry.user.firstName} ${entry.user.lastName}`,
      userEmail: entry.user.email,
      type: entry.type,
      points: entry.points,
      description: entry.description,
      date: new Date(entry.createdAt).toLocaleString(),
      orderId: entry.order?.id || "",
      orderNumber: entry.order?.orderNumber || "",
      orderTotal: entry.order ? Number(entry.order.total) : 0,
      redemptionId: entry.redemption?.id || "",
      redemptionCode: entry.redemption?.code || "",
      rewardName: entry.redemption?.reward?.name || "",
    }))

    // Define fields to export
    const fields = [
      "userId",
      "userName",
      "userEmail",
      "type",
      "points",
      "description",
      "date",
      "orderId",
      "orderNumber",
      "orderTotal",
      "redemptionId",
      "redemptionCode",
      "rewardName",
    ]

    // Export data using the existing export service
    switch (format) {
      case "csv":
        return exportService.exportToCsv(formattedData, fields, exportService.ExportDataType.LOYALTY_POINTS, requestId)
      case "excel":
        return exportService.exportToExcel(
          formattedData,
          fields,
          exportService.ExportDataType.LOYALTY_POINTS,
          requestId,
        )
      case "pdf":
        return exportService.exportToPdf(
          formattedData,
          fields,
          exportService.ExportDataType.LOYALTY_POINTS,
          "Loyalty Points Report",
          requestId,
        )
      case "json":
        return exportService.exportToJson(formattedData, exportService.ExportDataType.LOYALTY_POINTS, requestId)
      default:
        throw new ApiError(`Unsupported export format: ${format}`, 400)
    }
  } catch (error: any) {
    logger.error(`Error generating points report: ${error.message}`)
    throw error
  }
}

/**
 * Generate redemptions report
 * @param format Export format
 * @param startDate Start date
 * @param endDate End date
 * @param filter Additional filters
 * @param requestId Request ID for logging
 * @returns Report file path
 */
async function generateRedemptionsReport(
  format: "csv" | "excel" | "pdf" | "json",
  startDate: Date,
  endDate: Date,
  filter?: Record<string, any>,
  requestId?: string,
): Promise<string> {
  const logger = createRequestLogger(requestId || 'loyalty-redemptions-report')
  logger.info("Generating redemptions report")

  try {
    // Build query filters
    const where: Prisma.RedemptionWhereInput = {
      createdAt: { gte: startDate, lte: endDate },
      ...filter,
    }

    // Get redemptions with user and reward details
    const redemptions = await prisma.redemption.findMany({
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
        reward: {
          select: {
            id: true,
            name: true,
            type: true,
            pointsCost: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format data for export
    const formattedData = redemptions.map((redemption) => ({
      userId: redemption.user.id,
      userName: `${redemption.user.firstName} ${redemption.user.lastName}`,
      userEmail: redemption.user.email,
      rewardId: redemption.reward.id,
      rewardName: redemption.reward.name,
      rewardType: redemption.reward.type,
      pointsCost: redemption.pointsUsed,
      code: redemption.code,
      status: redemption.status,
      createdAt: new Date(redemption.createdAt).toLocaleString(),
      expiresAt: redemption.expiresAt ? new Date(redemption.expiresAt).toLocaleString() : "N/A",
      usedAt: redemption.usedAt ? new Date(redemption.usedAt).toLocaleString() : "N/A",
      approvedAt: redemption.approvedAt ? new Date(redemption.approvedAt).toLocaleString() : "N/A",
      rejectedAt: redemption.rejectedAt ? new Date(redemption.rejectedAt).toLocaleString() : "N/A",
    }))

    // Define fields to export
    const fields = [
      "userId",
      "userName",
      "userEmail",
      "rewardId",
      "rewardName",
      "rewardType",
      "pointsCost",
      "code",
      "status",
      "createdAt",
      "expiresAt",
      "usedAt",
      "approvedAt",
      "rejectedAt",
    ]

    // Export data
    switch (format) {
      case "csv":
        return exportService.exportToCsv(
          formattedData,
          fields,
          exportService.ExportDataType.LOYALTY_REDEMPTIONS,
          requestId,
        )
      case "excel":
        return exportService.exportToExcel(
          formattedData,
          fields,
          exportService.ExportDataType.LOYALTY_REDEMPTIONS,
          requestId,
        )
      case "pdf":
        return exportService.exportToPdf(
          formattedData,
          fields,
          exportService.ExportDataType.LOYALTY_REDEMPTIONS,
          "Loyalty Redemptions Report",
          requestId,
        )
      case "json":
        return exportService.exportToJson(formattedData, exportService.ExportDataType.LOYALTY_REDEMPTIONS, requestId)
      default:
        throw new ApiError(`Unsupported export format: ${format}`, 400)
    }
  } catch (error: any) {
    logger.error(`Error generating redemptions report: ${error.message}`)
    throw error
  }
}

/**
 * Generate tiers report
 * @param format Export format
 * @param filter Additional filters
 * @param requestId Request ID for logging
 * @returns Report file path
 */
async function generateTiersReport(
  format: "csv" | "excel" | "pdf" | "json",
  filter?: Record<string, any>,
  requestId?: string,
): Promise<string> {
  const logger = createRequestLogger(requestId || 'loyalty-tiers-report')
  logger.info("Generating tiers report")

  try {
    // Get users by tier using Prisma aggregation
    const usersByTier = await prisma.loyaltyTier.findMany({
      include: {
        loyaltyPrograms: {
          where: filter || {},
          select: {
            points: true,
            lifetimePoints: true,
          },
        },
        _count: {
          select: {
            loyaltyPrograms: {
              where: filter || {},
            },
          },
        },
      },
      orderBy: { level: 'asc' },
    })

    // Format data for export
    const formattedData = usersByTier.map((tier) => {
      const totalPoints = tier.loyaltyPrograms.reduce((sum, program) => sum + program.points, 0)
      const totalLifetimePoints = tier.loyaltyPrograms.reduce((sum, program) => sum + program.lifetimePoints, 0)
      const userCount = tier._count.loyaltyPrograms
      const averagePoints = userCount > 0 ? Math.round(totalPoints / userCount) : 0
      const averageLifetimePoints = userCount > 0 ? Math.round(totalLifetimePoints / userCount) : 0

      return {
        tierId: tier.id,
        tierName: tier.name,
        tierLevel: tier.level,
        pointsThreshold: tier.pointsThreshold,
        userCount,
        totalPoints,
        totalLifetimePoints,
        averagePoints,
        averageLifetimePoints,
        discountPercentage: Number(tier.discountPercentage),
        benefits: tier.benefits.join(', '),
        active: tier.active ? 'Yes' : 'No',
      }
    })

    // Define fields to export
    const fields = [
      "tierId",
      "tierName", 
      "tierLevel",
      "pointsThreshold",
      "userCount",
      "totalPoints",
      "totalLifetimePoints",
      "averagePoints",
      "averageLifetimePoints",
      "discountPercentage",
      "benefits",
      "active",
    ]

    // Export data
    switch (format) {
      case "csv":
        return exportService.exportToCsv(formattedData, fields, exportService.ExportDataType.LOYALTY_TIERS, requestId)
      case "excel":
        return exportService.exportToExcel(formattedData, fields, exportService.ExportDataType.LOYALTY_TIERS, requestId)
      case "pdf":
        return exportService.exportToPdf(
          formattedData,
          fields,
          exportService.ExportDataType.LOYALTY_TIERS,
          "Loyalty Tiers Report",
          requestId,
        )
      case "json":
        return exportService.exportToJson(formattedData, exportService.ExportDataType.LOYALTY_TIERS, requestId)
      default:
        throw new ApiError(`Unsupported export format: ${format}`, 400)
    }
  } catch (error: any) {
    logger.error(`Error generating tiers report: ${error.message}`)
    throw error
  }
}

/**
 * Generate referrals report
 * @param format Export format
 * @param startDate Start date
 * @param endDate End date
 * @param filter Additional filters
 * @param requestId Request ID for logging
 * @returns Report file path
 */
async function generateReferralsReport(
  format: "csv" | "excel" | "pdf" | "json",
  startDate: Date,
  endDate: Date,
  filter?: Record<string, any>,
  requestId?: string,
): Promise<string> {
  const logger = createRequestLogger(requestId || 'loyalty-referrals-report')
  logger.info("Generating referrals report")

  try {
    // Get loyalty programs with referral information
    const referrals = await prisma.loyaltyProgram.findMany({
      where: {
        referredById: { not: null },
        createdAt: { gte: startDate, lte: endDate },
        ...filter,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
        referredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format data for export
    const formattedData = referrals.map((referral) => ({
      userId: referral.user.id,
      userName: `${referral.user.firstName} ${referral.user.lastName}`,
      userEmail: referral.user.email,
      userCreatedAt: new Date(referral.user.createdAt).toLocaleString(),
      referrerId: referral.referredBy?.id || "",
      referrerName: referral.referredBy ? `${referral.referredBy.firstName} ${referral.referredBy.lastName}` : "",
      referrerEmail: referral.referredBy?.email || "",
      referralCode: referral.referralCode,
      currentPoints: referral.points,
      lifetimePoints: referral.lifetimePoints,
    }))

    // Define fields to export
    const fields = [
      "userId",
      "userName",
      "userEmail",
      "userCreatedAt",
      "referrerId",
      "referrerName",
      "referrerEmail",
      "referralCode",
      "currentPoints",
      "lifetimePoints",
    ]

    // Export data
    switch (format) {
      case "csv":
        return exportService.exportToCsv(
          formattedData,
          fields,
          exportService.ExportDataType.LOYALTY_REFERRALS,
          requestId,
        )
      case "excel":
        return exportService.exportToExcel(
          formattedData,
          fields,
          exportService.ExportDataType.LOYALTY_REFERRALS,
          requestId,
        )
      case "pdf":
        return exportService.exportToPdf(
          formattedData,
          fields,
          exportService.ExportDataType.LOYALTY_REFERRALS,
          "Loyalty Referrals Report",
          requestId,
        )
      case "json":
        return exportService.exportToJson(formattedData, exportService.ExportDataType.LOYALTY_REFERRALS, requestId)
      default:
        throw new ApiError(`Unsupported export format: ${format}`, 400)
    }
  } catch (error: any) {
    logger.error(`Error generating referrals report: ${error.message}`)
    throw error
  }
}

/**
 * Get loyalty analytics summary
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Analytics summary
 */
export const getLoyaltyAnalytics = async (
  startDate?: Date,
  endDate?: Date,
  requestId?: string,
): Promise<{
  totalUsers: number
  totalPoints: number
  totalRedemptions: number
  averagePointsPerUser: number
  topTier: string
  recentActivity: any[]
}> => {
  const logger = createRequestLogger(requestId || 'loyalty-analytics')
  logger.info("Getting loyalty analytics summary")

  try {
    // Set default dates
    const end = endDate || new Date()
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Try to get from cache
    const cacheKey = `loyalty_analytics:${start.toISOString()}:${end.toISOString()}`
    const cachedData = await getCache<any>(cacheKey)

    if (cachedData) {
      logger.info('Retrieved loyalty analytics from cache')
      return cachedData
    }

    // Get total users in loyalty program
    const totalUsers = await prisma.loyaltyProgram.count()

    // Get total points distributed
    const pointsSum = await prisma.loyaltyHistory.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        type: { in: ['ORDER', 'REFERRAL', 'MANUAL', 'OTHER'] },
      },
      _sum: { points: true },
    })

    // Get total redemptions
    const totalRedemptions = await prisma.redemption.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    })

    // Get average points per user
    const avgPoints = await prisma.loyaltyProgram.aggregate({
      _avg: { points: true },
    })

    // Get most popular tier
    const tierStats = await prisma.loyaltyTier.findMany({
      include: {
        _count: {
          select: {
            loyaltyPrograms: true,
          },
        },
      },
      orderBy: {
        loyaltyPrograms: {
          _count: 'desc',
        },
      },
      take: 1,
    })

    // Get recent activity
    const recentActivity = await prisma.loyaltyHistory.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const result = {
      totalUsers,
      totalPoints: Number(pointsSum._sum.points) || 0,
      totalRedemptions,
      averagePointsPerUser: Math.round(Number(avgPoints._avg.points) || 0),
      topTier: tierStats[0]?.name || 'N/A',
      recentActivity: recentActivity.map(activity => ({
        type: activity.type,
        points: activity.points,
        description: activity.description,
        userName: `${activity.user.firstName} ${activity.user.lastName}`,
        date: activity.createdAt,
      })),
    }

    // Cache the result
    await setCache(cacheKey, result, CACHE_TTL.AGGREGATED_DATA)

    return result
  } catch (error: any) {
    logger.error(`Error getting loyalty analytics: ${error.message}`)
    throw error
  }
}
