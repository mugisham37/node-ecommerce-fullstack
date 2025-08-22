import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import * as abTestService from "../services/ab-test.service"

/**
 * Create a new A/B test
 * @route POST /api/v1/ab-tests
 * @access Protected (Admin)
 */
export const createABTest = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Creating A/B test")

  const test = await abTestService.createABTest(req.body, req.id)

  res.status(201).json({
    status: "success",
    requestId: req.id,
    data: test,
  })
})

/**
 * Get all A/B tests
 * @route GET /api/v1/ab-tests
 * @access Protected (Admin)
 */
export const getABTests = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting A/B tests")

  const filters = {
    status: req.query.status as string | undefined,
    type: req.query.type as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
  }

  // Validate pagination parameters
  if (filters.page < 1) {
    throw new ApiError("Page must be greater than 0", 400)
  }

  if (filters.limit < 1 || filters.limit > 100) {
    throw new ApiError("Limit must be between 1 and 100", 400)
  }

  const result = await abTestService.getABTests(filters, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  })
})

/**
 * Get A/B test by ID
 * @route GET /api/v1/ab-tests/:id
 * @access Protected (Admin)
 */
export const getABTestById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  if (!id) {
    return next(new ApiError("Test ID is required", 400))
  }

  requestLogger.info(`Getting A/B test: ${id}`)

  const test = await abTestService.getABTestById(id, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: test,
  })
})

/**
 * Update A/B test
 * @route PUT /api/v1/ab-tests/:id
 * @access Protected (Admin)
 */
export const updateABTest = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  if (!id) {
    return next(new ApiError("Test ID is required", 400))
  }

  requestLogger.info(`Updating A/B test: ${id}`)

  const test = await abTestService.updateABTest(id, req.body, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: test,
  })
})

/**
 * Start A/B test
 * @route POST /api/v1/ab-tests/:id/start
 * @access Protected (Admin)
 */
export const startABTest = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  if (!id) {
    return next(new ApiError("Test ID is required", 400))
  }

  requestLogger.info(`Starting A/B test: ${id}`)

  const test = await abTestService.startABTest(id, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: test,
    message: "A/B test started successfully",
  })
})

/**
 * Pause A/B test
 * @route POST /api/v1/ab-tests/:id/pause
 * @access Protected (Admin)
 */
export const pauseABTest = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  if (!id) {
    return next(new ApiError("Test ID is required", 400))
  }

  requestLogger.info(`Pausing A/B test: ${id}`)

  const test = await abTestService.pauseABTest(id, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: test,
    message: "A/B test paused successfully",
  })
})

/**
 * Complete A/B test
 * @route POST /api/v1/ab-tests/:id/complete
 * @access Protected (Admin)
 */
export const completeABTest = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params
  const { winner } = req.body

  if (!id) {
    return next(new ApiError("Test ID is required", 400))
  }

  // Validate winner if provided
  if (winner && typeof winner !== "string") {
    return next(new ApiError("Winner must be a string", 400))
  }

  requestLogger.info(`Completing A/B test: ${id}`)

  const test = await abTestService.completeABTest(id, winner, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: test,
    message: "A/B test completed successfully",
  })
})

/**
 * Delete A/B test
 * @route DELETE /api/v1/ab-tests/:id
 * @access Protected (Admin)
 */
export const deleteABTest = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  if (!id) {
    return next(new ApiError("Test ID is required", 400))
  }

  requestLogger.info(`Deleting A/B test: ${id}`)

  const test = await abTestService.deleteABTest(id, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: test,
    message: "A/B test deleted successfully",
  })
})

/**
 * Get test results
 * @route GET /api/v1/ab-tests/:id/results
 * @access Protected (Admin)
 */
export const getTestResults = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  if (!id) {
    return next(new ApiError("Test ID is required", 400))
  }

  requestLogger.info(`Getting test results for test: ${id}`)

  const results = await abTestService.getTestResults(id, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: results,
  })
})

/**
 * Get user's test assignment
 * @route GET /api/v1/ab-tests/:id/assignment
 * @access Protected
 */
export const getUserTestAssignment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params
  const userId = req.user?._id

  if (!id) {
    return next(new ApiError("Test ID is required", 400))
  }

  if (!userId) {
    return next(new ApiError("User authentication required", 401))
  }

  requestLogger.info(`Getting test assignment for user: ${userId}, test: ${id}`)

  const assignment = await abTestService.getUserTestAssignment(userId.toString(), id, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: assignment,
  })
})

/**
 * Get all user's test assignments
 * @route GET /api/v1/ab-tests/assignments
 * @access Protected
 */
export const getUserTestAssignments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const userId = req.user?._id

  if (!userId) {
    return next(new ApiError("User authentication required", 401))
  }

  requestLogger.info(`Getting all test assignments for user: ${userId}`)

  const assignments = await abTestService.getUserTestAssignments(userId.toString(), req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: assignments.length,
    data: assignments,
  })
})

/**
 * Track test event
 * @route POST /api/v1/ab-tests/:id/track
 * @access Protected
 */
export const trackTestEvent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params
  const userId = req.user?._id
  const { eventType, amount } = req.body

  if (!id) {
    return next(new ApiError("Test ID is required", 400))
  }

  if (!userId) {
    return next(new ApiError("User authentication required", 401))
  }

  if (!eventType) {
    return next(new ApiError("Event type is required", 400))
  }

  if (!["impression", "conversion", "revenue", "engagement"].includes(eventType)) {
    return next(new ApiError("Invalid event type. Must be one of: impression, conversion, revenue, engagement", 400))
  }

  // Validate amount for revenue events
  if (eventType === "revenue") {
    if (amount === undefined || amount === null) {
      return next(new ApiError("Amount is required for revenue events", 400))
    }
    if (typeof amount !== "number" || amount < 0) {
      return next(new ApiError("Amount must be a non-negative number", 400))
    }
  }

  requestLogger.info(`Tracking test event for user: ${userId}, test: ${id}, event: ${eventType}`)

  const assignment = await abTestService.trackTestEvent(
    userId.toString(), 
    id, 
    eventType as "impression" | "conversion" | "revenue" | "engagement", 
    { amount }, 
    req.id
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: assignment,
    message: "Event tracked successfully",
  })
})

/**
 * Get active A/B tests
 * @route GET /api/v1/ab-tests/active
 * @access Protected (Admin)
 */
export const getActiveABTests = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting active A/B tests")

  const tests = await abTestService.getActiveABTests(req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: tests.length,
    data: tests,
  })
})

/**
 * Get A/B test statistics
 * @route GET /api/v1/ab-tests/:id/statistics
 * @access Protected (Admin)
 */
export const getABTestStatistics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { id } = req.params

  if (!id) {
    return next(new ApiError("Test ID is required", 400))
  }

  requestLogger.info(`Getting statistics for A/B test: ${id}`)

  // Get test results which include statistics
  const results = await abTestService.getTestResults(id, req.id)

  // Extract statistics from results
  const statistics = {
    totalParticipants: results.resultsByVariant.reduce((sum: number, variant: any) => sum + variant.users, 0),
    totalImpressions: results.resultsByVariant.reduce((sum: number, variant: any) => sum + variant.impressions, 0),
    totalConversions: results.resultsByVariant.reduce((sum: number, variant: any) => sum + variant.conversions, 0),
    totalRevenue: results.resultsByVariant.reduce((sum: number, variant: any) => sum + variant.revenue, 0),
    overallConversionRate: results.resultsByVariant.reduce((sum: number, variant: any) => sum + variant.impressions, 0) > 0 
      ? (results.resultsByVariant.reduce((sum: number, variant: any) => sum + variant.conversions, 0) / 
         results.resultsByVariant.reduce((sum: number, variant: any) => sum + variant.impressions, 0)) * 100 
      : 0,
    averageRevenuePerUser: results.resultsByVariant.reduce((sum: number, variant: any) => sum + variant.users, 0) > 0
      ? results.resultsByVariant.reduce((sum: number, variant: any) => sum + variant.revenue, 0) / 
        results.resultsByVariant.reduce((sum: number, variant: any) => sum + variant.users, 0)
      : 0,
    significance: results.significance,
    winner: results.winner,
    variants: results.resultsByVariant,
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: statistics,
  })
})
