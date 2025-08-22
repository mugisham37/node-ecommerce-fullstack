import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import { getCache, setCache } from '../config/redis'

// Cache TTL in seconds
const CACHE_TTL = {
  DASHBOARD_SUMMARY: 1800, // 30 minutes
  ANALYTICS: 3600, // 1 hour
}

/**
 * Get vendor dashboard summary
 * @param vendorId Vendor ID
 * @param period Period for metrics calculation
 * @param requestId Request ID for logging
 * @returns Dashboard summary
 */
export const getVendorDashboardSummary = async (
  vendorId: string,
  period: 'day' | 'week' | 'month' | 'year' | 'all' = 'month',
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-dashboard-summary')
  logger.info(`Getting dashboard summary for vendor ID: ${vendorId} with period: ${period}`)

  // Try to get from cache
  const cacheKey = `vendor:${vendorId}:dashboard:${period}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved vendor dashboard summary from cache')
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
    let previousStartDate = new Date(0)

    if (period === 'day') {
      startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
      previousStartDate = new Date(startDate)
      previousStartDate.setDate(startDate.getDate() - 1)
    } else if (period === 'week') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
      previousStartDate = new Date(startDate)
      previousStartDate.setDate(startDate.getDate() - 7)
    } else if (period === 'month') {
      startDate = new Date(now)
      startDate.setMonth(now.getMonth() - 1)
      previousStartDate = new Date(startDate)
      previousStartDate.setMonth(startDate.getMonth() - 1)
    } else if (period === 'year') {
      startDate = new Date(now)
      startDate.setFullYear(now.getFullYear() - 1)
      previousStartDate = new Date(startDate)
      previousStartDate.setFullYear(startDate.getFullYear() - 1)
    }

    // Get current period metrics
    const currentMetrics = await getVendorMetrics(vendorId, startDate, now)
    
    // Get previous period metrics for comparison
    const previousMetrics = await getVendorMetrics(vendorId, previousStartDate, startDate)

    // Get product statistics
    const productStats = await getProductStatistics(vendorId)

    // Get recent orders
    const recentOrders = await getRecentOrders(vendorId, 10)

    // Get top products
    const topProducts = await getTopProducts(vendorId, startDate, now, 5)

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const summary = {
      period,
      dateRange: {
        start: startDate,
        end: now,
      },
      metrics: {
        totalRevenue: currentMetrics.totalRevenue,
        totalOrders: currentMetrics.totalOrders,
        totalProducts: productStats.totalProducts,
        activeProducts: productStats.activeProducts,
        averageOrderValue: currentMetrics.averageOrderValue,
        conversionRate: currentMetrics.conversionRate,
      },
      growth: {
        revenue: calculateGrowth(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
        orders: calculateGrowth(currentMetrics.totalOrders, previousMetrics.totalOrders),
        averageOrderValue: calculateGrowth(currentMetrics.averageOrderValue, previousMetrics.averageOrderValue),
      },
      recentOrders,
      topProducts,
      productStats,
    }

    // Cache the results
    await setCache(cacheKey, summary, CACHE_TTL.DASHBOARD_SUMMARY)

    return summary
  } catch (error: any) {
    logger.error(`Error getting vendor dashboard summary: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor sales analytics
 * @param vendorId Vendor ID
 * @param options Analytics options
 * @param requestId Request ID for logging
 * @returns Sales analytics
 */
export const getVendorSalesAnalytics = async (
  vendorId: string,
  options: {
    startDate?: Date
    endDate?: Date
    interval?: 'hourly' | 'daily' | 'weekly' | 'monthly'
    compareWithPrevious?: boolean
    groupBy?: 'product' | 'category' | 'customer'
  } = {},
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-sales-analytics')
  logger.info(`Getting sales analytics for vendor ID: ${vendorId}`)

  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate = new Date(),
    interval = 'daily',
    compareWithPrevious = true,
    groupBy,
  } = options

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Get sales data with time series
    const salesTimeSeries = await getSalesTimeSeries(vendorId, startDate, endDate, interval)

    // Get sales by grouping if specified
    let salesByGroup = null
    if (groupBy) {
      salesByGroup = await getSalesByGroup(vendorId, startDate, endDate, groupBy)
    }

    // Get comparison data if requested
    let comparisonData = null
    if (compareWithPrevious) {
      const periodDiff = endDate.getTime() - startDate.getTime()
      const previousStartDate = new Date(startDate.getTime() - periodDiff)
      const previousEndDate = new Date(startDate.getTime())
      
      comparisonData = await getVendorMetrics(vendorId, previousStartDate, previousEndDate)
    }

    // Calculate summary metrics
    const currentMetrics = await getVendorMetrics(vendorId, startDate, endDate)

    const analytics = {
      period: {
        start: startDate,
        end: endDate,
        interval,
      },
      summary: currentMetrics,
      timeSeries: salesTimeSeries,
      ...(salesByGroup && { [groupBy as string]: salesByGroup }),
      ...(comparisonData && { comparison: comparisonData }),
    }

    return analytics
  } catch (error: any) {
    logger.error(`Error getting vendor sales analytics: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor product analytics
 * @param vendorId Vendor ID
 * @param options Analytics options
 * @param requestId Request ID for logging
 * @returns Product analytics
 */
export const getVendorProductAnalytics = async (
  vendorId: string,
  options: {
    startDate?: Date
    endDate?: Date
    categoryId?: string
    limit?: number
  } = {},
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-product-analytics')
  logger.info(`Getting product analytics for vendor ID: ${vendorId}`)

  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate = new Date(),
    categoryId,
    limit = 20,
  } = options

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Build product filter
    const productFilter: Prisma.ProductWhereInput = { vendorId }
    if (categoryId) {
      productFilter.categoryId = categoryId
    }

    // Get product performance data
    const productPerformance = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        p.name,
        p.price,
        p."categoryId",
        c.name as "categoryName",
        SUM(oi.quantity) as "totalSold",
        SUM(oi.price * oi.quantity) as "totalRevenue",
        COUNT(DISTINCT o.id) as "orderCount",
        AVG(r.rating) as "averageRating",
        COUNT(r.id) as "reviewCount"
      FROM "Product" p
      LEFT JOIN "OrderItem" oi ON p.id = oi."productId"
      LEFT JOIN "Order" o ON oi."orderId" = o.id AND o."createdAt" >= ${startDate} AND o."createdAt" <= ${endDate}
      LEFT JOIN "Review" r ON p.id = r."productId"
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p."vendorId" = ${vendorId}
        ${categoryId ? Prisma.sql`AND p."categoryId" = ${categoryId}` : Prisma.empty}
      GROUP BY p.id, p.name, p.price, p."categoryId", c.name
      ORDER BY "totalRevenue" DESC NULLS LAST
      LIMIT ${limit}
    `

    // Get inventory status
    const inventoryStatus = await prisma.product.groupBy({
      by: ['active'],
      where: productFilter,
      _count: {
        id: true,
      },
    })

    // Get stock status manually since stockStatus might not exist
    const lowStockProducts = await prisma.product.count({
      where: { ...productFilter, quantity: { lte: 10 } }
    })
    const outOfStockProducts = await prisma.product.count({
      where: { ...productFilter, quantity: 0 }
    })

    // Get category performance
    const categoryPerformance = await prisma.$queryRaw<any[]>`
      SELECT 
        c.id,
        c.name,
        COUNT(p.id) as "productCount",
        SUM(oi.quantity) as "totalSold",
        SUM(oi.price * oi.quantity) as "totalRevenue"
      FROM "Category" c
      JOIN "Product" p ON c.id = p."categoryId"
      LEFT JOIN "OrderItem" oi ON p.id = oi."productId"
      LEFT JOIN "Order" o ON oi."orderId" = o.id AND o."createdAt" >= ${startDate} AND o."createdAt" <= ${endDate}
      WHERE p."vendorId" = ${vendorId}
      GROUP BY c.id, c.name
      ORDER BY "totalRevenue" DESC NULLS LAST
    `

    const analytics = {
      period: {
        start: startDate,
        end: endDate,
      },
      productPerformance: productPerformance.map(product => ({
        ...product,
        totalSold: Number(product.totalSold) || 0,
        totalRevenue: Number(product.totalRevenue) || 0,
        orderCount: Number(product.orderCount) || 0,
        averageRating: Number(product.averageRating) || 0,
        reviewCount: Number(product.reviewCount) || 0,
      })),
      inventoryStatus: {
        active: inventoryStatus.find(item => item.active === true)?._count.id || 0,
        inactive: inventoryStatus.find(item => item.active === false)?._count.id || 0,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
      categoryPerformance: categoryPerformance.map(category => ({
        ...category,
        productCount: Number(category.productCount) || 0,
        totalSold: Number(category.totalSold) || 0,
        totalRevenue: Number(category.totalRevenue) || 0,
      })),
    }

    return analytics
  } catch (error: any) {
    logger.error(`Error getting vendor product analytics: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor order analytics
 * @param vendorId Vendor ID
 * @param options Analytics options
 * @param requestId Request ID for logging
 * @returns Order analytics
 */
export const getVendorOrderAnalytics = async (
  vendorId: string,
  options: {
    startDate?: Date
    endDate?: Date
    status?: string
  } = {},
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-order-analytics')
  logger.info(`Getting order analytics for vendor ID: ${vendorId}`)

  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate = new Date(),
    status,
  } = options

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Build order filter
    const orderFilter = `
      AND o."createdAt" >= ${startDate.toISOString()}
      AND o."createdAt" <= ${endDate.toISOString()}
      ${status ? `AND o.status = '${status}'` : ''}
    `

    // Get order status distribution
    const ordersByStatus = await prisma.$queryRaw<any[]>`
      SELECT 
        o.status,
        COUNT(DISTINCT o.id) as "orderCount",
        SUM(oi.price * oi.quantity) as "totalValue"
      FROM "Order" o
      JOIN "OrderItem" oi ON o.id = oi."orderId"
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        ${Prisma.raw(orderFilter)}
      GROUP BY o.status
      ORDER BY "orderCount" DESC
    `

    // Get order fulfillment metrics
    const fulfillmentMetrics = await prisma.$queryRaw<any[]>`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (o."shippedAt" - o."createdAt"))/86400) as "avgProcessingDays",
        AVG(EXTRACT(EPOCH FROM (o."deliveredAt" - o."shippedAt"))/86400) as "avgShippingDays",
        COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END) as "deliveredOrders",
        COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END) as "cancelledOrders",
        COUNT(*) as "totalOrders"
      FROM "Order" o
      JOIN "OrderItem" oi ON o.id = oi."orderId"
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        ${Prisma.raw(orderFilter)}
    `

    // Get payment method distribution
    const paymentMethods = await prisma.$queryRaw<any[]>`
      SELECT 
        o."paymentMethod",
        COUNT(DISTINCT o.id) as "orderCount",
        SUM(oi.price * oi.quantity) as "totalValue"
      FROM "Order" o
      JOIN "OrderItem" oi ON o.id = oi."orderId"
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        ${Prisma.raw(orderFilter)}
      GROUP BY o."paymentMethod"
      ORDER BY "orderCount" DESC
    `

    const fulfillment = fulfillmentMetrics[0] || {}

    const analytics = {
      period: {
        start: startDate,
        end: endDate,
      },
      ordersByStatus: ordersByStatus.map(item => ({
        status: item.status,
        orderCount: Number(item.orderCount) || 0,
        totalValue: Number(item.totalValue) || 0,
      })),
      fulfillmentMetrics: {
        avgProcessingDays: Number(fulfillment.avgProcessingDays) || 0,
        avgShippingDays: Number(fulfillment.avgShippingDays) || 0,
        deliveredOrders: Number(fulfillment.deliveredOrders) || 0,
        cancelledOrders: Number(fulfillment.cancelledOrders) || 0,
        totalOrders: Number(fulfillment.totalOrders) || 0,
        fulfillmentRate: fulfillment.totalOrders > 0 
          ? (Number(fulfillment.deliveredOrders) / Number(fulfillment.totalOrders)) * 100 
          : 0,
        cancellationRate: fulfillment.totalOrders > 0 
          ? (Number(fulfillment.cancelledOrders) / Number(fulfillment.totalOrders)) * 100 
          : 0,
      },
      paymentMethods: paymentMethods.map(item => ({
        method: item.paymentMethod,
        orderCount: Number(item.orderCount) || 0,
        totalValue: Number(item.totalValue) || 0,
      })),
    }

    return analytics
  } catch (error: any) {
    logger.error(`Error getting vendor order analytics: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor payout analytics
 * @param vendorId Vendor ID
 * @param options Analytics options
 * @param requestId Request ID for logging
 * @returns Payout analytics
 */
export const getVendorPayoutAnalytics = async (
  vendorId: string,
  options: {
    startDate?: Date
    endDate?: Date
  } = {},
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-payout-analytics')
  logger.info(`Getting payout analytics for vendor ID: ${vendorId}`)

  const {
    startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    endDate = new Date(),
  } = options

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new ApiError('Vendor not found', 404)
    }

    // Get payout summary
    const payoutSummary = await prisma.payout.aggregate({
      where: {
        vendorId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
        fee: true,
        netAmount: true,
      },
      _count: {
        id: true,
      },
    })

    // Get payouts by status
    const payoutsByStatus = await prisma.payout.groupBy({
      by: ['status'],
      where: {
        vendorId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
        netAmount: true,
      },
      _count: {
        id: true,
      },
    })

    // Get recent payouts
    const recentPayouts = await prisma.payout.findMany({
      where: {
        vendorId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    // Calculate pending earnings (orders that haven't been paid out yet)
    const pendingEarnings = await prisma.$queryRaw<any[]>`
      SELECT 
        SUM(oi.price * oi.quantity) as "totalAmount"
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o.status IN ('DELIVERED', 'SHIPPED')
        AND o."paymentStatus" = 'PAID'
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND NOT EXISTS (
          SELECT 1 FROM "Payout" payout 
          WHERE payout."vendorId" = ${vendorId}
            AND o."createdAt" >= payout."periodStart"
            AND o."createdAt" <= payout."periodEnd"
        )
    `

    const pendingAmount = Number(pendingEarnings[0]?.totalAmount) || 0
    const commissionRate = Number(vendor.commissionRate) || 0
    const pendingCommission = (pendingAmount * commissionRate) / 100
    const pendingNet = pendingAmount - pendingCommission

    const analytics = {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalPayouts: payoutSummary._count.id || 0,
        totalAmount: Number(payoutSummary._sum.amount) || 0,
        totalFees: Number(payoutSummary._sum.fee) || 0,
        totalNetAmount: Number(payoutSummary._sum.netAmount) || 0,
        averagePayoutAmount: payoutSummary._count.id > 0 
          ? (Number(payoutSummary._sum.amount) || 0) / payoutSummary._count.id 
          : 0,
      },
      payoutsByStatus: payoutsByStatus.map(item => ({
        status: item.status,
        count: item._count.id,
        totalAmount: Number(item._sum.amount) || 0,
        totalNetAmount: Number(item._sum.netAmount) || 0,
      })),
      recentPayouts,
      pendingEarnings: {
        totalAmount: pendingAmount,
        commission: pendingCommission,
        netAmount: pendingNet,
      },
    }

    return analytics
  } catch (error: any) {
    logger.error(`Error getting vendor payout analytics: ${error.message}`)
    throw error
  }
}

// Helper functions

/**
 * Get vendor metrics for a specific period
 */
const getVendorMetrics = async (vendorId: string, startDate: Date, endDate: Date): Promise<any> => {
  const salesData = await prisma.$queryRaw<any[]>`
    SELECT 
      SUM(oi.price * oi.quantity) as "totalRevenue",
      COUNT(DISTINCT o.id) as "totalOrders",
      COUNT(DISTINCT o."userId") as "uniqueCustomers",
      AVG(oi.price * oi.quantity) as "averageOrderValue"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    JOIN "Product" p ON oi."productId" = p.id
    WHERE p."vendorId" = ${vendorId}
      AND o."createdAt" >= ${startDate}
      AND o."createdAt" <= ${endDate}
      AND o.status NOT IN ('CANCELLED')
  `

  const metrics = salesData[0] || {}
  return {
    totalRevenue: Number(metrics.totalRevenue) || 0,
    totalOrders: Number(metrics.totalOrders) || 0,
    uniqueCustomers: Number(metrics.uniqueCustomers) || 0,
    averageOrderValue: Number(metrics.averageOrderValue) || 0,
    conversionRate: 0, // Placeholder - would need more data to calculate
  }
}

/**
 * Get product statistics for a vendor
 */
const getProductStatistics = async (vendorId: string): Promise<any> => {
  const totalProducts = await prisma.product.count({ where: { vendorId } })
  const activeProducts = await prisma.product.count({ 
    where: { vendorId, active: true } 
  })
  const outOfStockProducts = await prisma.product.count({ 
    where: { vendorId, quantity: 0 } 
  })

  return {
    totalProducts,
    activeProducts,
    inactiveProducts: totalProducts - activeProducts,
    outOfStockProducts,
  }
}

/**
 * Get recent orders for a vendor
 */
const getRecentOrders = async (vendorId: string, limit: number): Promise<any[]> => {
  const orders = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT
      o.id,
      o."orderNumber",
      o.status,
      o.total,
      o."createdAt",
      u."firstName",
      u."lastName"
    FROM "Order" o
    JOIN "OrderItem" oi ON o.id = oi."orderId"
    JOIN "Product" p ON oi."productId" = p.id
    JOIN "User" u ON o."userId" = u.id
    WHERE p."vendorId" = ${vendorId}
    ORDER BY o."createdAt" DESC
    LIMIT ${limit}
  `

  return orders.map(order => ({
    ...order,
    total: Number(order.total) || 0,
    customerName: `${order.firstName} ${order.lastName}`,
  }))
}

/**
 * Get top products for a vendor
 */
const getTopProducts = async (vendorId: string, startDate: Date, endDate: Date, limit: number): Promise<any[]> => {
  const products = await prisma.$queryRaw<any[]>`
    SELECT 
      p.id,
      p.name,
      p.price,
      SUM(oi.quantity) as "totalSold",
      SUM(oi.price * oi.quantity) as "totalRevenue"
    FROM "Product" p
    LEFT JOIN "OrderItem" oi ON p.id = oi."productId"
    LEFT JOIN "Order" o ON oi."orderId" = o.id 
      AND o."createdAt" >= ${startDate} 
      AND o."createdAt" <= ${endDate}
    WHERE p."vendorId" = ${vendorId}
    GROUP BY p.id, p.name, p.price
    ORDER BY "totalRevenue" DESC NULLS LAST
    LIMIT ${limit}
  `

  return products.map(product => ({
    ...product,
    price: Number(product.price) || 0,
    totalSold: Number(product.totalSold) || 0,
    totalRevenue: Number(product.totalRevenue) || 0,
  }))
}

/**
 * Get sales time series data
 */
const getSalesTimeSeries = async (
  vendorId: string, 
  startDate: Date, 
  endDate: Date, 
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly'
): Promise<any[]> => {
  let dateFormat = 'YYYY-MM-DD'
  let dateTrunc = 'day'

  switch (interval) {
    case 'hourly':
      dateFormat = 'YYYY-MM-DD HH24:00:00'
      dateTrunc = 'hour'
      break
    case 'weekly':
      dateFormat = 'YYYY-"W"WW'
      dateTrunc = 'week'
      break
    case 'monthly':
      dateFormat = 'YYYY-MM'
      dateTrunc = 'month'
      break
  }

  const timeSeries = await prisma.$queryRaw<any[]>`
    SELECT 
      DATE_TRUNC(${dateTrunc}, o."createdAt") as "period",
      SUM(oi.price * oi.quantity) as "revenue",
      COUNT(DISTINCT o.id) as "orders"
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    JOIN "Product" p ON oi."productId" = p.id
    WHERE p."vendorId" = ${vendorId}
      AND o."createdAt" >= ${startDate}
      AND o."createdAt" <= ${endDate}
      AND o.status NOT IN ('CANCELLED')
    GROUP BY DATE_TRUNC(${dateTrunc}, o."createdAt")
    ORDER BY "period"
  `

  return timeSeries.map(item => ({
    period: item.period,
    revenue: Number(item.revenue) || 0,
    orders: Number(item.orders) || 0,
  }))
}

/**
 * Get sales data grouped by specified field
 */
const getSalesByGroup = async (
  vendorId: string,
  startDate: Date,
  endDate: Date,
  groupBy: 'product' | 'category' | 'customer'
): Promise<any[]> => {
  let query = ''

  switch (groupBy) {
    case 'product':
      query = `
        SELECT 
          p.id,
          p.name,
          SUM(oi.quantity) as "totalSold",
          SUM(oi.price * oi.quantity) as "totalRevenue"
        FROM "Product" p
        JOIN "OrderItem" oi ON p.id = oi."productId"
        JOIN "Order" o ON oi."orderId" = o.id
        WHERE p."vendorId" = '${vendorId}'
          AND o."createdAt" >= '${startDate.toISOString()}'
          AND o."createdAt" <= '${endDate.toISOString()}'
          AND o.status NOT IN ('CANCELLED')
        GROUP BY p.id, p.name
        ORDER BY "totalRevenue" DESC
        LIMIT 20
      `
      break
    case 'category':
      query = `
        SELECT 
          c.id,
          c.name,
          SUM(oi.quantity) as "totalSold",
          SUM(oi.price * oi.quantity) as "totalRevenue"
        FROM "Category" c
        JOIN "Product" p ON c.id = p."categoryId"
        JOIN "OrderItem" oi ON p.id = oi."productId"
        JOIN "Order" o ON oi."orderId" = o.id
        WHERE p."vendorId" = '${vendorId}'
          AND o."createdAt" >= '${startDate.toISOString()}'
          AND o."createdAt" <= '${endDate.toISOString()}'
          AND o.status NOT IN ('CANCELLED')
        GROUP BY c.id, c.name
        ORDER BY "totalRevenue" DESC
      `
      break
    case 'customer':
      query = `
        SELECT 
          u.id,
          u."firstName",
          u."lastName",
          COUNT(DISTINCT o.id) as "orderCount",
          SUM(oi.price * oi.quantity) as "totalSpent"
        FROM "User" u
        JOIN "Order" o ON u.id = o."userId"
        JOIN "OrderItem" oi ON o.id = oi."orderId"
        JOIN "Product" p ON oi."productId" = p.id
        WHERE p."vendorId" = '${vendorId}'
          AND o."createdAt" >= '${startDate.toISOString()}'
          AND o."createdAt" <= '${endDate.toISOString()}'
          AND o.status NOT IN ('CANCELLED')
        GROUP BY u.id, u."firstName", u."lastName"
        ORDER BY "totalSpent" DESC
        LIMIT 20
      `
      break
  }

  const results = await prisma.$queryRawUnsafe<any[]>(query)

  return results.map(item => ({
    ...item,
    totalSold: Number(item.totalSold) || 0,
    totalRevenue: Number(item.totalRevenue) || 0,
    totalSpent: Number(item.totalSpent) || 0,
    orderCount: Number(item.orderCount) || 0,
  }))
}
