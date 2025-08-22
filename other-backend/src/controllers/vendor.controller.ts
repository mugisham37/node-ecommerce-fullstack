import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import * as vendorService from "../services/vendor.service"
import { translateError } from "../utils/translate"
import Joi from "joi"

// Validation schemas
const objectIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  "string.pattern.base": "Invalid ID format. Must be a valid ObjectId",
})

const vendorStatusSchema = Joi.string().valid("pending", "approved", "rejected", "suspended").messages({
  "any.only": "Invalid status. Must be one of: pending, approved, rejected, suspended",
})

const payoutStatusSchema = Joi.string().valid("pending", "processing", "completed", "failed", "cancelled").messages({
  "any.only": "Invalid status. Must be one of: pending, processing, completed, failed, cancelled",
})

const periodSchema = Joi.string().valid("day", "week", "month", "year", "all").messages({
  "any.only": "Invalid period. Must be one of: day, week, month, year, all",
})

/**
 * Create a new vendor
 * @route POST /api/v1/vendors
 * @access Protected (Admin)
 */
export const createVendor = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Creating new vendor")

  const vendor = await vendorService.createVendor(req.body, req.id)

  res.status(201).json({
    status: "success",
    requestId: req.id,
    data: {
      vendor,
    },
  })
})

/**
 * Get vendor by ID
 * @route GET /api/v1/vendors/:id
 * @access Protected (Admin, Vendor)
 */
export const getVendorById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  requestLogger.info(`Getting vendor with ID: ${id}`)

  if (!id) {
    return next(new ApiError(translateError("vendorIdRequired", {}, req.language), 400))
  }

  // Validate ID format
  const { error } = objectIdSchema.validate(id)
  if (error) {
    return next(new ApiError("Invalid vendor ID format", 400))
  }

  const vendor = await vendorService.getVendorById(id, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      vendor,
    },
  })
})

/**
 * Get vendor by slug
 * @route GET /api/v1/vendors/slug/:slug
 * @access Public
 */
export const getVendorBySlug = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { slug } = req.params

  requestLogger.info(`Getting vendor with slug: ${slug}`)

  if (!slug) {
    return next(new ApiError(translateError("vendorSlugRequired", {}, req.language), 400))
  }

  // Validate slug format (basic validation)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return next(new ApiError("Invalid slug format. Must contain only lowercase letters, numbers, and hyphens", 400))
  }

  const vendor = await vendorService.getVendorBySlug(slug, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      vendor,
    },
  })
})

/**
 * Update vendor
 * @route PUT /api/v1/vendors/:id
 * @access Protected (Admin, Vendor)
 */
export const updateVendor = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  requestLogger.info(`Updating vendor with ID: ${id}`)

  if (!id) {
    return next(new ApiError(translateError("vendorIdRequired", {}, req.language), 400))
  }

  // Validate ID format
  const { error } = objectIdSchema.validate(id)
  if (error) {
    return next(new ApiError("Invalid vendor ID format", 400))
  }

  const vendor = await vendorService.updateVendor(id, req.body, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      vendor,
    },
  })
})

/**
 * Delete vendor
 * @route DELETE /api/v1/vendors/:id
 * @access Protected (Admin)
 */
export const deleteVendor = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  requestLogger.info(`Deleting vendor with ID: ${id}`)

  if (!id) {
    return next(new ApiError(translateError("vendorIdRequired", {}, req.language), 400))
  }

  // Validate ID format
  const { error } = objectIdSchema.validate(id)
  if (error) {
    return next(new ApiError("Invalid vendor ID format", 400))
  }

  const vendor = await vendorService.deleteVendor(id, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      vendor,
    },
  })
})

/**
 * Get all vendors
 * @route GET /api/v1/vendors
 * @access Protected (Admin)
 */
export const getAllVendors = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting all vendors")

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10
  const sort = (req.query.sort as string) || "-createdAt"
  const select = req.query.select as string

  // Validate pagination
  if (page < 1) {
    throw new ApiError("Page must be greater than 0", 400)
  }

  if (limit < 1 || limit > 100) {
    throw new ApiError("Limit must be between 1 and 100", 400)
  }

  // Build filter
  const filter: Record<string, any> = {}

  if (req.query.status) {
    const { error } = vendorStatusSchema.validate(req.query.status)
    if (error) {
      throw new ApiError(error.details[0].message, 400)
    }
    filter.status = req.query.status
  }

  if (req.query.active) {
    filter.active = req.query.active === "true"
  }

  if (req.query.search) {
    filter.$or = [
      { businessName: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ]
  }

  const { vendors, count } = await vendorService.getAllVendors(filter, { page, limit, sort, select }, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: vendors.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalResults: count,
    },
    data: {
      vendors,
    },
  })
})

/**
 * Get vendor products
 * @route GET /api/v1/vendors/:id/products
 * @access Public
 */
export const getVendorProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  requestLogger.info(`Getting products for vendor ID: ${id}`)

  if (!id) {
    return next(new ApiError(translateError("vendorIdRequired", {}, req.language), 400))
  }

  // Validate ID format
  const { error } = objectIdSchema.validate(id)
  if (error) {
    return next(new ApiError("Invalid vendor ID format", 400))
  }

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10
  const sort = (req.query.sort as string) || "-createdAt"

  // Validate pagination
  if (page < 1) {
    return next(new ApiError("Page must be greater than 0", 400))
  }

  if (limit < 1 || limit > 100) {
    return next(new ApiError("Limit must be between 1 and 100", 400))
  }

  // Build filter
  const filter: Record<string, any> = {}

  if (req.query.category) {
    filter.category = req.query.category
  }

  if (req.query.active) {
    filter.active = req.query.active === "true"
  }

  if (req.query.featured) {
    filter.featured = req.query.featured === "true"
  }

  if (req.query.minPrice && req.query.maxPrice) {
    const minPrice = Number.parseFloat(req.query.minPrice as string)
    const maxPrice = Number.parseFloat(req.query.maxPrice as string)
    
    if (isNaN(minPrice) || isNaN(maxPrice)) {
      return next(new ApiError("Invalid price range. Prices must be valid numbers", 400))
    }
    
    if (minPrice > maxPrice) {
      return next(new ApiError("Minimum price cannot be greater than maximum price", 400))
    }
    
    filter.price = {
      $gte: minPrice,
      $lte: maxPrice,
    }
  } else if (req.query.minPrice) {
    const minPrice = Number.parseFloat(req.query.minPrice as string)
    if (isNaN(minPrice)) {
      return next(new ApiError("Invalid minimum price. Must be a valid number", 400))
    }
    filter.price = { $gte: minPrice }
  } else if (req.query.maxPrice) {
    const maxPrice = Number.parseFloat(req.query.maxPrice as string)
    if (isNaN(maxPrice)) {
      return next(new ApiError("Invalid maximum price. Must be a valid number", 400))
    }
    filter.price = { $lte: maxPrice }
  }

  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { description: { $regex: req.query.search, $options: "i" } },
    ]
  }

  const { products, count } = await vendorService.getVendorProducts(id, { page, limit, sort, filter }, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: products.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalResults: count,
    },
    data: {
      products,
    },
  })
})

/**
 * Get vendor metrics
 * @route GET /api/v1/vendors/:id/metrics
 * @access Protected (Admin, Vendor)
 */
export const getVendorMetrics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params
  const period = (req.query.period as "day" | "week" | "month" | "year" | "all") || "all"

  requestLogger.info(`Getting metrics for vendor ID: ${id} with period: ${period}`)

  if (!id) {
    return next(new ApiError(translateError("vendorIdRequired", {}, req.language), 400))
  }

  // Validate ID format
  const idValidation = objectIdSchema.validate(id)
  if (idValidation.error) {
    return next(new ApiError("Invalid vendor ID format", 400))
  }

  // Validate period
  const { error } = periodSchema.validate(period)
  if (error) {
    return next(new ApiError(error.details[0].message, 400))
  }

  const metrics = await vendorService.getVendorMetrics(id, period, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      metrics,
    },
  })
})

/**
 * Update vendor status
 * @route PATCH /api/v1/vendors/:id/status
 * @access Protected (Admin)
 */
export const updateVendorStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params
  const { status, notes } = req.body

  requestLogger.info(`Updating status for vendor ID: ${id} to ${status}`)

  if (!id) {
    return next(new ApiError(translateError("vendorIdRequired", {}, req.language), 400))
  }

  // Validate ID format
  const idValidation = objectIdSchema.validate(id)
  if (idValidation.error) {
    return next(new ApiError("Invalid vendor ID format", 400))
  }

  if (!status) {
    return next(new ApiError(translateError("statusRequired", {}, req.language), 400))
  }

  // Validate status
  const { error } = vendorStatusSchema.validate(status)
  if (error) {
    return next(new ApiError(error.details[0].message, 400))
  }

  const vendor = await vendorService.updateVendorStatus(id, status, notes, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      vendor,
    },
  })
})

/**
 * Get vendor payouts
 * @route GET /api/v1/vendors/:id/payouts
 * @access Protected (Admin, Vendor)
 */
export const getVendorPayouts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  requestLogger.info(`Getting payouts for vendor ID: ${id}`)

  if (!id) {
    return next(new ApiError(translateError("vendorIdRequired", {}, req.language), 400))
  }

  // Validate ID format
  const { error } = objectIdSchema.validate(id)
  if (error) {
    return next(new ApiError("Invalid vendor ID format", 400))
  }

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10
  const sort = (req.query.sort as string) || "-createdAt"

  // Validate pagination
  if (page < 1) {
    return next(new ApiError("Page must be greater than 0", 400))
  }

  if (limit < 1 || limit > 100) {
    return next(new ApiError("Limit must be between 1 and 100", 400))
  }

  // Build filter
  const filter: Record<string, any> = {}

  if (req.query.status) {
    const { error } = payoutStatusSchema.validate(req.query.status)
    if (error) {
      return next(new ApiError(error.details[0].message, 400))
    }
    filter.status = req.query.status
  }

  if (req.query.startDate && req.query.endDate) {
    const startDate = new Date(req.query.startDate as string)
    const endDate = new Date(req.query.endDate as string)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new ApiError("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
    }
    
    if (startDate > endDate) {
      return next(new ApiError("Start date cannot be after end date", 400))
    }
    
    filter.createdAt = {
      $gte: startDate,
      $lte: endDate,
    }
  }

  const { payouts, count } = await vendorService.getVendorPayouts(id, { page, limit, sort, filter }, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: payouts.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalResults: count,
    },
    data: {
      payouts,
    },
  })
})

/**
 * Calculate vendor payout
 * @route POST /api/v1/vendors/:id/calculate-payout
 * @access Protected (Admin)
 */
export const calculateVendorPayout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params
  const { startDate, endDate } = req.body

  requestLogger.info(`Calculating payout for vendor ID: ${id}`)

  if (!id) {
    return next(new ApiError(translateError("vendorIdRequired", {}, req.language), 400))
  }

  // Validate ID format
  const { error } = objectIdSchema.validate(id)
  if (error) {
    return next(new ApiError("Invalid vendor ID format", 400))
  }

  if (!startDate || !endDate) {
    return next(new ApiError(translateError("dateRangeRequired", {}, req.language), 400))
  }

  // Validate dates
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }
  
  if (start > end) {
    return next(new ApiError("Start date cannot be after end date", 400))
  }

  const payoutCalculation = await vendorService.calculateVendorPayout(id, start, end, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      payoutCalculation,
    },
  })
})

/**
 * Create vendor payout
 * @route POST /api/v1/vendors/payouts
 * @access Protected (Admin)
 */
export const createVendorPayout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info(`Creating payout for vendor ID: ${req.body.vendor}`)

  // Validate vendor ID in body
  if (!req.body.vendor) {
    return next(new ApiError("Vendor ID is required", 400))
  }

  const { error } = objectIdSchema.validate(req.body.vendor)
  if (error) {
    return next(new ApiError("Invalid vendor ID format", 400))
  }

  const payout = await vendorService.createVendorPayout(req.body, req.id)

  res.status(201).json({
    status: "success",
    requestId: req.id,
    data: {
      payout,
    },
  })
})

/**
 * Update payout status
 * @route PATCH /api/v1/vendors/payouts/:id/status
 * @access Protected (Admin)
 */
export const updatePayoutStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params
  const { status, transactionId, notes } = req.body

  requestLogger.info(`Updating status for payout ID: ${id} to ${status}`)

  if (!id) {
    return next(new ApiError(translateError("payoutIdRequired", {}, req.language), 400))
  }

  // Validate ID format
  const idValidation = objectIdSchema.validate(id)
  if (idValidation.error) {
    return next(new ApiError("Invalid payout ID format", 400))
  }

  if (!status) {
    return next(new ApiError(translateError("statusRequired", {}, req.language), 400))
  }

  // Validate status
  const { error } = payoutStatusSchema.validate(status)
  if (error) {
    return next(new ApiError(error.details[0].message, 400))
  }

  const payout = await vendorService.updatePayoutStatus(id, status, transactionId, notes, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      payout,
    },
  })
})

/**
 * Get payout by ID
 * @route GET /api/v1/vendors/payouts/:id
 * @access Protected (Admin, Vendor)
 */
export const getPayoutById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  requestLogger.info(`Getting payout with ID: ${id}`)

  if (!id) {
    return next(new ApiError(translateError("payoutIdRequired", {}, req.language), 400))
  }

  // Validate ID format
  const { error } = objectIdSchema.validate(id)
  if (error) {
    return next(new ApiError("Invalid payout ID format", 400))
  }

  const payout = await vendorService.getPayoutById(id, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      payout,
    },
  })
})
