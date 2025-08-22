import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { getCache, setCache } from '../config/redis'
import { ApiError } from '../utils/api-error'

// Cache TTL in seconds
const CACHE_TTL = {
  POPULAR_PRODUCTS: 3600, // 1 hour
  RELATED_PRODUCTS: 3600, // 1 hour
  PERSONALIZED_RECOMMENDATIONS: 86400, // 24 hours
  RECENTLY_VIEWED: 86400, // 24 hours
}

/**
 * Get popular products
 * @param limit Number of products to return
 * @param requestId Request ID for logging
 * @returns Array of popular products
 */
export const getPopularProducts = async (limit = 10, requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'recommendation-popular')
  logger.info(`Getting popular products with limit: ${limit}`)

  // Try to get from cache
  const cacheKey = `popular_products:${limit}`
  const cachedData = await getCache<any[]>(cacheKey)

  if (cachedData) {
    logger.info(`Retrieved popular products from cache`)
    return cachedData
  }

  try {
    // Get products with highest average rating and at least 5 reviews
    const popularProducts = await prisma.product.findMany({
      where: { 
        active: true,
        reviews: {
          some: {},
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: [
        { reviews: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
      take: limit,
    })

    // Calculate average ratings and filter products with at least 5 reviews
    const productsWithRatings = popularProducts
      .map(product => ({
        ...product,
        averageRating: product.reviews.length > 0 
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
          : 0,
        reviewCount: product._count.reviews,
      }))
      .filter(product => product.reviewCount >= 5)
      .sort((a, b) => b.averageRating - a.averageRating)

    // If not enough products with ratings, get products with most orders
    if (productsWithRatings.length < limit) {
      const remainingLimit = limit - productsWithRatings.length
      const existingProductIds = productsWithRatings.map(product => product.id)

      // Get products with most order items
      const mostOrderedProducts = await prisma.product.findMany({
        where: {
          active: true,
          id: { notIn: existingProductIds },
          orderItems: {
            some: {},
          },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              orderItems: true,
            },
          },
        },
        orderBy: {
          orderItems: {
            _count: 'desc',
          },
        },
        take: remainingLimit,
      })

      const formattedMostOrdered = mostOrderedProducts.map(product => ({
        ...product,
        averageRating: product.reviews.length > 0 
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
          : 0,
        reviewCount: product._count.reviews,
      }))

      productsWithRatings.push(...formattedMostOrdered)
    }

    // If still not enough products, get featured products
    if (productsWithRatings.length < limit) {
      const remainingLimit = limit - productsWithRatings.length
      const existingProductIds = productsWithRatings.map(product => product.id)

      const featuredProducts = await prisma.product.findMany({
        where: {
          active: true,
          featured: true,
          id: { notIn: existingProductIds },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: remainingLimit,
      })

      const formattedFeatured = featuredProducts.map(product => ({
        ...product,
        averageRating: product.reviews.length > 0 
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
          : 0,
        reviewCount: product._count.reviews,
      }))

      productsWithRatings.push(...formattedFeatured)
    }

    // Cache the results
    await setCache(cacheKey, productsWithRatings, CACHE_TTL.POPULAR_PRODUCTS)

    return productsWithRatings
  } catch (error: any) {
    logger.error(`Error getting popular products: ${error.message}`)
    throw new ApiError(`Failed to get popular products: ${error.message}`, 500)
  }
}

/**
 * Get related products for a specific product
 * @param productId Product ID
 * @param limit Number of products to return
 * @param requestId Request ID for logging
 * @returns Array of related products
 */
export const getRelatedProducts = async (productId: string, limit = 10, requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'recommendation-related')
  logger.info(`Getting related products for product ID: ${productId} with limit: ${limit}`)

  // Try to get from cache
  const cacheKey = `related_products:${productId}:${limit}`
  const cachedData = await getCache<any[]>(cacheKey)

  if (cachedData) {
    logger.info(`Retrieved related products from cache`)
    return cachedData
  }

  try {
    // Get the product to find related products
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { 
        categoryId: true,
        vendorId: true,
        tags: true,
      },
    })

    if (!product) {
      throw new ApiError("Product not found", 404)
    }

    // Get products in the same category
    const relatedProducts = await prisma.product.findMany({
      where: {
        id: { not: productId },
        categoryId: product.categoryId,
        active: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: [
        { reviews: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
      take: limit,
    })

    // Format products with average ratings
    const formattedRelated = relatedProducts.map(product => ({
      ...product,
      averageRating: product.reviews.length > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0,
      reviewCount: product._count.reviews,
    }))

    // Cache the results
    await setCache(cacheKey, formattedRelated, CACHE_TTL.RELATED_PRODUCTS)

    return formattedRelated
  } catch (error: any) {
    logger.error(`Error getting related products: ${error.message}`)
    throw error
  }
}

/**
 * Get personalized recommendations for a user
 * @param userId User ID
 * @param limit Number of products to return
 * @param requestId Request ID for logging
 * @returns Array of recommended products
 */
export const getPersonalizedRecommendations = async (
  userId: string,
  limit = 10,
  requestId?: string,
): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'recommendation-personalized')
  logger.info(`Getting personalized recommendations for user ID: ${userId} with limit: ${limit}`)

  // Try to get from cache
  const cacheKey = `personalized_recommendations:${userId}:${limit}`
  const cachedData = await getCache<any[]>(cacheKey)

  if (cachedData) {
    logger.info(`Retrieved personalized recommendations from cache`)
    return cachedData
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      throw new ApiError("User not found", 404)
    }

    // Get user's order history
    const userOrders = await prisma.order.findMany({
      where: {
        userId: userId,
        status: { in: ['DELIVERED', 'SHIPPED'] },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                categoryId: true,
                vendorId: true,
                tags: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // If user has no orders, return popular products
    if (!userOrders.length) {
      logger.info(`User has no orders, returning popular products`)
      return getPopularProducts(limit, requestId)
    }

    // Extract product IDs and categories from user's orders
    const orderedProductIds: string[] = []
    const orderedCategoryIds: string[] = []

    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.product) {
          orderedProductIds.push(item.product.id)
          if (item.product.categoryId) orderedCategoryIds.push(item.product.categoryId)
        }
      })
    })

    // Get unique values
    const uniqueOrderedProductIds = [...new Set(orderedProductIds)]
    const uniqueOrderedCategoryIds = [...new Set(orderedCategoryIds)]

    // Get products from the same categories that the user hasn't ordered
    const recommendedProducts = await prisma.product.findMany({
      where: {
        id: { notIn: uniqueOrderedProductIds },
        categoryId: { in: uniqueOrderedCategoryIds },
        active: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: [
        { reviews: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
      take: limit,
    })

    // Format products with average ratings
    const formattedRecommendations = recommendedProducts.map(product => ({
      ...product,
      averageRating: product.reviews.length > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0,
      reviewCount: product._count.reviews,
    }))

    // Cache the results
    await setCache(cacheKey, formattedRecommendations, CACHE_TTL.PERSONALIZED_RECOMMENDATIONS)

    return formattedRecommendations
  } catch (error: any) {
    logger.error(`Error getting personalized recommendations: ${error.message}`)
    throw error
  }
}

/**
 * Track recently viewed products for a user
 * @param userId User ID
 * @param productId Product ID
 * @param requestId Request ID for logging
 */
export const trackRecentlyViewedProduct = async (
  userId: string,
  productId: string,
  requestId?: string,
): Promise<void> => {
  const logger = createRequestLogger(requestId || 'recommendation-track')
  logger.info(`Tracking recently viewed product for user ID: ${userId}, product ID: ${productId}`)

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })

    if (!product) {
      throw new ApiError("Product not found", 404)
    }

    // Get recently viewed products from cache
    const cacheKey = `recently_viewed:${userId}`
    const recentlyViewed = (await getCache<string[]>(cacheKey)) || []

    // Remove the product if it's already in the list
    const updatedRecentlyViewed = recentlyViewed.filter((id) => id !== productId)

    // Add the product to the beginning of the list
    updatedRecentlyViewed.unshift(productId)

    // Keep only the last 20 viewed products
    const limitedRecentlyViewed = updatedRecentlyViewed.slice(0, 20)

    // Update the cache
    await setCache(cacheKey, limitedRecentlyViewed, CACHE_TTL.RECENTLY_VIEWED)
  } catch (error: any) {
    logger.error(`Error tracking recently viewed product: ${error.message}`)
    throw error
  }
}

/**
 * Get recently viewed products for a user
 * @param userId User ID
 * @param limit Number of products to return
 * @param requestId Request ID for logging
 * @returns Array of recently viewed products
 */
export const getRecentlyViewedProducts = async (userId: string, limit = 10, requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'recommendation-recent')
  logger.info(`Getting recently viewed products for user ID: ${userId} with limit: ${limit}`)

  try {
    // Get recently viewed products from cache
    const cacheKey = `recently_viewed:${userId}`
    const recentlyViewed = (await getCache<string[]>(cacheKey)) || []

    // If no recently viewed products, return popular products
    if (!recentlyViewed.length) {
      logger.info(`User has no recently viewed products, returning popular products`)
      return getPopularProducts(limit, requestId)
    }

    // Limit the number of products
    const limitedRecentlyViewed = recentlyViewed.slice(0, limit)

    // Get product details
    const products = await prisma.product.findMany({
      where: {
        id: { in: limitedRecentlyViewed },
        active: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    })

    // Sort products in the same order as recentlyViewed and add average ratings
    const sortedProducts = limitedRecentlyViewed
      .map((id) => {
        const product = products.find((product) => product.id === id)
        if (product) {
          return {
            ...product,
            averageRating: product.reviews.length > 0 
              ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
              : 0,
            reviewCount: product._count.reviews,
          }
        }
        return null
      })
      .filter(Boolean) // Remove null values

    return sortedProducts
  } catch (error: any) {
    logger.error(`Error getting recently viewed products: ${error.message}`)
    throw error
  }
}

/**
 * Get "Frequently Bought Together" products for a specific product
 * @param productId Product ID
 * @param limit Number of products to return
 * @param requestId Request ID for logging
 * @returns Array of frequently bought together products
 */
export const getFrequentlyBoughtTogether = async (productId: string, limit = 3, requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'recommendation-frequently-bought')
  logger.info(`Getting frequently bought together products for product ID: ${productId} with limit: ${limit}`)

  // Try to get from cache
  const cacheKey = `frequently_bought_together:${productId}:${limit}`
  const cachedData = await getCache<any[]>(cacheKey)

  if (cachedData) {
    logger.info(`Retrieved frequently bought together products from cache`)
    return cachedData
  }

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, categoryId: true },
    })

    if (!product) {
      throw new ApiError("Product not found", 404)
    }

    // Find orders containing the product
    const ordersWithProduct = await prisma.order.findMany({
      where: {
        items: {
          some: {
            productId: productId,
          },
        },
        status: { in: ['DELIVERED', 'SHIPPED'] },
      },
      include: {
        items: {
          select: {
            productId: true,
          },
        },
      },
    })

    // If no orders found, return related products
    if (!ordersWithProduct.length) {
      logger.info(`No orders found with product ID: ${productId}, returning related products`)
      return getRelatedProducts(productId, limit, requestId)
    }

    // Count co-occurrence of products
    const productCounts = new Map<string, number>()

    ordersWithProduct.forEach((order) => {
      order.items.forEach((item) => {
        // Skip the original product
        if (item.productId === productId) {
          return
        }

        const currentCount = productCounts.get(item.productId) || 0
        productCounts.set(item.productId, currentCount + 1)
      })
    })

    // Sort products by co-occurrence count
    const sortedProductIds = [...productCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id)

    // Get product details
    const frequentlyBoughtTogether = await prisma.product.findMany({
      where: {
        id: { in: sortedProductIds },
        active: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    })

    // Sort products in the same order as sortedProductIds and add average ratings
    const sortedProducts = sortedProductIds
      .map((id) => {
        const product = frequentlyBoughtTogether.find((product) => product.id === id)
        if (product) {
          return {
            ...product,
            averageRating: product.reviews.length > 0 
              ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
              : 0,
            reviewCount: product._count.reviews,
          }
        }
        return null
      })
      .filter(Boolean) // Remove null values

    // Cache the results
    await setCache(cacheKey, sortedProducts, CACHE_TTL.RELATED_PRODUCTS)

    return sortedProducts
  } catch (error: any) {
    logger.error(`Error getting frequently bought together products: ${error.message}`)
    throw error
  }
}
