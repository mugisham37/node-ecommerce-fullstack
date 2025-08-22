import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import { getCache, setCache } from '../config/redis'
import slugify from 'slugify'

// Cache TTL in seconds
const CACHE_TTL = {
  VENDOR: 3600, // 1 hour
  VENDORS_LIST: 1800, // 30 minutes
  VENDOR_PRODUCTS: 1800, // 30 minutes
  VENDOR_METRICS: 3600, // 1 hour
}

/**
 * Create a new vendor
 * @param vendorData Vendor data
 * @param requestId Request ID for logging
 * @returns Created vendor
 */
export const createVendor = async (
  vendorData: Prisma.VendorCreateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-create')
  logger.info('Creating new vendor')

  try {
    // Check if vendor with same email already exists
    const existingVendor = await prisma.vendor.findFirst({
      where: { 
        OR: [
          { email: vendorData.contactEmail },
          { contactEmail: vendorData.contactEmail }
        ]
      },
    })
    if (existingVendor) {
      throw new ApiError('Vendor with this email already exists', 400)
    }

    // Generate slug from business name
    const slug = slugify(vendorData.businessName || '', { lower: true })

    // Check if slug already exists
    const existingSlug = await prisma.vendor.findUnique({ where: { slug } })
    if (existingSlug) {
      // Append a random string to make the slug unique
      vendorData.slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`
    } else {
      vendorData.slug = slug
    }

    // Create new vendor
    const vendor = await prisma.vendor.create({
      data: vendorData,
    })
    logger.info(`Vendor created with ID: ${vendor.id}`)

    return vendor
  } catch (error: any) {
    logger.error(`Error creating vendor: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor by ID
 * @param vendorId Vendor ID
 * @param requestId Request ID for logging
 * @returns Vendor document
 */
export const getVendorById = async (vendorId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-get')
  logger.info(`Getting vendor with ID: ${vendorId}`)

  // Try to get from cache
  const cacheKey = `vendor:${vendorId}`
  const cachedVendor = await getCache<any>(cacheKey)

  if (cachedVendor) {
    logger.info('Retrieved vendor from cache')
    return cachedVendor
  }

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            active: true,
          },
          take: 5,
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Cache the vendor
    await setCache(cacheKey, vendor, CACHE_TTL.VENDOR)

    return vendor
  } catch (error: any) {
    logger.error(`Error getting vendor: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor by slug
 * @param slug Vendor slug
 * @param requestId Request ID for logging
 * @returns Vendor document
 */
export const getVendorBySlug = async (slug: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-get-slug')
  logger.info(`Getting vendor with slug: ${slug}`)

  // Try to get from cache
  const cacheKey = `vendor:slug:${slug}`
  const cachedVendor = await getCache<any>(cacheKey)

  if (cachedVendor) {
    logger.info('Retrieved vendor from cache')
    return cachedVendor
  }

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { slug },
      include: {
        products: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            slug: true,
          },
          take: 12,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            products: {
              where: { active: true },
            },
          },
        },
      },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Cache the vendor
    await setCache(cacheKey, vendor, CACHE_TTL.VENDOR)

    return vendor
  } catch (error: any) {
    logger.error(`Error getting vendor: ${error.message}`)
    throw error
  }
}

/**
 * Update vendor
 * @param vendorId Vendor ID
 * @param updateData Update data
 * @param requestId Request ID for logging
 * @returns Updated vendor
 */
export const updateVendor = async (
  vendorId: string,
  updateData: Prisma.VendorUpdateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-update')
  logger.info(`Updating vendor with ID: ${vendorId}`)

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // If business name is being updated, update slug as well
    if (updateData.businessName) {
      const newSlug = slugify(updateData.businessName as string, { lower: true })

      // Check if new slug already exists and is not the current vendor
      const existingSlug = await prisma.vendor.findFirst({
        where: { 
          slug: newSlug, 
          id: { not: vendorId } 
        },
      })
      if (existingSlug) {
        // Append a random string to make the slug unique
        updateData.slug = `${newSlug}-${Math.random().toString(36).substring(2, 8)}`
      } else {
        updateData.slug = newSlug
      }
    }

    // Update vendor
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: updateData,
    })

    // Invalidate cache
    const cacheKey = `vendor:${vendorId}`
    const slugCacheKey = `vendor:slug:${vendor.slug}`
    await Promise.all([
      setCache(cacheKey, null, 1),
      setCache(slugCacheKey, null, 1),
      setCache('vendors:list', null, 1),
    ])

    logger.info('Vendor updated successfully')

    return updatedVendor
  } catch (error: any) {
    logger.error(`Error updating vendor: ${error.message}`)
    throw error
  }
}

/**
 * Delete vendor
 * @param vendorId Vendor ID
 * @param requestId Request ID for logging
 * @returns Deleted vendor
 */
export const deleteVendor = async (vendorId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-delete')
  logger.info(`Deleting vendor with ID: ${vendorId}`)

  try {
    // Check if vendor has products
    const productsCount = await prisma.product.count({ where: { vendorId } })
    if (productsCount > 0) {
      throw new ApiError('Cannot delete vendor with existing products', 400)
    }

    // Check if vendor has pending payouts
    const pendingPayoutsCount = await prisma.payout.count({
      where: {
        vendorId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    })
    if (pendingPayoutsCount > 0) {
      throw new ApiError('Cannot delete vendor with pending payouts', 400)
    }

    // Delete vendor
    const vendor = await prisma.vendor.delete({
      where: { id: vendorId },
    })

    // Invalidate cache
    const cacheKey = `vendor:${vendorId}`
    const slugCacheKey = `vendor:slug:${vendor.slug}`
    await Promise.all([
      setCache(cacheKey, null, 1),
      setCache(slugCacheKey, null, 1),
      setCache('vendors:list', null, 1),
    ])

    logger.info('Vendor deleted successfully')

    return vendor
  } catch (error: any) {
    logger.error(`Error deleting vendor: ${error.message}`)
    throw error
  }
}

/**
 * Get all vendors
 * @param filter Filter options
 * @param options Pagination and sorting options
 * @param requestId Request ID for logging
 * @returns List of vendors and count
 */
export const getAllVendors = async (
  filter: Prisma.VendorWhereInput = {},
  options: {
    page?: number
    limit?: number
    sort?: string
    select?: any
  } = {},
  requestId?: string
): Promise<{ vendors: any[]; count: number }> => {
  const logger = createRequestLogger(requestId || 'vendor-list')
  logger.info('Getting all vendors')

  const { page = 1, limit = 10, sort = 'createdAt', select } = options

  // Build query
  const query: Prisma.VendorWhereInput = { ...filter }

  // Try to get from cache if no filters are applied
  const isDefaultQuery =
    Object.keys(filter).length === 0 && page === 1 && limit === 10 && sort === 'createdAt' && !select
  if (isDefaultQuery) {
    const cacheKey = 'vendors:list'
    const cachedData = await getCache<{ vendors: any[]; count: number }>(cacheKey)

    if (cachedData) {
      logger.info('Retrieved vendors from cache')
      return cachedData
    }
  }

  try {
    // Execute query with pagination
    const skip = (page - 1) * limit

    // Determine sort order
    const orderBy: Prisma.VendorOrderByWithRelationInput = {}
    if (sort.startsWith('-')) {
      const field = sort.substring(1)
      orderBy[field as keyof Prisma.VendorOrderByWithRelationInput] = 'desc'
    } else {
      orderBy[sort as keyof Prisma.VendorOrderByWithRelationInput] = 'asc'
    }

    // Get vendors
    const vendors = await prisma.vendor.findMany({
      where: query,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
      ...(select && { select }),
    })

    // Get total count
    const count = await prisma.vendor.count({ where: query })

    const result = { vendors, count }

    // Cache the results if it's the default query
    if (isDefaultQuery) {
      const cacheKey = 'vendors:list'
      await setCache(cacheKey, result, CACHE_TTL.VENDORS_LIST)
    }

    return result
  } catch (error: any) {
    logger.error(`Error getting vendors: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor products
 * @param vendorId Vendor ID
 * @param options Pagination and filtering options
 * @param requestId Request ID for logging
 * @returns List of products and count
 */
export const getVendorProducts = async (
  vendorId: string,
  options: {
    page?: number
    limit?: number
    sort?: string
    filter?: Prisma.ProductWhereInput
  } = {},
  requestId?: string
): Promise<{ products: any[]; count: number }> => {
  const logger = createRequestLogger(requestId || 'vendor-products')
  logger.info(`Getting products for vendor ID: ${vendorId}`)

  const { page = 1, limit = 10, sort = 'createdAt', filter = {} } = options

  // Build query
  const query: Prisma.ProductWhereInput = { vendorId, ...filter }

  // Try to get from cache if no filters are applied
  const isDefaultQuery = Object.keys(filter).length === 0 && page === 1 && limit === 10 && sort === 'createdAt'
  if (isDefaultQuery) {
    const cacheKey = `vendor:${vendorId}:products`
    const cachedData = await getCache<{ products: any[]; count: number }>(cacheKey)

    if (cachedData) {
      logger.info('Retrieved vendor products from cache')
      return cachedData
    }
  }

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Execute query with pagination
    const skip = (page - 1) * limit

    // Determine sort order
    const orderBy: Prisma.ProductOrderByWithRelationInput = {}
    if (sort.startsWith('-')) {
      const field = sort.substring(1)
      orderBy[field as keyof Prisma.ProductOrderByWithRelationInput] = 'desc'
    } else {
      orderBy[sort as keyof Prisma.ProductOrderByWithRelationInput] = 'asc'
    }

    // Get products
    const products = await prisma.product.findMany({
      where: query,
      include: {
        category: {
          select: {
            id: true,
            name: true,
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
      orderBy,
      skip,
      take: limit,
    })

    // Get total count
    const count = await prisma.product.count({ where: query })

    // Add calculated fields
    const formattedProducts = products.map(product => ({
      ...product,
      averageRating: product.reviews.length > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0,
      reviewCount: product._count.reviews,
    }))

    const result = { products: formattedProducts, count }

    // Cache the results if it's the default query
    if (isDefaultQuery) {
      const cacheKey = `vendor:${vendorId}:products`
      await setCache(cacheKey, result, CACHE_TTL.VENDOR_PRODUCTS)
    }

    return result
  } catch (error: any) {
    logger.error(`Error getting vendor products: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor metrics
 * @param vendorId Vendor ID
 * @param period Period for metrics calculation
 * @param requestId Request ID for logging
 * @returns Vendor metrics
 */
export const getVendorMetrics = async (
  vendorId: string,
  period: 'day' | 'week' | 'month' | 'year' | 'all' = 'all',
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-metrics')
  logger.info(`Getting metrics for vendor ID: ${vendorId} with period: ${period}`)

  // Try to get from cache
  const cacheKey = `vendor:${vendorId}:metrics:${period}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved vendor metrics from cache')
    return cachedData
  }

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Calculate date range based on period
    const now = new Date()
    let startDate = new Date(0) // Unix epoch

    if (period === 'day') {
      startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    } else if (period === 'month') {
      startDate = new Date(now)
      startDate.setMonth(now.getMonth() - 1)
    } else if (period === 'year') {
      startDate = new Date(now)
      startDate.setFullYear(now.getFullYear() - 1)
    }

    // Get orders for this vendor using raw SQL for better performance
    const salesData = await prisma.$queryRaw<any[]>`
      SELECT 
        SUM(oi.price * oi.quantity) as total_sales,
        SUM(oi.quantity) as total_items,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT o."userId") as unique_customers
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o.status NOT IN ('CANCELLED')
    `

    // Get product count
    const productCount = await prisma.product.count({ where: { vendorId } })

    // Get active product count
    const activeProductCount = await prisma.product.count({ 
      where: { vendorId, active: true } 
    })

    // Calculate metrics
    const metrics = salesData[0] || { 
      total_sales: 0, 
      total_items: 0, 
      total_orders: 0, 
      unique_customers: 0 
    }

    const totalSales = Number(metrics.total_sales) || 0
    const totalOrders = Number(metrics.total_orders) || 0
    const totalItems = Number(metrics.total_items) || 0
    const uniqueCustomers = Number(metrics.unique_customers) || 0

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    // Calculate commission
    const commissionRate = Number(vendor.commissionRate) || 0
    const totalCommission = (totalSales * commissionRate) / 100
    const netRevenue = totalSales - totalCommission

    // Get conversion rate (simplified - would need more data for accurate calculation)
    const conversionRate = 0 // Placeholder

    // Compile metrics
    const result = {
      period,
      totalSales,
      totalRevenue: totalSales,
      totalCommission,
      netRevenue,
      totalOrders,
      totalItems,
      productCount,
      activeProductCount,
      uniqueCustomers,
      averageOrderValue,
      conversionRate,
      startDate,
      endDate: now,
    }

    // Cache the results
    await setCache(cacheKey, result, CACHE_TTL.VENDOR_METRICS)

    return result
  } catch (error: any) {
    logger.error(`Error getting vendor metrics: ${error.message}`)
    throw error
  }
}

/**
 * Update vendor status
 * @param vendorId Vendor ID
 * @param status New status
 * @param notes Optional notes for status change
 * @param requestId Request ID for logging
 * @returns Updated vendor
 */
export const updateVendorStatus = async (
  vendorId: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED',
  notes?: string,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-status-update')
  logger.info(`Updating status for vendor ID: ${vendorId} to ${status}`)

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Update vendor status
    const updateData: Prisma.VendorUpdateInput = { status }
    if (notes) {
      updateData.verificationNotes = notes
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: updateData,
    })

    // Invalidate cache
    const cacheKey = `vendor:${vendorId}`
    const slugCacheKey = `vendor:slug:${vendor.slug}`
    await Promise.all([
      setCache(cacheKey, null, 1),
      setCache(slugCacheKey, null, 1),
      setCache('vendors:list', null, 1),
    ])

    logger.info(`Vendor status updated successfully to ${status}`)

    return updatedVendor
  } catch (error: any) {
    logger.error(`Error updating vendor status: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor payouts
 * @param vendorId Vendor ID
 * @param options Pagination and filtering options
 * @param requestId Request ID for logging
 * @returns List of payouts and count
 */
export const getVendorPayouts = async (
  vendorId: string,
  options: {
    page?: number
    limit?: number
    sort?: string
    filter?: Prisma.PayoutWhereInput
  } = {},
  requestId?: string
): Promise<{ payouts: any[]; count: number }> => {
  const logger = createRequestLogger(requestId || 'vendor-payouts')
  logger.info(`Getting payouts for vendor ID: ${vendorId}`)

  const { page = 1, limit = 10, sort = 'createdAt', filter = {} } = options

  // Build query
  const query: Prisma.PayoutWhereInput = { vendorId, ...filter }

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Execute query with pagination
    const skip = (page - 1) * limit

    // Determine sort order
    const orderBy: Prisma.PayoutOrderByWithRelationInput = {}
    if (sort.startsWith('-')) {
      const field = sort.substring(1)
      orderBy[field as keyof Prisma.PayoutOrderByWithRelationInput] = 'desc'
    } else {
      orderBy[sort as keyof Prisma.PayoutOrderByWithRelationInput] = 'asc'
    }

    // Get payouts
    const payouts = await prisma.payout.findMany({
      where: query,
      orderBy,
      skip,
      take: limit,
    })

    // Get total count
    const count = await prisma.payout.count({ where: query })

    return { payouts, count }
  } catch (error: any) {
    logger.error(`Error getting vendor payouts: ${error.message}`)
    throw error
  }
}

/**
 * Calculate vendor payout
 * @param vendorId Vendor ID
 * @param startDate Start date for payout period
 * @param endDate End date for payout period
 * @param requestId Request ID for logging
 * @returns Payout calculation
 */
export const calculateVendorPayout = async (
  vendorId: string,
  startDate: Date,
  endDate: Date,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-payout-calculate')
  logger.info(`Calculating payout for vendor ID: ${vendorId} from ${startDate} to ${endDate}`)

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Check if there's already a payout for this period
    const existingPayout = await prisma.payout.findFirst({
      where: {
        vendorId,
        periodStart: { lte: endDate },
        periodEnd: { gte: startDate },
      },
    })

    if (existingPayout) {
      throw new ApiError('A payout already exists for this period', 400)
    }

    // Get orders for this vendor in the specified period using raw SQL
    const salesData = await prisma.$queryRaw<any[]>`
      SELECT 
        SUM(oi.price * oi.quantity) as total_amount,
        COUNT(DISTINCT o.id) as order_count,
        ARRAY_AGG(DISTINCT o.id) as order_ids
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o.status IN ('DELIVERED', 'SHIPPED')
        AND o."paymentStatus" = 'PAID'
    `

    const salesResult = salesData[0] || { total_amount: 0, order_count: 0, order_ids: [] }
    const totalAmount = Number(salesResult.total_amount) || 0
    const orderCount = Number(salesResult.order_count) || 0
    const orderIds = salesResult.order_ids || []

    // Calculate commission
    const commissionRate = Number(vendor.commissionRate) || 0
    const totalCommission = (totalAmount * commissionRate) / 100

    // Calculate net amount
    const netAmount = totalAmount - totalCommission

    // Check if amount meets minimum payout
    const minimumPayoutAmount = Number(vendor.minimumPayoutAmount) || 0
    if (netAmount < minimumPayoutAmount) {
      throw new ApiError(
        `Payout amount (${netAmount}) is less than minimum payout amount (${minimumPayoutAmount})`,
        400
      )
    }

    // Generate reference
    const reference = `PAY-${vendorId.substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`

    // Create payout calculation
    const payoutCalculation = {
      vendorId,
      amount: totalAmount,
      fee: totalCommission,
      netAmount,
      currency: 'USD', // Default currency
      status: 'PENDING',
      paymentMethod: 'BANK_TRANSFER', // Default payment method
      reference,
      periodStart: startDate,
      periodEnd: endDate,
      orderIds,
      orderCount,
    }

    return payoutCalculation
  } catch (error: any) {
    logger.error(`Error calculating vendor payout: ${error.message}`)
    throw error
  }
}

/**
 * Create vendor payout
 * @param payoutData Payout data
 * @param requestId Request ID for logging
 * @returns Created payout
 */
export const createVendorPayout = async (
  payoutData: Omit<Prisma.PayoutCreateInput, 'vendor'> & { vendorId: string },
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-payout-create')
  logger.info(`Creating payout for vendor ID: ${payoutData.vendorId}`)

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: payoutData.vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Check if there's already a payout for this period
    const existingPayout = await prisma.payout.findFirst({
      where: {
        vendorId: payoutData.vendorId,
        periodStart: { lte: payoutData.periodEnd as Date },
        periodEnd: { gte: payoutData.periodStart as Date },
      },
    })

    if (existingPayout) {
      throw new ApiError('A payout already exists for this period', 400)
    }

    // Prepare payout data with vendor relation
    const { vendorId, ...restPayoutData } = payoutData
    const payoutCreateData: Prisma.PayoutCreateInput = {
      ...restPayoutData,
      vendor: {
        connect: { id: vendorId }
      }
    }

    // Create payout
    const payout = await prisma.payout.create({
      data: payoutCreateData,
    })
    logger.info(`Payout created with ID: ${payout.id}`)

    return payout
  } catch (error: any) {
    logger.error(`Error creating vendor payout: ${error.message}`)
    throw error
  }
}

/**
 * Update payout status
 * @param payoutId Payout ID
 * @param status New status
 * @param transactionId Optional transaction ID
 * @param notes Optional notes
 * @param requestId Request ID for logging
 * @returns Updated payout
 */
export const updatePayoutStatus = async (
  payoutId: string,
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
  transactionId?: string,
  notes?: string,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'payout-status-update')
  logger.info(`Updating status for payout ID: ${payoutId} to ${status}`)

  try {
    // Check if payout exists
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
    })

    if (!payout) {
      throw new ApiError('Payout not found', 404)
    }

    // Update payout status
    const updateData: Prisma.PayoutUpdateInput = { status }

    if (status === 'COMPLETED') {
      updateData.processedAt = new Date()
    }

    if (transactionId) {
      updateData.transactionId = transactionId
    }

    if (notes) {
      updateData.notes = notes
    }

    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: updateData,
    })

    logger.info(`Payout status updated successfully to ${status}`)

    return updatedPayout
  } catch (error: any) {
    logger.error(`Error updating payout status: ${error.message}`)
    throw error
  }
}

/**
 * Get payout by ID
 * @param payoutId Payout ID
 * @param requestId Request ID for logging
 * @returns Payout document
 */
export const getPayoutById = async (payoutId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'payout-get')
  logger.info(`Getting payout with ID: ${payoutId}`)

  try {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        vendor: {
          select: {
            businessName: true,
            contactEmail: true,
          },
        },
      },
    })

    if (!payout) {
      throw new ApiError('Payout not found', 404)
    }

    return payout
  } catch (error: any) {
    logger.error(`Error getting payout: ${error.message}`)
    throw error
  }
}

/**
 * Search vendors
 * @param query Search query
 * @param options Search options
 * @param requestId Request ID for logging
 * @returns Search results
 */
export const searchVendors = async (
  query: string,
  options: {
    page?: number
    limit?: number
    status?: string
    sort?: string
  } = {},
  requestId?: string
): Promise<{ vendors: any[]; count: number }> => {
  const logger = createRequestLogger(requestId || 'vendor-search')
  logger.info(`Searching vendors with query: ${query}`)

  const { page = 1, limit = 10, status, sort = 'createdAt' } = options

  try {
    // Build search query
    const where: Prisma.VendorWhereInput = {
      OR: [
        { businessName: { contains: query, mode: 'insensitive' } },
        { contactEmail: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    }

    if (status) {
      where.status = status as any
    }

    // Execute query with pagination
    const skip = (page - 1) * limit

    // Determine sort order
    const orderBy: Prisma.VendorOrderByWithRelationInput = {}
    if (sort.startsWith('-')) {
      const field = sort.substring(1)
      orderBy[field as keyof Prisma.VendorOrderByWithRelationInput] = 'desc'
    } else {
      orderBy[sort as keyof Prisma.VendorOrderByWithRelationInput] = 'asc'
    }

    // Get vendors
    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    })

    // Get total count
    const count = await prisma.vendor.count({ where })

    return { vendors, count }
  } catch (error: any) {
    logger.error(`Error searching vendors: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor statistics
 * @param requestId Request ID for logging
 * @returns Vendor statistics
 */
export const getVendorStatistics = async (requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-statistics')
  logger.info('Getting vendor statistics')

  try {
    // Get vendor counts by status
    const vendorsByStatus = await prisma.vendor.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    })

    // Get total vendors
    const totalVendors = await prisma.vendor.count()

    // Get vendors with products
    const vendorsWithProducts = await prisma.vendor.count({
      where: {
        products: {
          some: {},
        },
      },
    })

    // Get top vendors by product count
    const topVendorsByProducts = await prisma.vendor.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        products: {
          _count: 'desc',
        },
      },
      take: 10,
    })

    // Convert status counts to object
    const statusCounts: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      SUSPENDED: 0,
    }

    vendorsByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.id
    })

    return {
      totalVendors,
      vendorsWithProducts,
      statusCounts,
      topVendorsByProducts: topVendorsByProducts.map(vendor => ({
        id: vendor.id,
        businessName: vendor.businessName,
        slug: vendor.slug,
        productCount: vendor._count.products,
        status: vendor.status,
      })),
    }
  } catch (error: any) {
    logger.error(`Error getting vendor statistics: ${error.message}`)
    throw error
  }
}
