import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import { getCache, setCache } from '../config/redis'

// Cache TTL in seconds
const CACHE_TTL = {
  COUNTRIES: 86400, // 24 hours
}

/**
 * Get all countries
 * @param requestId Request ID for logging
 * @returns Array of countries
 */
export const getAllCountries = async (requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'country-list')
  logger.info('Getting all countries')

  // Try to get from cache
  const cacheKey = 'countries:all'
  const cachedData = await getCache<any[]>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved countries from cache')
    return cachedData
  }

  try {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      include: {
        currency: true,
        region: true,
      },
      orderBy: { name: 'asc' },
    })

    // Cache the results
    await setCache(cacheKey, countries, CACHE_TTL.COUNTRIES)

    return countries
  } catch (error: any) {
    logger.error(`Error getting countries: ${error.message}`)
    throw new ApiError(`Failed to get countries: ${error.message}`, 500)
  }
}

/**
 * Get country by code
 * @param code Country code
 * @param requestId Request ID for logging
 * @returns Country object
 */
export const getCountryByCode = async (code: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'country-get')
  logger.info(`Getting country by code: ${code}`)

  // Try to get from cache
  const cacheKey = `country:${code}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info(`Retrieved country ${code} from cache`)
    return cachedData
  }

  try {
    const country = await prisma.country.findUnique({
      where: { 
        code: code.toUpperCase(),
        isActive: true,
      },
      include: {
        currency: true,
        region: true,
      },
    })

    if (!country) {
      throw new ApiError(`Country with code ${code} not found`, 404)
    }

    // Cache the results
    await setCache(cacheKey, country, CACHE_TTL.COUNTRIES)

    return country
  } catch (error: any) {
    logger.error(`Error getting country by code: ${error.message}`)
    throw error
  }
}

/**
 * Create country
 * @param countryData Country data
 * @param requestId Request ID for logging
 * @returns Created country
 */
export const createCountry = async (
  countryData: Prisma.CountryCreateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'country-create')
  logger.info(`Creating country: ${JSON.stringify(countryData)}`)

  try {
    // Check if country with same code already exists
    const existingCountry = await prisma.country.findUnique({
      where: { code: countryData.code.toUpperCase() },
    })

    if (existingCountry) {
      throw new ApiError(`Country with code ${countryData.code} already exists`, 400)
    }

    // Create country
    const country = await prisma.country.create({
      data: {
        ...countryData,
        code: countryData.code.toUpperCase(),
      },
      include: {
        currency: true,
      },
    })

    // Invalidate cache
    await invalidateCountryCache()

    return country
  } catch (error: any) {
    logger.error(`Error creating country: ${error.message}`)
    throw error
  }
}

/**
 * Update country
 * @param code Country code
 * @param countryData Country data
 * @param requestId Request ID for logging
 * @returns Updated country
 */
export const updateCountry = async (
  code: string,
  countryData: Prisma.CountryUpdateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'country-update')
  logger.info(`Updating country ${code}: ${JSON.stringify(countryData)}`)

  try {
    // Find country
    const country = await prisma.country.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!country) {
      throw new ApiError(`Country with code ${code} not found`, 404)
    }

    // If trying to change the code, check if new code already exists
    if (countryData.code && countryData.code !== code.toUpperCase()) {
      const existingCountry = await prisma.country.findUnique({
        where: { code: countryData.code as string },
      })

      if (existingCountry) {
        throw new ApiError(`Country with code ${countryData.code} already exists`, 400)
      }
    }

    // Update country
    const updatedCountry = await prisma.country.update({
      where: { code: code.toUpperCase() },
      data: countryData,
      include: {
        currency: true,
      },
    })

    // Invalidate cache
    await invalidateCountryCache()

    return updatedCountry
  } catch (error: any) {
    logger.error(`Error updating country: ${error.message}`)
    throw error
  }
}

/**
 * Delete country
 * @param code Country code
 * @param requestId Request ID for logging
 * @returns Deleted country
 */
export const deleteCountry = async (code: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'country-delete')
  logger.info(`Deleting country: ${code}`)

  try {
    // Find country
    const country = await prisma.country.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!country) {
      throw new ApiError(`Country with code ${code} not found`, 404)
    }

    // Check if country is in use
    const usersCount = await prisma.user.count({
      where: { 
        country: {
          code: code.toUpperCase()
        }
      },
    })

    if (usersCount > 0) {
      throw new ApiError(`Cannot delete country ${code} as it is being used by ${usersCount} users`, 400)
    }

    // Delete country
    const deletedCountry = await prisma.country.delete({
      where: { code: code.toUpperCase() },
    })

    // Invalidate cache
    await invalidateCountryCache()

    return deletedCountry
  } catch (error: any) {
    logger.error(`Error deleting country: ${error.message}`)
    throw error
  }
}

/**
 * Get states/provinces for a country
 * @param countryCode Country code
 * @param requestId Request ID for logging
 * @returns Array of states/provinces
 */
export const getStatesByCountry = async (
  countryCode: string,
  requestId?: string
): Promise<{ code: string; name: string }[]> => {
  const logger = createRequestLogger(requestId || 'country-states')
  logger.info(`Getting states for country: ${countryCode}`)

  // Try to get from cache
  const cacheKey = `country:${countryCode}:states`
  const cachedData = await getCache<{ code: string; name: string }[]>(cacheKey)

  if (cachedData) {
    logger.info(`Retrieved states for country ${countryCode} from cache`)
    return cachedData
  }

  try {
    const country = await prisma.country.findUnique({
      where: { 
        code: countryCode.toUpperCase(),
        isActive: true,
      },
      select: { states: true },
    })

    if (!country) {
      throw new ApiError(`Country with code ${countryCode} not found`, 404)
    }

    const states = (country.states as any) || []

    // Cache the results
    await setCache(cacheKey, states, CACHE_TTL.COUNTRIES)

    return states
  } catch (error: any) {
    logger.error(`Error getting states for country: ${error.message}`)
    throw error
  }
}

/**
 * Add state to country
 * @param countryCode Country code
 * @param state State data
 * @param requestId Request ID for logging
 * @returns Updated country
 */
export const addStateToCountry = async (
  countryCode: string,
  state: { code: string; name: string },
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'country-add-state')
  logger.info(`Adding state to country ${countryCode}: ${JSON.stringify(state)}`)

  try {
    // Get current country
    const country = await prisma.country.findUnique({
      where: { code: countryCode.toUpperCase() },
    })

    if (!country) {
      throw new ApiError(`Country with code ${countryCode} not found`, 404)
    }

    // Get current states
    const currentStates = (country.states as any) || []

    // Check if state already exists
    const existingState = currentStates.find((s: any) => s.code === state.code)
    if (existingState) {
      throw new ApiError(`State with code ${state.code} already exists in country ${countryCode}`, 400)
    }

    // Add new state
    const updatedStates = [...currentStates, state]

    // Update country
    const updatedCountry = await prisma.country.update({
      where: { code: countryCode.toUpperCase() },
      data: { states: updatedStates },
      include: {
        currency: true,
      },
    })

    // Invalidate cache
    await invalidateCountryCache()

    return updatedCountry
  } catch (error: any) {
    logger.error(`Error adding state to country: ${error.message}`)
    throw error
  }
}

/**
 * Remove state from country
 * @param countryCode Country code
 * @param stateCode State code
 * @param requestId Request ID for logging
 * @returns Updated country
 */
export const removeStateFromCountry = async (
  countryCode: string,
  stateCode: string,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'country-remove-state')
  logger.info(`Removing state ${stateCode} from country ${countryCode}`)

  try {
    // Get current country
    const country = await prisma.country.findUnique({
      where: { code: countryCode.toUpperCase() },
    })

    if (!country) {
      throw new ApiError(`Country with code ${countryCode} not found`, 404)
    }

    // Get current states
    const currentStates = (country.states as any) || []

    // Filter out the state to remove
    const updatedStates = currentStates.filter((s: any) => s.code !== stateCode)

    if (updatedStates.length === currentStates.length) {
      throw new ApiError(`State with code ${stateCode} not found in country ${countryCode}`, 404)
    }

    // Update country
    const updatedCountry = await prisma.country.update({
      where: { code: countryCode.toUpperCase() },
      data: { states: updatedStates },
      include: {
        currency: true,
      },
    })

    // Invalidate cache
    await invalidateCountryCache()

    return updatedCountry
  } catch (error: any) {
    logger.error(`Error removing state from country: ${error.message}`)
    throw error
  }
}

/**
 * Get countries by region
 * @param region Region name
 * @param requestId Request ID for logging
 * @returns Array of countries in the region
 */
export const getCountriesByRegion = async (region: string, requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'country-by-region')
  logger.info(`Getting countries by region: ${region}`)

  try {
    const countries = await prisma.country.findMany({
      where: {
        region: { 
          name: { equals: region, mode: 'insensitive' }
        },
        isActive: true,
      },
      include: {
        currency: true,
        region: true,
      },
      orderBy: { name: 'asc' },
    })

    return countries
  } catch (error: any) {
    logger.error(`Error getting countries by region: ${error.message}`)
    throw new ApiError(`Failed to get countries by region: ${error.message}`, 500)
  }
}

/**
 * Search countries
 * @param query Search query
 * @param requestId Request ID for logging
 * @returns Array of matching countries
 */
export const searchCountries = async (query: string, requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'country-search')
  logger.info(`Searching countries with query: ${query}`)

  try {
    const countries = await prisma.country.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
          { region: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        currency: true,
        region: true,
      },
      orderBy: { name: 'asc' },
    })

    return countries
  } catch (error: any) {
    logger.error(`Error searching countries: ${error.message}`)
    throw new ApiError(`Failed to search countries: ${error.message}`, 500)
  }
}

/**
 * Invalidate country cache
 */
const invalidateCountryCache = async (): Promise<void> => {
  const logger = createRequestLogger()
  logger.info('Invalidating country cache')

  try {
    // Delete all country-related cache keys
    await Promise.all([
      setCache('countries:all', null, 1),
    ])

    // Delete individual country cache keys
    const countries = await prisma.country.findMany({
      select: { code: true },
    })

    await Promise.all(
      countries.map((country) =>
        Promise.all([
          setCache(`country:${country.code}`, null, 1),
          setCache(`country:${country.code}:states`, null, 1),
        ])
      )
    )

    logger.info('Country cache invalidated')
  } catch (error: any) {
    logger.error(`Error invalidating country cache: ${error.message}`)
  }
}
