import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import * as loyaltyService from "../services/loyalty.service"

/**
 * Get customer loyalty dashboard
 * @route GET /api/v1/loyalty/dashboard
 * @access Private
 */
export const getCustomerLoyaltyDashboard = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting customer loyalty dashboard")

  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  const userId = req.user._id.toString()
  const dashboard = await loyaltyService.getCustomerLoyaltyProgram(userId, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: dashboard,
  })
})

/**
 * Get loyalty statistics by period
 * @route GET /api/v1/loyalty/statistics/:period
 * @access Private
 */
export const getLoyaltyStatisticsByPeriod = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { period } = req.params
  requestLogger.info(`Getting loyalty statistics for period: ${period}`)

  if (!req.user?._id) {
    return next(new ApiError("User authentication required", 401))
  }

  // Validate period
  if (!["week", "month", "year", "all"].includes(period)) {
    return next(new ApiError("Invalid period. Must be one of: week, month, year, all", 400))
  }

  const userId = req.user._id.toString()
  const statistics = await loyaltyService.getLoyaltyStatistics(
    userId,
    period as "week" | "month" | "year" | "all",
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: statistics,
  })
})
