import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import * as countryService from "../services/country.service"
import { translateError } from "../utils/translate"

/**
 * Get all countries
 * @route GET /api/v1/countries
 * @access Public
 */
export const getAllCountries = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting all countries")

  // Parse query parameters for filtering and pagination
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50
  const search = req.query.search as string | undefined
  const region = req.query.region as string | undefined
  const active = req.query.active ? req.query.active === "true" : undefined

  const countries = await countryService.getAllCountries(req.id)

  // Apply client-side filtering and pagination since service doesn't support it
  let filteredCountries = countries

  // Apply search filter
  if (search) {
    filteredCountries = filteredCountries.filter(country => 
      country.name.toLowerCase().includes(search.toLowerCase()) ||
      country.code.toLowerCase().includes(search.toLowerCase())
    )
  }

  // Apply region filter
  if (region) {
    filteredCountries = filteredCountries.filter(country => 
      country.region?.name?.toLowerCase() === region.toLowerCase()
    )
  }

  // Apply active filter
  if (active !== undefined) {
    filteredCountries = filteredCountries.filter(country => country.isActive === active)
  }

  // Apply pagination
  const totalResults = filteredCountries.length
  const totalPages = Math.ceil(totalResults / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedCountries = filteredCountries.slice(startIndex, endIndex)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: paginatedCountries.length,
    pagination: {
      page,
      limit,
      totalPages,
      totalResults,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    data: {
      countries: paginatedCountries,
    },
  })
})

/**
 * Get country by code
 * @route GET /api/v1/countries/:code
 * @access Public
 */
export const getCountryByCode = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { code } = req.params

  requestLogger.info(`Getting country by code: ${code}`)

  if (!code) {
    return next(new ApiError(translateError("countryCodeRequired", {}, req.language), 400))
  }

  // Validate country code format (2 or 3 characters)
  if (!/^[A-Z]{2,3}$/.test(code.toUpperCase())) {
    return next(new ApiError("Invalid country code format. Must be 2 or 3 uppercase letters", 400))
  }

  const country = await countryService.getCountryByCode(code.toUpperCase(), req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      country,
    },
  })
})

/**
 * Create country
 * @route POST /api/v1/countries
 * @access Protected (Admin)
 */
export const createCountry = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info(`Creating country: ${JSON.stringify(req.body)}`)

  // Validate required fields
  const { code, name } = req.body

  if (!code || !name) {
    return next(new ApiError("Country code and name are required", 400))
  }

  // Validate country code format
  if (!/^[A-Z]{2,3}$/.test(code)) {
    return next(new ApiError("Invalid country code format. Must be 2 or 3 uppercase letters", 400))
  }

  // Validate name length
  if (name.length < 2 || name.length > 100) {
    return next(new ApiError("Country name must be between 2 and 100 characters", 400))
  }

  const country = await countryService.createCountry({
    ...req.body,
    code: code.toUpperCase(),
  }, req.id)

  res.status(201).json({
    status: "success",
    requestId: req.id,
    data: {
      country,
    },
  })
})

/**
 * Update country
 * @route PUT /api/v1/countries/:code
 * @access Protected (Admin)
 */
export const updateCountry = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { code } = req.params

  requestLogger.info(`Updating country ${code}: ${JSON.stringify(req.body)}`)

  if (!code) {
    return next(new ApiError(translateError("countryCodeRequired", {}, req.language), 400))
  }

  // Validate country code format
  if (!/^[A-Z]{2,3}$/.test(code.toUpperCase())) {
    return next(new ApiError("Invalid country code format. Must be 2 or 3 uppercase letters", 400))
  }

  // Validate name if provided
  if (req.body.name && (req.body.name.length < 2 || req.body.name.length > 100)) {
    return next(new ApiError("Country name must be between 2 and 100 characters", 400))
  }

  const country = await countryService.updateCountry(code.toUpperCase(), req.body, req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      country,
    },
  })
})

/**
 * Delete country
 * @route DELETE /api/v1/countries/:code
 * @access Protected (Admin)
 */
export const deleteCountry = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { code } = req.params

  requestLogger.info(`Deleting country: ${code}`)

  if (!code) {
    return next(new ApiError(translateError("countryCodeRequired", {}, req.language), 400))
  }

  // Validate country code format
  if (!/^[A-Z]{2,3}$/.test(code.toUpperCase())) {
    return next(new ApiError("Invalid country code format. Must be 2 or 3 uppercase letters", 400))
  }

  const country = await countryService.deleteCountry(code.toUpperCase(), req.id)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      country,
    },
    message: "Country deleted successfully",
  })
})

/**
 * Get states/provinces for a country
 * @route GET /api/v1/countries/:code/states
 * @access Public
 */
export const getStatesByCountry = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { code } = req.params

  requestLogger.info(`Getting states for country: ${code}`)

  if (!code) {
    return next(new ApiError(translateError("countryCodeRequired", {}, req.language), 400))
  }

  // Validate country code format
  if (!/^[A-Z]{2,3}$/.test(code.toUpperCase())) {
    return next(new ApiError("Invalid country code format. Must be 2 or 3 uppercase letters", 400))
  }

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50
  const search = req.query.search as string | undefined

  const states = await countryService.getStatesByCountry(code.toUpperCase(), req.id)

  // Apply client-side filtering and pagination
  let filteredStates = states

  // Apply search filter
  if (search) {
    filteredStates = filteredStates.filter(state => 
      state.name.toLowerCase().includes(search.toLowerCase()) ||
      state.code.toLowerCase().includes(search.toLowerCase())
    )
  }

  // Apply pagination
  const totalResults = filteredStates.length
  const totalPages = Math.ceil(totalResults / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedStates = filteredStates.slice(startIndex, endIndex)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: paginatedStates.length,
    pagination: {
      page,
      limit,
      totalPages,
      totalResults,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    data: {
      states: paginatedStates,
    },
  })
})

/**
 * Add state to country
 * @route POST /api/v1/countries/:code/states
 * @access Protected (Admin)
 */
export const addStateToCountry = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { code } = req.params
  const { stateCode, stateName } = req.body

  requestLogger.info(`Adding state to country: ${code}`)

  if (!code) {
    return next(new ApiError(translateError("countryCodeRequired", {}, req.language), 400))
  }

  if (!stateCode || !stateName) {
    return next(new ApiError("State code and name are required", 400))
  }

  // Validate country code format
  if (!/^[A-Z]{2,3}$/.test(code.toUpperCase())) {
    return next(new ApiError("Invalid country code format. Must be 2 or 3 uppercase letters", 400))
  }

  const country = await countryService.addStateToCountry(
    code.toUpperCase(),
    { code: stateCode.toUpperCase(), name: stateName },
    req.id
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      country,
    },
    message: "State added successfully",
  })
})

/**
 * Remove state from country
 * @route DELETE /api/v1/countries/:code/states/:stateCode
 * @access Protected (Admin)
 */
export const removeStateFromCountry = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { code, stateCode } = req.params

  requestLogger.info(`Removing state ${stateCode} from country: ${code}`)

  if (!code || !stateCode) {
    return next(new ApiError("Country code and state code are required", 400))
  }

  // Validate country code format
  if (!/^[A-Z]{2,3}$/.test(code.toUpperCase())) {
    return next(new ApiError("Invalid country code format. Must be 2 or 3 uppercase letters", 400))
  }

  const country = await countryService.removeStateFromCountry(
    code.toUpperCase(),
    stateCode.toUpperCase(),
    req.id
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: {
      country,
    },
    message: "State removed successfully",
  })
})

/**
 * Get countries by region
 * @route GET /api/v1/countries/region/:region
 * @access Public
 */
export const getCountriesByRegion = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { region } = req.params

  requestLogger.info(`Getting countries for region: ${region}`)

  if (!region) {
    return next(new ApiError("Region is required", 400))
  }

  // Validate region
  const validRegions = ["africa", "americas", "asia", "europe", "oceania"]
  if (!validRegions.includes(region.toLowerCase())) {
    return next(new ApiError(`Invalid region. Must be one of: ${validRegions.join(", ")}`, 400))
  }

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50
  const search = req.query.search as string | undefined

  const countries = await countryService.getCountriesByRegion(region.toLowerCase(), req.id)

  // Apply client-side filtering and pagination
  let filteredCountries = countries

  // Apply search filter
  if (search) {
    filteredCountries = filteredCountries.filter(country => 
      country.name.toLowerCase().includes(search.toLowerCase()) ||
      country.code.toLowerCase().includes(search.toLowerCase())
    )
  }

  // Apply pagination
  const totalResults = filteredCountries.length
  const totalPages = Math.ceil(totalResults / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedCountries = filteredCountries.slice(startIndex, endIndex)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: paginatedCountries.length,
    pagination: {
      page,
      limit,
      totalPages,
      totalResults,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    data: {
      countries: paginatedCountries,
      region: region.toLowerCase(),
    },
  })
})

/**
 * Search countries
 * @route GET /api/v1/countries/search
 * @access Public
 */
export const searchCountries = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const query = req.query.q as string | undefined

  requestLogger.info(`Searching countries with query: ${query}`)

  if (!query) {
    return next(new ApiError("Search query is required", 400))
  }

  if (query.length < 2) {
    return next(new ApiError("Search query must be at least 2 characters long", 400))
  }

  // Parse query parameters
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20
  const region = req.query.region as string | undefined

  const countries = await countryService.searchCountries(query, req.id)

  // Apply client-side filtering and pagination
  let filteredCountries = countries

  // Apply region filter
  if (region) {
    filteredCountries = filteredCountries.filter(country => 
      country.region?.name?.toLowerCase() === region.toLowerCase()
    )
  }

  // Apply pagination
  const totalResults = filteredCountries.length
  const totalPages = Math.ceil(totalResults / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedCountries = filteredCountries.slice(startIndex, endIndex)

  res.status(200).json({
    status: "success",
    requestId: req.id,
    results: paginatedCountries.length,
    pagination: {
      page,
      limit,
      totalPages,
      totalResults,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    data: {
      countries: paginatedCountries,
      query,
    },
  })
})
