import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import exportService from "../services/export.service"

/**
 * Export orders
 * @route GET /api/v1/export/orders
 * @access Protected (Admin)
 */
export const exportOrdersController = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const format = (req.query.format as string) || "csv"

  // Validate format
  if (!["csv", "excel", "pdf"].includes(format)) {
    return next(new ApiError(`Invalid export format: ${format}`, 400))
  }

  requestLogger.info(`Exporting orders in ${format} format`)

  try {
    // Extract filters from query params
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string,
      vendorId: req.query.vendorId as string,
    }

    // Export orders using the service
    const buffer = await exportService.exportOrders(format as any, filters, req.id)

    // Set appropriate content type and filename
    let contentType = "text/csv"
    let fileExtension = "csv"
    
    switch (format) {
      case "excel":
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        fileExtension = "xlsx"
        break
      case "pdf":
        contentType = "application/pdf"
        fileExtension = "pdf"
        break
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `orders_export_${timestamp}.${fileExtension}`

    // Set headers for file download
    res.setHeader("Content-Type", contentType)
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`)

    // Send the buffer
    res.send(buffer)
  } catch (error: any) {
    requestLogger.error(`Error exporting orders: ${error.message}`)
    return next(new ApiError(`Failed to export orders: ${error.message}`, 500))
  }
})

/**
 * Export products
 * @route GET /api/v1/export/products
 * @access Protected (Admin)
 */
export const exportProductsController = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const format = (req.query.format as string) || "csv"

  // Validate format
  if (!["csv"].includes(format)) {
    return next(new ApiError(`Invalid export format: ${format}. Only CSV is supported for products.`, 400))
  }

  requestLogger.info(`Exporting products in ${format} format`)

  try {
    // Extract filters from query params
    const filters = {
      categoryId: req.query.category as string,
      vendorId: req.query.vendor as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      inStock: req.query.inStock ? req.query.inStock === "true" : undefined,
      featured: req.query.featured ? req.query.featured === "true" : undefined,
      active: req.query.active ? req.query.active === "true" : undefined,
    }

    // Export products using the service
    const buffer = await exportService.exportProducts(format as any, filters, req.id)

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `products_export_${timestamp}.csv`

    // Set headers for file download
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`)

    // Send the buffer
    res.send(buffer)
  } catch (error: any) {
    requestLogger.error(`Error exporting products: ${error.message}`)
    return next(new ApiError(`Failed to export products: ${error.message}`, 500))
  }
})

/**
 * Export customers
 * @route GET /api/v1/export/customers
 * @access Protected (Admin)
 */
export const exportCustomersController = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const format = (req.query.format as string) || "csv"

  // Validate format
  if (!["csv"].includes(format)) {
    return next(new ApiError(`Invalid export format: ${format}. Only CSV is supported for customers.`, 400))
  }

  requestLogger.info(`Exporting customers in ${format} format`)

  try {
    // Extract filters from query params
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      isActive: req.query.active ? req.query.active === "true" : undefined,
    }

    // Export customers using the service
    const buffer = await exportService.exportCustomers(format as any, filters, req.id)

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `customers_export_${timestamp}.csv`

    // Set headers for file download
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`)

    // Send the buffer
    res.send(buffer)
  } catch (error: any) {
    requestLogger.error(`Error exporting customers: ${error.message}`)
    return next(new ApiError(`Failed to export customers: ${error.message}`, 500))
  }
})

/**
 * Export sales (using orders data)
 * @route GET /api/v1/export/sales
 * @access Protected (Admin)
 */
export const exportSalesController = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const format = (req.query.format as string) || "csv"

  // Validate format
  if (!["csv", "excel", "pdf"].includes(format)) {
    return next(new ApiError(`Invalid export format: ${format}`, 400))
  }

  requestLogger.info(`Exporting sales data in ${format} format`)

  try {
    // Extract filters from query params
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      vendorId: req.query.vendorId as string,
      status: "DELIVERED", // Only include completed sales
    }

    // Export orders as sales data using the service
    const buffer = await exportService.exportOrders(format as any, filters, req.id)

    // Set appropriate content type and filename
    let contentType = "text/csv"
    let fileExtension = "csv"
    
    switch (format) {
      case "excel":
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        fileExtension = "xlsx"
        break
      case "pdf":
        contentType = "application/pdf"
        fileExtension = "pdf"
        break
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `sales_export_${timestamp}.${fileExtension}`

    // Set headers for file download
    res.setHeader("Content-Type", contentType)
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`)

    // Send the buffer
    res.send(buffer)
  } catch (error: any) {
    requestLogger.error(`Error exporting sales: ${error.message}`)
    return next(new ApiError(`Failed to export sales: ${error.message}`, 500))
  }
})

/**
 * Export inventory (using products data)
 * @route GET /api/v1/export/inventory
 * @access Protected (Admin)
 */
export const exportInventoryController = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const format = (req.query.format as string) || "csv"

  // Validate format
  if (!["csv"].includes(format)) {
    return next(new ApiError(`Invalid export format: ${format}. Only CSV is supported for inventory.`, 400))
  }

  requestLogger.info(`Exporting inventory data in ${format} format`)

  try {
    // Extract filters from query params
    const filters = {
      categoryId: req.query.category as string,
      vendorId: req.query.vendor as string,
      minPrice: req.query.minQuantity ? Number(req.query.minQuantity) : undefined,
      maxPrice: req.query.maxQuantity ? Number(req.query.maxQuantity) : undefined,
      inStock: req.query.inStock ? req.query.inStock === "true" : undefined,
      active: true, // Only include active products for inventory
    }

    // Export products as inventory data using the service
    const buffer = await exportService.exportProducts(format as any, filters, req.id)

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `inventory_export_${timestamp}.csv`

    // Set headers for file download
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`)

    // Send the buffer
    res.send(buffer)
  } catch (error: any) {
    requestLogger.error(`Error exporting inventory: ${error.message}`)
    return next(new ApiError(`Failed to export inventory: ${error.message}`, 500))
  }
})

/**
 * Get export status (for future implementation of async exports)
 * @route GET /api/v1/export/status/:exportId
 * @access Protected (Admin)
 */
export const getExportStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { exportId } = req.params

  if (!exportId) {
    return next(new ApiError("Export ID is required", 400))
  }

  requestLogger.info(`Getting export status for: ${exportId}`)

  // For now, return a mock status since async exports aren't implemented
  const status = {
    exportId,
    status: "completed",
    progress: 100,
    createdAt: new Date(),
    completedAt: new Date(),
    downloadUrl: `/api/v1/export/download/${exportId}`,
  }

  res.status(200).json({
    status: "success",
    requestId: req.id,
    data: status,
  })
})

/**
 * Download exported file (for future implementation)
 * @route GET /api/v1/export/download/:exportId
 * @access Protected (Admin)
 */
export const downloadExportFile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  const { exportId } = req.params

  if (!exportId) {
    return next(new ApiError("Export ID is required", 400))
  }

  requestLogger.info(`Downloading export file: ${exportId}`)

  // For now, return an error since file storage isn't implemented
  return next(new ApiError("Export file download not implemented yet", 501))
})
