import { createRequestLogger } from "../utils/logger"
import * as analyticsService from "./analytics.service"
import * as exportService from "./export.service"
import prisma from "../database/client"
import { ApiError } from "../utils/api-error"

interface ReportOptions {
  format: "csv" | "excel" | "pdf" | "json"
  type: "points" | "redemptions" | "tiers" | "referrals"
  startDate?: Date
  endDate?: Date
  filter?: any
}

/**
 * Generate loyalty report
 * @param options Report generation options
 * @param requestId Request ID for logging
 * @returns Report file path or data
 */
export const generateLoyaltyReport = async (
  options: ReportOptions,
  requestId?: string
): Promise<string> => {
  const requestLogger = createRequestLogger(requestId)
  requestLogger.info(`Generating loyalty report: ${options.type} in ${options.format} format`)

  try {
    let reportData: any

    switch (options.type) {
      case "points":
        reportData = await generatePointsReport(options, requestId)
        break
      case "redemptions":
        reportData = await generateRedemptionsReport(options, requestId)
        break
      case "tiers":
        reportData = await generateTiersReport(options, requestId)
        break
      case "referrals":
        reportData = await generateReferralsReport(options, requestId)
        break
      default:
        throw new ApiError(`Invalid report type: ${options.type}`, 400)
    }

    // Generate file based on format
    const fileName = `loyalty_${options.type}_${Date.now()}.${options.format}`
    const filePath = await generateReportFile(reportData, options.format, fileName, requestId)

    requestLogger.info(`Loyalty report generated successfully: ${filePath}`)
    return filePath
  } catch (error: any) {
    requestLogger.error(`Error generating loyalty report: ${error.message}`)
    throw new ApiError(`Failed to generate loyalty report: ${error.message}`, 500)
  }
}

/**
 * Generate points report data
 */
async function generatePointsReport(options: ReportOptions, requestId?: string): Promise<any[]> {
  const requestLogger = createRequestLogger(requestId)
  requestLogger.info("Generating points report data")

  const whereClause: any = {}

  if (options.startDate && options.endDate) {
    whereClause.createdAt = {
      gte: options.startDate,
      lte: options.endDate,
    }
  }

  if (options.filter?.userId) {
    whereClause.userId = options.filter.userId
  }

  if (options.filter?.type) {
    whereClause.type = options.filter.type
  }

  const pointsData = await prisma.loyaltyHistory.findMany({
    where: whereClause,
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
    },
    orderBy: { createdAt: "desc" },
  })

  return pointsData.map((record) => ({
    id: record.id,
    userId: record.userId,
    userEmail: record.user?.email,
    userName: `${record.user?.firstName} ${record.user?.lastName}`,
    points: record.points,
    type: record.type,
    description: record.description,
    orderId: record.order?.id,
    orderNumber: record.order?.orderNumber,
    orderTotal: record.order?.total,
    createdAt: record.createdAt,
    expiresAt: null, // LoyaltyHistory doesn't have expiresAt field
  }))
}

/**
 * Generate redemptions report data
 */
async function generateRedemptionsReport(options: ReportOptions, requestId?: string): Promise<any[]> {
  const requestLogger = createRequestLogger(requestId)
  requestLogger.info("Generating redemptions report data")

  const whereClause: any = {}

  if (options.startDate && options.endDate) {
    whereClause.createdAt = {
      gte: options.startDate,
      lte: options.endDate,
    }
  }

  if (options.filter?.userId) {
    whereClause.userId = options.filter.userId
  }

  if (options.filter?.status) {
    whereClause.status = options.filter.status
  }

  const redemptionsData = await prisma.loyaltyRedemption.findMany({
    where: whereClause,
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
    orderBy: { createdAt: "desc" },
  })

  return redemptionsData.map((record) => ({
    id: record.id,
    userId: record.userId,
    userEmail: record.user?.email,
    userName: `${record.user?.firstName} ${record.user?.lastName}`,
    rewardId: record.rewardId,
    rewardName: record.rewardName,
    pointsUsed: record.pointsUsed,
    status: record.status,
    code: record.code,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    usedAt: record.usedAt,
  }))
}

/**
 * Generate tiers report data
 */
async function generateTiersReport(options: ReportOptions, requestId?: string): Promise<any[]> {
  const requestLogger = createRequestLogger(requestId)
  requestLogger.info("Generating tiers report data")

  // Get user loyalty data with tier information
  const usersData = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(options.startDate && options.endDate
        ? {
            createdAt: {
              gte: options.startDate,
              lte: options.endDate,
            },
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      loyaltyPoints: true,
      createdAt: true,
    },
    orderBy: { loyaltyPoints: "desc" },
  })

  // Calculate tier for each user based on points
  return usersData.map((user) => {
    let tier = "Bronze"
    let tierLevel = 1

    if (user.loyaltyPoints >= 10000) {
      tier = "Platinum"
      tierLevel = 4
    } else if (user.loyaltyPoints >= 5000) {
      tier = "Gold"
      tierLevel = 3
    } else if (user.loyaltyPoints >= 1000) {
      tier = "Silver"
      tierLevel = 2
    }

    return {
      userId: user.id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      currentPoints: user.loyaltyPoints,
      tier,
      tierLevel,
      joinedAt: user.createdAt,
    }
  })
}

/**
 * Generate referrals report data
 */
async function generateReferralsReport(options: ReportOptions, requestId?: string): Promise<any[]> {
  const requestLogger = createRequestLogger(requestId)
  requestLogger.info("Generating referrals report data")

  const whereClause: any = {}

  if (options.startDate && options.endDate) {
    whereClause.createdAt = {
      gte: options.startDate,
      lte: options.endDate,
    }
  }

  if (options.filter?.referrerId) {
    whereClause.referrerId = options.filter.referrerId
  }

  const referralsData = await prisma.loyaltyReferral.findMany({
    where: whereClause,
    include: {
      referrer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      referred: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return referralsData.map((record) => ({
    id: record.id,
    code: record.code,
    referrerId: record.referrerId,
    referrerEmail: record.referrer?.email,
    referrerName: `${record.referrer?.firstName} ${record.referrer?.lastName}`,
    referredId: record.referredUserId,
    referredEmail: record.referred?.email,
    referredName: record.referred ? `${record.referred.firstName} ${record.referred.lastName}` : null,
    isUsed: record.isUsed,
    pointsAwarded: 500, // Default points awarded for referrals (since field doesn't exist in schema)
    createdAt: record.createdAt,
    usedAt: record.usedAt,
  }))
}

/**
 * Generate report file based on format
 */
async function generateReportFile(
  data: any[],
  format: string,
  fileName: string,
  requestId?: string
): Promise<string> {
  const requestLogger = createRequestLogger(requestId)
  requestLogger.info(`Generating report file: ${fileName}`)

  try {
    switch (format) {
      case "json":
        return await generateJsonReport(data, fileName, requestId)
      case "csv":
        return await generateCsvReport(data, fileName, requestId)
      case "excel":
        return await generateExcelReport(data, fileName, requestId)
      case "pdf":
        return await generatePdfReport(data, fileName, requestId)
      default:
        throw new ApiError(`Unsupported format: ${format}`, 400)
    }
  } catch (error: any) {
    requestLogger.error(`Error generating report file: ${error.message}`)
    throw error
  }
}

/**
 * Generate JSON report
 */
async function generateJsonReport(data: any[], fileName: string, requestId?: string): Promise<string> {
  const fs = require("fs").promises
  const path = require("path")

  const reportsDir = path.join(process.cwd(), "reports")
  await fs.mkdir(reportsDir, { recursive: true })

  const filePath = path.join(reportsDir, fileName)
  const reportContent = {
    generatedAt: new Date(),
    totalRecords: data.length,
    data,
  }

  await fs.writeFile(filePath, JSON.stringify(reportContent, null, 2))
  return filePath
}

/**
 * Generate CSV report using export service
 */
async function generateCsvReport(data: any[], fileName: string, requestId?: string): Promise<string> {
  const fs = require("fs").promises
  const path = require("path")

  const reportsDir = path.join(process.cwd(), "reports")
  await fs.mkdir(reportsDir, { recursive: true })

  const filePath = path.join(reportsDir, fileName)

  if (data.length === 0) {
    await fs.writeFile(filePath, "No data available")
    return filePath
  }

  // Convert data to CSV format
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          if (value === null || value === undefined) return ""
          if (typeof value === "string" && value.includes(",")) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return String(value)
        })
        .join(",")
    ),
  ].join("\n")

  await fs.writeFile(filePath, csvContent)
  return filePath
}

/**
 * Generate Excel report (placeholder - would need xlsx library)
 */
async function generateExcelReport(data: any[], fileName: string, requestId?: string): Promise<string> {
  // For now, generate CSV as Excel is not implemented
  const csvFileName = fileName.replace(".xlsx", ".csv")
  return await generateCsvReport(data, csvFileName, requestId)
}

/**
 * Generate PDF report (placeholder - would need pdf library)
 */
async function generatePdfReport(data: any[], fileName: string, requestId?: string): Promise<string> {
  // For now, generate JSON as PDF is not implemented
  const jsonFileName = fileName.replace(".pdf", ".json")
  return await generateJsonReport(data, jsonFileName, requestId)
}

/**
 * Get report statistics
 */
export const getReportStatistics = async (requestId?: string): Promise<any> => {
  const requestLogger = createRequestLogger(requestId)
  requestLogger.info("Getting report statistics")

  try {
    const stats = {
      totalUsers: await prisma.user.count({ where: { role: "CUSTOMER" } }),
      totalPointsAwarded: await prisma.loyaltyHistory.aggregate({
        where: { points: { gt: 0 } },
        _sum: { points: true },
      }),
      totalPointsRedeemed: await prisma.loyaltyHistory.aggregate({
        where: { points: { lt: 0 } },
        _sum: { points: true },
      }),
      totalRedemptions: await prisma.loyaltyRedemption.count(),
      totalReferrals: await prisma.loyaltyReferral.count({ where: { isUsed: true } }),
    }

    return {
      ...stats,
      totalPointsAwarded: Number(stats.totalPointsAwarded._sum.points) || 0,
      totalPointsRedeemed: Math.abs(Number(stats.totalPointsRedeemed._sum.points)) || 0,
    }
  } catch (error: any) {
    requestLogger.error(`Error getting report statistics: ${error.message}`)
    throw new ApiError(`Failed to get report statistics: ${error.message}`, 500)
  }
}

/**
 * Clean up old report files
 */
export const cleanupOldReports = async (daysOld: number = 7, requestId?: string): Promise<number> => {
  const requestLogger = createRequestLogger(requestId)
  requestLogger.info(`Cleaning up reports older than ${daysOld} days`)

  try {
    const fs = require("fs").promises
    const path = require("path")

    const reportsDir = path.join(process.cwd(), "reports")
    
    try {
      const files = await fs.readdir(reportsDir)
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
      let deletedCount = 0

      for (const file of files) {
        const filePath = path.join(reportsDir, file)
        const stats = await fs.stat(filePath)
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath)
          deletedCount++
        }
      }

      requestLogger.info(`Cleaned up ${deletedCount} old report files`)
      return deletedCount
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // Reports directory doesn't exist
        return 0
      }
      throw error
    }
  } catch (error: any) {
    requestLogger.error(`Error cleaning up old reports: ${error.message}`)
    throw new ApiError(`Failed to clean up old reports: ${error.message}`, 500)
  }
}
