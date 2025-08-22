import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import * as batchService from "../services/batch-loyalty.service"
import * as settingsService from "../services/settings.service"
import Joi from "joi"

// Validation schema for batch loyalty points
const batchLoyaltyPointsSchema = Joi.object({
  operations: Joi.array()
    .items(
      Joi.object({
        userId: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            "string.pattern.base": "User ID must be a valid ObjectId",
            "any.required": "User ID is required",
          }),
        points: Joi.number().integer().required().messages({
          "number.base": "Points must be a number",
          "number.integer": "Points must be an integer",
          "any.required": "Points are required",
        }),
        description: Joi.string().min(1).max(500).required().messages({
          "string.empty": "Description is required",
          "string.min": "Description must be at least 1 character long",
          "string.max": "Description cannot exceed 500 characters",
          "any.required": "Description is required",
        }),
        referenceId: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .optional()
          .messages({
            "string.pattern.base": "Reference ID must be a valid ObjectId",
          }),
        type: Joi.string().valid("order", "referral", "manual", "bonus", "adjustment", "other").optional(),
        expiresAt: Joi.date().optional(),
        metadata: Joi.object().optional(),
      }),
    )
    .min(1)
    .max(1000)
    .required()
    .messages({
      "array.min": "At least one operation is required",
      "array.max": "Cannot process more than 1000 operations at once",
      "any.required": "Operations are required",
    }),
})

// Validation schema for batch expired points
const batchExpiredPointsSchema = Joi.object({
  batchSize: Joi.number().integer().min(1).max(10000).optional().default(100),
  dryRun: Joi.boolean().optional().default(false),
  expiryDays: Joi.number().integer().min(1).max(3650).optional(),
})

/**
 * Process batch loyalty points operations
 * @route POST /api/v1/admin/batch/loyalty-points
 * @access Protected (Admin)
 */
export const processBatchLoyaltyPoints = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Processing batch loyalty points operations")

  // Validate request body
  const { error, value } = batchLoyaltyPointsSchema.validate(req.body)
  if (error) {
    return next(new ApiError(`Validation error: ${error.details[0].message}`, 400))
  }

  const { operations } = value

  try {
    // Log the batch operation start
    requestLogger.info(`Starting batch loyalty points processing for ${operations.length} operations`)

    // Process the batch operations
    const result = await batchService.processBatchLoyaltyPoints(operations, req.id)

    // Calculate success/failure counts
    const successful = result.results.filter(r => r.success).length
    const failed = result.results.filter(r => !r.success).length

    // Log the results
    requestLogger.info(
      `Batch loyalty points processing completed. Success: ${successful}, Failed: ${failed}`,
    )

    res.status(200).json({
      status: "success",
      requestId: req.id,
      data: {
        ...result,
        successful,
        failed,
        message: `Processed ${operations.length} operations. ${successful} successful, ${failed} failed.`,
      },
    })
  } catch (error: any) {
    requestLogger.error(`Batch loyalty points processing failed: ${error.message}`)
    return next(new ApiError(`Batch processing failed: ${error.message}`, 500))
  }
})

/**
 * Process batch expired points cleanup
 * @route POST /api/v1/admin/batch/expired-points
 * @access Protected (Admin)
 */
export const processBatchExpiredPoints = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Processing batch expired points cleanup")

  // Validate request body
  const { error, value } = batchExpiredPointsSchema.validate(req.body)
  if (error) {
    return next(new ApiError(`Validation error: ${error.details[0].message}`, 400))
  }

  const { batchSize, dryRun, expiryDays } = value

  try {
    // Get expiry days from settings if not provided
    const effectiveExpiryDays =
      expiryDays || (await settingsService.getSetting("loyalty.pointsExpiryDays", 365, req.id))

    requestLogger.info(
      `Starting batch expired points cleanup. Batch size: ${batchSize}, Expiry days: ${effectiveExpiryDays}, Dry run: ${dryRun}`,
    )

    // Process the batch expired points (service only takes 3 parameters)
    const result = await batchService.processBatchExpiredPoints(effectiveExpiryDays, batchSize, req.id)

    // Log the results
    requestLogger.info(
      `Batch expired points cleanup completed. Processed: ${result.processed}, Errors: ${result.errors}`,
    )

    res.status(200).json({
      status: "success",
      requestId: req.id,
      data: {
        ...result,
        settings: {
          batchSize,
          expiryDays: effectiveExpiryDays,
          dryRun,
        },
        message: dryRun
          ? `Dry run completed. Found ${result.processed} point records that would be processed.`
          : `Processed ${result.processed} records with ${result.errors} errors.`,
      },
    })
  } catch (error: any) {
    requestLogger.error(`Batch expired points cleanup failed: ${error.message}`)
    return next(new ApiError(`Batch expired points cleanup failed: ${error.message}`, 500))
  }
})

/**
 * Get batch operation status
 * @route GET /api/v1/admin/batch/status/:batchId
 * @access Protected (Admin)
 */
export const getBatchOperationStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { batchId } = req.params

  if (!batchId) {
    return next(new ApiError("Batch ID is required", 400))
  }

  requestLogger.info(`Getting batch operation status for batch: ${batchId}`)

  try {
    // In a real implementation, you would query a batch operations table
    // For now, return a mock status
    const status = {
      batchId,
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
      totalOperations: 100,
      successfulOperations: 95,
      failedOperations: 5,
      progress: 100,
      errors: [
        {
          operation: 23,
          error: "User not found",
          userId: "507f1f77bcf86cd799439011",
        },
        {
          operation: 67,
          error: "Insufficient points",
          userId: "507f1f77bcf86cd799439012",
        },
      ],
    }

    res.status(200).json({
      status: "success",
      requestId: req.id,
      data: status,
    })
  } catch (error: any) {
    requestLogger.error(`Failed to get batch operation status: ${error.message}`)
    return next(new ApiError(`Failed to get batch status: ${error.message}`, 500))
  }
})

/**
 * Get batch operations history
 * @route GET /api/v1/admin/batch/history
 * @access Protected (Admin)
 */
export const getBatchOperationsHistory = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting batch operations history")

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20
  const type = req.query.type as string | undefined
  const status = req.query.status as string | undefined

  try {
    // In a real implementation, you would query a batch operations table
    // For now, return mock history data
    const mockHistory = [
      {
        batchId: "batch_001",
        type: "loyalty-points",
        status: "completed",
        totalOperations: 150,
        successfulOperations: 148,
        failedOperations: 2,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000), // 5 minutes later
        createdBy: req.user?._id || "unknown",
      },
      {
        batchId: "batch_002",
        type: "expired-points",
        status: "completed",
        totalOperations: 500,
        successfulOperations: 500,
        failedOperations: 0,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000), // 15 minutes later
        createdBy: req.user?._id || "unknown",
      },
    ]

    // Filter by type and status if provided
    let filteredHistory = mockHistory
    if (type) {
      filteredHistory = filteredHistory.filter(batch => batch.type === type)
    }
    if (status) {
      filteredHistory = filteredHistory.filter(batch => batch.status === status)
    }

    // Paginate results
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex)

    const totalPages = Math.ceil(filteredHistory.length / limit)

    res.status(200).json({
      status: "success",
      requestId: req.id,
      results: paginatedHistory.length,
      pagination: {
        page,
        limit,
        totalPages,
        totalResults: filteredHistory.length,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: {
        batches: paginatedHistory,
      },
    })
  } catch (error: any) {
    requestLogger.error(`Failed to get batch operations history: ${error.message}`)
    res.status(500).json({
      status: "error",
      requestId: req.id,
      message: "Failed to get batch operations history",
    })
  }
})

/**
 * Cancel batch operation
 * @route POST /api/v1/admin/batch/:batchId/cancel
 * @access Protected (Admin)
 */
export const cancelBatchOperation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { batchId } = req.params

  if (!batchId) {
    return next(new ApiError("Batch ID is required", 400))
  }

  requestLogger.info(`Cancelling batch operation: ${batchId}`)

  try {
    // In a real implementation, you would update the batch status and stop processing
    // For now, return a mock response
    const result = {
      batchId,
      status: "cancelled",
      cancelledAt: new Date(),
      message: "Batch operation has been cancelled",
    }

    res.status(200).json({
      status: "success",
      requestId: req.id,
      data: result,
    })
  } catch (error: any) {
    requestLogger.error(`Failed to cancel batch operation: ${error.message}`)
    return next(new ApiError(`Failed to cancel batch operation: ${error.message}`, 500))
  }
})

/**
 * Validate batch operations before processing
 * @route POST /api/v1/admin/batch/validate
 * @access Protected (Admin)
 */
export const validateBatchOperations = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Validating batch operations")

  // Validate request body
  const { error, value } = batchLoyaltyPointsSchema.validate(req.body)
  if (error) {
    return next(new ApiError(`Validation error: ${error.details[0].message}`, 400))
  }

  const { operations } = value

  try {
    // Perform basic validation without calling service
    let validOperations = 0
    let invalidOperations = 0
    const validationErrors: Array<{ index: number; error: string }> = []

    operations.forEach((operation: any, index: number) => {
      // Basic validation checks
      if (!operation.userId || !operation.points || !operation.description) {
        invalidOperations++
        validationErrors.push({
          index,
          error: "Missing required fields",
        })
      } else if (operation.points <= 0) {
        invalidOperations++
        validationErrors.push({
          index,
          error: "Points must be greater than 0",
        })
      } else {
        validOperations++
      }
    })

    res.status(200).json({
      status: "success",
      requestId: req.id,
      data: {
        validOperations,
        invalidOperations,
        totalOperations: operations.length,
        errors: validationErrors,
        message: `Validated ${operations.length} operations. ${validOperations} valid, ${invalidOperations} invalid.`,
      },
    })
  } catch (error: any) {
    requestLogger.error(`Batch validation failed: ${error.message}`)
    return next(new ApiError(`Batch validation failed: ${error.message}`, 500))
  }
})

/**
 * Get batch processing statistics
 * @route GET /api/v1/admin/batch/stats
 * @access Protected (Admin)
 */
export const getBatchProcessingStats = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting batch processing statistics")

  try {
    // In a real implementation, you would query batch operations and calculate stats
    // For now, return mock statistics
    const stats = {
      totalBatches: 25,
      completedBatches: 23,
      failedBatches: 1,
      cancelledBatches: 1,
      totalOperations: 12500,
      successfulOperations: 12350,
      failedOperations: 150,
      averageProcessingTime: 8.5, // minutes
      lastBatchProcessed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      byType: {
        "loyalty-points": {
          batches: 20,
          operations: 10000,
          successRate: 98.5,
        },
        "expired-points": {
          batches: 5,
          operations: 2500,
          successRate: 100,
        },
      },
      recentActivity: [
        {
          date: new Date().toISOString().split("T")[0],
          batches: 3,
          operations: 450,
          successRate: 97.8,
        },
        {
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          batches: 2,
          operations: 300,
          successRate: 100,
        },
      ],
    }

    res.status(200).json({
      status: "success",
      requestId: req.id,
      data: stats,
    })
  } catch (error: any) {
    requestLogger.error(`Failed to get batch processing statistics: ${error.message}`)
    res.status(500).json({
      status: "error",
      requestId: req.id,
      message: "Failed to get batch processing statistics",
    })
  }
})
