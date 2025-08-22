import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import * as emailService from './email.service'
import { sendOrderShippedEmail } from './email.service'

/**
 * Send loyalty notification
 * @param userId User ID
 * @param type Notification type
 * @param data Notification data
 * @param requestId Request ID for logging
 * @returns Result of sending notification
 */
export const sendLoyaltyNotification = async (
  userId: string,
  type: "points_earned" | "points_expired" | "tier_upgrade" | "reward_redeemed" | "reward_approved" | "reward_rejected",
  data: Record<string, any>,
  requestId?: string,
): Promise<boolean> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending loyalty notification of type ${type} to user ${userId}`)

  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!user || !user.email) {
      logger.warn(`User ${userId} not found or has no email`)
      return false
    }

    // Define notification templates
    const templates: Record<string, { subject: string; template: (data: any) => string }> = {
      points_earned: {
        subject: "You've Earned Loyalty Points!",
        template: (data) => `
          <h1>Congratulations, ${user.firstName || "Valued Customer"}!</h1>
          <p>You've earned <strong>${data.points}</strong> loyalty points.</p>
          <p>${data.description || ""}</p>
          <p>Your current points balance is <strong>${data.currentPoints}</strong>.</p>
          <p>Thank you for your loyalty!</p>
        `,
      },
      points_expired: {
        subject: "Your Loyalty Points Have Expired",
        template: (data) => `
          <h1>Hello, ${user.firstName || "Valued Customer"}</h1>
          <p>We wanted to let you know that <strong>${data.points}</strong> of your loyalty points have expired.</p>
          <p>Your current points balance is <strong>${data.currentPoints}</strong>.</p>
          <p>Remember to use your points before they expire!</p>
        `,
      },
      tier_upgrade: {
        subject: "Congratulations on Your Tier Upgrade!",
        template: (data) => `
          <h1>Congratulations, ${user.firstName || "Valued Customer"}!</h1>
          <p>We're excited to inform you that you've been upgraded to our <strong>${data.tierName}</strong> tier!</p>
          <p>You now have access to exclusive benefits including:</p>
          <ul>
            ${data.benefits.map((benefit: string) => `<li>${benefit}</li>`).join("")}
          </ul>
          <p>Thank you for your continued loyalty. Your current points balance is <strong>${
            data.currentPoints
          }</strong>.</p>
          <p>Keep shopping to enjoy even more rewards!</p>
        `,
      },
      reward_redeemed: {
        subject: "Reward Redemption Confirmation",
        template: (data) => `
          <h1>Reward Redemption Confirmation</h1>
          <p>Dear ${user.firstName || "Customer"},</p>
          <p>Thank you for redeeming your loyalty points for the following reward:</p>
          <h2>${data.rewardName}</h2>
          <p>${data.rewardDescription}</p>
          <p>Your redemption code is: <strong>${data.code}</strong></p>
          ${data.expiresAt ? `<p>This code will expire on ${new Date(data.expiresAt).toLocaleDateString()}.</p>` : ""}
          <p>You now have ${data.currentPoints} points remaining in your account.</p>
          <p>Thank you for your loyalty!</p>
        `,
      },
      reward_approved: {
        subject: "Your Reward Redemption Has Been Approved",
        template: (data) => `
          <h1>Reward Redemption Approved</h1>
          <p>Dear ${user.firstName || "Customer"},</p>
          <p>We're pleased to inform you that your redemption for <strong>${data.rewardName}</strong> has been approved!</p>
          <p>Your redemption code is: <strong>${data.code}</strong></p>
          ${data.expiresAt ? `<p>This code will expire on ${new Date(data.expiresAt).toLocaleDateString()}.</p>` : ""}
          <p>Thank you for your loyalty!</p>
        `,
      },
      reward_rejected: {
        subject: "Your Reward Redemption Has Been Rejected",
        template: (data) => `
          <h1>Reward Redemption Rejected</h1>
          <p>Dear ${user.firstName || "Customer"},</p>
          <p>We regret to inform you that your redemption for <strong>${data.rewardName}</strong> has been rejected.</p>
          ${data.notes ? `<p>Reason: ${data.notes}</p>` : ""}
          <p>Your points have been refunded to your account. Your current points balance is <strong>${
            data.currentPoints
          }</strong>.</p>
          <p>If you have any questions, please contact our customer support.</p>
        `,
      },
    }

    // Get template
    const template = templates[type]
    if (!template) {
      logger.error(`Notification template not found for type ${type}`)
      return false
    }

    // Send email
    await emailService.sendEmail(
      user.email,
      template.subject,
      template.template(data),
      {},
      requestId,
    )

    return true
  } catch (error: any) {
    logger.error(`Error sending loyalty notification: ${error.message}`)
    return false
  }
}

/**
 * Send batch loyalty notifications
 * @param notifications Array of notifications
 * @param requestId Request ID for logging
 * @returns Results of batch processing
 */
export const sendBatchLoyaltyNotifications = async (
  notifications: Array<{
    userId: string
    type:
      | "points_earned"
      | "points_expired"
      | "tier_upgrade"
      | "reward_redeemed"
      | "reward_approved"
      | "reward_rejected"
    data: Record<string, any>
  }>,
  requestId?: string,
): Promise<{
  success: boolean
  results: Array<{
    userId: string
    type: string
    success: boolean
    error?: string
  }>
}> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending batch loyalty notifications for ${notifications.length} notifications`)

  const results = []
  let hasErrors = false

  // Process notifications in chunks to avoid overwhelming the email service
  const CHUNK_SIZE = 20
  const chunks = []

  for (let i = 0; i < notifications.length; i += CHUNK_SIZE) {
    chunks.push(notifications.slice(i, i + CHUNK_SIZE))
  }

  for (const chunk of chunks) {
    // Process chunk in parallel
    const chunkResults = await Promise.all(
      chunk.map(async (notification) => {
        try {
          const success = await sendLoyaltyNotification(
            notification.userId,
            notification.type,
            notification.data,
            requestId,
          )

          return {
            userId: notification.userId,
            type: notification.type,
            success,
          }
        } catch (error: any) {
          hasErrors = true
          return {
            userId: notification.userId,
            type: notification.type,
            success: false,
            error: error.message,
          }
        }
      }),
    )

    results.push(...chunkResults)
  }

  return {
    success: !hasErrors,
    results,
  }
}

/**
 * Send order notification
 * @param userId User ID
 * @param type Notification type
 * @param orderData Order data
 * @param requestId Request ID for logging
 * @returns Result of sending notification
 */
export const sendOrderNotification = async (
  userId: string,
  type: "order_confirmed" | "order_shipped" | "order_delivered" | "order_cancelled",
  orderData: Record<string, any>,
  requestId?: string,
): Promise<boolean> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending order notification of type ${type} to user ${userId}`)

  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!user || !user.email) {
      logger.warn(`User ${userId} not found or has no email`)
      return false
    }

    // Send appropriate email based on type
    switch (type) {
      case "order_confirmed":
        await emailService.sendOrderConfirmationEmail(
          user.email,
          {
            firstName: user.firstName,
            orderId: orderData.orderId,
            orderNumber: orderData.orderNumber,
            orderDate: orderData.orderDate,
            orderItems: orderData.orderItems,
            subtotal: orderData.subtotal,
            taxAmount: orderData.taxAmount,
            shippingAmount: orderData.shippingAmount,
            total: orderData.total,
            shippingAddress: orderData.shippingAddress,
            orderUrl: orderData.orderUrl,
            storeName: process.env.STORE_NAME || "Our Store",
            year: new Date().getFullYear(),
          },
          "en",
          requestId,
        )
        break

      case "order_shipped":
        await sendOrderShippedEmail(
          user.email,
          {
            firstName: user.firstName,
            orderId: orderData.orderId,
            orderNumber: orderData.orderNumber,
            trackingNumber: orderData.trackingNumber,
            shippingCarrier: orderData.shippingCarrier,
            estimatedDelivery: orderData.estimatedDelivery,
            trackingUrl: orderData.trackingUrl,
            orderUrl: orderData.orderUrl,
            storeName: process.env.STORE_NAME || "Our Store",
            year: new Date().getFullYear(),
          },
          "en",
          requestId,
        )
        break

      case "order_delivered":
        await emailService.sendOrderDeliveredEmail(
          user.email,
          {
            firstName: user.firstName,
            orderId: orderData.orderId,
            reviewUrl: orderData.reviewUrl,
            orderUrl: orderData.orderUrl,
            storeName: process.env.STORE_NAME || "Our Store",
            year: new Date().getFullYear(),
          },
          "en",
          requestId,
        )
        break

      case "order_cancelled":
        // Send generic email for cancelled orders
        await emailService.sendEmail(
          user.email,
          "Order Cancelled",
          `
            <h1>Order Cancelled</h1>
            <p>Dear ${user.firstName || "Customer"},</p>
            <p>Your order ${orderData.orderId} has been cancelled.</p>
            <p>If you have any questions, please contact our customer support.</p>
            <p>Thank you for your understanding.</p>
          `,
          {},
          requestId,
        )
        break

      default:
        logger.error(`Unknown order notification type: ${type}`)
        return false
    }

    return true
  } catch (error: any) {
    logger.error(`Error sending order notification: ${error.message}`)
    return false
  }
}

/**
 * Send welcome notification
 * @param userId User ID
 * @param userData User data
 * @param requestId Request ID for logging
 * @returns Result of sending notification
 */
export const sendWelcomeNotification = async (
  userId: string,
  userData: Record<string, any>,
  requestId?: string,
): Promise<boolean> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending welcome notification to user ${userId}`)

  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!user || !user.email) {
      logger.warn(`User ${userId} not found or has no email`)
      return false
    }

    // Send welcome email
    await emailService.sendWelcomeEmail(
      user.email,
      {
        firstName: user.firstName,
        storeName: process.env.STORE_NAME || "Our Store",
        year: new Date().getFullYear(),
        storeUrl: process.env.FRONTEND_URL || "https://example.com",
      },
      "en",
      requestId,
    )

    return true
  } catch (error: any) {
    logger.error(`Error sending welcome notification: ${error.message}`)
    return false
  }
}

/**
 * Send password reset notification
 * @param userId User ID
 * @param resetData Reset data
 * @param requestId Request ID for logging
 * @returns Result of sending notification
 */
export const sendPasswordResetNotification = async (
  userId: string,
  resetData: {
    resetUrl: string
    expiryTime: string
  },
  requestId?: string,
): Promise<boolean> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending password reset notification to user ${userId}`)

  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!user || !user.email) {
      logger.warn(`User ${userId} not found or has no email`)
      return false
    }

    // Send password reset email
    await emailService.sendPasswordResetEmail(
      user.email,
      {
        firstName: user.firstName,
        resetUrl: resetData.resetUrl,
        expiryTime: resetData.expiryTime,
        storeName: process.env.STORE_NAME || "Our Store",
        year: new Date().getFullYear(),
      },
      "en",
      requestId,
    )

    return true
  } catch (error: any) {
    logger.error(`Error sending password reset notification: ${error.message}`)
    return false
  }
}

/**
 * Create in-app notification
 * @param userId User ID
 * @param title Notification title
 * @param message Notification message
 * @param type Notification type
 * @param data Additional data
 * @param requestId Request ID for logging
 * @returns Created notification
 */
export const createInAppNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO',
  data?: Record<string, any>,
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Creating in-app notification for user ${userId}`)

  try {
    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        data: data || {},
        isRead: false,
      },
    })

    return notification
  } catch (error: any) {
    logger.error(`Error creating in-app notification: ${error.message}`)
    throw new ApiError(`Failed to create notification: ${error.message}`, 500)
  }
}

/**
 * Get user notifications
 * @param userId User ID
 * @param options Query options
 * @param requestId Request ID for logging
 * @returns User notifications
 */
export const getUserNotifications = async (
  userId: string,
  options: {
    page?: number
    limit?: number
    unreadOnly?: boolean
  } = {},
  requestId?: string,
): Promise<{
  notifications: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Getting notifications for user ${userId}`)

  try {
    const { page = 1, limit = 20, unreadOnly = false } = options

    // Build where clause
    const where: Prisma.NotificationWhereInput = { userId }
    if (unreadOnly) {
      where.isRead = false
    }

    // Calculate skip value
    const skip = (page - 1) * limit

    // Get notifications and total count
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  } catch (error: any) {
    logger.error(`Error getting user notifications: ${error.message}`)
    throw new ApiError(`Failed to get notifications: ${error.message}`, 500)
  }
}

/**
 * Mark notification as read
 * @param notificationId Notification ID
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns Updated notification
 */
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string,
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Marking notification ${notificationId} as read for user ${userId}`)

  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    if (notification.count === 0) {
      throw new ApiError("Notification not found", 404)
    }

    return notification
  } catch (error: any) {
    logger.error(`Error marking notification as read: ${error.message}`)
    throw error
  }
}

/**
 * Mark all notifications as read
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns Number of notifications marked as read
 */
export const markAllNotificationsAsRead = async (userId: string, requestId?: string): Promise<number> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Marking all notifications as read for user ${userId}`)

  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return result.count
  } catch (error: any) {
    logger.error(`Error marking all notifications as read: ${error.message}`)
    throw new ApiError(`Failed to mark notifications as read: ${error.message}`, 500)
  }
}

/**
 * Delete notification
 * @param notificationId Notification ID
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns Deleted notification
 */
export const deleteNotification = async (
  notificationId: string,
  userId: string,
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Deleting notification ${notificationId} for user ${userId}`)

  try {
    const notification = await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    })

    if (notification.count === 0) {
      throw new ApiError("Notification not found", 404)
    }

    return notification
  } catch (error: any) {
    logger.error(`Error deleting notification: ${error.message}`)
    throw error
  }
}

/**
 * Get unread notification count
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns Unread notification count
 */
export const getUnreadNotificationCount = async (userId: string, requestId?: string): Promise<number> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Getting unread notification count for user ${userId}`)

  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    })

    return count
  } catch (error: any) {
    logger.error(`Error getting unread notification count: ${error.message}`)
    throw new ApiError(`Failed to get unread notification count: ${error.message}`, 500)
  }
}
