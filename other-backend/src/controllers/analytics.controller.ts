import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import * as analyticsService from "../services/analytics.service"

/**
 * Get dashboard analytics
 * @route GET /api/v1/analytics/dashboard
 * @access Protected (Admin)
 */
export const getDashboardAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting dashboard analytics")

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined
  const compareWithPrevious = req.query.compareWithPrevious !== "false"

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  // Validate date range
  if (startDate && endDate && startDate > endDate) {
    return next(new ApiError("Start date cannot be after end date", 400))
  }

  // Get dashboard analytics
  const analytics = await analyticsService.getDashboardAnalytics(
    {
      startDate,
      endDate,
      compareWithPrevious,
    },
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: analytics,
  })
})

/**
 * Get sales analytics
 * @route GET /api/v1/analytics/sales
 * @access Protected (Admin)
 */
export const getSalesAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting sales analytics")

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined
  const interval = req.query.interval as "hourly" | "daily" | "weekly" | "monthly" | undefined
  const compareWithPrevious = req.query.compareWithPrevious !== "false"
  const groupBy = req.query.groupBy as
    | "product"
    | "category"
    | "vendor"
    | "customer"
    | "paymentMethod"
    | "country"
    | undefined

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  // Validate date range
  if (startDate && endDate && startDate > endDate) {
    return next(new ApiError("Start date cannot be after end date", 400))
  }

  // Validate interval
  if (interval && !["hourly", "daily", "weekly", "monthly"].includes(interval)) {
    return next(new ApiError("Invalid interval. Must be one of: hourly, daily, weekly, monthly", 400))
  }

  // Validate groupBy
  if (groupBy && !["product", "category", "vendor", "customer", "paymentMethod", "country"].includes(groupBy)) {
    return next(
      new ApiError("Invalid groupBy. Must be one of: product, category, vendor, customer, paymentMethod, country", 400),
    )
  }

  // Get sales analytics
  const analytics = await analyticsService.getSalesAnalytics(
    {
      startDate,
      endDate,
      interval,
      compareWithPrevious,
      groupBy,
    },
    req.id,
  )

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: analytics,
  })
})

/**
 * Get customer analytics (simplified version using dashboard data)
 * @route GET /api/v1/analytics/customers
 * @access Protected (Admin)
 */
export const getCustomerAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting customer analytics")

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  // Validate date range
  if (startDate && endDate && startDate > endDate) {
    return next(new ApiError("Start date cannot be after end date", 400))
  }

  // Get dashboard analytics which includes customer summary
  const dashboardData = await analyticsService.getDashboardAnalytics(
    {
      startDate,
      endDate,
      compareWithPrevious: true,
    },
    req.id,
  )

  // Extract customer analytics from dashboard data
  const customerAnalytics = {
    summary: dashboardData.customerSummary,
    period: dashboardData.period,
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: customerAnalytics,
  })
})

/**
 * Get inventory analytics (simplified version using dashboard data)
 * @route GET /api/v1/analytics/inventory
 * @access Protected (Admin)
 */
export const getInventoryAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting inventory analytics")

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  // Validate date range
  if (startDate && endDate && startDate > endDate) {
    return next(new ApiError("Start date cannot be after end date", 400))
  }

  // Get dashboard analytics which includes product summary
  const dashboardData = await analyticsService.getDashboardAnalytics(
    {
      startDate,
      endDate,
      compareWithPrevious: false,
    },
    req.id,
  )

  // Extract inventory analytics from dashboard data
  const inventoryAnalytics = {
    summary: dashboardData.productSummary,
    topProducts: dashboardData.topProducts,
    period: dashboardData.period,
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: inventoryAnalytics,
  })
})

/**
 * Get revenue analytics (using sales analytics)
 * @route GET /api/v1/analytics/revenue
 * @access Protected (Admin)
 */
export const getRevenueAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting revenue analytics")

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined
  const interval = req.query.interval as "daily" | "weekly" | "monthly" | "yearly" | undefined

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  // Validate date range
  if (startDate && endDate && startDate > endDate) {
    return next(new ApiError("Start date cannot be after end date", 400))
  }

  // Validate interval
  if (interval && !["daily", "weekly", "monthly", "yearly"].includes(interval)) {
    return next(new ApiError("Invalid interval. Must be one of: daily, weekly, monthly, yearly", 400))
  }

  // Get sales analytics which includes revenue data
  const salesData = await analyticsService.getSalesAnalytics(
    {
      startDate,
      endDate,
      interval: interval === "yearly" ? "monthly" : (interval as "hourly" | "daily" | "weekly" | "monthly"),
      compareWithPrevious: true,
    },
    req.id,
  )

  // Extract revenue analytics from sales data
  const revenueAnalytics = {
    summary: {
      totalRevenue: salesData.summary.totalSales,
      growth: salesData.summary.growth.totalSales,
    },
    trend: salesData.trend,
    period: salesData.period,
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: revenueAnalytics,
  })
})

/**
 * Get product performance analytics (using dashboard data)
 * @route GET /api/v1/analytics/products
 * @access Protected (Admin)
 */
export const getProductAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting product analytics")

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  // Validate date range
  if (startDate && endDate && startDate > endDate) {
    return next(new ApiError("Start date cannot be after end date", 400))
  }

  // Get dashboard analytics which includes product data
  const dashboardData = await analyticsService.getDashboardAnalytics(
    {
      startDate,
      endDate,
      compareWithPrevious: false,
    },
    req.id,
  )

  // Extract product analytics from dashboard data
  const productAnalytics = {
    summary: dashboardData.productSummary,
    topProducts: dashboardData.topProducts,
    salesByCategory: dashboardData.salesByCategory,
    salesByVendor: dashboardData.salesByVendor,
    period: dashboardData.period,
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: productAnalytics,
  })
})

/**
 * Get sales trend data (simplified conversion funnel)
 * @route GET /api/v1/analytics/funnel
 * @access Protected (Admin)
 */
export const getConversionFunnel = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting conversion funnel analytics")

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    return next(new ApiError("Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  if (endDate && isNaN(endDate.getTime())) {
    return next(new ApiError("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  // Validate date range
  if (startDate && endDate && startDate > endDate) {
    return next(new ApiError("Start date cannot be after end date", 400))
  }

  // Get dashboard analytics for funnel data
  const dashboardData = await analyticsService.getDashboardAnalytics(
    {
      startDate,
      endDate,
      compareWithPrevious: false,
    },
    req.id,
  )

  // Create a simplified funnel from available data
  const funnelData = {
    steps: [
      {
        name: "Visitors",
        count: dashboardData.customerSummary.totalCustomers,
        percentage: 100,
      },
      {
        name: "Active Customers",
        count: dashboardData.customerSummary.activeCustomers,
        percentage: dashboardData.customerSummary.totalCustomers > 0 
          ? Math.round((dashboardData.customerSummary.activeCustomers / dashboardData.customerSummary.totalCustomers) * 100)
          : 0,
      },
      {
        name: "Orders",
        count: dashboardData.salesSummary.totalOrders,
        percentage: dashboardData.customerSummary.activeCustomers > 0
          ? Math.round((dashboardData.salesSummary.totalOrders / dashboardData.customerSummary.activeCustomers) * 100)
          : 0,
      },
    ],
    period: dashboardData.period,
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: funnelData,
  })
})

/**
 * Get real-time analytics (using recent data from dashboard)
 * @route GET /api/v1/analytics/realtime
 * @access Protected (Admin)
 */
export const getRealtimeAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Getting real-time analytics")

  // Get recent data (last 24 hours)
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

  const dashboardData = await analyticsService.getDashboardAnalytics(
    {
      startDate,
      endDate,
      compareWithPrevious: false,
    },
    req.id,
  )

  // Create real-time analytics from recent data
  const realtimeData = {
    recentOrders: dashboardData.recentOrders,
    salesTrend: dashboardData.salesTrend,
    summary: {
      ordersToday: dashboardData.salesSummary.totalOrders,
      revenueToday: dashboardData.salesSummary.totalSales,
      newCustomersToday: dashboardData.customerSummary.newCustomers,
    },
    lastUpdated: new Date(),
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: realtimeData,
  })
})

/**
 * Export analytics data (simplified version)
 * @route POST /api/v1/analytics/export
 * @access Protected (Admin)
 */
export const exportAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  requestLogger.info("Exporting analytics data")

  const { type, startDate, endDate, format = "json" } = req.body

  // Validate required fields
  if (!type) {
    return next(new ApiError("Export type is required", 400))
  }

  if (!["sales", "customers", "products", "dashboard"].includes(type)) {
    return next(new ApiError("Invalid export type. Must be one of: sales, customers, products, dashboard", 400))
  }

  if (!["json"].includes(format)) {
    return next(new ApiError("Invalid format. Currently only 'json' format is supported", 400))
  }

  // Validate dates
  const start = startDate ? new Date(startDate) : undefined
  const end = endDate ? new Date(endDate) : undefined

  if (start && isNaN(start.getTime())) {
    return next(new ApiError("Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  if (end && isNaN(end.getTime())) {
    return next(new ApiError("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)", 400))
  }

  if (start && end && start > end) {
    return next(new ApiError("Start date cannot be after end date", 400))
  }

  // Get analytics data based on type
  let exportData: any
  
  if (type === "dashboard") {
    exportData = await analyticsService.getDashboardAnalytics(
      {
        startDate: start,
        endDate: end,
        compareWithPrevious: true,
      },
      req.id,
    )
  } else if (type === "sales") {
    exportData = await analyticsService.getSalesAnalytics(
      {
        startDate: start,
        endDate: end,
        compareWithPrevious: true,
      },
      req.id,
    )
  } else {
    // For customers and products, use dashboard data
    const dashboardData = await analyticsService.getDashboardAnalytics(
      {
        startDate: start,
        endDate: end,
        compareWithPrevious: true,
      },
      req.id,
    )
    
    if (type === "customers") {
      exportData = {
        summary: dashboardData.customerSummary,
        period: dashboardData.period,
      }
    } else if (type === "products") {
      exportData = {
        summary: dashboardData.productSummary,
        topProducts: dashboardData.topProducts,
        salesByCategory: dashboardData.salesByCategory,
        salesByVendor: dashboardData.salesByVendor,
        period: dashboardData.period,
      }
    }
  }

  const exportResult = {
    type,
    format,
    exportedAt: new Date(),
    data: exportData,
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: exportResult,
    message: "Analytics data exported successfully",
  })
})
