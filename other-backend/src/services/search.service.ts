import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { getCache, setCache } from '../config/redis'
import { ApiError } from '../utils/api-error'

// Cache TTL in seconds
const CACHE_TTL = {
  SEARCH_RESULTS: 1800, // 30 minutes
  FACETS: 3600, // 1 hour
  SUGGESTIONS: 1800, // 30 minutes
}

/**
 * Advanced search with faceted navigation
 * @param options Search options
 * @param requestId Request ID for logging
 * @returns Search results with facets
 */
export const advancedSearch = async (
  options: {
    query?: string
    filters?: Record<string, any>
    page?: number
    limit?: number
    sort?: string
    includeFacets?: boolean
  } = {},
  requestId?: string
): Promise<{
  products: any[]
  count: number
  facets?: Record<string, any>
  pagination: {
    page: number
    limit: number
    totalPages: number
    totalResults: number
  }
}> => {
  const logger = createRequestLogger(requestId || 'search-advanced')
  logger.info(`Performing advanced search with query: ${options.query || ''}`)

  // Set default options
  const query = options.query || ''
  const filters = options.filters || {}
  const page = options.page || 1
  const limit = options.limit || 10
  const sort = options.sort || 'relevance'
  const includeFacets = options.includeFacets !== undefined ? options.includeFacets : true

  // Build search query
  const searchQuery: Prisma.ProductWhereInput = {
    active: true,
  }

  // Add text search if query is provided
  if (query && query.trim()) {
    searchQuery.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { sku: { contains: query, mode: 'insensitive' } },
      { tags: { hasSome: [query] } },
    ]
  }

  // Process filters
  await processSearchFilters(searchQuery, filters, requestId)

  // Try to get from cache
  const cacheKey = `advanced_search:${JSON.stringify({ query, filters, page, limit, sort, includeFacets })}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved advanced search results from cache')
    return cachedData
  }

  try {
    // Determine sort order
    const sortOptions = determineSortOptions(sort)

    // Calculate skip value for pagination
    const skip = (page - 1) * limit

    // Get products with relations
    const products = await prisma.product.findMany({
      where: searchQuery,
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
      orderBy: sortOptions,
      skip,
      take: limit,
    })

    // Get total count
    const count = await prisma.product.count({
      where: searchQuery,
    })

    // Calculate total pages
    const totalPages = Math.ceil(count / limit)

    // Get facets if requested
    let facets: Record<string, any> | undefined = undefined
    if (includeFacets) {
      facets = await getFacets(searchQuery, requestId)
    }

    // Prepare result
    const result = {
      products: products.map(product => ({
        ...product,
        averageRating: product.reviews.length > 0 
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
          : 0,
        reviewCount: product._count.reviews,
      })),
      count,
      facets,
      pagination: {
        page,
        limit,
        totalPages,
        totalResults: count,
      },
    }

    // Cache the results
    await setCache(cacheKey, result, CACHE_TTL.SEARCH_RESULTS)

    return result
  } catch (error: any) {
    logger.error(`Error performing advanced search: ${error.message}`)
    throw new ApiError(`Failed to perform search: ${error.message}`, 500)
  }
}

/**
 * Process search filters
 * @param searchQuery Search query object to modify
 * @param filters Filter options
 * @param requestId Request ID for logging
 */
async function processSearchFilters(
  searchQuery: Prisma.ProductWhereInput,
  filters: Record<string, any>,
  requestId?: string
): Promise<void> {
  const logger = createRequestLogger(requestId || 'search-filters')
  logger.info(`Processing search filters: ${JSON.stringify(filters)}`)

  try {
    // Process category filter
    if (filters.category) {
      if (Array.isArray(filters.category)) {
        searchQuery.categoryId = { in: filters.category }
      } else {
        searchQuery.categoryId = filters.category
      }
    }

    // Process vendor filter
    if (filters.vendor) {
      if (Array.isArray(filters.vendor)) {
        searchQuery.vendorId = { in: filters.vendor }
      } else {
        searchQuery.vendorId = filters.vendor
      }
    }

    // Process price filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      searchQuery.price = {}
      if (filters.minPrice !== undefined) {
        searchQuery.price.gte = Number(filters.minPrice)
      }
      if (filters.maxPrice !== undefined) {
        searchQuery.price.lte = Number(filters.maxPrice)
      }
    }

    // Process stock filter
    if (filters.inStock !== undefined) {
      searchQuery.quantity = filters.inStock === 'true' ? { gt: 0 } : { lte: 0 }
    }

    // Process featured filter
    if (filters.featured !== undefined) {
      searchQuery.featured = filters.featured === 'true'
    }

    // Process tags filter
    if (filters.tags) {
      const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags]
      searchQuery.tags = { hasSome: tags }
    }

    // Process discount filter
    if (filters.onSale === 'true') {
      searchQuery.compareAtPrice = { gt: 0 }
    }

    // Process date filter
    if (filters.createdAfter || filters.createdBefore) {
      searchQuery.createdAt = {}
      if (filters.createdAfter) {
        searchQuery.createdAt.gte = new Date(filters.createdAfter)
      }
      if (filters.createdBefore) {
        searchQuery.createdAt.lte = new Date(filters.createdBefore)
      }
    }
  } catch (error: any) {
    logger.error(`Error processing search filters: ${error.message}`)
    throw error
  }
}

/**
 * Determine sort options based on sort parameter
 * @param sort Sort parameter
 * @returns Sort options
 */
function determineSortOptions(sort: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price_asc':
      return [{ price: 'asc' }]
    case 'price_desc':
      return [{ price: 'desc' }]
    case 'newest':
      return [{ createdAt: 'desc' }]
    case 'oldest':
      return [{ createdAt: 'asc' }]
    case 'name_asc':
      return [{ name: 'asc' }]
    case 'name_desc':
      return [{ name: 'desc' }]
    case 'popularity':
      return [{ reviews: { _count: 'desc' } }]
    default:
      // Default sort by created date
      return [{ createdAt: 'desc' }]
  }
}

/**
 * Get facets for search results
 * @param baseQuery Base query for facets
 * @param requestId Request ID for logging
 * @returns Facets for search results
 */
export const getFacets = async (
  baseQuery: Prisma.ProductWhereInput,
  requestId?: string
): Promise<Record<string, any>> => {
  const logger = createRequestLogger(requestId || 'search-facets')
  logger.info('Getting facets for search results')

  // Try to get from cache
  const cacheKey = `facets:${JSON.stringify(baseQuery)}`
  const cachedFacets = await getCache<Record<string, any>>(cacheKey)

  if (cachedFacets) {
    logger.info('Retrieved facets from cache')
    return cachedFacets
  }

  try {
    // Get price range
    const priceRange = await prisma.product.aggregate({
      where: baseQuery,
      _min: { price: true },
      _max: { price: true },
    })

    // Get categories with product counts
    const categories = await prisma.category.findMany({
      where: {
        products: {
          some: baseQuery,
        },
      },
      include: {
        _count: {
          select: {
            products: {
              where: baseQuery,
            },
          },
        },
      },
      orderBy: {
        products: {
          _count: 'desc',
        },
      },
      take: 20,
    })

    // Get vendors with product counts
    const vendors = await prisma.vendor.findMany({
      where: {
        products: {
          some: baseQuery,
        },
      },
      include: {
        _count: {
          select: {
            products: {
              where: baseQuery,
            },
          },
        },
      },
      orderBy: {
        products: {
          _count: 'desc',
        },
      },
      take: 20,
    })

    // Get all products matching the base query to calculate other facets
    const products = await prisma.product.findMany({
      where: baseQuery,
      select: {
        tags: true,
        compareAtPrice: true,
        price: true,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    })

    // Calculate ratings distribution
    const ratingsMap = new Map<number, number>()
    products.forEach(product => {
      if (product.reviews.length > 0) {
        const avgRating = Math.floor(
          product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        )
        ratingsMap.set(avgRating, (ratingsMap.get(avgRating) || 0) + 1)
      }
    })

    const ratings = Array.from(ratingsMap.entries())
      .map(([rating, count]) => ({ rating, count }))
      .sort((a, b) => b.rating - a.rating)

    // Get unique tags with counts
    const tagsMap = new Map<string, number>()
    products.forEach(product => {
      product.tags.forEach(tag => {
        tagsMap.set(tag, (tagsMap.get(tag) || 0) + 1)
      })
    })

    const tags = Array.from(tagsMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)

    // Get discount status
    const onSaleCount = products.filter(p => p.compareAtPrice && p.compareAtPrice > p.price).length
    const regularPriceCount = products.length - onSaleCount

    // Compile facets
    const facets = {
      priceRange: {
        min: priceRange._min.price || 0,
        max: priceRange._max.price || 1000,
      },
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: cat._count.products,
      })),
      vendors: vendors.map(vendor => ({
        id: vendor.id,
        name: vendor.businessName,
        slug: vendor.slug,
        count: vendor._count.products,
      })),
      ratings,
      tags,
      discountStatus: [
        { onSale: true, count: onSaleCount },
        { onSale: false, count: regularPriceCount },
      ],
    }

    // Cache the facets
    await setCache(cacheKey, facets, CACHE_TTL.FACETS)

    return facets
  } catch (error: any) {
    logger.error(`Error getting facets: ${error.message}`)
    throw new ApiError(`Failed to get facets: ${error.message}`, 500)
  }
}

/**
 * Get product suggestions for autocomplete
 * @param query Search query
 * @param options Suggestion options
 * @param requestId Request ID for logging
 * @returns Product suggestions
 */
export const getProductSuggestions = async (
  query: string,
  options: {
    limit?: number
    includeCategories?: boolean
    includeVendors?: boolean
  } = {},
  requestId?: string
): Promise<{
  products: any[]
  categories?: any[]
  vendors?: any[]
}> => {
  const logger = createRequestLogger(requestId || 'search-suggestions')
  logger.info(`Getting product suggestions for query: ${query}`)

  if (!query || query.trim().length < 2) {
    return { products: [] }
  }

  // Set default options
  const limit = options.limit || 5
  const includeCategories = options.includeCategories !== undefined ? options.includeCategories : true
  const includeVendors = options.includeVendors !== undefined ? options.includeVendors : true

  // Try to get from cache
  const cacheKey = `suggestions:${query}:${limit}:${includeCategories}:${includeVendors}`
  const cachedSuggestions = await getCache<any>(cacheKey)

  if (cachedSuggestions) {
    logger.info('Retrieved suggestions from cache')
    return cachedSuggestions
  }

  try {
    // Search for products
    const products = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: true,
      },
      take: limit,
    })

    // Prepare result
    const result: {
      products: any[]
      categories?: any[]
      vendors?: any[]
    } = {
      products,
    }

    // Search for categories if requested
    if (includeCategories) {
      const categories = await prisma.category.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        take: 3,
      })

      result.categories = categories
    }

    // Search for vendors if requested
    if (includeVendors) {
      const vendors = await prisma.vendor.findMany({
        where: {
          businessName: { contains: query, mode: 'insensitive' },
          status: 'APPROVED',
        },
        select: {
          id: true,
          businessName: true,
          slug: true,
        },
        take: 3,
      })

      result.vendors = vendors
    }

    // Cache the suggestions
    await setCache(cacheKey, result, CACHE_TTL.SUGGESTIONS)

    return result
  } catch (error: any) {
    logger.error(`Error getting product suggestions: ${error.message}`)
    throw new ApiError(`Failed to get product suggestions: ${error.message}`, 500)
  }
}

/**
 * Get popular searches
 * @param limit Number of popular searches to return
 * @param requestId Request ID for logging
 * @returns Popular searches
 */
export const getPopularSearches = async (limit = 10, requestId?: string): Promise<string[]> => {
  const logger = createRequestLogger(requestId || 'search-popular')
  logger.info(`Getting popular searches, limit: ${limit}`)

  // This is a placeholder implementation
  // In a real application, you would track search queries and their frequency
  // For now, we'll return dummy data based on common e-commerce searches
  return [
    'smartphone',
    'laptop',
    'headphones',
    'camera',
    'smartwatch',
    'tablet',
    'bluetooth speaker',
    'gaming console',
    'wireless earbuds',
    'smart tv',
  ].slice(0, limit)
}

/**
 * Track search query for analytics
 * @param query Search query
 * @param userId User ID (optional)
 * @param results Number of results
 * @param requestId Request ID for logging
 */
export const trackSearchQuery = async (
  query: string,
  userId?: string,
  results?: number,
  requestId?: string
): Promise<void> => {
  const logger = createRequestLogger(requestId || 'search-track')
  logger.info(`Tracking search query: ${query}`)

  try {
    // In a real implementation, you would store this in a search analytics table
    // For now, we'll just log it
    logger.info(`Search tracked: query="${query}", userId="${userId}", results=${results}`)
  } catch (error: any) {
    logger.error(`Error tracking search query: ${error.message}`)
    // Don't throw error to avoid breaking the search flow
  }
}
