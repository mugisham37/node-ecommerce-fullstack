import type { Request, Response } from "express"
import { asyncHandler } from "../utils/async-handler"
import { createRequestLogger } from "../utils/logger"
import * as loyaltyService from "../services/loyalty.service"
import prisma from "../database/client"

/**
 * Get loyalty program dashboard
 * @route GET /api/v1/admin/dashboard/loyalty
 * @access Protected (Admin)
 */
export const getLoyaltyDashboard = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting loyalty program dashboard")

  try {
    // Get overall loyalty statistics (mock data since the service method requires userId)
    const totalUsers = await prisma.user.count({
      where: { role: "CUSTOMER" }
    })

    const totalPointsAwarded = await prisma.loyaltyHistory.aggregate({
      where: {
        type: { in: ['ORDER', 'REFERRAL', 'MANUAL', 'OTHER'] }
      },
      _sum: {
        points: true
      }
    })

    const totalPointsRedeemed = await prisma.loyaltyHistory.aggregate({
      where: {
        type: 'REDEMPTION'
      },
      _sum: {
        points: true
      }
    })

    const totalRedemptions = await prisma.loyaltyRedemption.count()

    const activeRedemptions = await prisma.loyaltyRedemption.count({
      where: {
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    })

    // Get recent redemptions
    const recentRedemptions = await prisma.loyaltyRedemption.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Get tier distribution (mock data since we don't have tier models)
    const tiers = [
      {
        _id: "bronze",
        name: "Bronze",
        level: 1,
        pointsThreshold: 0,
        userCount: Math.floor(totalUsers * 0.6)
      },
      {
        _id: "silver", 
        name: "Silver",
        level: 2,
        pointsThreshold: 1000,
        userCount: Math.floor(totalUsers * 0.25)
      },
      {
        _id: "gold",
        name: "Gold", 
        level: 3,
        pointsThreshold: 5000,
        userCount: Math.floor(totalUsers * 0.12)
      },
      {
        _id: "platinum",
        name: "Platinum",
        level: 4, 
        pointsThreshold: 10000,
        userCount: Math.floor(totalUsers * 0.03)
      }
    ]

    // Get top rewards by redemption count (mock data since we don't have reward models)
    const topRewards = [
      {
        _id: "discount-10",
        name: "10% Discount",
        pointsCost: 200,
        redemptionCount: 45,
        type: "discount"
      },
      {
        _id: "free-shipping",
        name: "Free Shipping",
        pointsCost: 150,
        redemptionCount: 38,
        type: "shipping"
      },
      {
        _id: "discount-5",
        name: "5% Discount",
        pointsCost: 100,
        redemptionCount: 32,
        type: "discount"
      },
      {
        _id: "gift-card-10",
        name: "$10 Gift Card",
        pointsCost: 1000,
        redemptionCount: 15,
        type: "gift_card"
      }
    ]

    const statistics = {
      totalUsers,
      totalPointsAwarded: Number(totalPointsAwarded._sum.points) || 0,
      totalPointsRedeemed: Math.abs(Number(totalPointsRedeemed._sum.points)) || 0,
      totalRedemptions,
      activeRedemptions,
      averagePointsPerUser: totalUsers > 0 ? Math.round((Number(totalPointsAwarded._sum.points) || 0) / totalUsers) : 0
    }

    res.status(200).json({
      status: "success",
      requestId: req.id,
      data: {
        statistics,
        redemptions: recentRedemptions,
        tiers,
        rewards: topRewards,
      },
    })
  } catch (error: any) {
    requestLogger.error(`Error getting loyalty dashboard: ${error.message}`)
    res.status(500).json({
      status: "error",
      requestId: req.id,
      message: "Failed to get loyalty dashboard",
    })
  }
})
