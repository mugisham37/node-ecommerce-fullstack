import type { Request, Response } from "express"
import { asyncHandler } from "../utils/async-handler"
import { createRequestLogger } from "../utils/logger"
import * as searchService from "../services/search.service"

/**
 * Search products with faceted navigation
 * @route GET /api/v1/search
 * @access Public
 */
export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  const query = (req.query.q as string) || ""

  requestLogger.info(`Searching products with query: ${query}`)

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10
  const sort = (req.query.sort as string) || "relevance"

  // Build filter
  const filters: Record<string, any> = {}

  if (req.query.category) {
    filters.category = req.query.category
  }

  if (req.query.vendor) {
    filters.vendor = req.query.vendor
  }

  if (req.query.minPrice || req.query.maxPrice) {
    if (req.query.minPrice) {
      filters.minPrice = Number(req.query.minPrice)
    }
    if (req.query.maxPrice) {
      filters.maxPrice = Number(req.query.maxPrice)
    }
  }

  if (req.query.rating) {
    filters.rating = Number(req.query.rating)
  }

  if (req.query.inStock) {
    filters.inStock = req.query.inStock === "true"
  }

  if (req.query.featured) {
    filters.featured = req.query.featured === "true"
  }

  if (req.query.attributes) {
    try {
      filters.attributes = typeof req.query.attributes === "string" 
        ? JSON.parse(req.query.attributes) 
        : req.query.attributes
    } catch (error) {
      // Invalid JSON, ignore attributes filter
      requestLogger.warn("Invalid attributes JSON format, ignoring filter")
    }
  }

  if (req.query.tags) {
    filters.tags = Array.isArray(req.query.tags) 
      ? req.query.tags 
      : (req.query.tags as string).split(",").map(tag => tag.trim())
  }

  if (req.query.onSale) {
    filters.onSale = req.query.onSale === "true"
  }

  // Use the advanced search service
  const searchResults = await searchService.advancedSearch(
    {
      query,
      filters,
      page,
      limit,
      sort,
      includeFacets: true,
    },
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: searchResults.products.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(searchResults.count / limit),
      totalResults: searchResults.count,
      hasNextPage: page < Math.ceil(searchResults.count / limit),
      hasPrevPage: page > 1,
    },
    data: {
      products: searchResults.products,
      facets: searchResults.facets,
    },
  })
})

/**
 * Get product suggestions for autocomplete
 * @route GET /api/v1/search/suggestions
 * @access Public
 */
export const getProductSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  const query = (req.query.q as string) || ""
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 5

  requestLogger.info(`Getting product suggestions for query: ${query}`)

  if (!query || query.length < 2) {
    res.status(200).json({
      status: "success",
      requestId: req.id,
      results: 0,
      data: {
        suggestions: [],
      },
    })
    return
  }

  const suggestions = await searchService.getProductSuggestions(
    query,
    {
      limit,
      includeCategories: true,
      includeVendors: true,
    },
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: suggestions.products?.length || 0,
    data: {
      suggestions: suggestions.products || [],
      categories: suggestions.categories || [],
      vendors: suggestions.vendors || [],
    },
  })
})

/**
 * Get popular searches
 * @route GET /api/v1/search/popular
 * @access Public
 */
export const getPopularSearches = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10

  requestLogger.info(`Getting popular searches, limit: ${limit}`)

  const popularSearches = await searchService.getPopularSearches(limit, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: popularSearches.length,
    data: {
      searches: popularSearches,
    },
  })
})

/**
 * Track search query for analytics
 * @route POST /api/v1/search/track
 * @access Public
 */
export const trackSearchQuery = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  const { query, results } = req.body
  const userId = req.user?._id?.toString()

  requestLogger.info(`Tracking search query: ${query}`)

  if (!query) {
    res.status(400).json({
      status: "error",
      requestId: req.id,
      message: "Query is required",
    })
    return
  }

  await searchService.trackSearchQuery(query, userId, results, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    message: "Search query tracked successfully",
  })
})

/**
 * Get search facets
 * @route GET /api/v1/search/facets
 * @access Public
 */
export const getSearchFacets = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  const query = (req.query.q as string) || ""

  requestLogger.info(`Getting search facets for query: ${query}`)

  // Build basic filters from query parameters
  const filters: Record<string, any> = {}

  if (req.query.category) {
    filters.category = req.query.category
  }

  if (req.query.vendor) {
    filters.vendor = req.query.vendor
  }

  // Get facets using a minimal search
  const searchResults = await searchService.advancedSearch(
    {
      query,
      filters,
      page: 1,
      limit: 1,
      sort: "relevance",
      includeFacets: true,
    },
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      facets: searchResults.facets,
      totalResults: searchResults.count,
    },
  })
})

/**
 * Advanced search endpoint (alias for backward compatibility)
 * @route POST /api/v1/search/advanced
 * @access Public
 */
export const advancedSearchPost = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Performing advanced search via POST")

  const {
    query = "",
    filters = {},
    page = 1,
    limit = 10,
    sort = "relevance",
    includeFacets = true,
  } = req.body

  // Validate pagination
  if (page < 1 || limit < 1 || limit > 100) {
    res.status(400).json({
      status: "error",
      requestId: req.id,
      message: "Invalid pagination parameters",
    })
    return
  }

  const searchResults = await searchService.advancedSearch(
    {
      query,
      filters,
      page,
      limit,
      sort,
      includeFacets,
    },
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: searchResults.products.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(searchResults.count / limit),
      totalResults: searchResults.count,
      hasNextPage: page < Math.ceil(searchResults.count / limit),
      hasPrevPage: page > 1,
    },
    data: {
      products: searchResults.products,
      facets: includeFacets ? searchResults.facets : undefined,
    },
  })
})
