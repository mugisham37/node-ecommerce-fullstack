import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import { getCache, setCache } from '../config/redis'
import axios from 'axios'

// Cache TTL in seconds
const CACHE_TTL = {
  CURRENCIES: 3600, // 1 hour
  EXCHANGE_RATES: 3600, // 1 hour
}

/**
 * Get all currencies
 * @param requestId Request ID for logging
 * @returns Array of currencies
 */
export const getAllCurrencies = async (requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'currency-list')
  logger.info('Getting all currencies')

  // Try to get from cache
  const cacheKey = 'currencies:all'
  const cachedData = await getCache<any[]>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved currencies from cache')
    return cachedData
  }

  try {
    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    })

    // Cache the results
    await setCache(cacheKey, currencies, CACHE_TTL.CURRENCIES)

    return currencies
  } catch (error: any) {
    logger.error(`Error getting currencies: ${error.message}`)
    throw new ApiError(`Failed to get currencies: ${error.message}`, 500)
  }
}

/**
 * Get currency by code
 * @param code Currency code
 * @param requestId Request ID for logging
 * @returns Currency object
 */
export const getCurrencyByCode = async (code: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'currency-get')
  logger.info(`Getting currency by code: ${code}`)

  // Try to get from cache
  const cacheKey = `currency:${code}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info(`Retrieved currency ${code} from cache`)
    return cachedData
  }

  try {
    const currency = await prisma.currency.findUnique({
      where: { 
        code: code.toUpperCase(),
        isActive: true,
      },
    })

    if (!currency) {
      throw new ApiError(`Currency with code ${code} not found`, 404)
    }

    // Cache the results
    await setCache(cacheKey, currency, CACHE_TTL.CURRENCIES)

    return currency
  } catch (error: any) {
    logger.error(`Error getting currency by code: ${error.message}`)
    throw error
  }
}

/**
 * Get base currency
 * @param requestId Request ID for logging
 * @returns Base currency object
 */
export const getBaseCurrency = async (requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'currency-base')
  logger.info('Getting base currency')

  // Try to get from cache
  const cacheKey = 'currency:base'
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved base currency from cache')
    return cachedData
  }

  try {
    const baseCurrency = await prisma.currency.findFirst({
      where: { isBase: true },
    })

    if (!baseCurrency) {
      throw new ApiError('No base currency found', 500)
    }

    // Cache the results
    await setCache(cacheKey, baseCurrency, CACHE_TTL.CURRENCIES)

    return baseCurrency
  } catch (error: any) {
    logger.error(`Error getting base currency: ${error.message}`)
    throw error
  }
}

/**
 * Create currency
 * @param currencyData Currency data
 * @param requestId Request ID for logging
 * @returns Created currency
 */
export const createCurrency = async (
  currencyData: Prisma.CurrencyCreateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'currency-create')
  logger.info(`Creating currency: ${JSON.stringify(currencyData)}`)

  try {
    // Check if currency with same code already exists
    const existingCurrency = await prisma.currency.findUnique({
      where: { code: currencyData.code.toUpperCase() },
    })

    if (existingCurrency) {
      throw new ApiError(`Currency with code ${currencyData.code} already exists`, 400)
    }

    // If this is the first currency, set it as base
    const currencyCount = await prisma.currency.count()
    if (currencyCount === 0) {
      currencyData.isBase = true
      currencyData.rate = 1
    }

    // Create currency
    const currency = await prisma.currency.create({
      data: {
        ...currencyData,
        code: currencyData.code.toUpperCase(),
      },
    })

    // Invalidate cache
    await invalidateCurrencyCache()

    return currency
  } catch (error: any) {
    logger.error(`Error creating currency: ${error.message}`)
    throw error
  }
}

/**
 * Update currency
 * @param code Currency code
 * @param currencyData Currency data
 * @param requestId Request ID for logging
 * @returns Updated currency
 */
export const updateCurrency = async (
  code: string,
  currencyData: Prisma.CurrencyUpdateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'currency-update')
  logger.info(`Updating currency ${code}: ${JSON.stringify(currencyData)}`)

  try {
    // Find currency
    const currency = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!currency) {
      throw new ApiError(`Currency with code ${code} not found`, 404)
    }

    // If trying to change the code, check if new code already exists
    if (currencyData.code && currencyData.code !== code.toUpperCase()) {
      const existingCurrency = await prisma.currency.findUnique({
        where: { code: currencyData.code as string },
      })

      if (existingCurrency) {
        throw new ApiError(`Currency with code ${currencyData.code} already exists`, 400)
      }
    }

    // If this is the base currency, don't allow changing the rate
    if (currency.isBase && currencyData.rate && currencyData.rate !== 1) {
      throw new ApiError('Cannot change the rate of the base currency', 400)
    }

    // Update currency
    const updatedCurrency = await prisma.currency.update({
      where: { code: code.toUpperCase() },
      data: currencyData,
    })

    // Invalidate cache
    await invalidateCurrencyCache()

    return updatedCurrency
  } catch (error: any) {
    logger.error(`Error updating currency: ${error.message}`)
    throw error
  }
}

/**
 * Delete currency
 * @param code Currency code
 * @param requestId Request ID for logging
 * @returns Deleted currency
 */
export const deleteCurrency = async (code: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'currency-delete')
  logger.info(`Deleting currency: ${code}`)

  try {
    // Find currency
    const currency = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!currency) {
      throw new ApiError(`Currency with code ${code} not found`, 404)
    }

    // Check if this is the base currency
    if (currency.isBase) {
      throw new ApiError('Cannot delete the base currency', 400)
    }

    // Check if currency is in use
    const countriesCount = await prisma.country.count({
      where: { currencyId: currency.id },
    })

    if (countriesCount > 0) {
      throw new ApiError(`Cannot delete currency ${code} as it is being used by ${countriesCount} countries`, 400)
    }

    // Delete currency
    const deletedCurrency = await prisma.currency.delete({
      where: { code: code.toUpperCase() },
    })

    // Invalidate cache
    await invalidateCurrencyCache()

    return deletedCurrency
  } catch (error: any) {
    logger.error(`Error deleting currency: ${error.message}`)
    throw error
  }
}

/**
 * Set base currency
 * @param code Currency code
 * @param requestId Request ID for logging
 * @returns Base currency
 */
export const setBaseCurrency = async (code: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'currency-set-base')
  logger.info(`Setting base currency: ${code}`)

  try {
    // Find currency
    const currency = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!currency) {
      throw new ApiError(`Currency with code ${code} not found`, 404)
    }

    // If already base currency, return
    if (currency.isBase) {
      return currency
    }

    // Use transaction to update all currencies
    const result = await prisma.$transaction(async (tx) => {
      // Find current base currency
      const currentBase = await tx.currency.findFirst({
        where: { isBase: true },
      })

      // Get all currencies
      const currencies = await tx.currency.findMany({
        where: { id: { not: currency.id } },
      })

      // Update rates relative to new base
      if (currentBase) {
        for (const curr of currencies) {
          if (curr.id === currentBase.id) {
            // Current base becomes regular currency with rate relative to new base
            await tx.currency.update({
              where: { id: curr.id },
              data: {
                rate: 1 / Number(currency.rate),
                isBase: false,
              },
            })
          } else {
            // Other currencies get their rates adjusted relative to new base
            await tx.currency.update({
              where: { id: curr.id },
              data: {
                rate: Number(curr.rate) / Number(currency.rate),
              },
            })
          }
        }
      }

      // Set new base currency
      const updatedCurrency = await tx.currency.update({
        where: { id: currency.id },
        data: {
          isBase: true,
          rate: 1,
        },
      })

      return updatedCurrency
    })

    // Invalidate cache
    await invalidateCurrencyCache()

    return result
  } catch (error: any) {
    logger.error(`Error setting base currency: ${error.message}`)
    throw error
  }
}

/**
 * Update exchange rates from external API
 * @param apiKey Exchange rate API key
 * @param requestId Request ID for logging
 * @returns Updated currencies
 */
export const updateExchangeRates = async (apiKey: string, requestId?: string): Promise<any[]> => {
  const logger = createRequestLogger(requestId || 'currency-update-rates')
  logger.info('Updating exchange rates from external API')

  try {
    // Get base currency
    const baseCurrency = await getBaseCurrency(requestId)

    // Fetch exchange rates from external API
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency.code}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.data || !response.data.rates) {
      throw new ApiError('Failed to fetch exchange rates', 500)
    }

    const rates = response.data.rates

    // Update currencies with new rates
    const currencies = await prisma.currency.findMany({
      where: { isBase: false },
    })

    for (const currency of currencies) {
      if (rates[currency.code]) {
        await prisma.currency.update({
          where: { id: currency.id },
          data: { rate: rates[currency.code] },
        })
        logger.info(`Updated rate for ${currency.code}: ${rates[currency.code]}`)
      } else {
        logger.warn(`No rate found for ${currency.code}`)
      }
    }

    // Invalidate cache
    await invalidateCurrencyCache()

    return await prisma.currency.findMany({
      orderBy: { code: 'asc' },
    })
  } catch (error: any) {
    logger.error(`Error updating exchange rates: ${error.message}`)
    throw new ApiError(`Failed to update exchange rates: ${error.message}`, 500)
  }
}

/**
 * Convert amount between currencies
 * @param amount Amount to convert
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 * @param requestId Request ID for logging
 * @returns Converted amount
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  requestId?: string
): Promise<number> => {
  const logger = createRequestLogger(requestId || 'currency-convert')
  logger.info(`Converting ${amount} from ${fromCurrency} to ${toCurrency}`)

  try {
    // If same currency, return amount
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return amount
    }

    // Get currencies
    const sourceCurrency = await getCurrencyByCode(fromCurrency, requestId)
    const targetCurrency = await getCurrencyByCode(toCurrency, requestId)

    // Convert to base currency first, then to target currency
    const amountInBaseCurrency = amount / Number(sourceCurrency.rate)
    const convertedAmount = amountInBaseCurrency * Number(targetCurrency.rate)

    // Round to target currency decimal places
    const factor = Math.pow(10, targetCurrency.decimalPlaces)
    return Math.round(convertedAmount * factor) / factor
  } catch (error: any) {
    logger.error(`Error converting currency: ${error.message}`)
    throw error
  }
}

/**
 * Format amount according to currency
 * @param amount Amount to format
 * @param currencyCode Currency code
 * @param requestId Request ID for logging
 * @returns Formatted amount string
 */
export const formatCurrency = async (amount: number, currencyCode: string, requestId?: string): Promise<string> => {
  const logger = createRequestLogger(requestId || 'currency-format')
  logger.info(`Formatting ${amount} in ${currencyCode}`)

  try {
    const currency = await getCurrencyByCode(currencyCode, requestId)

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    }).format(amount)
  } catch (error: any) {
    logger.error(`Error formatting currency: ${error.message}`)
    throw error
  }
}

/**
 * Invalidate currency cache
 */
const invalidateCurrencyCache = async (): Promise<void> => {
  const logger = createRequestLogger()
  logger.info('Invalidating currency cache')

  try {
    // Delete all currency-related cache keys
    await Promise.all([
      setCache('currencies:all', null, 1),
      setCache('currency:base', null, 1),
    ])

    // Delete individual currency cache keys
    const currencies = await prisma.currency.findMany({
      select: { code: true },
    })

    await Promise.all(
      currencies.map((currency) =>
        setCache(`currency:${currency.code}`, null, 1)
      )
    )

    logger.info('Currency cache invalidated')
  } catch (error: any) {
    logger.error(`Error invalidating currency cache: ${error.message}`)
  }
}
