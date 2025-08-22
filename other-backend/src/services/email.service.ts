import nodemailer from "nodemailer"
import fs from "fs"
import path from "path"
import Handlebars from "handlebars"
import { createRequestLogger } from "../utils/logger"
import { translateEmail } from "../utils/translate"
import { ApiError } from "../utils/api-error"
import { getCache, setCache } from "../config/redis"
import prisma from "../database/client"

// Email templates directory
const TEMPLATES_DIR = path.join(process.cwd(), "src/templates")

// Email queue key in Redis
const EMAIL_QUEUE_KEY = "email:queue"

// Cache TTL in seconds
const CACHE_TTL = {
  EMAIL_TEMPLATES: 3600, // 1 hour
  EMAIL_SETTINGS: 1800, // 30 minutes
}

// Email types
export enum EmailType {
  WELCOME = "welcome",
  ORDER_CONFIRMATION = "order-confirmation",
  ORDER_SHIPPED = "order-shipped",
  ORDER_DELIVERED = "order-delivered",
  PASSWORD_RESET = "password-reset",
  REVIEW_REQUEST = "review-request",
  LOYALTY_POINTS_EARNED = "loyalty-points-earned",
  LOYALTY_TIER_UPGRADE = "loyalty-tier-upgrade",
  VENDOR_APPLICATION = "vendor-application",
  VENDOR_APPROVED = "vendor-approved",
  VENDOR_REJECTED = "vendor-rejected",
  PAYOUT_PROCESSED = "payout-processed",
}

// Email template interface
interface EmailTemplate {
  subject: string
  html: Handlebars.TemplateDelegate<any>
}

// Email data interface
interface EmailData {
  to: string
  subject: string
  html: string
  from?: string
  cc?: string
  bcc?: string
  attachments?: any[]
}

// Email queue item interface
interface EmailQueueItem {
  id: string
  data: EmailData
  attempts: number
  createdAt: string
  priority?: number
  scheduledFor?: string
}

/**
 * Create email transport
 * @returns Nodemailer transport
 */
const createTransport = () => {
  // Check if we're using SMTP or a service like SendGrid
  if (process.env.EMAIL_PROVIDER === "smtp") {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })
  } else {
    // Default to SendGrid
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "SendGrid",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })
  }
}

/**
 * Log email activity to database
 * @param to Recipient email
 * @param subject Email subject
 * @param status Email status
 * @param messageId Message ID
 * @param requestId Request ID for logging
 * @param error Error message if any
 */
const logEmailActivity = async (
  to: string,
  subject: string,
  status: string,
  messageId: string | null,
  requestId?: string,
  error?: string
): Promise<void> => {
  const logger = createRequestLogger(requestId)
  
  try {
    // In a real implementation, you would create an EmailLog table in your schema
    // For now, we'll just log to the application logs
    logger.info(`Email activity logged: to=${to}, subject=${subject}, status=${status}, messageId=${messageId}, error=${error}`)
    
    // You could also store this in a database table like:
    // await prisma.emailLog.create({
    //   data: {
    //     to,
    //     subject,
    //     status,
    //     messageId,
    //     error,
    //     createdAt: new Date(),
    //   },
    // })
  } catch (logError: any) {
    logger.error(`Failed to log email activity: ${logError.message}`)
    // Don't throw error to avoid breaking email flow
  }
}

/**
 * Load email template with caching
 * @param templateName Template name
 * @param language Language code
 * @returns Email template
 */
const loadTemplate = async (templateName: string, language = "en"): Promise<EmailTemplate> => {
  const logger = createRequestLogger()
  
  // Try to get from cache
  const cacheKey = `email_template:${templateName}:${language}`
  const cachedTemplate = await getCache<EmailTemplate>(cacheKey)

  if (cachedTemplate) {
    logger.info(`Retrieved email template from cache: ${templateName}`)
    return cachedTemplate
  }

  try {
    // Check if template exists
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`)
    if (!fs.existsSync(templatePath)) {
      throw new ApiError(`Email template not found: ${templateName}`, 500)
    }

    // Read template file
    const templateContent = fs.readFileSync(templatePath, "utf-8")

    // Compile template
    const template = Handlebars.compile(templateContent)

    // Get subject from translations
    const subject = translateEmail(`${templateName}.subject`, {}, language)

    const emailTemplate = {
      subject,
      html: template,
    }

    // Cache the template
    await setCache(cacheKey, emailTemplate, CACHE_TTL.EMAIL_TEMPLATES)

    return emailTemplate
  } catch (error: any) {
    throw new ApiError(`Failed to load email template: ${error.message}`, 500)
  }
}

/**
 * Send email
 * @param to Recipient email
 * @param subject Email subject
 * @param html Email HTML content
 * @param options Additional email options
 * @param requestId Request ID for logging
 * @returns Email send result
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  options: {
    from?: string
    cc?: string
    bcc?: string
    attachments?: any[]
  } = {},
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending email to: ${to}, subject: ${subject}`)

  try {
    const transport = createTransport()

    const mailOptions = {
      from: options.from || process.env.EMAIL_FROM || "noreply@example.com",
      to,
      subject,
      html,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    }

    const result = await transport.sendMail(mailOptions)
    logger.info(`Email sent successfully to: ${to}, messageId: ${result.messageId}`)

    // Log email activity to database
    await logEmailActivity(to, subject, 'sent', result.messageId, requestId)

    return result
  } catch (error: any) {
    logger.error(`Failed to send email: ${error.message}`)
    
    // Log email failure to database
    await logEmailActivity(to, subject, 'failed', null, requestId, error.message)
    
    throw new ApiError(`Failed to send email: ${error.message}`, 500)
  }
}

/**
 * Queue email for sending
 * @param to Recipient email
 * @param subject Email subject
 * @param html Email HTML content
 * @param options Additional email options
 * @param requestId Request ID for logging
 * @returns Email queue ID
 */
export const queueEmail = async (
  to: string,
  subject: string,
  html: string,
  options: {
    from?: string
    cc?: string
    bcc?: string
    attachments?: any[]
    priority?: number
    scheduledFor?: Date
  } = {},
  requestId?: string,
): Promise<string> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Queueing email to: ${to}, subject: ${subject}`)

  try {
    // Create email data
    const emailData: EmailData = {
      to,
      subject,
      html,
      from: options.from || process.env.EMAIL_FROM || "noreply@example.com",
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    }

    // Create queue item
    const queueItem: EmailQueueItem = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      data: emailData,
      attempts: 0,
      createdAt: new Date().toISOString(),
      priority: options.priority || 5,
      scheduledFor: options.scheduledFor?.toISOString(),
    }

    // Add to queue with priority
    const queueKey = options.priority && options.priority < 5 
      ? `${EMAIL_QUEUE_KEY}:high` 
      : EMAIL_QUEUE_KEY

    await setCache(queueKey, JSON.stringify(queueItem), 0) // No expiry for queue items
    logger.info(`Email queued successfully, id: ${queueItem.id}`)

    return queueItem.id
  } catch (error: any) {
    logger.error(`Failed to queue email: ${error.message}`)
    throw new ApiError(`Failed to queue email: ${error.message}`, 500)
  }
}

/**
 * Process email queue
 * @param limit Number of emails to process
 * @param requestId Request ID for logging
 * @returns Number of emails processed
 */
export const processEmailQueue = async (limit = 10, requestId?: string): Promise<number> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Processing email queue, limit: ${limit}`)

  let processed = 0

  try {
    // Process high priority emails first
    const highPriorityProcessed = await processQueueByPriority(`${EMAIL_QUEUE_KEY}:high`, limit, requestId)
    processed += highPriorityProcessed

    // Process remaining capacity with normal priority
    if (processed < limit) {
      const normalProcessed = await processQueueByPriority(EMAIL_QUEUE_KEY, limit - processed, requestId)
      processed += normalProcessed
    }

    logger.info(`Email queue processing completed, processed: ${processed}`)
    return processed
  } catch (error: any) {
    logger.error(`Error processing email queue: ${error.message}`)
    throw new ApiError(`Error processing email queue: ${error.message}`, 500)
  }
}

/**
 * Process queue by priority
 * @param queueKey Queue key
 * @param limit Processing limit
 * @param requestId Request ID for logging
 * @returns Number of emails processed
 */
const processQueueByPriority = async (queueKey: string, limit: number, requestId?: string): Promise<number> => {
  const logger = createRequestLogger(requestId)
  let processed = 0

  for (let i = 0; i < limit; i++) {
    // Get next email from queue
    const queueItemJson = await getCache<string>(queueKey)

    // If queue is empty, stop processing
    if (!queueItemJson) {
      break
    }

    // Parse queue item
    const queueItem: EmailQueueItem = JSON.parse(queueItemJson)
    
    // Check if email is scheduled for future
    if (queueItem.scheduledFor && new Date(queueItem.scheduledFor) > new Date()) {
      // Re-queue for later
      await setCache(queueKey, queueItemJson, 0)
      continue
    }

    logger.info(`Processing email from queue, id: ${queueItem.id}`)

    try {
      // Send email
      await sendEmail(
        queueItem.data.to,
        queueItem.data.subject,
        queueItem.data.html,
        {
          from: queueItem.data.from,
          cc: queueItem.data.cc,
          bcc: queueItem.data.bcc,
          attachments: queueItem.data.attachments,
        },
        requestId,
      )

      // Increment processed count
      processed++
    } catch (error: any) {
      logger.error(`Failed to process email from queue, id: ${queueItem.id}, error: ${error.message}`)

      // Increment attempts
      queueItem.attempts++

      // If max attempts reached, log and continue
      if (queueItem.attempts >= 3) {
        logger.error(`Max attempts reached for email, id: ${queueItem.id}, dropping from queue`)
        await logEmailActivity(
          queueItem.data.to, 
          queueItem.data.subject, 
          'failed_max_attempts', 
          null, 
          requestId, 
          error.message
        )
      } else {
        // Otherwise, add back to queue
        logger.info(`Re-queueing email, id: ${queueItem.id}, attempts: ${queueItem.attempts}`)
        await setCache(queueKey, JSON.stringify(queueItem), 0)
      }
    }
  }

  return processed
}

/**
 * Get email queue length
 * @param requestId Request ID for logging
 * @returns Queue length
 */
export const getEmailQueueLength = async (requestId?: string): Promise<{ total: number; high: number; normal: number }> => {
  const logger = createRequestLogger(requestId)

  try {
    // Get queue lengths (this is a simplified implementation)
    // In a real Redis implementation, you'd use LLEN command
    const highPriorityQueue = await getCache<string>(`${EMAIL_QUEUE_KEY}:high`)
    const normalQueue = await getCache<string>(EMAIL_QUEUE_KEY)
    
    const high = highPriorityQueue ? 1 : 0 // Simplified count
    const normal = normalQueue ? 1 : 0 // Simplified count
    const total = high + normal

    logger.info(`Email queue length - Total: ${total}, High: ${high}, Normal: ${normal}`)
    return { total, high, normal }
  } catch (error: any) {
    logger.error(`Error getting email queue length: ${error.message}`)
    throw new ApiError(`Error getting email queue length: ${error.message}`, 500)
  }
}

/**
 * Clear email queue
 * @param requestId Request ID for logging
 * @returns Number of emails removed
 */
export const clearEmailQueue = async (requestId?: string): Promise<number> => {
  const logger = createRequestLogger(requestId)
  logger.info("Clearing email queue")

  try {
    // Clear both queues
    await Promise.all([
      setCache(EMAIL_QUEUE_KEY, null, 1),
      setCache(`${EMAIL_QUEUE_KEY}:high`, null, 1),
    ])

    logger.info("Email queue cleared")
    return 0 // Simplified return
  } catch (error: any) {
    logger.error(`Error clearing email queue: ${error.message}`)
    throw new ApiError(`Error clearing email queue: ${error.message}`, 500)
  }
}

/**
 * Send welcome email
 * @param to Recipient email
 * @param data Template data
 * @param language Language code
 * @param requestId Request ID for logging
 * @returns Email send result
 */
export const sendWelcomeEmail = async (
  to: string,
  data: {
    firstName: string
    storeName: string
    year: number
    storeUrl: string
  },
  language = "en",
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending welcome email to: ${to}`)

  try {
    // Load template
    const template = await loadTemplate(EmailType.WELCOME, language)

    // Compile template with data
    const html = template.html({
      ...data,
      welcomeMessage: translateEmail("welcome.message", {}, language),
      benefits: translateEmail("welcome.benefits", {}, language),
      benefit1: translateEmail("welcome.benefit1", {}, language),
      benefit2: translateEmail("welcome.benefit2", {}, language),
      benefit3: translateEmail("welcome.benefit3", {}, language),
      benefit4: translateEmail("welcome.benefit4", {}, language),
      support: translateEmail("welcome.support", {}, language),
      cta: translateEmail("welcome.cta", {}, language),
    })

    // Get subject from translations
    const subject = translateEmail("welcome.subject", { storeName: data.storeName }, language)

    // Queue email
    return queueEmail(to, subject, html, {}, requestId)
  } catch (error: any) {
    logger.error(`Failed to send welcome email: ${error.message}`)
    throw error
  }
}

/**
 * Send order confirmation email
 * @param to Recipient email
 * @param data Template data
 * @param language Language code
 * @param requestId Request ID for logging
 * @returns Email send result
 */
export const sendOrderConfirmationEmail = async (
  to: string,
  data: {
    firstName: string
    orderId: string
    orderNumber: string
    orderDate: string
    orderItems: any[]
    subtotal: number
    taxAmount: number
    shippingAmount: number
    total: number
    shippingAddress: any
    orderUrl: string
    storeName: string
    year: number
  },
  language = "en",
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending order confirmation email to: ${to}, order ID: ${data.orderId}`)

  try {
    // Load template
    const template = await loadTemplate(EmailType.ORDER_CONFIRMATION, language)

    // Compile template with data
    const html = template.html({
      ...data,
      greeting: translateEmail("orderConfirmation.greeting", { firstName: data.firstName }, language),
      message: translateEmail("orderConfirmation.message", {}, language),
      orderDetails: translateEmail("orderConfirmation.orderDetails", {}, language),
      orderNumber: translateEmail("orderConfirmation.orderNumber", {}, language),
      orderDate: translateEmail("orderConfirmation.orderDate", {}, language),
      itemsOrdered: translateEmail("orderConfirmation.itemsOrdered", {}, language),
      product: translateEmail("orderConfirmation.product", {}, language),
      quantity: translateEmail("orderConfirmation.quantity", {}, language),
      price: translateEmail("orderConfirmation.price", {}, language),
      total: translateEmail("orderConfirmation.total", {}, language),
      subtotal: translateEmail("orderConfirmation.subtotal", {}, language),
      tax: translateEmail("orderConfirmation.tax", {}, language),
      shipping: translateEmail("orderConfirmation.shipping", {}, language),
      totalAmount: translateEmail("orderConfirmation.totalAmount", {}, language),
      shippingAddress: translateEmail("orderConfirmation.shippingAddress", {}, language),
      trackingMessage: translateEmail("orderConfirmation.trackingMessage", {}, language),
      cta: translateEmail("orderConfirmation.cta", {}, language),
    })

    // Get subject from translations
    const subject = translateEmail("orderConfirmation.subject", { orderId: data.orderId }, language)

    // Queue email
    return queueEmail(to, subject, html, {}, requestId)
  } catch (error: any) {
    logger.error(`Failed to send order confirmation email: ${error.message}`)
    throw error
  }
}

/**
 * Send order delivered email
 * @param to Recipient email
 * @param data Template data
 * @param language Language code
 * @param requestId Request ID for logging
 * @returns Email send result
 */
export const sendOrderDeliveredEmail = async (
  to: string,
  data: {
    firstName: string
    orderId: string
    orderNumber?: string
    reviewUrl: string
    orderUrl: string
    storeName: string
    year: number
  },
  language = "en",
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending order delivered email to: ${to}, order ID: ${data.orderId}`)

  try {
    // Load template
    const template = await loadTemplate(EmailType.ORDER_DELIVERED, language)

    // Compile template with data
    const html = template.html({
      ...data,
      greeting: translateEmail("orderDelivered.greeting", { firstName: data.firstName }, language),
      message: translateEmail("orderDelivered.message", {}, language),
      reviewMessage: translateEmail("orderDelivered.reviewMessage", {}, language),
      reviewCta: translateEmail("orderDelivered.reviewCta", {}, language),
      orderCta: translateEmail("orderDelivered.orderCta", {}, language),
      support: translateEmail("orderDelivered.support", {}, language),
    })

    // Get subject from translations
    const subject = translateEmail("orderDelivered.subject", { orderId: data.orderId }, language)

    // Queue email
    return queueEmail(to, subject, html, {}, requestId)
  } catch (error: any) {
    logger.error(`Failed to send order delivered email: ${error.message}`)
    throw error
  }
}

/**
 * Send order shipped email
 * @param to Recipient email
 * @param data Template data
 * @param language Language code
 * @param requestId Request ID for logging
 * @returns Email send result
 */
export const sendOrderShippedEmail = async (
  to: string,
  data: {
    firstName: string
    orderId: string
    orderNumber: string
    trackingNumber?: string
    shippingCarrier?: string
    estimatedDelivery?: string
    trackingUrl?: string
    orderUrl: string
    storeName: string
    year: number
  },
  language = "en",
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending order shipped email to: ${to}, order ID: ${data.orderId}`)

  try {
    // Load template
    const template = await loadTemplate(EmailType.ORDER_SHIPPED, language)

    // Compile template with data
    const html = template.html({
      ...data,
      greeting: translateEmail("orderShipped.greeting", { firstName: data.firstName }, language),
      message: translateEmail("orderShipped.message", { orderNumber: data.orderNumber }, language),
      trackingInfo: translateEmail("orderShipped.trackingInfo", {}, language),
      trackingNumber: translateEmail("orderShipped.trackingNumber", {}, language),
      carrier: translateEmail("orderShipped.carrier", {}, language),
      estimatedDelivery: translateEmail("orderShipped.estimatedDelivery", {}, language),
      trackingInstructions: translateEmail("orderShipped.trackingInstructions", {}, language),
      orderCta: translateEmail("orderShipped.orderCta", {}, language),
      support: translateEmail("orderShipped.support", {}, language),
    })

    // Get subject from translations
    const subject = translateEmail("orderShipped.subject", { orderNumber: data.orderNumber }, language)

    // Queue email
    return queueEmail(to, subject, html, {}, requestId)
  } catch (error: any) {
    logger.error(`Failed to send order shipped email: ${error.message}`)
    throw error
  }
}

/**
 * Send password reset email
 * @param to Recipient email
 * @param data Template data
 * @param language Language code
 * @param requestId Request ID for logging
 * @returns Email send result
 */
export const sendPasswordResetEmail = async (
  to: string,
  data: {
    firstName: string
    resetUrl: string
    expiryTime: string
    storeName: string
    year: number
  },
  language = "en",
  requestId?: string,
): Promise<any> => {
  const logger = createRequestLogger(requestId)
  logger.info(`Sending password reset email to: ${to}`)

  try {
    // Load template
    const template = await loadTemplate(EmailType.PASSWORD_RESET, language)

    // Compile template with data
    const html = template.html({
      ...data,
      greeting: translateEmail("passwordReset.greeting", { firstName: data.firstName }, language),
      message: translateEmail("passwordReset.message", {}, language),
      instruction: translateEmail("passwordReset.instruction", { expiryTime: data.expiryTime }, language),
      cta: translateEmail("passwordReset.cta", {}, language),
      warning: translateEmail("passwordReset.warning", {}, language),
      alternative: translateEmail("passwordReset.alternative", {}, language),
    })

    // Get subject from translations
    const subject = translateEmail("passwordReset.subject", {}, language)

    // Send email immediately (don't queue password reset emails)
    return sendEmail(to, subject, html, {}, requestId)
  } catch (error: any) {
    logger.error(`Failed to send password reset email: ${error.message}`)
    throw error
  }
}
