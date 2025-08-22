import { Prisma, OrderStatus } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import { getCache, setCache } from '../config/redis'
import * as loyaltyService from './loyalty.service'
import { sendOrderConfirmationEmail } from './email.service'

// Temporary placeholder for sendOrderDeliveredEmail until email service is fixed
const sendOrderDeliveredEmail = async (
  to: string,
  data: any,
  language: string,
  requestId?: string
): Promise<void> => {
  const logger = createRequestLogger(requestId || 'default')
  logger.info(`Order delivered email placeholder for ${to}, order: ${data.orderId}`)
  // TODO: Implement when email service is properly configured
}

// Cache TTL in seconds
const CACHE_TTL = {
  ORDER_DETAILS: 1800, // 30 minutes
  ORDER_HISTORY: 3600, // 1 hour
  ORDER_STATISTICS: 1800, // 30 minutes
}

// Order status transitions map for validation
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
}

/**
 * Validate order status transition
 * @param currentStatus Current order status
 * @param newStatus New order status
 * @returns Boolean indicating if transition is valid
 */
const isValidStatusTransition = (currentStatus: string, newStatus: string): boolean => {
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || []
  return validTransitions.includes(newStatus)
}

/**
 * Clear order-related cache
 * @param orderId Order ID
 * @param userId User ID
 */
const clearOrderCache = async (orderId: string, userId?: string | null): Promise<void> => {
  const cacheKeys = [
    `order:details:${orderId}`,
    `order:statistics:${orderId}`,
  ]

  if (userId) {
    cacheKeys.push(`order:history:${userId}`)
  }

  await Promise.all(cacheKeys.map(key => setCache(key, null, 1)))
}

/**
 * Get order by ID with caching
 * @param orderId Order ID
 * @param requestId Request ID for logging
 * @returns Order details
 */
export const getOrderById = async (orderId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'default')
  logger.info(`Getting order by ID: ${orderId}`)

  // Try to get from cache
  const cacheKey = `order:details:${orderId}`
  const cachedOrder = await getCache<any>(cacheKey)

  if (cachedOrder) {
    logger.info(`Retrieved order from cache: ${orderId}`)
    return cachedOrder
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: true,
              },
            },
            productVariant: {
              select: {
                id: true,
                sku: true,
                price: true,
                attributes: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!order) {
      throw new ApiError("Order not found", 404)
    }

    // Cache the result
    await setCache(cacheKey, order, CACHE_TTL.ORDER_DETAILS)

    return order
  } catch (error: any) {
    logger.error(`Error getting order by ID: ${error.message}`)
    throw error
  }
}

/**
 * Process order completion
 * @param orderId Order ID
 * @param requestId Request ID for logging
 * @returns Updated order
 */
export const processOrderCompletion = async (orderId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'default')
  logger.info(`Processing order completion for order ID: ${orderId}`)

  try {
    // Get order with full details
    const order = await getOrderById(orderId, requestId)
    
    if (!order) {
      throw new ApiError("Order not found", 404)
    }

    // Check if order is already delivered
    if (order.status === 'DELIVERED') {
      logger.info(`Order ${orderId} is already marked as delivered`)
      return order
    }

    // Validate status transition
    if (!isValidStatusTransition(order.status, 'DELIVERED')) {
      throw new ApiError(
        `Invalid status transition from ${order.status} to DELIVERED`,
        400
      )
    }

    // Use transaction to ensure data consistency
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                },
              },
            },
          },
        },
      })

      // Update vendor metrics
      if (updated.vendorId) {
        await tx.vendor.update({
          where: { id: updated.vendorId },
          data: {
            totalOrders: { increment: 1 },
            totalSales: { increment: updated.total },
          },
        })
      }

      return updated
    })

    // Process loyalty points if order is paid
    if (order.paymentStatus === 'COMPLETED' && order.userId) {
      try {
        await loyaltyService.processOrderPoints(orderId, requestId)
        logger.info(`Loyalty points processed for order ${orderId}`)
      } catch (loyaltyError: any) {
        logger.error(`Error processing loyalty points: ${loyaltyError.message}`)
        // Continue processing even if loyalty points fail
      }
    }

    // Send order delivered email
    if (updatedOrder.user?.email) {
      try {
        await sendOrderDeliveredEmail(
          updatedOrder.user.email,
          {
            firstName: updatedOrder.user.firstName,
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            reviewUrl: `${process.env.FRONTEND_URL || "https://example.com"}/review/${updatedOrder.id}`,
            orderUrl: `${process.env.FRONTEND_URL || "https://example.com"}/orders/${updatedOrder.id}`,
            storeName: process.env.STORE_NAME || "Our Store",
            year: new Date().getFullYear(),
          },
          'en', // TODO: Get user's preferred language
          requestId,
        )
        logger.info(`Order delivered email sent for order ${orderId}`)
      } catch (emailError: any) {
        logger.error(`Error sending order delivered email: ${emailError.message}`)
        // Continue processing even if email fails
      }
    }

    // Clear cache
    await clearOrderCache(orderId, updatedOrder.userId)

    logger.info(`Order completion processed successfully for order ${orderId}`)
    return updatedOrder
  } catch (error: any) {
    logger.error(`Error processing order completion: ${error.message}`)
    throw error
  }
}

/**
 * Update order to paid status
 * @param orderId Order ID
 * @param paymentResult Payment result details
 * @param requestId Request ID for logging
 * @returns Updated order
 */
export const updateOrderToPaid = async (
  orderId: string,
  paymentResult: {
    id: string
    status: string
    update_time: string
    email_address?: string
    amount?: number
    currency?: string
    gateway?: string
  },
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'default')
  logger.info(`Updating order ${orderId} to paid status`)

  try {
    // Get order with full details
    const order = await getOrderById(orderId, requestId)

    if (!order) {
      throw new ApiError("Order not found", 404)
    }

    // Check if order is already paid
    if (order.paymentStatus === 'COMPLETED') {
      logger.info(`Order ${orderId} is already marked as paid`)
      return order
    }

    // Use transaction to ensure data consistency
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Create payment record
      await tx.payment.create({
        data: {
          orderId,
          amount: paymentResult.amount || order.total,
          currency: paymentResult.currency || order.currency,
          status: 'COMPLETED',
          paymentMethod: paymentResult.gateway || 'unknown',
          paymentReference: paymentResult.id,
          transactionId: paymentResult.id,
          gatewayResponse: paymentResult,
          processedAt: new Date(),
        },
      })

      // Update order payment details
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'COMPLETED',
          paymentMethod: paymentResult.gateway || 'unknown',
          paymentReference: paymentResult.id,
          status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  images: true,
                },
              },
              productVariant: {
                select: {
                  id: true,
                  sku: true,
                  price: true,
                  attributes: true,
                },
              },
            },
          },
        },
      })

      return updated
    })

    // Process inventory (placeholder for future inventory service)
    try {
      // await processOrderInventory(orderId, requestId)
      logger.info(`Inventory processing skipped for order ${orderId} - service not yet implemented`)
    } catch (inventoryError: any) {
      logger.error(`Error processing inventory: ${inventoryError.message}`)
      // Continue processing even if inventory fails
    }

    // Process loyalty points if order has a user
    if (updatedOrder.userId) {
      try {
        await loyaltyService.processOrderPoints(orderId, requestId)
        logger.info(`Loyalty points processed for order ${orderId}`)
      } catch (loyaltyError: any) {
        logger.error(`Error processing loyalty points: ${loyaltyError.message}`)
        // Continue processing even if loyalty points fail
      }
    }

    // Send order confirmation email
    if (updatedOrder.user?.email) {
      try {
        // Format order items for email
        const formattedItems = updatedOrder.items.map((item: any) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          image: item.product.images?.[0]?.url,
        }))

        await sendOrderConfirmationEmail(
          updatedOrder.user.email,
          {
            firstName: updatedOrder.user.firstName,
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            orderDate: updatedOrder.createdAt.toLocaleDateString(),
            orderItems: formattedItems,
            subtotal: Number(updatedOrder.subtotal),
            taxAmount: Number(updatedOrder.taxAmount),
            shippingAmount: Number(updatedOrder.shippingAmount),
            total: Number(updatedOrder.total),
            shippingAddress: updatedOrder.shippingAddress,
            orderUrl: `${process.env.FRONTEND_URL || "https://example.com"}/orders/${updatedOrder.id}`,
            storeName: process.env.STORE_NAME || "Our Store",
            year: new Date().getFullYear(),
          },
          'en', // TODO: Get user's preferred language
          requestId,
        )
        logger.info(`Order confirmation email sent for order ${orderId}`)
      } catch (emailError: any) {
        logger.error(`Error sending order confirmation email: ${emailError.message}`)
        // Continue processing even if email fails
      }
    }

    // Clear cache
    await clearOrderCache(orderId, updatedOrder.userId)

    logger.info(`Order payment processing completed successfully for order ${orderId}`)
    return updatedOrder
  } catch (error: any) {
    logger.error(`Error updating order to paid: ${error.message}`)
    throw error
  }
}

/**
 * Update order status
 * @param orderId Order ID
 * @param status New status
 * @param requestId Request ID for logging
 * @returns Updated order
 */
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'default')
  logger.info(`Updating order ${orderId} status to ${status}`)

  try {
    // Get current order
    const order = await getOrderById(orderId, requestId)

    if (!order) {
      throw new ApiError("Order not found", 404)
    }

    // Validate status transition
    if (!isValidStatusTransition(order.status, status)) {
      throw new ApiError(
        `Invalid status transition from ${order.status} to ${status}`,
        400
      )
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as OrderStatus,
        updatedAt: new Date(),
        // Set specific timestamps based on status
        ...(status === 'SHIPPED' && { shippedAt: new Date() }),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
        ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    })

    // Clear cache
    await clearOrderCache(orderId, updatedOrder.userId)

    // Handle specific status changes
    if (status === 'DELIVERED') {
      // Process order completion
      return await processOrderCompletion(orderId, requestId)
    }

    logger.info(`Order status updated successfully for order ${orderId}`)
    return updatedOrder
  } catch (error: any) {
    logger.error(`Error updating order status: ${error.message}`)
    throw error
  }
}

/**
 * Get user order history
 * @param userId User ID
 * @param params Query parameters
 * @param requestId Request ID for logging
 * @returns User order history
 */
export const getUserOrderHistory = async (
  userId: string,
  params: {
    page?: number
    limit?: number
    status?: string
    dateFrom?: Date
    dateTo?: Date
  } = {},
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'default')
  logger.info(`Getting order history for user ${userId}`)

  const { page = 1, limit = 10, status, dateFrom, dateTo } = params

  // Try to get from cache
  const cacheKey = `order:history:${userId}:${JSON.stringify(params)}`
  const cachedHistory = await getCache<any>(cacheKey)

  if (cachedHistory) {
    logger.info(`Retrieved order history from cache for user ${userId}`)
    return cachedHistory
  }

  try {
    // Build where clause
    const where: Prisma.OrderWhereInput = {
      userId,
    }

    if (status) {
      where.status = status as any
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = dateFrom
      if (dateTo) where.createdAt.lte = dateTo
    }

    // Calculate pagination
    const skip = (page - 1) * limit
    const take = limit

    // Get orders and total count
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                },
              },
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    const result = {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }

    // Cache the result
    await setCache(cacheKey, result, CACHE_TTL.ORDER_HISTORY)

    return result
  } catch (error: any) {
    logger.error(`Error getting user order history: ${error.message}`)
    throw error
  }
}

/**
 * Get order statistics
 * @param params Query parameters
 * @param requestId Request ID for logging
 * @returns Order statistics
 */
export const getOrderStatistics = async (
  params: {
    userId?: string
    vendorId?: string
    dateFrom?: Date
    dateTo?: Date
    period?: 'day' | 'week' | 'month' | 'year'
  } = {},
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Getting order statistics with params:`, params)

  const { userId, vendorId, dateFrom, dateTo, period = 'month' } = params

  // Try to get from cache
  const cacheKey = `order:statistics:${JSON.stringify(params)}`
  const cachedStats = await getCache<any>(cacheKey)

  if (cachedStats) {
    logger.info('Retrieved order statistics from cache')
    return cachedStats
  }

  try {
    // Build where clause
    const where: Prisma.OrderWhereInput = {}

    if (userId) where.userId = userId
    if (vendorId) where.vendorId = vendorId

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = dateFrom
      if (dateTo) where.createdAt.lte = dateTo
    }

    // Get basic statistics
    const [
      totalOrders,
      totalRevenue,
      ordersByStatus,
      averageOrderValue,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: 'COMPLETED' },
        _sum: { total: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: 'COMPLETED' },
        _avg: { total: true },
      }),
    ])

    // Get revenue by period
    const revenueByPeriod = await prisma.order.groupBy({
      by: ['createdAt'],
      where: { ...where, paymentStatus: 'COMPLETED' },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    // Format revenue by period data
    const formattedRevenueData = revenueByPeriod.map(item => ({
      date: item.createdAt.toISOString().split('T')[0],
      revenue: Number(item._sum.total) || 0,
      orders: item._count.id,
    }))

    // Format orders by status
    const formattedOrdersByStatus = ordersByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id
      return acc
    }, {} as Record<string, number>)

    const result = {
      totalOrders,
      totalRevenue: Number(totalRevenue._sum.total) || 0,
      averageOrderValue: Number(averageOrderValue._avg.total) || 0,
      ordersByStatus: formattedOrdersByStatus,
      revenueByPeriod: formattedRevenueData,
      period: {
        start: dateFrom,
        end: dateTo,
      },
    }

    // Cache the result
    await setCache(cacheKey, result, CACHE_TTL.ORDER_STATISTICS)

    return result
  } catch (error: any) {
    logger.error(`Error getting order statistics: ${error.message}`)
    throw error
  }
}

/**
 * Cancel order
 * @param orderId Order ID
 * @param reason Cancellation reason
 * @param requestId Request ID for logging
 * @returns Updated order
 */
export const cancelOrder = async (
  orderId: string,
  reason?: string,
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Cancelling order ${orderId}`)

  try {
    // Get current order
    const order = await getOrderById(orderId, requestId)

    if (!order) {
      throw new ApiError("Order not found", 404)
    }

    // Check if order can be cancelled
    if (!isValidStatusTransition(order.status, 'CANCELLED')) {
      throw new ApiError(
        `Order cannot be cancelled from status ${order.status}`,
        400
      )
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    })

    // Clear cache
    await clearOrderCache(orderId, updatedOrder.userId)

    logger.info(`Order cancelled successfully: ${orderId}`)
    return updatedOrder
  } catch (error: any) {
    logger.error(`Error cancelling order: ${error.message}`)
    throw error
  }
}

/**
 * Placeholder for inventory service integration
 * This will be implemented when inventory service is provided
 */
export const processOrderInventory = async (orderId: string, requestId?: string): Promise<void> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Processing inventory for order ${orderId} - placeholder implementation`)
  
  // TODO: Implement when inventory service is available
  // This should:
  // 1. Reserve inventory items
  // 2. Update stock quantities
  // 3. Handle out-of-stock scenarios
  // 4. Create inventory movement records
}
