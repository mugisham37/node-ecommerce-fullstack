import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import * as vendorDashboardService from "../services/vendor-dashboard.service"
import Joi from "joi"

// Validation schemas
const periodSchema = Joi.string().valid("day", "week", "month", "year", "all").messages({
  "any.only": "Invalid period. Must be one of: day, week, month, year, all",
})

const intervalSchema = Joi.string().valid("hourly", "daily", "weekly", "monthly").messages({
  "any.only": "Invalid interval. Must be one of: hourly, daily, weekly, monthly",
})

const groupBySchema = Joi.string().valid("product", "category", "customer").messages({
  "any.only": "Invalid groupBy. Must be one of: product, category, customer",
})

const statusSchema = Joi.string().valid("pending", "processing", "shipped", "delivered", "cancelled").messages({
  "any.only": "Invalid status. Must be one of: pending, processing, shipped, delivered, cancelled",
})

const objectIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  "string.pattern.base": "Invalid ID format. Must be a valid ObjectId",
})

/**
 * Get vendor dashboard summary
 * @route GET /api/v1/vendors/dashboard
 * @access Protected (Vendor)
 */
export const getVendorDashboardSummary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  
  if (!req.vendor?._id) {
    return next(new ApiError("Vendor authentication required", 401))
  }
  
  const vendorId = req.vendor._id
  requestLogger.info(`Getting dashboard summary for vendor ID: ${vendorId}`)

  // Parse query parameters
  const period = (req.query.period as "day" | "week" | "month" | "year" | "all") || "month"

  // Validate period
  const { error } = periodSchema.validate(period)
  if (error) {
    return next(new ApiError(error.details[0].message, 400))
  }

  // Get dashboard summary
  const dashboardSummary = await vendorDashboardService.getVendorDashboardSummary(vendorId.toString(), period, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: dashboardSummary,
  })
})

/**
 * Get vendor sales analytics
 * @route GET /api/v1/vendors/analytics/sales
 * @access Protected (Vendor)
 */
export const getVendorSalesAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  
  if (!req.vendor?._id) {
    return next(new ApiError("Vendor authentication required", 401))
  }
  
  const vendorId = req.vendor._id
  requestLogger.info(`Getting sales analytics for vendor ID: ${vendorId}`)

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined
  const interval = req.query.interval as "hourly" | "daily" | "weekly" | "monthly" | undefined
  const compareWithPrevious = req.query.compareWithPrevious !== "false"
  const groupBy = req.query.groupBy as "product" | "category" | "customer" | undefined

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date", 400))
  }

  // Validate interval
  if (interval) {
    const { error } = intervalSchema.validate(interval)
    if (error) {
      return next(new ApiError(error.details[0].message, 400))
    }
  }

  // Validate groupBy
  if (groupBy) {
    const { error } = groupBySchema.validate(groupBy)
    if (error) {
      return next(new ApiError(error.details[0].message, 400))
    }
  }

  // Get sales analytics
  const salesAnalytics = await vendorDashboardService.getVendorSalesAnalytics(
    vendorId.toString(),
    {
      startDate,
      endDate,
      interval,
      compareWithPrevious,
      groupBy,
    },
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: salesAnalytics,
  })
})

/**
 * Get vendor product analytics
 * @route GET /api/v1/vendors/analytics/products
 * @access Protected (Vendor)
 */
export const getVendorProductAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  
  if (!req.vendor?._id) {
    return next(new ApiError("Vendor authentication required", 401))
  }
  
  const vendorId = req.vendor._id
  requestLogger.info(`Getting product analytics for vendor ID: ${vendorId}`)

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined
  const categoryId = req.query.categoryId as string | undefined
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : undefined

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date", 400))
  }

  // Validate category ID
  if (categoryId) {
    const { error } = objectIdSchema.validate(categoryId)
    if (error) {
      return next(new ApiError("Invalid category ID", 400))
    }
  }

  // Validate limit
  if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
    return next(new ApiError("Invalid limit. Must be a positive number", 400))
  }

  // Get product analytics
  const productAnalytics = await vendorDashboardService.getVendorProductAnalytics(
    vendorId.toString(),
    {
      startDate,
      endDate,
      categoryId,
      limit,
    },
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: productAnalytics,
  })
})

/**
 * Get vendor order analytics
 * @route GET /api/v1/vendors/analytics/orders
 * @access Protected (Vendor)
 */
export const getVendorOrderAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  
  if (!req.vendor?._id) {
    return next(new ApiError("Vendor authentication required", 401))
  }
  
  const vendorId = req.vendor._id
  requestLogger.info(`Getting order analytics for vendor ID: ${vendorId}`)

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined
  const status = req.query.status as string | undefined

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date", 400))
  }

  // Validate status
  if (status) {
    const { error } = statusSchema.validate(status)
    if (error) {
      return next(new ApiError(error.details[0].message, 400))
    }
  }

  // Get order analytics
  const orderAnalytics = await vendorDashboardService.getVendorOrderAnalytics(
    vendorId.toString(),
    {
      startDate,
      endDate,
      status,
    },
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: orderAnalytics,
  })
})

/**
 * Get vendor payout analytics
 * @route GET /api/v1/vendors/analytics/payouts
 * @access Protected (Vendor)
 */
export const getVendorPayoutAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  
  if (!req.vendor?._id) {
    return next(new ApiError("Vendor authentication required", 401))
  }
  
  const vendorId = req.vendor._id
  requestLogger.info(`Getting payout analytics for vendor ID: ${vendorId}`)

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date", 400))
  }

  // Get payout analytics
  const payoutAnalytics = await vendorDashboardService.getVendorPayoutAnalytics(
    vendorId.toString(),
    {
      startDate,
      endDate,
    },
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: payoutAnalytics,
  })
})

/**
 * Get vendor dashboard summary (Admin)
 * @route GET /api/v1/admin/vendors/:vendorId/dashboard
 * @access Protected (Admin)
 */
export const getVendorDashboardSummaryAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { vendorId } = req.params
  requestLogger.info(`Getting dashboard summary for vendor ID: ${vendorId} (admin)`)

  if (!vendorId) {
    return next(new ApiError("Vendor ID is required", 400))
  }

  // Validate vendor ID
  const { error } = objectIdSchema.validate(vendorId)
  if (error) {
    return next(new ApiError("Invalid vendor ID", 400))
  }

  // Parse query parameters
  const period = (req.query.period as "day" | "week" | "month" | "year" | "all") || "month"

  // Validate period
  const periodValidation = periodSchema.validate(period)
  if (periodValidation.error) {
    return next(new ApiError(periodValidation.error.details[0].message, 400))
  }

  // Get dashboard summary
  const dashboardSummary = await vendorDashboardService.getVendorDashboardSummary(vendorId, period, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: dashboardSummary,
  })
})
