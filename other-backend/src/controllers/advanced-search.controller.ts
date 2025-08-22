import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import * as searchService from "../services/search.service"

/**
 * Advanced search with faceted navigation
 * @route GET /api/v1/search/advanced
 * @access Public
 */
export const advancedSearch = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Performing advanced search")

  // Parse query parameters
  const query = req.query.q as string | undefined
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10
  const sort = req.query.sort as string | undefined
  const includeFacets = req.query.includeFacets !== "false"

  // Extract filters from query parameters
  const filters: Record<string, any> = {}

  // Category filter
  if (req.query.category) {
    filters.category = req.query.category
  }

  // Vendor filter
  if (req.query.vendor) {
    filters.vendor = req.query.vendor
  }

  // Price filter
  if (req.query.minPrice) {
    const minPrice = Number(req.query.minPrice)
    if (isNaN(minPrice) || minPrice < 0) {
      return next(new ApiError("Invalid minPrice. Must be a non-negative number", 400))
    }
    filters.minPrice = minPrice
  }

  if (req.query.maxPrice) {
    const maxPrice = Number(req.query.maxPrice)
    if (isNaN(maxPrice) || maxPrice < 0) {
      return next(new ApiError("Invalid maxPrice. Must be a non-negative number", 400))
    }
    filters.maxPrice = maxPrice
  }

  // Validate price range
  if (filters.minPrice && filters.maxPrice && filters.minPrice > filters.maxPrice) {
    return next(new ApiError("minPrice cannot be greater than maxPrice", 400))
  }

  // Rating filter
  if (req.query.rating) {
    const rating = Number(req.query.rating)
    if (isNaN(rating) || rating < 0 || rating > 5) {
      return next(new ApiError("Invalid rating. Must be between 0 and 5", 400))
    }
    filters.rating = rating
  }

  // Stock filter
  if (req.query.inStock) {
    filters.inStock = req.query.inStock === "true"
  }

  // Featured filter
  if (req.query.featured) {
    filters.featured = req.query.featured === "true"
  }

  // Attributes filter
  if (req.query.attributes) {
    try {
      filters.attributes = typeof req.query.attributes === "string" 
        ? JSON.parse(req.query.attributes) 
        : req.query.attributes
    } catch (error) {
      return next(new ApiError("Invalid attributes format. Must be valid JSON", 400))
    }
  }

  // Tags filter
  if (req.query.tags) {
    filters.tags = Array.isArray(req.query.tags) 
      ? req.query.tags 
      : (req.query.tags as string).split(",").map(tag => tag.trim())
  }

  // Discount filter
  if (req.query.onSale) {
    filters.onSale = req.query.onSale === "true"
  }

  // Date filter
  if (req.query.createdAfter) {
    const createdAfter = new Date(req.query.createdAfter as string)
    if (isNaN(createdAfter.getTime())) {
      return next(new ApiError("Invalid createdAfter date format. Use ISO 8601 format", 400))
    }
    filters.createdAfter = createdAfter
  }

  if (req.query.createdBefore) {
    const createdBefore = new Date(req.query.createdBefore as string)
    if (isNaN(createdBefore.getTime())) {
      return next(new ApiError("Invalid createdBefore date format. Use ISO 8601 format", 400))
    }
    filters.createdBefore = createdBefore
  }

  // Validate date range
  if (filters.createdAfter && filters.createdBefore && filters.createdAfter > filters.createdBefore) {
    return next(new ApiError("createdAfter cannot be after createdBefore", 400))
  }

  // Validate pagination
  if (page < 1) {
    return next(new ApiError("Page must be greater than or equal to 1", 400))
  }

  if (limit < 1 || limit > 100) {
    return next(new ApiError("Limit must be between 1 and 100", 400))
  }

  // Validate sort parameter
  const validSortOptions = ["relevance", "price_asc", "price_desc", "name_asc", "name_desc", "created_desc", "created_asc", "rating_desc"]
  if (sort && !validSortOptions.includes(sort)) {
    return next(new ApiError(`Invalid sort option. Must be one of: ${validSortOptions.join(", ")}`, 400))
  }

  // Perform search using the existing search service
  const searchResults = await searchService.advancedSearch(
    {
      query: query || "",
      filters,
      page,
      limit,
      sort: sort || "relevance",
      includeFacets,
    },
    req.id,
  )

  // Enhanced response with additional metadata
  const response = {
    query: query || "",
    filters: filters,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(searchResults.count / limit),
      totalResults: searchResults.count,
      hasNextPage: page < Math.ceil(searchResults.count / limit),
      hasPrevPage: page > 1,
    },
    products: searchResults.products,
    facets: includeFacets ? searchResults.facets : undefined,
    searchTime: Date.now(), // Could be enhanced with actual search timing
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: searchResults.products.length,
    data: response,
  })
})

/**
 * Get product suggestions for autocomplete
 * @route GET /api/v1/search/suggestions
 * @access Public
 */
export const getProductSuggestions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting product suggestions")

  // Parse query parameters
  const query = req.query.q as string | undefined
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 5
  const includeCategories = req.query.includeCategories !== "false"
  const includeVendors = req.query.includeVendors !== "false"

  if (!query) {
    return next(new ApiError("Query parameter 'q' is required", 400))
  }

  if (query.length < 2) {
    return next(new ApiError("Query must be at least 2 characters long", 400))
  }

  // Validate limit
  if (limit < 1 || limit > 20) {
    return next(new ApiError("Limit must be between 1 and 20", 400))
  }

  // Get suggestions using the existing search service
  const suggestions = await searchService.getProductSuggestions(
    query,
    {
      limit,
      includeCategories,
      includeVendors,
    },
    req.id,
  )

  // Enhanced suggestions with categories and vendors if requested
  const enhancedSuggestions = {
    products: suggestions.products || [],
    categories: suggestions.categories || [],
    vendors: suggestions.vendors || [],
    query: query,
    totalSuggestions: suggestions.products?.length || 0,
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: enhancedSuggestions,
  })
})

/**
 * Get popular searches
 * @route GET /api/v1/search/popular
 * @access Public
 */
export const getPopularSearches = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting popular searches")

  // Parse query parameters
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10
  const timeframe = req.query.timeframe as "day" | "week" | "month" | "all" | undefined

  // Validate limit
  if (limit < 1 || limit > 50) {
    return next(new ApiError("Limit must be between 1 and 50", 400))
  }

  // Validate timeframe
  if (timeframe && !["day", "week", "month", "all"].includes(timeframe)) {
    return next(new ApiError("Invalid timeframe. Must be one of: day, week, month, all", 400))
  }

  // For now, return mock popular searches since we don't have search tracking
  // In a real implementation, this would query a search analytics table
  const popularSearches = await getMockPopularSearches(limit, timeframe || "week")

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      searches: popularSearches,
      timeframe: timeframe || "week",
      limit,
      generatedAt: new Date(),
    },
  })
})

/**
 * Search with filters and sorting
 * @route POST /api/v1/search/filtered
 * @access Public
 */
export const filteredSearch = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Performing filtered search")

  const {
    query = "",
    filters = {},
    sort = "relevance",
    page = 1,
    limit = 10,
    includeFacets = true,
  } = req.body

  // Validate pagination
  if (page < 1) {
    return next(new ApiError("Page must be greater than or equal to 1", 400))
  }

  if (limit < 1 || limit > 100) {
    return next(new ApiError("Limit must be between 1 and 100", 400))
  }

  // Validate and sanitize filters
  const sanitizedFilters = await sanitizeFilters(filters)

  // Perform search
  const searchResults = await searchService.advancedSearch(
    {
      query,
      filters: sanitizedFilters,
      page,
      limit,
      sort,
      includeFacets,
    },
    req.id,
  )

  const response = {
    query,
    filters: sanitizedFilters,
    sort,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(searchResults.count / limit),
      totalResults: searchResults.count,
      hasNextPage: page < Math.ceil(searchResults.count / limit),
      hasPrevPage: page > 1,
    },
    products: searchResults.products,
    facets: includeFacets ? searchResults.facets : undefined,
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: searchResults.products.length,
    data: response,
  })
})

/**
 * Get search facets for a given query
 * @route GET /api/v1/search/facets
 * @access Public
 */
export const getSearchFacets = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting search facets")

  const query = req.query.q as string | undefined
  const filters = req.query.filters ? JSON.parse(req.query.filters as string) : {}

  // Get facets by performing a search with limit 1 (just to get facets)
  const searchResults = await searchService.advancedSearch(
    {
      query: query || "",
      filters,
      page: 1,
      limit: 1, // Minimal limit since we only need facets
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
      query: query || "",
      filters,
    },
  })
})

// Helper functions

/**
 * Get category suggestions based on query
 */
async function getCategorySuggestions(query: string, limit: number, requestId?: string): Promise<any[]> {
  // This would typically query the categories table
  // For now, return empty array as categories aren't implemented in search service
  return []
}

/**
 * Get vendor suggestions based on query
 */
async function getVendorSuggestions(query: string, limit: number, requestId?: string): Promise<any[]> {
  // This would typically query the vendors table
  // For now, return empty array as vendors aren't implemented in search service
  return []
}

/**
 * Get mock popular searches
 */
async function getMockPopularSearches(limit: number, timeframe: string): Promise<any[]> {
  // Mock popular searches - in a real implementation, this would query search analytics
  const mockSearches = [
    { query: "laptop", count: 1250, trend: "up" },
    { query: "smartphone", count: 980, trend: "stable" },
    { query: "headphones", count: 750, trend: "up" },
    { query: "gaming", count: 650, trend: "up" },
    { query: "wireless", count: 580, trend: "stable" },
    { query: "bluetooth", count: 520, trend: "down" },
    { query: "camera", count: 480, trend: "stable" },
    { query: "tablet", count: 420, trend: "down" },
    { query: "monitor", count: 380, trend: "up" },
    { query: "keyboard", count: 350, trend: "stable" },
  ]

  return mockSearches.slice(0, limit)
}

/**
 * Sanitize and validate filters
 */
async function sanitizeFilters(filters: any): Promise<Record<string, any>> {
  const sanitized: Record<string, any> = {}

  // Price filters
  if (filters.minPrice !== undefined) {
    const minPrice = Number(filters.minPrice)
    if (!isNaN(minPrice) && minPrice >= 0) {
      sanitized.minPrice = minPrice
    }
  }

  if (filters.maxPrice !== undefined) {
    const maxPrice = Number(filters.maxPrice)
    if (!isNaN(maxPrice) && maxPrice >= 0) {
      sanitized.maxPrice = maxPrice
    }
  }

  // Rating filter
  if (filters.rating !== undefined) {
    const rating = Number(filters.rating)
    if (!isNaN(rating) && rating >= 0 && rating <= 5) {
      sanitized.rating = rating
    }
  }

  // Boolean filters
  if (filters.inStock !== undefined) {
    sanitized.inStock = Boolean(filters.inStock)
  }

  if (filters.featured !== undefined) {
    sanitized.featured = Boolean(filters.featured)
  }

  if (filters.onSale !== undefined) {
    sanitized.onSale = Boolean(filters.onSale)
  }

  // String filters
  if (filters.category && typeof filters.category === "string") {
    sanitized.category = filters.category.trim()
  }

  if (filters.vendor && typeof filters.vendor === "string") {
    sanitized.vendor = filters.vendor.trim()
  }

  // Array filters
  if (filters.tags && Array.isArray(filters.tags)) {
    sanitized.tags = filters.tags.filter((tag: any) => typeof tag === "string" && tag.trim().length > 0)
  }

  // Date filters
  if (filters.createdAfter) {
    const date = new Date(filters.createdAfter)
    if (!isNaN(date.getTime())) {
      sanitized.createdAfter = date
    }
  }

  if (filters.createdBefore) {
    const date = new Date(filters.createdBefore)
    if (!isNaN(date.getTime())) {
      sanitized.createdBefore = date
    }
  }

  return sanitized
}
