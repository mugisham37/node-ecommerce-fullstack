import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import { getCache, setCache } from '../config/redis'

// Cache TTL in seconds
const CACHE_TTL = {
  TAX_RATES: 3600, // 1 hour
}

/**
 * Get all tax rates
 * @param requestId Request ID for logging
 * @returns Array of tax rates
 */
export const getAllTaxRates = async (requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'tax-get-all')
  logger.info('Getting all tax rates')

  // Try to get from cache
  const cacheKey = 'tax:all'
  const cachedData = await getCache<any[]>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved tax rates from cache')
    return cachedData
  }

  try {
    const taxRates = await prisma.taxRate.findMany({
      where: { isActive: true },
      orderBy: [
        { country: 'asc' },
        { priority: 'desc' }
      ],
    })

    // Cache the results
    await setCache(cacheKey, taxRates, CACHE_TTL.TAX_RATES)

    return taxRates
  } catch (error: any) {
    logger.error(`Error getting tax rates: ${error.message}`)
    throw new ApiError(`Failed to get tax rates: ${error.message}`, 500)
  }
}

/**
 * Get tax rate by ID
 * @param id Tax rate ID
 * @param requestId Request ID for logging
 * @returns Tax rate object
 */
export const getTaxRateById = async (id: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'tax-get-by-id')
  logger.info(`Getting tax rate by ID: ${id}`)

  // Try to get from cache
  const cacheKey = `tax:${id}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info(`Retrieved tax rate ${id} from cache`)
    return cachedData
  }

  try {
    const taxRate = await prisma.taxRate.findUnique({
      where: { id },
    })

    if (!taxRate) {
      throw new ApiError(`Tax rate with ID ${id} not found`, 404)
    }

    // Cache the results
    await setCache(cacheKey, taxRate, CACHE_TTL.TAX_RATES)

    return taxRate
  } catch (error: any) {
    logger.error(`Error getting tax rate by ID: ${error.message}`)
    throw error
  }
}

/**
 * Create tax rate
 * @param taxRateData Tax rate data
 * @param requestId Request ID for logging
 * @returns Created tax rate
 */
export const createTaxRate = async (
  taxRateData: Prisma.TaxRateCreateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'tax-create')
  logger.info(`Creating tax rate: ${JSON.stringify(taxRateData)}`)

  try {
    // Create tax rate
    const taxRate = await prisma.taxRate.create({
      data: taxRateData,
    })

    // Invalidate cache
    await invalidateTaxCache()

    return taxRate
  } catch (error: any) {
    logger.error(`Error creating tax rate: ${error.message}`)
    throw error
  }
}

/**
 * Update tax rate
 * @param id Tax rate ID
 * @param taxRateData Tax rate data
 * @param requestId Request ID for logging
 * @returns Updated tax rate
 */
export const updateTaxRate = async (
  id: string,
  taxRateData: Prisma.TaxRateUpdateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'tax-update')
  logger.info(`Updating tax rate ${id}: ${JSON.stringify(taxRateData)}`)

  try {
    // Find tax rate
    const taxRate = await prisma.taxRate.findUnique({
      where: { id },
    })

    if (!taxRate) {
      throw new ApiError(`Tax rate with ID ${id} not found`, 404)
    }

    // Update tax rate
    const updatedTaxRate = await prisma.taxRate.update({
      where: { id },
      data: taxRateData,
    })

    // Invalidate cache
    await invalidateTaxCache()

    return updatedTaxRate
  } catch (error: any) {
    logger.error(`Error updating tax rate: ${error.message}`)
    throw error
  }
}

/**
 * Delete tax rate
 * @param id Tax rate ID
 * @param requestId Request ID for logging
 * @returns Deleted tax rate
 */
export const deleteTaxRate = async (id: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'tax-delete')
  logger.info(`Deleting tax rate: ${id}`)

  try {
    // Find tax rate
    const taxRate = await prisma.taxRate.findUnique({
      where: { id },
    })

    if (!taxRate) {
      throw new ApiError(`Tax rate with ID ${id} not found`, 404)
    }

    // Delete tax rate
    const deletedTaxRate = await prisma.taxRate.delete({
      where: { id },
    })

    // Invalidate cache
    await invalidateTaxCache()

    return deletedTaxRate
  } catch (error: any) {
    logger.error(`Error deleting tax rate: ${error.message}`)
    throw error
  }
}

/**
 * Get applicable tax rate for a location
 * @param country Country code
 * @param state State/province code (optional)
 * @param postalCode Postal/ZIP code (optional)
 * @param categoryId Product category ID (optional)
 * @param requestId Request ID for logging
 * @returns Applicable tax rate
 */
export const getApplicableTaxRate = async (
  country: string,
  state?: string,
  postalCode?: string,
  categoryId?: string,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'tax-applicable')
  logger.info(`Getting applicable tax rate for ${country}, ${state || 'any'}, ${postalCode || 'any'}`)

  // Try to get from cache
  const cacheKey = `tax:applicable:${country}:${state || 'any'}:${postalCode || 'any'}:${categoryId || 'any'}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved applicable tax rate from cache')
    return cachedData
  }

  try {
    // Build query to find the most specific tax rate
    const where: Prisma.TaxRateWhereInput = {
      country: country.toUpperCase(),
      isActive: true,
    }

    // If state is provided, include it in the query
    if (state) {
      where.state = state.toUpperCase()
    }

    // If postal code is provided, include it in the query
    if (postalCode) {
      where.postalCode = postalCode
    }

    // If category ID is provided, include it in the query
    if (categoryId) {
      where.productCategories = {
        some: {
          id: categoryId
        }
      }
    }

    // Find tax rates matching the criteria, sorted by priority
    let taxRates = await prisma.taxRate.findMany({
      where,
      orderBy: { priority: 'desc' },
      take: 1,
    })

    // If no specific tax rate found, try without postal code
    if (!taxRates.length && postalCode) {
      delete (where as any).postalCode
      taxRates = await prisma.taxRate.findMany({
        where,
        orderBy: { priority: 'desc' },
        take: 1,
      })
    }

    // If still no tax rate found, try without state
    if (!taxRates.length && state) {
      delete (where as any).state
      taxRates = await prisma.taxRate.findMany({
        where,
        orderBy: { priority: 'desc' },
        take: 1,
      })
    }

    // If still no tax rate found, try without category
    if (!taxRates.length && categoryId) {
      delete (where as any).productCategories
      taxRates = await prisma.taxRate.findMany({
        where,
        orderBy: { priority: 'desc' },
        take: 1,
      })
    }

    // If still no tax rate found, get the default tax rate
    if (!taxRates.length) {
      taxRates = await prisma.taxRate.findMany({
        where: { isDefault: true, isActive: true },
        take: 1,
      })
    }

    // If no tax rate found at all, return zero tax rate
    if (!taxRates.length) {
      logger.warn('No applicable tax rate found, returning zero tax')
      return {
        id: 'default',
        name: 'No Tax',
        rate: 0,
        country: 'GLOBAL',
        isDefault: true,
        isActive: true,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    const applicableTaxRate = taxRates[0]

    // Cache the results
    await setCache(cacheKey, applicableTaxRate, CACHE_TTL.TAX_RATES)

    return applicableTaxRate
  } catch (error: any) {
    logger.error(`Error getting applicable tax rate: ${error.message}`)
    throw new ApiError(`Failed to get applicable tax rate: ${error.message}`, 500)
  }
}

/**
 * Calculate tax amount
 * @param amount Amount to calculate tax on
 * @param country Country code
 * @param state State/province code (optional)
 * @param postalCode Postal/ZIP code (optional)
 * @param categoryId Product category ID (optional)
 * @param requestId Request ID for logging
 * @returns Tax amount and details
 */
export const calculateTax = async (
  amount: number,
  country: string,
  state?: string,
  postalCode?: string,
  categoryId?: string,
  requestId?: string
): Promise<{ taxAmount: number; taxRate: number; taxName: string; taxRateId: string }> => {
  const logger = createRequestLogger(requestId || 'tax-calculate')
  logger.info(`Calculating tax for amount ${amount} in ${country}, ${state || 'any'}, ${postalCode || 'any'}`)

  try {
    const taxRate = await getApplicableTaxRate(country, state, postalCode, categoryId, requestId)

    const taxAmount = (amount * Number(taxRate.rate)) / 100
    const roundedTaxAmount = Math.round(taxAmount * 100) / 100 // Round to 2 decimal places

    return {
      taxAmount: roundedTaxAmount,
      taxRate: Number(taxRate.rate),
      taxName: taxRate.name,
      taxRateId: taxRate.id.toString(),
    }
  } catch (error: any) {
    logger.error(`Error calculating tax: ${error.message}`)
    throw error
  }
}

/**
 * Invalidate tax cache
 */
const invalidateTaxCache = async (): Promise<void> => {
  const logger = createRequestLogger('tax-cache-invalidate')
  logger.info('Invalidating tax cache')

  try {
    // Delete all tax-related cache keys
    await Promise.all([
      setCache('tax:all', null, 1),
    ])

    // Delete individual tax rate cache keys
    const taxRates = await prisma.taxRate.findMany({
      select: { id: true },
    })

    await Promise.all(
      taxRates.map((taxRate) =>
        setCache(`tax:${taxRate.id}`, null, 1)
      )
    )

    // Note: For applicable tax rate cache keys, we rely on TTL expiration
    // as there are too many possible combinations to track individually

    logger.info('Tax cache invalidated')
  } catch (error: any) {
    logger.error(`Error invalidating tax cache: ${error.message}`)
  }
}
