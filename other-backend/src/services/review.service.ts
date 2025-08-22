import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import * as loyaltyService from './loyalty.service'
import * as notificationService from './notification.service'
import { getCache, setCache } from '../config/redis'

// Cache TTL in seconds
const CACHE_TTL = {
  PRODUCT_REVIEWS: 1800, // 30 minutes
  REVIEW_STATS: 3600, // 1 hour
  USER_REVIEWS: 1800, // 30 minutes
}

/**
 * Create a new review with loyalty points integration
 * @param reviewData Review data
 * @param requestId Request ID for logging
 * @returns Created review
 */
export const createReview = async (
  reviewData: {
    userId: string
    productId: string
    rating: number
    title?: string
    comment?: string
    images?: string[]
    pros?: string[]
    cons?: string[]
  },
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'review-create')
  logger.info(`Creating new review for product ${reviewData.productId} by user ${reviewData.userId}`)

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: reviewData.productId },
      select: {
        id: true,
        name: true,
        active: true,
      },
    })

    if (!product) {
      throw new ApiError('Product not found', 404)
    }

    if (!product.active) {
      throw new ApiError('Cannot review inactive product', 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: reviewData.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      throw new ApiError('User not found', 404)
    }

    // Check if user has already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: {
        userId: reviewData.userId,
        productId: reviewData.productId,
      },
    })

    if (existingReview) {
      throw new ApiError('You have already reviewed this product', 400)
    }

    // Check if user has purchased the product
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId: reviewData.productId,
        order: {
          userId: reviewData.userId,
          status: { in: ['DELIVERED', 'SHIPPED'] },
        },
      },
    })

    const isVerified = Boolean(hasPurchased) || user.role === 'ADMIN'

    // Create review in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the review
      const review = await tx.review.create({
        data: {
          userId: reviewData.userId,
          productId: reviewData.productId,
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment,
          images: reviewData.images || [],
          pros: reviewData.pros || [],
          cons: reviewData.cons || [],
          verified: isVerified,
          status: 'APPROVED', // Auto-approve for now, can be changed to PENDING for moderation
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // Update product ratings
      await updateProductRatings(reviewData.productId, requestId, tx)

      return review
    })

    // Award loyalty points for review (outside transaction to avoid blocking)
    try {
      const reviewBonus = 50 // Default review bonus points
      
      if (reviewBonus > 0) {
        await loyaltyService.addLoyaltyPoints(
          reviewData.userId,
          reviewBonus,
          `Points earned for reviewing ${product.name}`,
          result.id,
          'OTHER',
          requestId,
        )

        // Send notification about points earned
        await notificationService.sendLoyaltyNotification(
          reviewData.userId,
          'points_earned',
          {
            points: reviewBonus,
            description: `Points earned for reviewing ${product.name}`,
            currentPoints: (user as any).loyaltyPoints + reviewBonus,
          },
          requestId,
        )
      }
    } catch (loyaltyError: any) {
      logger.error(`Error awarding loyalty points for review: ${loyaltyError.message}`)
      // Continue processing even if loyalty points fail
    }

    // Clear cache
    await Promise.all([
      setCache(`product_reviews:${reviewData.productId}`, null, 1),
      setCache(`user_reviews:${reviewData.userId}`, null, 1),
      setCache(`review_stats:${reviewData.productId}`, null, 1),
    ])

    return result
  } catch (error: any) {
    logger.error(`Error creating review: ${error.message}`)
    throw error
  }
}

/**
 * Update product ratings after review changes
 * @param productId Product ID
 * @param requestId Request ID for logging
 * @param tx Optional transaction
 */
export const updateProductRatings = async (
  productId: string,
  requestId?: string,
  tx?: Prisma.TransactionClient,
): Promise<void> => {
  const logger = createRequestLogger(requestId || 'review-update-ratings')
  logger.info(`Updating product ratings for product ${productId}`)

  try {
    const client = tx || prisma

    // Get all approved reviews for the product
    const reviews = await client.review.findMany({
      where: {
        productId,
        status: 'APPROVED',
      },
      select: {
        rating: true,
      },
    })

    if (reviews.length === 0) {
      // No reviews, reset ratings
      await client.product.update({
        where: { id: productId },
        data: {
          averageRating: 0,
          reviewCount: 0,
        },
      })
      return
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = totalRating / reviews.length

    // Update product with new ratings
    await client.product.update({
      where: { id: productId },
      data: {
        averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
        reviewCount: reviews.length,
      },
    })

    logger.info(`Updated product ${productId} ratings: ${averageRating} (${reviews.length} reviews)`)
  } catch (error: any) {
    logger.error(`Error updating product ratings: ${error.message}`)
    throw error
  }
}

/**
 * Get reviews for a product
 * @param productId Product ID
 * @param options Query options
 * @param requestId Request ID for logging
 * @returns Product reviews with pagination
 */
export const getProductReviews = async (
  productId: string,
  options: {
    page?: number
    limit?: number
    sort?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful'
    rating?: number
    verified?: boolean
  } = {},
  requestId?: string,
): Promise<{
  reviews: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    averageRating: number
    totalReviews: number
    ratingDistribution: { rating: number; count: number }[]
  }
}> => {
  const logger = createRequestLogger(requestId || 'review-get-product')
  logger.info(`Getting reviews for product ${productId}`)

  // Set default options
  const page = options.page || 1
  const limit = options.limit || 10
  const sort = options.sort || 'newest'

  // Try to get from cache
  const cacheKey = `product_reviews:${productId}:${JSON.stringify(options)}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved product reviews from cache')
    return cachedData
  }

  try {
    // Build where clause
    const where: Prisma.ReviewWhereInput = {
      productId,
      status: 'APPROVED',
    }

    if (options.rating) {
      where.rating = options.rating
    }

    if (options.verified !== undefined) {
      where.verified = options.verified
    }

    // Determine sort order
    let orderBy: Prisma.ReviewOrderByWithRelationInput = { createdAt: 'desc' }
    
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'rating_high':
        orderBy = { rating: 'desc' }
        break
      case 'rating_low':
        orderBy = { rating: 'asc' }
        break
      case 'helpful':
        orderBy = { helpful: 'desc' }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    // Calculate skip value
    const skip = (page - 1) * limit

    // Get reviews and total count
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              helpfulVotes: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])

    // Get review statistics
    const stats = await getReviewStats(productId, requestId)

    const totalPages = Math.ceil(total / limit)

    const result = {
      reviews: reviews.map(review => ({
        ...review,
        user: {
          id: review.user.id,
          name: `${review.user.firstName} ${review.user.lastName}`,
          firstName: review.user.firstName,
        },
        helpfulCount: review._count.helpfulVotes,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats,
    }

    // Cache the result
    await setCache(cacheKey, result, CACHE_TTL.PRODUCT_REVIEWS)

    return result
  } catch (error: any) {
    logger.error(`Error getting product reviews: ${error.message}`)
    throw error
  }
}

/**
 * Get review statistics for a product
 * @param productId Product ID
 * @param requestId Request ID for logging
 * @returns Review statistics
 */
export const getReviewStats = async (
  productId: string,
  requestId?: string,
): Promise<{
  averageRating: number
  totalReviews: number
  ratingDistribution: { rating: number; count: number }[]
}> => {
  const logger = createRequestLogger(requestId || 'review-stats')
  logger.info(`Getting review stats for product ${productId}`)

  // Try to get from cache
  const cacheKey = `review_stats:${productId}`
  const cachedStats = await getCache<any>(cacheKey)

  if (cachedStats) {
    logger.info('Retrieved review stats from cache')
    return cachedStats
  }

  try {
    // Get rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId,
        status: 'APPROVED',
      },
      _count: {
        rating: true,
      },
      orderBy: {
        rating: 'desc',
      },
    })

    // Calculate totals
    const totalReviews = ratingDistribution.reduce((sum, item) => sum + item._count.rating, 0)
    const totalRatingPoints = ratingDistribution.reduce((sum, item) => sum + (item.rating * item._count.rating), 0)
    const averageRating = totalReviews > 0 ? totalRatingPoints / totalReviews : 0

    // Format rating distribution
    const formattedDistribution = [5, 4, 3, 2, 1].map(rating => {
      const found = ratingDistribution.find(item => item.rating === rating)
      return {
        rating,
        count: found ? found._count.rating : 0,
      }
    })

    const stats = {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
      ratingDistribution: formattedDistribution,
    }

    // Cache the stats
    await setCache(cacheKey, stats, CACHE_TTL.REVIEW_STATS)

    return stats
  } catch (error: any) {
    logger.error(`Error getting review stats: ${error.message}`)
    throw error
  }
}

/**
 * Get user's reviews
 * @param userId User ID
 * @param options Query options
 * @param requestId Request ID for logging
 * @returns User reviews with pagination
 */
export const getUserReviews = async (
  userId: string,
  options: {
    page?: number
    limit?: number
    status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  } = {},
  requestId?: string,
): Promise<{
  reviews: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}> => {
  const logger = createRequestLogger(requestId || 'review-get-user')
  logger.info(`Getting reviews for user ${userId}`)

  // Set default options
  const page = options.page || 1
  const limit = options.limit || 10

  // Try to get from cache
  const cacheKey = `user_reviews:${userId}:${JSON.stringify(options)}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved user reviews from cache')
    return cachedData
  }

  try {
    // Build where clause
    const where: Prisma.ReviewWhereInput = { userId }

    if (options.status) {
      where.status = options.status
    }

    // Calculate skip value
    const skip = (page - 1) * limit

    // Get reviews and total count
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              slug: true,
            },
          },
          _count: {
            select: {
              helpfulVotes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    const result = {
      reviews: reviews.map(review => ({
        ...review,
        helpfulCount: review._count.helpfulVotes,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }

    // Cache the result
    await setCache(cacheKey, result, CACHE_TTL.USER_REVIEWS)

    return result
  } catch (error: any) {
    logger.error(`Error getting user reviews: ${error.message}`)
    throw error
  }
}

/**
 * Update a review
 * @param reviewId Review ID
 * @param userId User ID (for authorization)
 * @param updateData Update data
 * @param requestId Request ID for logging
 * @returns Updated review
 */
export const updateReview = async (
  reviewId: string,
  userId: string,
  updateData: {
    rating?: number
    title?: string
    comment?: string
    images?: string[]
    pros?: string[]
    cons?: string[]
  },
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'review-update')
  logger.info(`Updating review ${reviewId} by user ${userId}`)

  try {
    // Find the review
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
        productId: true,
        status: true,
      },
    })

    if (!existingReview) {
      throw new ApiError('Review not found', 404)
    }

    // Check if user owns the review
    if (existingReview.userId !== userId) {
      throw new ApiError('You can only update your own reviews', 403)
    }

    // Check if review can be updated
    if (existingReview.status === 'REJECTED') {
      throw new ApiError('Cannot update rejected review', 400)
    }

    // Update review in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the review
      const updatedReview = await tx.review.update({
        where: { id: reviewId },
        data: {
          ...updateData,
          updatedAt: new Date(),
          // Reset status to pending if content changed significantly
          status: updateData.rating || updateData.comment ? 'PENDING' : existingReview.status,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // Update product ratings if rating changed
      if (updateData.rating && updatedReview.status === 'APPROVED') {
        await updateProductRatings(existingReview.productId, requestId, tx)
      }

      return updatedReview
    })

    // Clear cache
    await Promise.all([
      setCache(`product_reviews:${existingReview.productId}`, null, 1),
      setCache(`user_reviews:${userId}`, null, 1),
      setCache(`review_stats:${existingReview.productId}`, null, 1),
    ])

    return result
  } catch (error: any) {
    logger.error(`Error updating review: ${error.message}`)
    throw error
  }
}

/**
 * Delete a review
 * @param reviewId Review ID
 * @param userId User ID (for authorization)
 * @param requestId Request ID for logging
 * @returns Deleted review
 */
export const deleteReview = async (
  reviewId: string,
  userId: string,
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'review-delete')
  logger.info(`Deleting review ${reviewId} by user ${userId}`)

  try {
    // Find the review
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
        productId: true,
        status: true,
      },
    })

    if (!existingReview) {
      throw new ApiError('Review not found', 404)
    }

    // Check if user owns the review
    if (existingReview.userId !== userId) {
      throw new ApiError('You can only delete your own reviews', 403)
    }

    // Delete review in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete helpful votes first
      await tx.reviewHelpfulVote.deleteMany({
        where: { reviewId },
      })

      // Delete the review
      const deletedReview = await tx.review.delete({
        where: { id: reviewId },
      })

      // Update product ratings
      await updateProductRatings(existingReview.productId, requestId, tx)

      return deletedReview
    })

    // Clear cache
    await Promise.all([
      setCache(`product_reviews:${existingReview.productId}`, null, 1),
      setCache(`user_reviews:${userId}`, null, 1),
      setCache(`review_stats:${existingReview.productId}`, null, 1),
    ])

    return result
  } catch (error: any) {
    logger.error(`Error deleting review: ${error.message}`)
    throw error
  }
}

/**
 * Mark review as helpful
 * @param reviewId Review ID
 * @param userId User ID
 * @param helpful Whether the review is helpful
 * @param requestId Request ID for logging
 * @returns Updated helpful status
 */
export const markReviewHelpful = async (
  reviewId: string,
  userId: string,
  helpful: boolean,
  requestId?: string,
): Promise<{ helpful: boolean; helpfulCount: number }> => {
  const logger = createRequestLogger(requestId || 'review-helpful')
  logger.info(`Marking review ${reviewId} as ${helpful ? 'helpful' : 'not helpful'} by user ${userId}`)

  try {
    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true },
    })

    if (!review) {
      throw new ApiError('Review not found', 404)
    }

    // Users cannot vote on their own reviews
    if (review.userId === userId) {
      throw new ApiError('You cannot vote on your own review', 400)
    }

    // Check if user has already voted
    const existingVote = await prisma.reviewHelpfulVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    })

    let helpfulCount = 0

    if (existingVote) {
      if (existingVote.helpful === helpful) {
        // Same vote, remove it
        await prisma.reviewHelpfulVote.delete({
          where: { id: existingVote.id },
        })
      } else {
        // Different vote, update it
        await prisma.reviewHelpfulVote.update({
          where: { id: existingVote.id },
          data: { helpful },
        })
      }
    } else {
      // New vote
      await prisma.reviewHelpfulVote.create({
        data: {
          reviewId,
          userId,
          helpful,
        },
      })
    }

    // Get updated helpful count
    helpfulCount = await prisma.reviewHelpfulVote.count({
      where: {
        reviewId,
        helpful: true,
      },
    })

    // Note: helpfulCount is calculated from the relation, no need to update directly

    return { helpful, helpfulCount }
  } catch (error: any) {
    logger.error(`Error marking review as helpful: ${error.message}`)
    throw error
  }
}

/**
 * Moderate review (admin only)
 * @param reviewId Review ID
 * @param action Moderation action
 * @param reason Reason for action
 * @param requestId Request ID for logging
 * @returns Updated review
 */
export const moderateReview = async (
  reviewId: string,
  action: 'APPROVE' | 'REJECT',
  reason?: string,
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'review-moderate')
  logger.info(`Moderating review ${reviewId} with action: ${action}`)

  try {
    // Find the review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        productId: true,
        userId: true,
        status: true,
      },
    })

    if (!review) {
      throw new ApiError('Review not found', 404)
    }

    // Update review in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the review
      const updatedReview = await tx.review.update({
        where: { id: reviewId },
        data: {
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          moderationReason: reason,
          moderatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // Update product ratings if approved
      if (action === 'APPROVE') {
        await updateProductRatings(review.productId, requestId, tx)
      }

      return updatedReview
    })

    // Send notification to user
    try {
      if (action === 'APPROVE') {
        await notificationService.createInAppNotification(
          review.userId,
          'Review Approved',
          `Your review has been approved and is now visible to other customers.`,
          'SUCCESS',
          { reviewId },
          requestId,
        )
      } else {
        await notificationService.createInAppNotification(
          review.userId,
          'Review Rejected',
          `Your review has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
          'WARNING',
          { reviewId, reason },
          requestId,
        )
      }
    } catch (notificationError: any) {
      logger.error(`Error sending moderation notification: ${notificationError.message}`)
    }

    // Clear cache
    await Promise.all([
      setCache(`product_reviews:${review.productId}`, null, 1),
      setCache(`user_reviews:${review.userId}`, null, 1),
      setCache(`review_stats:${review.productId}`, null, 1),
    ])

    return result
  } catch (error: any) {
    logger.error(`Error moderating review: ${error.message}`)
    throw error
  }
}
