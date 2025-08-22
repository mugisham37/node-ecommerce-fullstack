import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { getCache, setCache } from '../config/redis'
import { ApiError } from '../utils/api-error'

// Cache TTL in seconds
const CACHE_TTL = {
  ACTIVE_TESTS: 300, // 5 minutes
  TEST_DETAILS: 300, // 5 minutes
  USER_ASSIGNMENTS: 300, // 5 minutes
}

/**
 * Create a new A/B test
 * @param testData Test data
 * @param requestId Request ID for logging
 * @returns Created test
 */
export const createABTest = async (
  testData: Prisma.ABTestCreateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'ab-test-create')
  logger.info('Creating A/B test')

  try {
    // Create test with variants in a transaction
    const test = await prisma.$transaction(async (tx) => {
      // Create the test
      const createdTest = await tx.aBTest.create({
        data: {
          name: testData.name,
          description: testData.description,
          type: testData.type,
          status: testData.status || 'DRAFT',
          startDate: testData.startDate,
          endDate: testData.endDate,
          primaryGoal: testData.primaryGoal,
          secondaryGoals: testData.secondaryGoals || [],
          targetAudienceType: testData.targetAudienceType || 'all',
          targetUserIds: testData.targetUserIds || [],
          results: testData.results || {},
        },
        include: {
          variants: true,
        },
      })

      // Create variants if provided
      if (testData.variants && 'create' in testData.variants) {
        const variantsData = Array.isArray(testData.variants.create) 
          ? testData.variants.create 
          : [testData.variants.create]

        await tx.aBTestVariant.createMany({
          data: variantsData.map((variant: any) => ({
            ...variant,
            testId: createdTest.id,
          })),
        })
      }

      return createdTest
    })

    // Clear cache
    await setCache('active_tests', null, 0)

    return test
  } catch (error: any) {
    logger.error(`Error creating A/B test: ${error.message}`)
    throw error
  }
}

/**
 * Update an A/B test
 * @param testId Test ID
 * @param testData Test data
 * @param requestId Request ID for logging
 * @returns Updated test
 */
export const updateABTest = async (
  testId: string,
  testData: Prisma.ABTestUpdateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'ab-test-update')
  logger.info(`Updating A/B test: ${testId}`)

  try {
    // Find test first
    const existingTest = await prisma.aBTest.findUnique({
      where: { id: testId },
    })

    if (!existingTest) {
      throw new ApiError('A/B test not found', 404)
    }

    // Check if test is completed
    if (existingTest.status === 'COMPLETED') {
      throw new ApiError('Cannot update a completed test', 400)
    }

    // Update test
    const updatedTest = await prisma.aBTest.update({
      where: { id: testId },
      data: testData,
      include: {
        variants: true,
        assignments: {
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
        },
      },
    })

    // Clear cache
    await Promise.all([
      setCache('active_tests', null, 0),
      setCache(`test:${testId}`, null, 0),
    ])

    return updatedTest
  } catch (error: any) {
    logger.error(`Error updating A/B test: ${error.message}`)
    throw error
  }
}

/**
 * Get all A/B tests
 * @param filters Filters
 * @param requestId Request ID for logging
 * @returns A/B tests
 */
export const getABTests = async (
  filters: {
    status?: string
    type?: string
    page?: number
    limit?: number
  } = {},
  requestId?: string
): Promise<{
  data: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}> => {
  const logger = createRequestLogger(requestId || 'ab-test-list')
  logger.info('Getting A/B tests')

  try {
    const { status, type, page = 1, limit = 10 } = filters

    // Build where clause
    const where: Prisma.ABTestWhereInput = {}

    if (status) {
      where.status = status as any
    }

    if (type) {
      where.type = type as any
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get tests and total count
    const [tests, total] = await Promise.all([
      prisma.aBTest.findMany({
        where,
        include: {
          variants: true,
          _count: {
            select: {
              assignments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.aBTest.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      data: tests,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  } catch (error: any) {
    logger.error(`Error getting A/B tests: ${error.message}`)
    throw error
  }
}

/**
 * Get active A/B tests
 * @param requestId Request ID for logging
 * @returns Active A/B tests
 */
export const getActiveABTests = async (requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'ab-test-active')
  logger.info('Getting active A/B tests')

  // Try to get from cache
  const cacheKey = 'active_tests'
  const cachedTests = await getCache<any[]>(cacheKey)

  if (cachedTests) {
    logger.info('Retrieved active A/B tests from cache')
    return cachedTests
  }

  try {
    // Get active tests using PostgreSQL date comparison
    const tests = await prisma.aBTest.findMany({
      where: {
        status: 'RUNNING',
        OR: [
          { endDate: { gt: new Date() } },
          { endDate: null },
        ],
      },
      include: {
        variants: true,
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Cache tests
    await setCache(cacheKey, tests, CACHE_TTL.ACTIVE_TESTS)

    return tests
  } catch (error: any) {
    logger.error(`Error getting active A/B tests: ${error.message}`)
    throw error
  }
}

/**
 * Get A/B test by ID
 * @param testId Test ID
 * @param requestId Request ID for logging
 * @returns A/B test
 */
export const getABTestById = async (testId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'ab-test-get')
  logger.info(`Getting A/B test: ${testId}`)

  // Try to get from cache
  const cacheKey = `test:${testId}`
  const cachedTest = await getCache<any>(cacheKey)

  if (cachedTest) {
    logger.info('Retrieved A/B test from cache')
    return cachedTest
  }

  try {
    // Get test with full details
    const test = await prisma.aBTest.findUnique({
      where: { id: testId },
      include: {
        variants: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            variant: true,
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    })

    if (!test) {
      throw new ApiError('A/B test not found', 404)
    }

    // Cache test
    await setCache(cacheKey, test, CACHE_TTL.TEST_DETAILS)

    return test
  } catch (error: any) {
    logger.error(`Error getting A/B test: ${error.message}`)
    throw error
  }
}

/**
 * Start an A/B test
 * @param testId Test ID
 * @param requestId Request ID for logging
 * @returns Updated test
 */
export const startABTest = async (testId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'ab-test-start')
  logger.info(`Starting A/B test: ${testId}`)

  try {
    // Find test
    const test = await prisma.aBTest.findUnique({
      where: { id: testId },
      include: { variants: true },
    })

    if (!test) {
      throw new ApiError('A/B test not found', 404)
    }

    // Check if test can be started
    if (test.status === 'RUNNING') {
      throw new ApiError('Test is already running', 400)
    }

    if (test.status === 'COMPLETED') {
      throw new ApiError('Cannot start a completed test', 400)
    }

    // Validate test has variants
    if (test.variants.length === 0) {
      throw new ApiError('Test must have at least one variant', 400)
    }

    // Validate traffic allocation adds up to 100
    const totalAllocation = test.variants.reduce((sum, variant) => sum + variant.trafficAllocation, 0)
    if (totalAllocation !== 100) {
      throw new ApiError('Variant traffic allocation must add up to 100%', 400)
    }

    // Update test
    const updatedTest = await prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: 'RUNNING',
        startDate: new Date(),
      },
      include: {
        variants: true,
      },
    })

    // Clear cache
    await Promise.all([
      setCache('active_tests', null, 0),
      setCache(`test:${testId}`, null, 0),
    ])

    return updatedTest
  } catch (error: any) {
    logger.error(`Error starting A/B test: ${error.message}`)
    throw error
  }
}

/**
 * Pause an A/B test
 * @param testId Test ID
 * @param requestId Request ID for logging
 * @returns Updated test
 */
export const pauseABTest = async (testId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Pausing A/B test: ${testId}`)

  try {
    // Find test
    const test = await prisma.aBTest.findUnique({
      where: { id: testId },
    })

    if (!test) {
      throw new ApiError('A/B test not found', 404)
    }

    // Check if test can be paused
    if (test.status !== 'RUNNING') {
      throw new ApiError('Test is not running', 400)
    }

    // Update test
    const updatedTest = await prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: 'PAUSED',
      },
      include: {
        variants: true,
      },
    })

    // Clear cache
    await Promise.all([
      setCache('active_tests', null, 0),
      setCache(`test:${testId}`, null, 0),
    ])

    return updatedTest
  } catch (error: any) {
    logger.error(`Error pausing A/B test: ${error.message}`)
    throw error
  }
}

/**
 * Complete an A/B test
 * @param testId Test ID
 * @param winner Winner variant name
 * @param requestId Request ID for logging
 * @returns Updated test
 */
export const completeABTest = async (
  testId: string,
  winner?: string,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Completing A/B test: ${testId}`)

  try {
    // Find test with variants and assignments
    const test = await prisma.aBTest.findUnique({
      where: { id: testId },
      include: {
        variants: true,
        assignments: true,
      },
    })

    if (!test) {
      throw new ApiError('A/B test not found', 404)
    }

    // Check if test can be completed
    if (test.status === 'COMPLETED') {
      throw new ApiError('Test is already completed', 400)
    }

    let finalWinner = winner

    // Set winner if provided
    if (winner) {
      // Check if winner is a valid variant
      const isValidVariant = test.variants.some((variant) => variant.name === winner)
      if (!isValidVariant) {
        throw new ApiError('Invalid winner variant', 400)
      }
    } else {
      // Determine winner based on primary goal
      const determinedWinner = await determineWinner(test, requestId)
      finalWinner = determinedWinner ?? undefined
    }

    // Update test
    const updatedTest = await prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: 'COMPLETED',
        endDate: new Date(),
        winner: finalWinner,
      },
      include: {
        variants: true,
        assignments: {
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
        },
      },
    })

    // Clear cache
    await Promise.all([
      setCache('active_tests', null, 0),
      setCache(`test:${testId}`, null, 0),
    ])

    return updatedTest
  } catch (error: any) {
    logger.error(`Error completing A/B test: ${error.message}`)
    throw error
  }
}

/**
 * Delete an A/B test
 * @param testId Test ID
 * @param requestId Request ID for logging
 * @returns Deleted test
 */
export const deleteABTest = async (testId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Deleting A/B test: ${testId}`)

  try {
    // Find test
    const test = await prisma.aBTest.findUnique({
      where: { id: testId },
    })

    if (!test) {
      throw new ApiError('A/B test not found', 404)
    }

    // Check if test can be deleted
    if (test.status === 'RUNNING') {
      throw new ApiError('Cannot delete a running test', 400)
    }

    // Delete test and related data in transaction
    const deletedTest = await prisma.$transaction(async (tx) => {
      // Delete user assignments
      await tx.userTestAssignment.deleteMany({
        where: { testId },
      })

      // Delete variants
      await tx.aBTestVariant.deleteMany({
        where: { testId },
      })

      // Delete test
      const deleted = await tx.aBTest.delete({
        where: { id: testId },
      })

      return deleted
    })

    // Clear cache
    await Promise.all([
      setCache('active_tests', null, 0),
      setCache(`test:${testId}`, null, 0),
    ])

    return deletedTest
  } catch (error: any) {
    logger.error(`Error deleting A/B test: ${error.message}`)
    throw error
  }
}

/**
 * Get user's test assignment
 * @param userId User ID
 * @param testId Test ID
 * @param requestId Request ID for logging
 * @returns User's test assignment
 */
export const getUserTestAssignment = async (
  userId: string,
  testId: string,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Getting test assignment for user: ${userId}, test: ${testId}`)

  // Try to get from cache
  const cacheKey = `user_assignment:${userId}:${testId}`
  const cachedAssignment = await getCache<any>(cacheKey)

  if (cachedAssignment) {
    logger.info('Retrieved user test assignment from cache')
    return cachedAssignment
  }

  try {
    // Get test with variants
    const test = await prisma.aBTest.findUnique({
      where: { id: testId },
      include: { variants: true },
    })

    if (!test) {
      throw new ApiError('A/B test not found', 404)
    }

    // Check if test is running
    if (test.status !== 'RUNNING') {
      throw new ApiError('Test is not running', 400)
    }

    // Get or create user's assignment
    let assignment = await prisma.userTestAssignment.findUnique({
      where: {
        userId_testId: {
          userId,
          testId,
        },
      },
      include: {
        variant: true,
      },
    })

    // If assignment doesn't exist, create it
    if (!assignment) {
      // Assign variant based on traffic allocation
      const selectedVariant = assignVariant(test.variants)

      // Create assignment
      assignment = await prisma.userTestAssignment.create({
        data: {
          userId,
          testId,
          variantId: selectedVariant.id,
        },
        include: {
          variant: true,
        },
      })
    }

    // Get variant details from test
    const variantDetails = test.variants.find((v) => v.id === assignment!.variantId)

    // Prepare result
    const result = {
      ...assignment,
      variantDetails,
    }

    // Cache result
    await setCache(cacheKey, result, CACHE_TTL.USER_ASSIGNMENTS)

    return result
  } catch (error: any) {
    logger.error(`Error getting user test assignment: ${error.message}`)
    throw error
  }
}

/**
 * Get all user's test assignments
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns User's test assignments
 */
export const getUserTestAssignments = async (userId: string, requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Getting all test assignments for user: ${userId}`)

  try {
    // Get active tests
    const activeTests = await getActiveABTests(requestId)

    // Get user's assignments for active tests
    const assignments = await Promise.allSettled(
      activeTests.map(async (test) => {
        try {
          const assignment = await getUserTestAssignment(userId, test.id, requestId)
          return {
            test: {
              id: test.id,
              name: test.name,
              type: test.type,
            },
            variant: assignment.variant.name,
            variantDetails: assignment.variantDetails,
          }
        } catch (error: any) {
          logger.error(`Error getting assignment for test ${test.id}: ${error.message}`)
          return null
        }
      })
    )

    // Filter out failed assignments and null values
    return assignments
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
  } catch (error: any) {
    logger.error(`Error getting user test assignments: ${error.message}`)
    throw error
  }
}

/**
 * Track test event
 * @param userId User ID
 * @param testId Test ID
 * @param eventType Event type
 * @param eventData Event data
 * @param requestId Request ID for logging
 * @returns Updated assignment
 */
export const trackTestEvent = async (
  userId: string,
  testId: string,
  eventType: 'impression' | 'conversion' | 'revenue' | 'engagement',
  eventData: {
    amount?: number
  } = {},
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Tracking test event for user: ${userId}, test: ${testId}, event: ${eventType}`)

  try {
    // Get test
    const test = await prisma.aBTest.findUnique({
      where: { id: testId },
      include: { variants: true },
    })

    if (!test) {
      throw new ApiError('A/B test not found', 404)
    }

    // Check if test is running
    if (test.status !== 'RUNNING') {
      logger.info('Test is not running, not tracking event')
      return null
    }

    // Get or create user's assignment
    let assignment = await prisma.userTestAssignment.findUnique({
      where: {
        userId_testId: {
          userId,
          testId,
        },
      },
    })

    if (!assignment) {
      // Create assignment if it doesn't exist
      const selectedVariant = assignVariant(test.variants)
      assignment = await prisma.userTestAssignment.create({
        data: {
          userId,
          testId,
          variantId: selectedVariant.id,
        },
      })
    }

    // Update assignment based on event type
    const updateData: Prisma.UserTestAssignmentUpdateInput = {
      lastActivity: new Date(),
    }

    switch (eventType) {
      case 'impression':
        updateData.impressions = { increment: 1 }
        break
      case 'conversion':
        updateData.conversions = { increment: 1 }
        break
      case 'revenue':
        updateData.revenue = { increment: eventData.amount || 0 }
        break
      case 'engagement':
        updateData.engagements = { increment: 1 }
        break
    }

    // Update assignment
    const updatedAssignment = await prisma.userTestAssignment.update({
      where: { id: assignment.id },
      data: updateData,
      include: {
        variant: true,
      },
    })

    // Update test results
    await updateTestResults(test, assignment.variantId, eventType, eventData, requestId)

    // Clear cache
    const cacheKey = `user_assignment:${userId}:${testId}`
    await Promise.all([
      setCache(cacheKey, null, 0),
      setCache(`test:${testId}`, null, 0),
    ])

    return updatedAssignment
  } catch (error: any) {
    logger.error(`Error tracking test event: ${error.message}`)
    throw error
  }
}

/**
 * Get test results
 * @param testId Test ID
 * @param requestId Request ID for logging
 * @returns Test results
 */
export const getTestResults = async (testId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Getting test results for test: ${testId}`)

  try {
    // Get test with variants and assignments
    const test = await prisma.aBTest.findUnique({
      where: { id: testId },
      include: {
        variants: true,
        assignments: {
          include: {
            variant: true,
          },
        },
      },
    })

    if (!test) {
      throw new ApiError('A/B test not found', 404)
    }

    // Calculate results by variant using PostgreSQL aggregation
    const variantResults = await prisma.userTestAssignment.groupBy({
      by: ['variantId'],
      where: { testId },
      _count: {
        userId: true,
      },
      _sum: {
        impressions: true,
        conversions: true,
        revenue: true,
        engagements: true,
      },
    })

    // Map results to variants
    const resultsByVariant = test.variants.map((variant) => {
      const result = variantResults.find((r) => r.variantId === variant.id)
      
      const users = result?._count.userId || 0
      const impressions = result?._sum.impressions || 0
      const conversions = result?._sum.conversions || 0
      const revenue = result?._sum.revenue || 0
      const engagements = result?._sum.engagements || 0

      // Calculate conversion rate
      const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0

      // Calculate average revenue per user
      const averageRevenue = users > 0 ? Number(revenue) / users : 0

      return {
        variant: variant.name,
        variantId: variant.id,
        users,
        impressions,
        conversions,
        revenue: Number(revenue),
        engagements,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageRevenue: Math.round(averageRevenue * 100) / 100,
      }
    })

    // Calculate statistical significance
    const significanceResults = calculateStatisticalSignificance(resultsByVariant)

    return {
      test,
      resultsByVariant,
      significance: significanceResults,
      winner: test.winner || significanceResults.winner,
    }
  } catch (error: any) {
    logger.error(`Error getting test results: ${error.message}`)
    throw error
  }
}

/**
 * Assign variant based on traffic allocation
 * @param variants Test variants
 * @returns Assigned variant
 */
const assignVariant = (variants: any[]): any => {
  // Generate random number between 0 and 100
  const random = Math.random() * 100

  // Calculate cumulative allocation
  let cumulativeAllocation = 0

  // Find variant based on traffic allocation
  for (const variant of variants) {
    cumulativeAllocation += variant.trafficAllocation
    if (random <= cumulativeAllocation) {
      return variant
    }
  }

  // Default to first variant
  return variants[0]
}

/**
 * Update test results in the test record
 * @param test A/B test
 * @param variantId Variant ID
 * @param eventType Event type
 * @param eventData Event data
 * @param requestId Request ID for logging
 */
const updateTestResults = async (
  test: any,
  variantId: string,
  eventType: 'impression' | 'conversion' | 'revenue' | 'engagement',
  eventData: { amount?: number } = {},
  requestId?: string
): Promise<void> => {
  const logger = createRequestLogger(requestId)

  try {
    // Get current results
    const results = test.results as any || {
      impressions: {},
      conversions: {},
      revenue: {},
      engagements: {},
    }

    // Update results based on event type
    switch (eventType) {
      case 'impression':
        results.impressions[variantId] = (results.impressions[variantId] || 0) + 1
        break
      case 'conversion':
        results.conversions[variantId] = (results.conversions[variantId] || 0) + 1
        break
      case 'revenue':
        results.revenue[variantId] = (results.revenue[variantId] || 0) + (eventData.amount || 0)
        break
      case 'engagement':
        results.engagements[variantId] = (results.engagements[variantId] || 0) + 1
        break
    }

    // Update test
    await prisma.aBTest.update({
      where: { id: test.id },
      data: { results },
    })
  } catch (error: any) {
    logger.error(`Error updating test results: ${error.message}`)
    // Don't throw error to avoid breaking the main flow
  }
}

/**
 * Determine winner based on primary goal
 * @param test A/B test
 * @param requestId Request ID for logging
 * @returns Winner variant name or null
 */
const determineWinner = async (test: any, requestId?: string): Promise<string | null> => {
  const logger = createRequestLogger(requestId)

  try {
    // Get test results
    const testResults = await getTestResults(test.id, requestId)
    const { resultsByVariant } = testResults

    if (resultsByVariant.length === 0) {
      return null
    }

    // Determine winner based on primary goal
    switch (test.primaryGoal) {
      case 'conversion':
        return determineWinnerByMetric(resultsByVariant, 'conversionRate')
      case 'revenue':
        return determineWinnerByMetric(resultsByVariant, 'revenue')
      case 'engagement':
        return determineWinnerByMetric(resultsByVariant, 'engagements')
      default:
        return null
    }
  } catch (error: any) {
    logger.error(`Error determining winner: ${error.message}`)
    return null
  }
}

/**
 * Determine winner by metric
 * @param variants Variant results
 * @param metric Metric to compare
 * @returns Winner variant name or null
 */
const determineWinnerByMetric = (variants: any[], metric: string): string | null => {
  if (variants.length === 0) {
    return null
  }

  // Sort variants by metric value (descending)
  const sortedVariants = [...variants].sort((a, b) => b[metric] - a[metric])

  // Return variant with highest metric value
  return sortedVariants[0][metric] > 0 ? sortedVariants[0].variant : null
}

/**
 * Calculate statistical significance
 * @param results Results by variant
 * @returns Significance results
 */
const calculateStatisticalSignificance = (results: any[]): any => {
  // If less than 2 variants, return null
  if (results.length < 2) {
    return {
      isSignificant: false,
      confidenceLevel: 0,
      winner: null,
    }
  }

  // Sort variants by conversion rate (descending)
  const sortedResults = [...results].sort((a, b) => b.conversionRate - a.conversionRate)

  // Get control and variation
  const control = sortedResults[1]
  const variation = sortedResults[0]

  // Calculate z-score
  const p1 = control.impressions > 0 ? control.conversions / control.impressions : 0
  const p2 = variation.impressions > 0 ? variation.conversions / variation.impressions : 0
  const p = (control.conversions + variation.conversions) / (control.impressions + variation.impressions)
  const se = Math.sqrt(p * (1 - p) * (1 / control.impressions + 1 / variation.impressions))

  // Avoid division by zero
  const zScore = se > 0 ? (p2 - p1) / se : 0

  // Calculate confidence level
  const confidenceLevel = calculateConfidenceLevel(zScore)

  // Determine if result is significant (95% confidence)
  const isSignificant = confidenceLevel >= 95

  return {
    isSignificant,
    confidenceLevel,
    winner: isSignificant ? variation.variant : null,
    control: control.variant,
    variation: variation.variant,
    improvement: p1 > 0 ? ((p2 - p1) / p1) * 100 : 0,
  }
}

/**
 * Calculate confidence level from z-score
 * @param zScore Z-score
 * @returns Confidence level (0-100)
 */
const calculateConfidenceLevel = (zScore: number): number => {
  // Approximate confidence level from z-score
  // This is a simplified calculation
  const absZ = Math.abs(zScore)
  let confidence = 0

  if (absZ >= 1.96) {
    confidence = 95
  } else if (absZ >= 1.645) {
    confidence = 90
  } else if (absZ >= 1.28) {
    confidence = 80
  } else if (absZ >= 0.84) {
    confidence = 60
  } else {
    confidence = 50
  }

  return confidence
}
