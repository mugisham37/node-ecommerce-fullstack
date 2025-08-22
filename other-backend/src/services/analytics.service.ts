import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { getCache, setCache } from '../config/redis'
import { ApiError } from '../utils/api-error'
import {
  safeDecimalToNumber,
  calculateGrowthPercentage as utilsCalculateGrowthPercentage,
  safeGetCount,
  safeGetSum,
  safeGetAverage,
  getPreviousPeriodDates,
  formatOrderNumber,
  calculatePercentage,
  validateDateRange,
  getDateTruncFunction,
  createAnalyticsCacheKey
} from '../utils/analytics.utils'
import {
  SalesAnalytics,
  CustomerSummary,
  ProductSummary,
  OrderSummary,
  RecentOrderSummary,
  ProductSalesData,
  CategorySalesData,
  VendorSalesData,
  SalesTrendData,
  DashboardAnalytics,
  AnalyticsOptions
} from '../types/analytics.types'

// Cache TTL in seconds
const CACHE_TTL = {
  DASHBOARD_ANALYTICS: 1800, // 30 minutes
  SALES_ANALYTICS: 3600, // 1 hour
  PRODUCT_ANALYTICS: 3600, // 1 hour
  CUSTOMER_ANALYTICS: 3600, // 1 hour
  VENDOR_ANALYTICS: 3600, // 1 hour
  INVENTORY_ANALYTICS: 3600, // 1 hour
  MARKETING_ANALYTICS: 3600, // 1 hour
}

/**
 * Get dashboard analytics
 * @param options Analytics options
 * @param requestId Request ID for logging
 * @returns Dashboard analytics data
 */
export const getDashboardAnalytics = async (
  options: {
    startDate?: Date
    endDate?: Date
    compareWithPrevious?: boolean
  } = {},
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'analytics-dashboard')
  logger.info('Getting dashboard analytics')

  // Set default options
  const endDate = options.endDate || new Date()
  const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  const compareWithPrevious = options.compareWithPrevious !== undefined ? options.compareWithPrevious : true

  // Calculate previous period
  const previousStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()))
  const previousEndDate = new Date(endDate.getTime() - (endDate.getTime() - startDate.getTime()))

  // Try to get from cache
  const cacheKey = `dashboard_analytics:${startDate.toISOString()}:${endDate.toISOString()}:${compareWithPrevious}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved dashboard analytics from cache')
    return cachedData
  }

  try {
    // Get sales summary
    const salesSummary = await getSalesSummary(
      startDate,
      endDate,
      compareWithPrevious ? previousStartDate : null,
      compareWithPrevious ? previousEndDate : null,
      requestId
    )

    // Get customer summary
    const customerSummary = await getCustomerSummary(
      startDate,
      endDate,
      compareWithPrevious ? previousStartDate : null,
      compareWithPrevious ? previousEndDate : null,
      requestId
    )

    // Get product summary
    const productSummary = await getProductSummary(startDate, endDate, requestId)

    // Get order summary
    const orderSummary = await getOrderSummary(startDate, endDate, requestId)

    // Get recent orders
    const recentOrders = await getRecentOrders(10, requestId)

    // Get top products
    const topProducts = await getTopProducts(5, startDate, endDate, requestId)

    // Get sales by category
    const salesByCategory = await getSalesByCategory(startDate, endDate, requestId)

    // Get sales by vendor
    const salesByVendor = await getSalesByVendor(startDate, endDate, requestId)

    // Get sales trend
    const salesTrend = await getSalesTrend(startDate, endDate, 'daily', requestId)

    // Compile dashboard data
    const dashboardData = {
      salesSummary,
      customerSummary,
      productSummary,
      orderSummary,
      recentOrders,
      topProducts,
      salesByCategory,
      salesByVendor,
      salesTrend,
      period: {
        startDate,
        endDate,
      },
    }

    // Cache the results
    await setCache(cacheKey, dashboardData, CACHE_TTL.DASHBOARD_ANALYTICS)

    return dashboardData
  } catch (error: any) {
    logger.error(`Error getting dashboard analytics: ${error.message}`)
    throw new ApiError(`Failed to get dashboard analytics: ${error.message}`, 500)
  }
}

/**
 * Get sales summary
 * @param startDate Start date
 * @param endDate End date
 * @param previousStartDate Previous period start date
 * @param previousEndDate Previous period end date
 * @param requestId Request ID for logging
 * @returns Sales summary data
 */
async function getSalesSummary(
  startDate: Date,
  endDate: Date,
  previousStartDate: Date | null,
  previousEndDate: Date | null,
  requestId?: string
): Promise<any> {
  const logger = createRequestLogger(requestId || 'analytics-sales-summary')
  logger.info('Getting sales summary')

  try {
    // Get current period sales data
    const currentSales = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['DELIVERED', 'SHIPPED'] },
      },
      _sum: {
        total: true,
      },
      _count: true,
      _avg: {
        total: true,
      },
    })

    // Get order items count for current period
    const currentOrderItems = await prisma.orderItem.aggregate({
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['DELIVERED', 'SHIPPED'] },
        },
      },
      _sum: {
        quantity: true,
      },
    })

    // Default values if no sales
    const currentPeriod = {
      totalSales: Number(currentSales._sum.total) || 0,
      totalOrders: currentSales._count || 0,
      avgOrderValue: Number(currentSales._avg.total) || 0,
      totalItems: Number(currentOrderItems._sum.quantity) || 0,
    }

    // Calculate growth if previous period dates are provided
    let growth = {
      totalSales: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      totalItems: 0,
    }

    if (previousStartDate && previousEndDate) {
      // Get previous period sales data
      const previousSales = await prisma.order.aggregate({
        where: {
          createdAt: { gte: previousStartDate, lte: previousEndDate },
          status: { in: ['DELIVERED', 'SHIPPED'] },
        },
        _sum: {
          total: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          total: true,
        },
      })

      const previousOrderItems = await prisma.orderItem.aggregate({
        where: {
          order: {
            createdAt: { gte: previousStartDate, lte: previousEndDate },
            status: { in: ['DELIVERED', 'SHIPPED'] },
          },
        },
        _sum: {
          quantity: true,
        },
      })

      const previousPeriod = {
        totalSales: safeGetSum(previousSales._sum, 'total'),
        totalOrders: safeGetCount(previousSales._count, 'id'),
        avgOrderValue: safeGetAverage(previousSales._avg, 'total'),
        totalItems: safeGetSum(previousOrderItems._sum, 'quantity'),
      }

      // Calculate growth percentages
      growth = {
        totalSales: calculateGrowthPercentage(currentPeriod.totalSales, previousPeriod.totalSales),
        totalOrders: calculateGrowthPercentage(currentPeriod.totalOrders, previousPeriod.totalOrders),
        avgOrderValue: calculateGrowthPercentage(currentPeriod.avgOrderValue, previousPeriod.avgOrderValue),
        totalItems: calculateGrowthPercentage(currentPeriod.totalItems, previousPeriod.totalItems),
      }
    }

    return {
      ...currentPeriod,
      growth,
    }
  } catch (error: any) {
    logger.error(`Error getting sales summary: ${error.message}`)
    throw error
  }
}

/**
 * Get customer summary
 * @param startDate Start date
 * @param endDate End date
 * @param previousStartDate Previous period start date
 * @param previousEndDate Previous period end date
 * @param requestId Request ID for logging
 * @returns Customer summary data
 */
async function getCustomerSummary(
  startDate: Date,
  endDate: Date,
  previousStartDate: Date | null,
  previousEndDate: Date | null,
  requestId?: string
): Promise<any> {
  const logger = createRequestLogger(requestId || 'analytics-customer-summary')
  logger.info('Getting customer summary')

  try {
    // Get total customers
    const totalCustomers = await prisma.user.count({
      where: { role: 'CUSTOMER' },
    })

    // Get new customers in current period
    const newCustomers = await prisma.user.count({
      where: {
        role: 'CUSTOMER',
        createdAt: { gte: startDate, lte: endDate },
      },
    })

    // Get active customers (customers who placed an order in the period)
    const activeCustomers = await prisma.user.count({
      where: {
        role: 'CUSTOMER',
        orders: {
          some: {
            createdAt: { gte: startDate, lte: endDate },
            status: { in: ['DELIVERED', 'SHIPPED'] },
          },
        },
      },
    })

    // Calculate customer retention rate
    const customersBeforePeriod = await prisma.user.count({
      where: {
        role: 'CUSTOMER',
        createdAt: { lt: startDate },
      },
    })

    const retentionRate = customersBeforePeriod > 0 ? Math.round((activeCustomers / customersBeforePeriod) * 100) : 0

    // Calculate growth if previous period dates are provided
    let growth = {
      newCustomers: 0,
      activeCustomers: 0,
      retentionRate: 0,
    }

    if (previousStartDate && previousEndDate) {
      // Get new customers in previous period
      const previousNewCustomers = await prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { gte: previousStartDate, lte: previousEndDate },
        },
      })

      // Get active customers in previous period
      const previousActiveCustomers = await prisma.user.count({
        where: {
          role: 'CUSTOMER',
          orders: {
            some: {
              createdAt: { gte: previousStartDate, lte: previousEndDate },
              status: { in: ['DELIVERED', 'SHIPPED'] },
            },
          },
        },
      })

      // Calculate previous retention rate
      const customersBeforePreviousPeriod = await prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { lt: previousStartDate },
        },
      })

      const previousRetentionRate =
        customersBeforePreviousPeriod > 0
          ? Math.round((previousActiveCustomers / customersBeforePreviousPeriod) * 100)
          : 0

      // Calculate growth percentages
      growth = {
        newCustomers: calculateGrowthPercentage(newCustomers, previousNewCustomers),
        activeCustomers: calculateGrowthPercentage(activeCustomers, previousActiveCustomers),
        retentionRate: calculateGrowthPercentage(retentionRate, previousRetentionRate),
      }
    }

    return {
      totalCustomers,
      newCustomers,
      activeCustomers,
      retentionRate,
      growth,
    }
  } catch (error: any) {
    logger.error(`Error getting customer summary: ${error.message}`)
    throw error
  }
}

/**
 * Get product summary
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Product summary data
 */
async function getProductSummary(startDate: Date, endDate: Date, requestId?: string): Promise<any> {
  const logger = createRequestLogger(requestId || 'analytics-product-summary')
  logger.info('Getting product summary')

  try {
    // Get product counts
    const totalProducts = await prisma.product.count()
    const activeProducts = await prisma.product.count({ where: { active: true } })
    const featuredProducts = await prisma.product.count({ where: { featured: true } })
    const lowStockProducts = await prisma.product.count({ 
      where: { quantity: { gt: 0, lte: 5 } } 
    })
    const outOfStockProducts = await prisma.product.count({ 
      where: { quantity: { lte: 0 } } 
    })

    // Get inventory value
    const inventoryValue = await prisma.product.aggregate({
      _sum: {
        price: true,
      },
      where: {
        active: true,
      },
    })

    // Get new products in period
    const newProducts = await prisma.product.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    })

    // Get updated products in period
    const updatedProducts = await prisma.product.count({
      where: {
        updatedAt: { gte: startDate, lte: endDate },
        createdAt: { lt: startDate },
      },
    })

    return {
      totalProducts,
      activeProducts,
      featuredProducts,
      lowStockProducts,
      outOfStockProducts,
      inventoryValue: Number(inventoryValue._sum.price) || 0,
      newProducts,
      updatedProducts,
    }
  } catch (error: any) {
    logger.error(`Error getting product summary: ${error.message}`)
    throw error
  }
}

/**
 * Get order summary
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Order summary data
 */
async function getOrderSummary(startDate: Date, endDate: Date, requestId?: string): Promise<any> {
  const logger = createRequestLogger(requestId || 'analytics-order-summary')
  logger.info('Getting order summary')

  try {
    // Get order counts by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: {
        id: true,
      },
    })

    // Convert to object
    const statusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    }

    ordersByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.id
    })

    // Get payment stats
    const paymentStats = await prisma.order.groupBy({
      by: ['paymentStatus'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
    })

    // Convert to object
    const paymentCounts = {
      paid: 0,
      unpaid: 0,
      paidTotal: 0,
      unpaidTotal: 0,
    }

    paymentStats.forEach((item) => {
      if (item.paymentStatus === PaymentStatus.COMPLETED) {
        paymentCounts.paid = safeGetCount(item._count, 'id')
        paymentCounts.paidTotal = safeGetSum(item._sum, 'total')
      } else {
        paymentCounts.unpaid = safeGetCount(item._count, 'id')
        paymentCounts.unpaidTotal = safeGetSum(item._sum, 'total')
      }
    })

    return {
      statusCounts,
      paymentCounts,
      totalOrders: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
    }
  } catch (error: any) {
    logger.error(`Error getting order summary: ${error.message}`)
    throw error
  }
}

/**
 * Get recent orders
 * @param limit Number of orders to return
 * @param requestId Request ID for logging
 * @returns Recent orders
 */
async function getRecentOrders(limit: number, requestId?: string): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'analytics-recent-orders')
  logger.info(`Getting recent orders, limit: ${limit}`)

  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          select: {
            quantity: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.id.substring(order.id.length - 8).toUpperCase(),
      customer: order.user
        ? {
            id: order.user.id,
            name: `${order.user.firstName} ${order.user.lastName}`,
            email: order.user.email,
          }
        : null,
      totalAmount: safeDecimalToNumber(order.total),
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    }))
  } catch (error: any) {
    logger.error(`Error getting recent orders: ${error.message}`)
    throw error
  }
}

/**
 * Get top products
 * @param limit Number of products to return
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Top products
 */
async function getTopProducts(limit: number, startDate: Date, endDate: Date, requestId?: string): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'analytics-top-products')
  logger.info(`Getting top products, limit: ${limit}`)

  try {
    // Get top selling products by quantity
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['DELIVERED', 'SHIPPED'] },
        },
      },
      _sum: {
        quantity: true,
        price: true,
      },
      _count: {
        orderId: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    })

    // Get product details
    const productIds = topProducts.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        images: true,
      },
    })

    // Combine data
    return topProducts.map((item) => {
      const product = products.find(p => p.id === item.productId)
      return {
        id: product?.id,
        name: product?.name,
        sku: product?.sku,
        price: Number(product?.price) || 0,
        image: product?.images?.[0] || null,
        quantitySold: Number(item._sum.quantity) || 0,
        revenue: Number(item._sum.price) || 0,
        orderCount: item._count.orderId,
      }
    }).filter(item => item.id) // Filter out items where product wasn't found
  } catch (error: any) {
    logger.error(`Error getting top products: ${error.message}`)
    throw error
  }
}

/**
 * Get sales by category
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Sales by category
 */
async function getSalesByCategory(startDate: Date, endDate: Date, requestId?: string): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'analytics-sales-category')
  logger.info('Getting sales by category')

  try {
    // Get sales by category through order items
    const salesByCategory = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['DELIVERED', 'SHIPPED'] },
        },
      },
      _sum: {
        price: true,
        quantity: true,
      },
    })

    // Get products with categories
    const productIds = salesByCategory.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Group by category
    const categoryMap = new Map<string, { id: string; name: string; sales: number; items: number }>()

    salesByCategory.forEach((item) => {
      const product = products.find(p => p.id === item.productId)
      if (product?.category) {
        const categoryId = product.category.id
        const existing = categoryMap.get(categoryId) || {
          id: categoryId,
          name: product.category.name,
          sales: 0,
          items: 0,
        }
        
        existing.sales += Number(item._sum.price) || 0
        existing.items += Number(item._sum.quantity) || 0
        categoryMap.set(categoryId, existing)
      }
    })

    const results = Array.from(categoryMap.values()).sort((a, b) => b.sales - a.sales)

    // Calculate total sales for percentage
    const totalSales = results.reduce((sum, category) => sum + category.sales, 0)

    // Add percentage to each category
    return results.map((category) => ({
      ...category,
      percentage: totalSales > 0 ? Math.round((category.sales / totalSales) * 100) : 0,
    }))
  } catch (error: any) {
    logger.error(`Error getting sales by category: ${error.message}`)
    throw error
  }
}

/**
 * Get sales by vendor
 * @param startDate Start date
 * @param endDate End date
 * @param requestId Request ID for logging
 * @returns Sales by vendor
 */
async function getSalesByVendor(startDate: Date, endDate: Date, requestId?: string): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'analytics-sales-vendor')
  logger.info('Getting sales by vendor')

  try {
    // Get sales by vendor through order items
    const salesByVendor = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['DELIVERED', 'SHIPPED'] },
        },
      },
      _sum: {
        price: true,
        quantity: true,
      },
    })

    // Get products with vendors
    const productIds = salesByVendor.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    })

    // Group by vendor
    const vendorMap = new Map<string, { id: string; name: string; sales: number; items: number }>()

    salesByVendor.forEach((item) => {
      const product = products.find(p => p.id === item.productId)
      if (product?.vendor) {
        const vendorId = product.vendor.id
        const existing = vendorMap.get(vendorId) || {
          id: vendorId,
          name: product.vendor.businessName,
          sales: 0,
          items: 0,
        }
        
        existing.sales += Number(item._sum.price) || 0
        existing.items += Number(item._sum.quantity) || 0
        vendorMap.set(vendorId, existing)
      }
    })

    const results = Array.from(vendorMap.values()).sort((a, b) => b.sales - a.sales)

    // Calculate total sales for percentage
    const totalSales = results.reduce((sum, vendor) => sum + vendor.sales, 0)

    // Add percentage to each vendor
    return results.map((vendor) => ({
      ...vendor,
      percentage: totalSales > 0 ? Math.round((vendor.sales / totalSales) * 100) : 0,
    }))
  } catch (error: any) {
    logger.error(`Error getting sales by vendor: ${error.message}`)
    throw error
  }
}

/**
 * Get sales trend
 * @param startDate Start date
 * @param endDate End date
 * @param interval Interval (hourly, daily, weekly, monthly)
 * @param requestId Request ID for logging
 * @returns Sales trend data
 */
async function getSalesTrend(
  startDate: Date,
  endDate: Date,
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
  requestId?: string
): Promise<any[]> {
  const logger = createRequestLogger(requestId || 'analytics-sales-trend')
  logger.info(`Getting sales trend with interval: ${interval}`)

  try {
    // For PostgreSQL, we'll use date_trunc function
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

    // Use raw SQL for date truncation
    const salesTrend = await prisma.$queryRaw<any[]>`
      SELECT 
        DATE_TRUNC(${truncFunction}, "createdAt") as date,
        SUM("total") as sales,
        COUNT(*) as orders,
        SUM((
          SELECT SUM("quantity") 
          FROM "OrderItem" 
          WHERE "orderId" = "Order"."id"
        )) as items
      FROM "Order"
      WHERE "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        AND "status" IN ('DELIVERED', 'SHIPPED')
      GROUP BY DATE_TRUNC(${truncFunction}, "createdAt")
      ORDER BY date ASC
    `

    return salesTrend.map(item => ({
      date: item.date,
      sales: Number(item.sales) || 0,
      orders: Number(item.orders) || 0,
      items: Number(item.items) || 0,
    }))
  } catch (error: any) {
    logger.error(`Error getting sales trend: ${error.message}`)
    throw error
  }
}

/**
 * Calculate growth percentage
 * @param current Current value
 * @param previous Previous value
 * @returns Growth percentage
 */
function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Get detailed sales analytics
 * @param options Analytics options
 * @param requestId Request ID for logging
 * @returns Detailed sales analytics
 */
export const getSalesAnalytics = async (
  options: {
    startDate?: Date
    endDate?: Date
    interval?: 'hourly' | 'daily' | 'weekly' | 'monthly'
    compareWithPrevious?: boolean
    groupBy?: 'product' | 'category' | 'vendor' | 'customer' | 'paymentMethod' | 'country'
  } = {},
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'analytics-sales-detailed')
  logger.info('Getting detailed sales analytics')

  // Set default options
  const endDate = options.endDate || new Date()
  const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  const interval = options.interval || 'daily'
  const compareWithPrevious = options.compareWithPrevious !== undefined ? options.compareWithPrevious : true
  const groupBy = options.groupBy || 'product'

  // Calculate previous period
  const previousStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()))
  const previousEndDate = new Date(endDate.getTime() - (endDate.getTime() - startDate.getTime()))

  // Try to get from cache
  const cacheKey = `sales_analytics:${startDate.toISOString()}:${endDate.toISOString()}:${interval}:${compareWithPrevious}:${groupBy}`
  const cachedData = await getCache<any>(cacheKey)

  if (cachedData) {
    logger.info('Retrieved sales analytics from cache')
    return cachedData
  }

  try {
    // Get sales trend
    const salesTrend = await getSalesTrend(startDate, endDate, interval, requestId)

    // Get previous period sales trend if needed
    let previousSalesTrend = null
    if (compareWithPrevious) {
      previousSalesTrend = await getSalesTrend(previousStartDate, previousEndDate, interval, requestId)
    }

    // Get sales summary
    const salesSummary = await getSalesSummary(
      startDate, 
      endDate, 
      compareWithPrevious ? previousStartDate : null, 
      compareWithPrevious ? previousEndDate : null, 
      requestId
    )

    // Get grouped sales data
    let groupedSales = []
    if (groupBy === 'product') {
      groupedSales = await getTopProducts(100, startDate, endDate, requestId)
    } else if (groupBy === 'category') {
      groupedSales = await getSalesByCategory(startDate, endDate, requestId)
    } else if (groupBy === 'vendor') {
      groupedSales = await getSalesByVendor(startDate, endDate, requestId)
    }

    // Compile sales analytics
    const salesAnalytics = {
      summary: salesSummary,
      trend: {
        current: salesTrend,
        previous: previousSalesTrend,
      },
      groupedSales,
      period: {
        startDate,
        endDate,
      },
      options: {
        interval,
        groupBy,
        compareWithPrevious,
      },
    }

    // Cache the results
    await setCache(cacheKey, salesAnalytics, CACHE_TTL.SALES_ANALYTICS)

    return salesAnalytics
  } catch (error: any) {
    logger.error(`Error getting sales analytics: ${error.message}`)
    throw new ApiError(`Failed to get sales analytics: ${error.message}`, 500)
  }
}
