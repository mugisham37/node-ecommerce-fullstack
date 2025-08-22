import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import { getCache, setCache } from '../config/redis'
import { toNumber, safePercentage, safeRound, safeSubtract } from '../utils/decimal.utils'
import type { 
  VendorDashboardSummary, 
  VendorSalesSummary, 
  VendorProductSummary,
  VendorOrderSummary,
  VendorPayoutSummary,
  VendorRecentOrder,
  VendorTopProduct,
  VendorSalesTrend,
  RawProductWithImages
} from '../types/vendor-analytics.types'

// Cache TTL in seconds
const CACHE_TTL = {
  DASHBOARD_SUMMARY: 1800, // 30 minutes
  SALES_ANALYTICS: 3600, // 1 hour
  PRODUCT_ANALYTICS: 3600, // 1 hour
  ORDER_ANALYTICS: 3600, // 1 hour
}

/**
 * Get vendor dashboard summary
 * @param vendorId Vendor ID
 * @param period Period for metrics calculation
 * @param requestId Request ID for logging
 * @returns Vendor dashboard summary
 */
export const getVendorDashboardSummary = async (
  vendorId: string,
  period: 'day' | 'week' | 'month' | 'year' | 'all' = 'month',
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'vendor-dashboard')
  logger.info(`Getting dashboard summary for vendor ID: ${vendorId} with period: ${period}`)

  // Try to get from cache
  const cacheKey = `vendor_dashboard:${vendorId}:${period}`
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

    // Get sales summary
    const salesSummary = await getVendorSalesSummary(vendorId, startDate, now, requestId)

    // Get product summary
    const productSummary = await getVendorProductSummary(vendorId, requestId)

    // Get order summary
    const orderSummary = await getVendorOrderSummary(vendorId, startDate, now, requestId)

    // Get payout summary
    const payoutSummary = await getVendorPayoutSummary(vendorId, startDate, now, requestId)

    // Get recent orders
    const recentOrders = await getVendorRecentOrders(vendorId, 5, requestId)

    // Get top products
    const topProducts = await getVendorTopProducts(vendorId, startDate, now, 5, requestId)

    // Get sales trend
    const salesTrend = await getVendorSalesTrend(
      vendorId,
      startDate,
      now,
      period === 'day' ? 'hourly' : 'daily',
      requestId
    )

    // Compile dashboard summary
    const dashboardSummary = {
      salesSummary,
      productSummary,
      orderSummary,
      payoutSummary,
      recentOrders,
      topProducts,
      salesTrend,
      period: {
        type: period,
        startDate,
        endDate: now,
      },
    }

    // Cache the results
    await setCache(cacheKey, dashboardSummary, CACHE_TTL.DASHBOARD_SUMMARY)

    return dashboardSummary
  } catch (error: any) {
    logger.error(`Error getting vendor dashboard summary: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor sales summary
 * @param vendorId Vendor ID
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Vendor sales summary
 */
async function getVendorSalesSummary(
  vendorId: string,
  startDate: Date,
  endDate: Date,
  requestId?: string
): Promise<any> {
  const logger = createRequestLogger(requestId || 'vendor-sales-summary')
  logger.info(`Getting sales summary for vendor ID: ${vendorId}`)

  try {
    // Get orders for this vendor using PostgreSQL aggregation
    const salesData = await prisma.$queryRaw<any[]>`
      SELECT 
        SUM(oi.price * oi.quantity) as total_sales,
        SUM(oi.quantity) as total_items,
        COUNT(DISTINCT o.id) as order_count
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o.status IN ('DELIVERED', 'SHIPPED')
    `

    // Get previous period sales for comparison
    const previousStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()))
    const previousEndDate = new Date(startDate)

    const previousSalesData = await prisma.$queryRaw<any[]>`
      SELECT 
        SUM(oi.price * oi.quantity) as total_sales,
        SUM(oi.quantity) as total_items,
        COUNT(DISTINCT o.id) as order_count
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${previousStartDate}
        AND o."createdAt" <= ${previousEndDate}
        AND o.status IN ('DELIVERED', 'SHIPPED')
    `

    // Calculate growth percentages
    const currentPeriod = salesData[0] || { total_sales: 0, total_items: 0, order_count: 0 }
    const previousPeriod = previousSalesData[0] || { total_sales: 0, total_items: 0, order_count: 0 }

    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    const growth = {
      salesGrowth: calculateGrowth(Number(currentPeriod.total_sales || 0), Number(previousPeriod.total_sales || 0)),
      itemsGrowth: calculateGrowth(Number(currentPeriod.total_items || 0), Number(previousPeriod.total_items || 0)),
      orderCountGrowth: calculateGrowth(Number(currentPeriod.order_count || 0), Number(previousPeriod.order_count || 0)),
    }

    // Get vendor commission rate
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { commissionRate: true },
    })
    const commissionRate = vendor?.commissionRate || 0

    // Calculate commission and net sales
    const totalSales = Number(currentPeriod.total_sales) || 0
    const commission = safePercentage(totalSales, commissionRate)
    const netSales = safeSubtract(totalSales, commission)

    return {
      totalSales,
      totalItems: Number(currentPeriod.total_items) || 0,
      orderCount: Number(currentPeriod.order_count) || 0,
      averageOrderValue:
        Number(currentPeriod.order_count) > 0
          ? Math.round((totalSales / Number(currentPeriod.order_count)) * 100) / 100
          : 0,
      commission: Math.round(commission * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      growth,
    }
  } catch (error: any) {
    logger.error(`Error getting vendor sales summary: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor product summary
 * @param vendorId Vendor ID
 * @param requestId Request ID for logging
 * @returns Vendor product summary
 */
async function getVendorProductSummary(vendorId: string, requestId?: string): Promise<any> {
  const logger = createRequestLogger(requestId || 'vendor-product-summary')
  logger.info(`Getting product summary for vendor ID: ${vendorId}`)

  try {
    // Get product counts
    const totalProducts = await prisma.product.count({ where: { vendorId } })
    const activeProducts = await prisma.product.count({ where: { vendorId, active: true } })
    const inactiveProducts = await prisma.product.count({ where: { vendorId, active: false } })
    const lowStockProducts = await prisma.product.count({ 
      where: { vendorId, quantity: { gt: 0, lte: 5 } } 
    })
    const outOfStockProducts = await prisma.product.count({ 
      where: { vendorId, quantity: { lte: 0 } } 
    })

    // Get inventory value
    const inventoryValue = await prisma.product.aggregate({
      where: { vendorId },
      _sum: {
        price: true,
      },
    })

    // Get total inventory items
    const totalItems = await prisma.product.aggregate({
      where: { vendorId },
      _sum: {
        quantity: true,
      },
    })

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      lowStockProducts,
      outOfStockProducts,
      inventoryValue: Number(inventoryValue._sum.price) || 0,
      totalItems: Number(totalItems._sum.quantity) || 0,
    }
  } catch (error: any) {
    logger.error(`Error getting vendor product summary: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor order summary
 * @param vendorId Vendor ID
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Vendor order summary
 */
async function getVendorOrderSummary(
  vendorId: string,
  startDate: Date,
  endDate: Date,
  requestId?: string
): Promise<any> {
  const logger = createRequestLogger(requestId || 'vendor-order-summary')
  logger.info(`Getting order summary for vendor ID: ${vendorId}`)

  try {
    // Get orders containing vendor's products
    const ordersByStatus = await prisma.$queryRaw<any[]>`
      SELECT 
        o.status,
        COUNT(DISTINCT o.id) as count
      FROM "Order" o
      JOIN "OrderItem" oi ON o.id = oi."orderId"
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
      GROUP BY o.status
    `

    // Convert to object
    const statusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    }

    ordersByStatus.forEach((item) => {
      statusCounts[item.status] = Number(item.count)
    })

    // Calculate total orders
    const totalOrders = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

    return {
      totalOrders,
      statusCounts,
    }
  } catch (error: any) {
    logger.error(`Error getting vendor order summary: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor payout summary
 * @param vendorId Vendor ID
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Vendor payout summary
 */
async function getVendorPayoutSummary(
  vendorId: string,
  startDate: Date,
  endDate: Date,
  requestId?: string
): Promise<any> {
  const logger = createRequestLogger(requestId || 'vendor-payout-summary')
  logger.info(`Getting payout summary for vendor ID: ${vendorId}`)

  try {
    // Get payouts for this vendor
    const payouts = await prisma.payout.findMany({
      where: {
        vendorId,
        createdAt: { gte: startDate, lte: endDate },
      },
    })

    // Calculate payout totals
    let totalPayouts = 0
    let pendingPayouts = 0
    let completedPayouts = 0

    payouts.forEach((payout) => {
      if (payout.status === 'COMPLETED') {
        completedPayouts += Number(payout.netAmount)
      } else if (payout.status === 'PENDING' || payout.status === 'PROCESSING') {
        pendingPayouts += Number(payout.netAmount)
      }
      totalPayouts += Number(payout.netAmount)
    })

    // Get sales data for the period
    const salesData = await prisma.$queryRaw<any[]>`
      SELECT 
        SUM(oi.price * oi.quantity) as total_sales
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o.status IN ('DELIVERED', 'SHIPPED')
        AND o."paymentStatus" = 'PAID'
    `

    // Get vendor commission rate
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { commissionRate: true },
    })

    const commissionRate = vendor?.commissionRate || 0

    // Calculate total sales and available balance
    const totalSales = Number(salesData[0]?.total_sales) || 0
    const commission = safePercentage(totalSales, commissionRate)
    const availableBalance = safeSubtract(safeSubtract(totalSales, commission), totalPayouts)

    return {
      totalPayouts: Math.round(totalPayouts * 100) / 100,
      pendingPayouts: Math.round(pendingPayouts * 100) / 100,
      completedPayouts: Math.round(completedPayouts * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
      commission: Math.round(commission * 100) / 100,
      availableBalance: Math.round(availableBalance * 100) / 100,
      payoutCount: payouts.length,
    }
  } catch (error: any) {
    logger.error(`Error getting vendor payout summary: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor recent orders
 * @param vendorId Vendor ID
 * @param limit Number of orders to return
 * @param requestId Request ID for logging
 * @returns Vendor recent orders
 */
async function getVendorRecentOrders(vendorId: string, limit: number, requestId?: string): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'vendor-recent-orders')
  logger.info(`Getting recent orders for vendor ID: ${vendorId}`)

  try {
    // Get orders containing vendor's products
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              vendorId,
            },
          },
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          where: {
            product: {
              vendorId,
            },
          },
          include: {
            product: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Format orders
    return orders.map((order) => {
      // Calculate vendor total
      const vendorTotal = order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)

      return {
        id: order.id,
        orderNumber: order.id.substring(order.id.length - 8).toUpperCase(),
        customer: order.user
          ? {
              name: `${order.user.firstName} ${order.user.lastName}`,
              email: order.user.email,
            }
          : null,
        status: order.status,
        vendorTotal: Math.round(vendorTotal * 100) / 100,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        paymentStatus: order.paymentStatus,
      }
    })
  } catch (error: any) {
    logger.error(`Error getting vendor recent orders: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor top products
 * @param vendorId Vendor ID
 * @param startDate Start date
 * @param endDate End date
 * @param limit Number of products to return
 * @param requestId Request ID for logging
 * @returns Vendor top products
 */
async function getVendorTopProducts(
  vendorId: string,
  startDate: Date,
  endDate: Date,
  limit: number,
  requestId?: string
): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'vendor-top-products')
  logger.info(`Getting top products for vendor ID: ${vendorId}`)

  try {
    // Get top selling products using raw SQL for better performance
    const topProducts = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.price,
        COALESCE(
          json_agg(
            json_build_object('url', pi.url, 'altText', pi."altText")
            ORDER BY pi."sortOrder"
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'::json
        ) as images,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.price * oi.quantity) as revenue,
        COUNT(DISTINCT o.id) as order_count
      FROM "Product" p
      LEFT JOIN "ProductImage" pi ON p.id = pi."productId"
      JOIN "OrderItem" oi ON p.id = oi."productId"
      JOIN "Order" o ON oi."orderId" = o.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o.status IN ('DELIVERED', 'SHIPPED')
      GROUP BY p.id, p.name, p.sku, p.price
      ORDER BY revenue DESC
      LIMIT ${limit}
    `

    return topProducts.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0].url : null,
      quantitySold: Number(product.quantity_sold),
      revenue: Math.round(Number(product.revenue) * 100) / 100,
      orderCount: Number(product.order_count),
    }))
  } catch (error: any) {
    logger.error(`Error getting vendor top products: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor sales trend
 * @param vendorId Vendor ID
 * @param startDate Start date
 * @param endDate End date
 * @param interval Interval (hourly, daily, weekly, monthly)
 * @param requestId Request ID for logging
 * @returns Vendor sales trend
 */
async function getVendorSalesTrend(
  vendorId: string,
  startDate: Date,
  endDate: Date,
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
  requestId?: string
): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'vendor-sales-trend')
  logger.info(`Getting sales trend for vendor ID: ${vendorId}`)

  try {
    // Define group by date format based on interval
    let truncFunction = 'day'
    switch (interval) {
      case 'hourly':
        truncFunction = 'hour'
        break
      case 'daily':
        truncFunction = 'day'
        break
      case 'weekly':
        truncFunction = 'week'
        break
      case 'monthly':
        truncFunction = 'month'
        break
    }

    // Get sales trend data using PostgreSQL date_trunc
    const salesTrend = await prisma.$queryRaw<any[]>`
      SELECT 
        DATE_TRUNC(${truncFunction}, o."createdAt") as date,
        SUM(oi.price * oi.quantity) as sales,
        SUM(oi.quantity) as items,
        COUNT(DISTINCT o.id) as order_count
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o.status IN ('DELIVERED', 'SHIPPED')
      GROUP BY DATE_TRUNC(${truncFunction}, o."createdAt")
      ORDER BY date ASC
    `

    return salesTrend.map(item => ({
      date: item.date,
      sales: Math.round(Number(item.sales) * 100) / 100,
      items: Number(item.items),
      orderCount: Number(item.order_count),
    }))
  } catch (error: any) {
    logger.error(`Error getting vendor sales trend: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor sales analytics
 * @param vendorId Vendor ID
 * @param options Analytics options
 * @param requestId Request ID for logging
 * @returns Vendor sales analytics
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

  // Set default options
  const endDate = options.endDate || new Date()
  const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  const interval = options.interval || 'daily'
  const compareWithPrevious = options.compareWithPrevious !== undefined ? options.compareWithPrevious : true
  const groupBy = options.groupBy || 'product'

  // Try to get from cache
  const cacheKey = `vendor_sales_analytics:${vendorId}:${startDate.toISOString()}:${endDate.toISOString()}:${interval}:${compareWithPrevious}:${groupBy}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved vendor sales analytics from cache')
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

    // Get sales summary
    const salesSummary = await getVendorSalesSummary(vendorId, startDate, endDate, requestId)

    // Get sales trend
    const salesTrend = await getVendorSalesTrend(vendorId, startDate, endDate, interval, requestId)

    // Get previous period sales trend if needed
    let previousSalesTrend = null
    if (compareWithPrevious) {
      const previousStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()))
      const previousEndDate = new Date(startDate)
      previousSalesTrend = await getVendorSalesTrend(vendorId, previousStartDate, previousEndDate, interval, requestId)
    }

    // Get grouped sales data
    let groupedSales = []
    if (groupBy === 'product') {
      groupedSales = await getVendorSalesByProduct(vendorId, startDate, endDate, requestId)
    } else if (groupBy === 'category') {
      groupedSales = await getVendorSalesByCategory(vendorId, startDate, endDate, requestId)
    } else if (groupBy === 'customer') {
      groupedSales = await getVendorSalesByCustomer(vendorId, startDate, endDate, requestId)
    }

    // Compile sales analytics
    const salesAnalytics = {
      summary: salesSummary,
      trend: {
        current: salesTrend,
        previous: previousSalesTrend,
      },
      groupedBy: {
        type: groupBy,
        data: groupedSales,
      },
      period: {
        startDate,
        endDate,
        interval,
      },
    }

    // Cache the results
    await setCache(cacheKey, salesAnalytics, CACHE_TTL.SALES_ANALYTICS)

    return salesAnalytics
  } catch (error: any) {
    logger.error(`Error getting vendor sales analytics: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor sales by product
 * @param vendorId Vendor ID
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Vendor sales by product
 */
async function getVendorSalesByProduct(
  vendorId: string,
  startDate: Date,
  endDate: Date,
  requestId?: string
): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'vendor-sales-by-product')
  logger.info(`Getting sales by product for vendor ID: ${vendorId}`)

  try {
    // Get sales by product using raw SQL
    const salesByProduct = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.price,
        COALESCE(
          json_agg(
            json_build_object('url', pi.url, 'altText', pi."altText")
            ORDER BY pi."sortOrder"
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'::json
        ) as images,
        SUM(oi.price * oi.quantity) as sales,
        SUM(oi.quantity) as quantity,
        COUNT(DISTINCT o.id) as order_count
      FROM "Product" p
      LEFT JOIN "ProductImage" pi ON p.id = pi."productId"
      JOIN "OrderItem" oi ON p.id = oi."productId"
      JOIN "Order" o ON oi."orderId" = o.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o.status IN ('DELIVERED', 'SHIPPED')
      GROUP BY p.id, p.name, p.sku, p.price
      ORDER BY sales DESC
    `

    // Calculate total sales for percentage
    const totalSales = salesByProduct.reduce((sum, product) => sum + Number(product.sales), 0)

    // Add percentage to each product
    return salesByProduct.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0].url : null,
      sales: Math.round(Number(product.sales) * 100) / 100,
      quantity: Number(product.quantity),
      orderCount: Number(product.order_count),
      percentage: totalSales > 0 ? Math.round((Number(product.sales) / totalSales) * 100) : 0,
    }))
  } catch (error: any) {
    logger.error(`Error getting vendor sales by product: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor sales by category
 * @param vendorId Vendor ID
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Vendor sales by category
 */
async function getVendorSalesByCategory(
  vendorId: string,
  startDate: Date,
  endDate: Date,
  requestId?: string
): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'vendor-sales-by-category')
  logger.info(`Getting sales by category for vendor ID: ${vendorId}`)

  try {
    // Get sales by category using raw SQL
    const salesByCategory = await prisma.$queryRaw<any[]>`
      SELECT 
        c.id,
        c.name,
        SUM(oi.price * oi.quantity) as sales,
        SUM(oi.quantity) as quantity,
        COUNT(DISTINCT o.id) as order_count
      FROM "Category" c
      JOIN "Product" p ON c.id = p."categoryId"
      JOIN "OrderItem" oi ON p.id = oi."productId"
      JOIN "Order" o ON oi."orderId" = o.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o.status IN ('DELIVERED', 'SHIPPED')
      GROUP BY c.id, c.name
      ORDER BY sales DESC
    `

    // Calculate total sales for percentage
    const totalSales = salesByCategory.reduce((sum, category) => sum + Number(category.sales), 0)

    // Add percentage to each category
    return salesByCategory.map((category) => ({
      id: category.id,
      name: category.name,
      sales: Math.round(Number(category.sales) * 100) / 100,
      quantity: Number(category.quantity),
      orderCount: Number(category.order_count),
      percentage: totalSales > 0 ? Math.round((Number(category.sales) / totalSales) * 100) : 0,
    }))
  } catch (error: any) {
    logger.error(`Error getting vendor sales by category: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor sales by customer
 * @param vendorId Vendor ID
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Vendor sales by customer
 */
async function getVendorSalesByCustomer(
  vendorId: string,
  startDate: Date,
  endDate: Date,
  requestId?: string
): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'vendor-sales-by-customer')
  logger.info(`Getting sales by customer for vendor ID: ${vendorId}`)

  try {
    // Get sales by customer using raw SQL
    const salesByCustomer = await prisma.$queryRaw<any[]>`
      SELECT 
        u.id,
        u."firstName",
        u."lastName",
        u.email,
        SUM(oi.price * oi.quantity) as sales,
        SUM(oi.quantity) as quantity,
        COUNT(DISTINCT o.id) as order_count
      FROM "User" u
      JOIN "Order" o ON u.id = o."userId"
      JOIN "OrderItem" oi ON o.id = oi."orderId"
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o.status IN ('DELIVERED', 'SHIPPED')
      GROUP BY u.id, u."firstName", u."lastName", u.email
      ORDER BY sales DESC
      LIMIT 20
    `

    // Calculate total sales for percentage
    const totalSales = salesByCustomer.reduce((sum, customer) => sum + Number(customer.sales), 0)

    // Add percentage to each customer
    return salesByCustomer.map((customer) => ({
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      sales: Math.round(Number(customer.sales) * 100) / 100,
      quantity: Number(customer.quantity),
      orderCount: Number(customer.order_count),
      percentage: totalSales > 0 ? Math.round((Number(customer.sales) / totalSales) * 100) : 0,
    }))
  } catch (error: any) {
    logger.error(`Error getting vendor sales by customer: ${error.message}`)
    throw error
  }
}

/**
 * Get vendor product analytics
 * @param vendorId Vendor ID
 * @param options Analytics options
 * @param requestId Request ID for logging
 * @returns Vendor product analytics
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

  // Set default options
  const endDate = options.endDate || new Date()
  const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  const limit = options.limit || 10

  // Build filter
  const filter: Prisma.ProductWhereInput = { vendorId }
  if (options.categoryId) {
    filter.categoryId = options.categoryId
  }

  // Try to get from cache
  const cacheKey = `vendor_product_analytics:${vendorId}:${startDate.toISOString()}:${endDate.toISOString()}:${options.categoryId || 'all'}:${limit}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved vendor product analytics from cache')
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

    // Get top selling products
    const topSellingProducts = await getVendorTopProducts(vendorId, startDate, endDate, limit, requestId)

    // Get low stock products
    const lowStockProducts = await prisma.product.findMany({
      where: {
        ...filter,
        quantity: { gt: 0, lte: 5 },
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        images: {
          select: {
            url: true,
            altText: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
          take: 1,
        },
      },
      orderBy: { quantity: 'asc' },
      take: limit,
    })

    // Get out of stock products
    const outOfStockProducts = await prisma.product.findMany({
      where: {
        ...filter,
        quantity: { lte: 0 },
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        images: {
          select: {
            url: true,
            altText: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    // Get inventory by category
    const inventoryByCategory = await prisma.$queryRaw<any[]>`
      SELECT 
        c.id,
        c.name,
        SUM(p.price * p.quantity) as value,
        SUM(p.quantity) as items,
        COUNT(p.id) as products
      FROM "Category" c
      JOIN "Product" p ON c.id = p."categoryId"
      WHERE p."vendorId" = ${vendorId}
      GROUP BY c.id, c.name
      ORDER BY value DESC
    `

    // Calculate total value for percentage
    const totalValue = inventoryByCategory.reduce((sum, category) => sum + Number(category.value), 0)

    // Add percentage to each category
    const inventoryByCategoryWithPercentage = inventoryByCategory.map((category) => ({
      id: category.id,
      name: category.name,
      value: Math.round(Number(category.value) * 100) / 100,
      items: Number(category.items),
      products: Number(category.products),
      percentage: totalValue > 0 ? Math.round((Number(category.value) / totalValue) * 100) : 0,
    }))

    // Get product summary
    const productSummary = await getVendorProductSummary(vendorId, requestId)

    // Compile product analytics
    const productAnalytics = {
      summary: productSummary,
      topSellingProducts,
      lowStockProducts: lowStockProducts.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: product.quantity,
        price: Number(product.price),
        category: product.category?.name || 'N/A',
        image: product.images?.[0] || null,
        inventoryValue: Math.round(Number(product.price) * product.quantity * 100) / 100,
      })),
      outOfStockProducts: outOfStockProducts.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: product.quantity,
        price: Number(product.price),
        category: product.category?.name || 'N/A',
        image: product.images?.[0] || null,
        lastUpdated: product.updatedAt,
      })),
      inventoryByCategory: inventoryByCategoryWithPercentage,
      period: {
        startDate,
        endDate,
      },
    }

    // Cache the results
    await setCache(cacheKey, productAnalytics, CACHE_TTL.PRODUCT_ANALYTICS)

    return productAnalytics
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
 * @returns Vendor order analytics
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

  // Set default options
  const endDate = options.endDate || new Date()
  const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

  // Try to get from cache
  const cacheKey = `vendor_order_analytics:${vendorId}:${startDate.toISOString()}:${endDate.toISOString()}:${options.status || 'all'}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved vendor order analytics from cache')
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

    // Get order summary
    const orderSummary = await getVendorOrderSummary(vendorId, startDate, endDate, requestId)

    // Get order trend
    const orderTrend = await prisma.$queryRaw<any[]>`
      SELECT 
        DATE_TRUNC('day', o."createdAt") as date,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(oi.id) as items
      FROM "Order" o
      JOIN "OrderItem" oi ON o.id = oi."orderId"
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', o."createdAt")
      ORDER BY date ASC
    `

    // Get orders by status
    const ordersByStatus = await prisma.$queryRaw<any[]>`
      SELECT 
        o.status,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(oi.id) as items,
        SUM(oi.price * oi.quantity) as sales
      FROM "Order" o
      JOIN "OrderItem" oi ON o.id = oi."orderId"
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."vendorId" = ${vendorId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
      GROUP BY o.status
      ORDER BY sales DESC
    `

    // Get recent orders
    const recentOrders = await getVendorRecentOrders(vendorId, 10, requestId)

    // Compile order analytics
    const orderAnalytics = {
      summary: orderSummary,
      trend: orderTrend.map(item => ({
        date: item.date,
        orderCount: Number(item.order_count),
        items: Number(item.items),
      })),
      byStatus: ordersByStatus.map(item => ({
        status: item.status,
        orderCount: Number(item.order_count),
        items: Number(item.items),
        sales: Math.round(Number(item.sales) * 100) / 100,
      })),
      recentOrders,
      period: {
        startDate,
        endDate,
      },
    }

    // Cache the results
    await setCache(cacheKey, orderAnalytics, CACHE_TTL.ORDER_ANALYTICS)

    return orderAnalytics
  } catch (error: any) {
    logger.error(`Error getting vendor order analytics: ${error.message}`)
    throw error
  }
}
