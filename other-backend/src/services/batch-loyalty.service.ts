import { createRequestLogger } from '../utils/logger'
import * as loyaltyService from './loyalty.service'
import prisma from '../database/client'
import { ApiError } from '../utils/api-error'

// Enum for loyalty transaction types
export enum LoyaltyTransactionType {
  ORDER = "ORDER",
  REFERRAL = "REFERRAL",
  MANUAL = "MANUAL",
  OTHER = "OTHER"
}

/**
 * Process loyalty points in batch
 * @param operations Array of operations
 * @param requestId Request ID for logging
 * @returns Results of batch processing
 */
export const processBatchLoyaltyPoints = async (
  operations: Array<{
    userId: string
    points: number
    description: string
    referenceId?: string
    type?: 'order' | 'referral' | 'manual' | 'other'
  }>,
  requestId?: string
): Promise<{
  success: boolean
  results: Array<{
    userId: string
    success: boolean
    points: number
    error?: string
  }>
}> => {
  const logger = createRequestLogger(requestId || 'batch-loyalty-process')
  logger.info(`Processing batch loyalty points for ${operations.length} operations`)

  const results = []
  let hasErrors = false

  // Process operations in chunks to avoid overwhelming the database
  const CHUNK_SIZE = 50
  const chunks = []

  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    chunks.push(operations.slice(i, i + CHUNK_SIZE))
  }

  for (const chunk of chunks) {
    // Process chunk in parallel
    const chunkResults = await Promise.all(
      chunk.map(async (operation) => {
        try {
          // Convert lowercase to uppercase enum values
          const typeMapping: Record<string, 'ORDER' | 'REFERRAL' | 'MANUAL' | 'OTHER'> = {
            'order': 'ORDER',
            'referral': 'REFERRAL', 
            'manual': 'MANUAL',
            'other': 'OTHER'
          }
          
          await loyaltyService.addLoyaltyPoints(
            operation.userId,
            operation.points,
            operation.description,
            operation.referenceId,
            typeMapping[operation.type || 'other'],
            requestId
          )

          return {
            userId: operation.userId,
            success: true,
            points: operation.points,
          }
        } catch (error: any) {
          hasErrors = true
          return {
            userId: operation.userId,
            success: false,
            points: operation.points,
            error: error.message,
          }
        }
      })
    )

    results.push(...chunkResults)
  }

  return {
    success: !hasErrors,
    results,
  }
}

/**
 * Process expired loyalty points in batch
 * @param expiryDays Number of days after which points expire
 * @param batchSize Batch size for processing
 * @param requestId Request ID for logging
 * @returns Results of batch processing
 */
export const processBatchExpiredPoints = async (
  expiryDays = 365,
  batchSize = 100,
  requestId?: string
): Promise<{
  success: boolean
  processed: number
  errors: number
}> => {
  const logger = createRequestLogger(requestId || 'batch-loyalty-expire')
  logger.info(`Processing batch expired points with expiry days: ${expiryDays}, batch size: ${batchSize}`)

  try {
    // Calculate expiry date
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() - expiryDays)

    // Find loyalty history entries older than expiry date that haven't been processed
    const historyEntries = await prisma.loyaltyHistory.findMany({
      where: {
        createdAt: { lt: expiryDate },
        type: { in: ['ORDER', 'REFERRAL', 'MANUAL', 'OTHER'] }, // Only positive point entries
        points: { gt: 0 },
        processed: { not: true },
      },
      include: {
        user: true,
      },
      take: batchSize,
    })

    logger.info(`Found ${historyEntries.length} loyalty history entries to expire`)

    let processed = 0
    let errors = 0

    // Process entries in chunks
    const CHUNK_SIZE = 20
    const chunks = []

    for (let i = 0; i < historyEntries.length; i += CHUNK_SIZE) {
      chunks.push(historyEntries.slice(i, i + CHUNK_SIZE))
    }

    for (const chunk of chunks) {
      // Process chunk in parallel
      await Promise.all(
        chunk.map(async (entry) => {
          try {
            // Mark entry as processed
            await prisma.loyaltyHistory.update({
              where: { id: entry.id },
              data: { processed: true },
            })

            // Add expiry entry to history
            await prisma.loyaltyHistory.create({
              data: {
                userId: entry.userId,
                type: 'EXPIRE',
                points: -entry.points,
                description: `Points expired from ${new Date(entry.createdAt).toLocaleDateString()}`,
              },
            })

            // Update user's points
            await loyaltyService.adjustCustomerPoints(
              entry.userId,
              -entry.points,
              `Points expired from ${new Date(entry.createdAt).toLocaleDateString()}`,
              requestId
            )

            processed++
          } catch (error: any) {
            logger.error(`Error processing loyalty expiry for user ${entry.userId}: ${error.message}`)
            errors++
          }
        })
      )
    }

    return {
      success: errors === 0,
      processed,
      errors,
    }
  } catch (error: any) {
    logger.error(`Error in batch expired points processing: ${error.message}`)
    throw new ApiError(`Failed to process expired points: ${error.message}`, 500)
  }
}

/**
 * Bulk award loyalty points to multiple users
 * @param userIds Array of user IDs
 * @param points Points to award
 * @param description Description for the award
 * @param type Type of award
 * @param requestId Request ID for logging
 * @returns Results of bulk award
 */
export const bulkAwardLoyaltyPoints = async (
  userIds: string[],
  points: number,
  description: string,
  type: 'order' | 'referral' | 'manual' | 'other' = 'manual',
  requestId?: string
): Promise<{
  success: boolean
  awarded: number
  errors: number
  results: Array<{
    userId: string
    success: boolean
    error?: string
  }>
}> => {
  const logger = createRequestLogger(requestId || 'batch-loyalty-bulk-award')
  logger.info(`Bulk awarding ${points} points to ${userIds.length} users`)

  const operations = userIds.map(userId => ({
    userId,
    points,
    description,
    type,
  }))

  const result = await processBatchLoyaltyPoints(operations, requestId)

  return {
    success: result.success,
    awarded: result.results.filter(r => r.success).length,
    errors: result.results.filter(r => !r.success).length,
    results: result.results.map(r => ({
      userId: r.userId,
      success: r.success,
      error: r.error,
    })),
  }
}

/**
 * Process loyalty points for completed orders in batch
 * @param orderIds Array of order IDs
 * @param pointsPerOrder Points to award per order
 * @param requestId Request ID for logging
 * @returns Results of batch processing
 */
export const processBatchOrderLoyaltyPoints = async (
  orderIds: string[],
  pointsPerOrder?: number,
  requestId?: string
): Promise<{
  success: boolean
  processed: number
  errors: number
  results: Array<{
    orderId: string
    userId: string
    points: number
    success: boolean
    error?: string
  }>
}> => {
  const logger = createRequestLogger(requestId || 'batch-loyalty-orders')
  logger.info(`Processing loyalty points for ${orderIds.length} orders`)

  try {
    // Get orders with user information
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        status: { in: ['DELIVERED', 'SHIPPED'] },
      },
      include: {
        user: true,
      },
    })

    const results = []
    let processed = 0
    let errors = 0

    // Process orders in chunks
    const CHUNK_SIZE = 20
    const chunks = []

    for (let i = 0; i < orders.length; i += CHUNK_SIZE) {
      chunks.push(orders.slice(i, i + CHUNK_SIZE))
    }

    for (const chunk of chunks) {
      // Process chunk in parallel
      const chunkResults = await Promise.all(
        chunk.map(async (order) => {
          try {
            // Calculate points based on order total or use provided points
            const points = pointsPerOrder || Math.floor(Number(order.total) / 10) // 1 point per $10 spent

            await loyaltyService.addLoyaltyPoints(
              order.userId,
              points,
              `Points earned from order ${order.orderNumber}`,
              order.id,
              'ORDER',
              requestId
            )

            processed++
            return {
              orderId: order.id,
              userId: order.userId,
              points,
              success: true,
            }
          } catch (error: any) {
            errors++
            return {
              orderId: order.id,
              userId: order.userId,
              points: pointsPerOrder || 0,
              success: false,
              error: error.message,
            }
          }
        })
      )

      results.push(...chunkResults)
    }

    return {
      success: errors === 0,
      processed,
      errors,
      results,
    }
  } catch (error: any) {
    logger.error(`Error processing batch order loyalty points: ${error.message}`)
    throw new ApiError(`Failed to process order loyalty points: ${error.message}`, 500)
  }
}

/**
 * Recalculate loyalty points for all users
 * @param requestId Request ID for logging
 * @returns Results of recalculation
 */
export const recalculateAllLoyaltyPoints = async (
  requestId?: string
): Promise<{
  success: boolean
  usersProcessed: number
  errors: number
}> => {
  const logger = createRequestLogger(requestId || 'batch-loyalty-recalculate')
  logger.info('Recalculating loyalty points for all users')

  try {
    // Get all users with loyalty points
    const users = await prisma.user.findMany({
      where: {
        loyaltyPoints: { gt: 0 },
      },
      select: {
        id: true,
        loyaltyPoints: true,
      },
    })

    let usersProcessed = 0
    let errors = 0

    // Process users in chunks
    const CHUNK_SIZE = 50
    const chunks = []

    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
      chunks.push(users.slice(i, i + CHUNK_SIZE))
    }

    for (const chunk of chunks) {
      // Process chunk in parallel
      await Promise.all(
        chunk.map(async (user) => {
          try {
            // Calculate total points from history
            const totalPoints = await prisma.loyaltyHistory.aggregate({
              where: {
                userId: user.id,
              },
              _sum: {
                points: true,
              },
            })

            const calculatedPoints = Number(totalPoints._sum.points) || 0

            // Update user's loyalty points if different
            if (calculatedPoints !== user.loyaltyPoints) {
              await prisma.user.update({
                where: { id: user.id },
                data: { loyaltyPoints: calculatedPoints },
              })

              logger.info(`Updated loyalty points for user ${user.id}: ${user.loyaltyPoints} -> ${calculatedPoints}`)
            }

            usersProcessed++
          } catch (error: any) {
            logger.error(`Error recalculating loyalty points for user ${user.id}: ${error.message}`)
            errors++
          }
        })
      )
    }

    return {
      success: errors === 0,
      usersProcessed,
      errors,
    }
  } catch (error: any) {
    logger.error(`Error recalculating all loyalty points: ${error.message}`)
    throw new ApiError(`Failed to recalculate loyalty points: ${error.message}`, 500)
  }
}
