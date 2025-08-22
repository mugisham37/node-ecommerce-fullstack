import * as cron from 'node-cron'
import { createRequestLogger } from '../utils/logger'
import * as emailService from './email.service'
import * as loyaltyService from './loyalty.service'
import * as notificationService from './notification.service'
import * as batchLoyaltyService from './batch-loyalty.service'
import prisma from '../database/client'
import { ApiError } from '../utils/api-error'

// Create logger
const logger = createRequestLogger('scheduler')

// Define cron jobs storage
const jobs: Record<string, { task: cron.ScheduledTask; description: string; lastRun?: Date }> = {}

/**
 * Initialize scheduler with all cron jobs
 */
export const initScheduler = (): void => {
  logger.info('Initializing scheduler with all cron jobs')

  try {
    // Process email queue every 5 minutes
    jobs.processEmailQueue = {
      task: cron.schedule('*/5 * * * *', async () => {
        await processEmailQueueJob()
      }),
      description: 'Process email queue every 5 minutes',
    }

    // Expire loyalty points daily at midnight
    jobs.expireLoyaltyPoints = {
      task: cron.schedule('0 0 * * *', async () => {
        await expireLoyaltyPointsJob()
      }),
      description: 'Expire old loyalty points daily at midnight',
    }

    // Award birthday bonus points daily at 8 AM
    jobs.awardBirthdayBonuses = {
      task: cron.schedule('0 8 * * *', async () => {
        await awardBirthdayBonusesJob()
      }),
      description: 'Award birthday bonus points daily at 8 AM',
    }

    // Clean up expired redemptions daily at 2 AM
    jobs.cleanupExpiredRedemptions = {
      task: cron.schedule('0 2 * * *', async () => {
        await cleanupExpiredRedemptionsJob()
      }),
      description: 'Clean up expired redemptions daily at 2 AM',
    }

    // Send weekly loyalty summary emails on Sundays at 9 AM
    jobs.sendWeeklyLoyaltySummary = {
      task: cron.schedule('0 9 * * 0', async () => {
        await sendWeeklyLoyaltySummaryJob()
      }),
      description: 'Send weekly loyalty summary emails on Sundays at 9 AM',
    }

    // Update product popularity scores daily at 3 AM
    jobs.updateProductPopularity = {
      task: cron.schedule('0 3 * * *', async () => {
        await updateProductPopularityJob()
      }),
      description: 'Update product popularity scores daily at 3 AM',
    }

    // Clean up old analytics data monthly on the 1st at 4 AM
    jobs.cleanupOldAnalytics = {
      task: cron.schedule('0 4 1 * *', async () => {
        await cleanupOldAnalyticsJob()
      }),
      description: 'Clean up old analytics data monthly on the 1st at 4 AM',
    }

    // Send abandoned cart reminders every 2 hours
    jobs.sendAbandonedCartReminders = {
      task: cron.schedule('0 */2 * * *', async () => {
        await sendAbandonedCartRemindersJob()
      }),
      description: 'Send abandoned cart reminders every 2 hours',
    }

    // Update currency exchange rates daily at 6 AM
    jobs.updateCurrencyRates = {
      task: cron.schedule('0 6 * * *', async () => {
        await updateCurrencyRatesJob()
      }),
      description: 'Update currency exchange rates daily at 6 AM',
    }

    // Generate daily reports at 5 AM
    jobs.generateDailyReports = {
      task: cron.schedule('0 5 * * *', async () => {
        await generateDailyReportsJob()
      }),
      description: 'Generate daily reports at 5 AM',
    }

    // Backup database weekly on Saturdays at 1 AM
    jobs.backupDatabase = {
      task: cron.schedule('0 1 * * 6', async () => {
        await backupDatabaseJob()
      }),
      description: 'Backup database weekly on Saturdays at 1 AM',
    }

    // Clean up temporary files daily at 1 AM
    jobs.cleanupTempFiles = {
      task: cron.schedule('0 1 * * *', async () => {
        await cleanupTempFilesJob()
      }),
      description: 'Clean up temporary files daily at 1 AM',
    }

    logger.info(`Initialized ${Object.keys(jobs).length} scheduled jobs`)
  } catch (error: any) {
    logger.error(`Error initializing scheduler: ${error.message}`)
    throw new ApiError(`Failed to initialize scheduler: ${error.message}`, 500)
  }
}

/**
 * Start all cron jobs
 */
export const startAllJobs = (): void => {
  logger.info('Starting all scheduled jobs')

  try {
    Object.keys(jobs).forEach((jobName) => {
      if (!jobs[jobName].task.getStatus()) {
        jobs[jobName].task.start()
        logger.info(`Started job: ${jobName}`)
      } else {
        logger.info(`Job already running: ${jobName}`)
      }
    })

    logger.info('All scheduled jobs started successfully')
  } catch (error: any) {
    logger.error(`Error starting jobs: ${error.message}`)
    throw new ApiError(`Failed to start jobs: ${error.message}`, 500)
  }
}

/**
 * Stop all cron jobs
 */
export const stopAllJobs = (): void => {
  logger.info('Stopping all scheduled jobs')

  try {
    Object.keys(jobs).forEach((jobName) => {
      if (jobs[jobName].task.getStatus()) {
        jobs[jobName].task.stop()
        logger.info(`Stopped job: ${jobName}`)
      } else {
        logger.info(`Job already stopped: ${jobName}`)
      }
    })

    logger.info('All scheduled jobs stopped successfully')
  } catch (error: any) {
    logger.error(`Error stopping jobs: ${error.message}`)
  }
}

/**
 * Get job status for all jobs
 * @returns Object with job status information
 */
export const getJobStatus = (): Record<string, { 
  running: boolean
  description: string
  lastRun?: Date
  nextRun?: Date
}> => {
  const status: Record<string, any> = {}

  Object.keys(jobs).forEach((jobName) => {
    const job = jobs[jobName]
    status[jobName] = {
      running: job.task.getStatus(),
      description: job.description,
      lastRun: job.lastRun,
      nextRun: job.task.getStatus() ? new Date() : undefined, // Simplified next run calculation
    }
  })

  return status
}

/**
 * Start a specific job
 * @param jobName Job name
 * @returns True if job was started, false otherwise
 */
export const startJob = (jobName: string): boolean => {
  logger.info(`Starting job: ${jobName}`)

  if (!jobs[jobName]) {
    logger.error(`Job not found: ${jobName}`)
    return false
  }

  if (jobs[jobName].task.getStatus()) {
    logger.info(`Job already running: ${jobName}`)
    return true
  }

  try {
    jobs[jobName].task.start()
    logger.info(`Started job: ${jobName}`)
    return true
  } catch (error: any) {
    logger.error(`Error starting job ${jobName}: ${error.message}`)
    return false
  }
}

/**
 * Stop a specific job
 * @param jobName Job name
 * @returns True if job was stopped, false otherwise
 */
export const stopJob = (jobName: string): boolean => {
  logger.info(`Stopping job: ${jobName}`)

  if (!jobs[jobName]) {
    logger.error(`Job not found: ${jobName}`)
    return false
  }

  if (!jobs[jobName].task.getStatus()) {
    logger.info(`Job already stopped: ${jobName}`)
    return true
  }

  try {
    jobs[jobName].task.stop()
    logger.info(`Stopped job: ${jobName}`)
    return true
  } catch (error: any) {
    logger.error(`Error stopping job ${jobName}: ${error.message}`)
    return false
  }
}

/**
 * Run a specific job immediately
 * @param jobName Job name
 * @returns True if job was run, false otherwise
 */
export const runJobNow = async (jobName: string): Promise<boolean> => {
  logger.info(`Running job now: ${jobName}`)

  if (!jobs[jobName]) {
    logger.error(`Job not found: ${jobName}`)
    return false
  }

  try {
    // Execute the job based on its name
    switch (jobName) {
      case 'processEmailQueue':
        await processEmailQueueJob()
        break
      case 'expireLoyaltyPoints':
        await expireLoyaltyPointsJob()
        break
      case 'awardBirthdayBonuses':
        await awardBirthdayBonusesJob()
        break
      case 'cleanupExpiredRedemptions':
        await cleanupExpiredRedemptionsJob()
        break
      case 'sendWeeklyLoyaltySummary':
        await sendWeeklyLoyaltySummaryJob()
        break
      case 'updateProductPopularity':
        await updateProductPopularityJob()
        break
      case 'cleanupOldAnalytics':
        await cleanupOldAnalyticsJob()
        break
      case 'sendAbandonedCartReminders':
        await sendAbandonedCartRemindersJob()
        break
      case 'updateCurrencyRates':
        await updateCurrencyRatesJob()
        break
      case 'generateDailyReports':
        await generateDailyReportsJob()
        break
      case 'backupDatabase':
        await backupDatabaseJob()
        break
      case 'cleanupTempFiles':
        await cleanupTempFilesJob()
        break
      default:
        logger.error(`Unknown job: ${jobName}`)
        return false
    }

    jobs[jobName].lastRun = new Date()
    logger.info(`Job executed successfully: ${jobName}`)
    return true
  } catch (error: any) {
    logger.error(`Error running job ${jobName}: ${error.message}`)
    return false
  }
}

// Job implementations

/**
 * Process email queue job
 */
async function processEmailQueueJob(): Promise<void> {
  const logger = createRequestLogger('job-email-queue')
  logger.info('Running email queue processing job')

  try {
    const processed = await emailService.processEmailQueue(50)
    logger.info(`Processed ${processed} emails from queue`)
  } catch (error: any) {
    logger.error(`Error processing email queue: ${error.message}`)
  }
}

/**
 * Expire loyalty points job
 */
async function expireLoyaltyPointsJob(): Promise<void> {
  const logger = createRequestLogger('job-expire-points')
  logger.info('Running loyalty points expiry job')

  try {
    const result = await batchLoyaltyService.processBatchExpiredPoints(365, 100)
    logger.info(`Expired points for ${result.processed} users with ${result.errors} errors`)
  } catch (error: any) {
    logger.error(`Error expiring loyalty points: ${error.message}`)
  }
}

/**
 * Award birthday bonuses job
 */
async function awardBirthdayBonusesJob(): Promise<void> {
  const logger = createRequestLogger('job-birthday-bonus')
  logger.info('Running birthday bonus job')

  try {
    // Get today's date
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()

    // Find users whose birthday is today
    const birthdayUsers = await prisma.user.findMany({
      where: {
        birthMonth: month,
        birthDay: day,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    logger.info(`Found ${birthdayUsers.length} users with birthdays today`)

    if (birthdayUsers.length === 0) {
      return
    }

    // Award birthday bonus points
    const birthdayBonus = 100 // Default birthday bonus
    const userIds = birthdayUsers.map(user => user.id)

    const result = await batchLoyaltyService.bulkAwardLoyaltyPoints(
      userIds,
      birthdayBonus,
      'Birthday bonus points',
      'other'
    )

    logger.info(`Awarded birthday bonuses to ${result.awarded} users with ${result.errors} errors`)

    // Send birthday emails
    for (const user of birthdayUsers) {
      try {
        await emailService.sendEmail(
          user.email,
          'Happy Birthday!',
          `
            <h1>Happy Birthday, ${user.firstName}!</h1>
            <p>We hope you have a fantastic day!</p>
            <p>As a token of our appreciation, we've added ${birthdayBonus} bonus points to your loyalty account.</p>
            <p>Visit our store to redeem your points for special rewards!</p>
            <p>Thank you for being a valued customer.</p>
          `,
          {}
        )
      } catch (emailError: any) {
        logger.error(`Error sending birthday email to user ${user.id}: ${emailError.message}`)
      }
    }
  } catch (error: any) {
    logger.error(`Error awarding birthday bonuses: ${error.message}`)
  }
}

/**
 * Cleanup expired redemptions job
 */
async function cleanupExpiredRedemptionsJob(): Promise<void> {
  const logger = createRequestLogger('job-cleanup-redemptions')
  logger.info('Running expired redemptions cleanup job')

  try {
    const expiredCount = await loyaltyService.expireOldRedemptions()
    logger.info(`Expired ${expiredCount} old redemptions`)
  } catch (error: any) {
    logger.error(`Error cleaning up expired redemptions: ${error.message}`)
  }
}

/**
 * Send weekly loyalty summary job
 */
async function sendWeeklyLoyaltySummaryJob(): Promise<void> {
  const logger = createRequestLogger('job-weekly-summary')
  logger.info('Running weekly loyalty summary job')

  try {
    // Get active loyalty program users
    const loyaltyUsers = await prisma.loyaltyProgram.findMany({
      where: {
        points: { gt: 0 },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      take: 1000, // Process in batches
    })

    logger.info(`Sending weekly summaries to ${loyaltyUsers.length} users`)

    // Calculate date range for the week
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)

    for (const loyaltyUser of loyaltyUsers) {
      try {
        // Get user's weekly activity
        const weeklyStats = await loyaltyService.getLoyaltyStatistics(
          loyaltyUser.user.id,
          'week'
        )

        // Only send if user had activity this week
        if (weeklyStats.totalEarned > 0 || weeklyStats.totalRedeemed > 0) {
          await emailService.sendEmail(
            loyaltyUser.user.email,
            'Your Weekly Loyalty Summary',
            `
              <h1>Weekly Loyalty Summary</h1>
              <p>Hi ${loyaltyUser.user.firstName},</p>
              <p>Here's your loyalty activity for this week:</p>
              <ul>
                <li>Points Earned: ${weeklyStats.totalEarned}</li>
                <li>Points Redeemed: ${weeklyStats.totalRedeemed}</li>
                <li>Current Balance: ${loyaltyUser.points}</li>
              </ul>
              <p>Keep shopping to earn more rewards!</p>
            `,
            {}
          )
        }
      } catch (error: any) {
        logger.error(`Error sending weekly summary to user ${loyaltyUser.user.id}: ${error.message}`)
      }
    }
  } catch (error: any) {
    logger.error(`Error sending weekly loyalty summaries: ${error.message}`)
  }
}

/**
 * Update product popularity job
 */
async function updateProductPopularityJob(): Promise<void> {
  const logger = createRequestLogger('job-product-popularity')
  logger.info('Running product popularity update job')

  try {
    // Calculate popularity scores based on recent orders, views, and ratings
    const popularityData = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        COALESCE(order_score.score, 0) * 0.5 +
        COALESCE(rating_score.score, 0) * 0.3 +
        COALESCE(view_score.score, 0) * 0.2 as popularity_score
      FROM "Product" p
      LEFT JOIN (
        SELECT 
          oi."productId",
          COUNT(*) * 10 as score
        FROM "OrderItem" oi
        JOIN "Order" o ON oi."orderId" = o.id
        WHERE o."createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY oi."productId"
      ) order_score ON p.id = order_score."productId"
      LEFT JOIN (
        SELECT 
          r."productId",
          AVG(r.rating) * COUNT(*) as score
        FROM "Review" r
        WHERE r."createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY r."productId"
      ) rating_score ON p.id = rating_score."productId"
      LEFT JOIN (
        SELECT 
          "productId",
          COUNT(*) as score
        FROM "ProductView"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY "productId"
      ) view_score ON p.id = view_score."productId"
    `

    // Update products with new popularity scores
    for (const item of popularityData) {
      await prisma.product.update({
        where: { id: item.id },
        data: { popularityScore: Math.round(item.popularity_score) },
      })
    }

    logger.info(`Updated popularity scores for ${popularityData.length} products`)
  } catch (error: any) {
    logger.error(`Error updating product popularity: ${error.message}`)
  }
}

/**
 * Cleanup old analytics data job
 */
async function cleanupOldAnalyticsJob(): Promise<void> {
  const logger = createRequestLogger('job-cleanup-analytics')
  logger.info('Running old analytics data cleanup job')

  try {
    // Delete analytics data older than 2 years
    const cutoffDate = new Date()
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2)

    // Clean up various analytics tables
    const deletedCounts = await Promise.all([
      prisma.productView.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      prisma.searchQuery.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      prisma.userSession.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
    ])

    const totalDeleted = deletedCounts.reduce((sum: number, result: any) => sum + result.count, 0)
    logger.info(`Cleaned up ${totalDeleted} old analytics records`)
  } catch (error: any) {
    logger.error(`Error cleaning up old analytics data: ${error.message}`)
  }
}

/**
 * Send abandoned cart reminders job
 */
async function sendAbandonedCartRemindersJob(): Promise<void> {
  const logger = createRequestLogger('job-abandoned-cart')
  logger.info('Running abandoned cart reminders job')

  try {
    // Find carts abandoned for more than 2 hours but less than 24 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: { gte: oneDayAgo, lte: twoHoursAgo },
        items: { some: {} }, // Has items
        reminderSent: { not: true },
      },
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
          include: {
            product: {
              select: {
                name: true,
                price: true,
                images: true,
              },
            },
          },
          take: 3, // Show first 3 items
        },
      },
      take: 100, // Process in batches
    })

    logger.info(`Found ${abandonedCarts.length} abandoned carts`)

    for (const cart of abandonedCarts) {
      try {
        const itemsHtml = cart.items
          .map(item => `
            <li>
              ${item.product.name} - $${item.product.price} (Qty: ${item.quantity})
            </li>
          `)
          .join('')

        await emailService.sendEmail(
          cart.user.email,
          'You left something in your cart!',
          `
            <h1>Don't forget your items!</h1>
            <p>Hi ${cart.user.firstName},</p>
            <p>You left some great items in your cart. Complete your purchase before they're gone!</p>
            <ul>${itemsHtml}</ul>
            <p><a href="${process.env.FRONTEND_URL}/cart">Complete Your Purchase</a></p>
          `,
          {}
        )

        // Mark reminder as sent
        await prisma.cart.update({
          where: { id: cart.id },
          data: { reminderSent: true },
        })
      } catch (error: any) {
        logger.error(`Error sending abandoned cart reminder to user ${cart.user.id}: ${error.message}`)
      }
    }
  } catch (error: any) {
    logger.error(`Error sending abandoned cart reminders: ${error.message}`)
  }
}

/**
 * Update currency rates job
 */
async function updateCurrencyRatesJob(): Promise<void> {
  const logger = createRequestLogger('job-currency-rates')
  logger.info('Running currency rates update job')

  try {
    // This would integrate with a currency service
    // For now, just log that the job ran
    logger.info('Currency rates update job completed (placeholder)')
  } catch (error: any) {
    logger.error(`Error updating currency rates: ${error.message}`)
  }
}

/**
 * Generate daily reports job
 */
async function generateDailyReportsJob(): Promise<void> {
  const logger = createRequestLogger('job-daily-reports')
  logger.info('Running daily reports generation job')

  try {
    // Generate various daily reports
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Generate sales report
    const salesData = await prisma.order.aggregate({
      where: {
        createdAt: { gte: yesterday, lt: today },
        status: { in: ['DELIVERED', 'SHIPPED'] },
      },
      _sum: { total: true },
      _count: { id: true },
    })

    // Generate user registration report
    const newUsers = await prisma.user.count({
      where: {
        createdAt: { gte: yesterday, lt: today },
        role: 'CUSTOMER',
      },
    })

    // Log daily summary
    logger.info(`Daily Report - Sales: $${salesData._sum?.total || 0}, Orders: ${salesData._count?.id || 0}, New Users: ${newUsers}`)
  } catch (error: any) {
    logger.error(`Error generating daily reports: ${error.message}`)
  }
}

/**
 * Backup database job
 */
async function backupDatabaseJob(): Promise<void> {
  const logger = createRequestLogger('job-backup-db')
  logger.info('Running database backup job')

  try {
    // This would implement actual database backup logic
    // For now, just log that the job ran
    logger.info('Database backup job completed (placeholder)')
  } catch (error: any) {
    logger.error(`Error backing up database: ${error.message}`)
  }
}

/**
 * Cleanup temporary files job
 */
async function cleanupTempFilesJob(): Promise<void> {
  const logger = createRequestLogger('job-cleanup-temp')
  logger.info('Running temporary files cleanup job')

  try {
    // This would implement actual file cleanup logic
    // For now, just log that the job ran
    logger.info('Temporary files cleanup job completed (placeholder)')
  } catch (error: any) {
    logger.error(`Error cleaning up temporary files: ${error.message}`)
  }
}

/**
 * Add a custom job
 * @param name Job name
 * @param cronExpression Cron expression
 * @param jobFunction Job function to execute
 * @param description Job description
 * @returns True if job was added successfully
 */
export const addCustomJob = (
  name: string,
  cronExpression: string,
  jobFunction: () => Promise<void>,
  description: string
): boolean => {
  logger.info(`Adding custom job: ${name}`)

  try {
    if (jobs[name]) {
      logger.error(`Job with name ${name} already exists`)
      return false
    }

    jobs[name] = {
      task: cron.schedule(cronExpression, jobFunction),
      description,
    }

    logger.info(`Added custom job: ${name}`)
    return true
  } catch (error: any) {
    logger.error(`Error adding custom job ${name}: ${error.message}`)
    return false
  }
}

/**
 * Remove a custom job
 * @param name Job name
 * @returns True if job was removed successfully
 */
export const removeCustomJob = (name: string): boolean => {
  logger.info(`Removing custom job: ${name}`)

  try {
    if (!jobs[name]) {
      logger.error(`Job with name ${name} not found`)
      return false
    }

    // Stop the job if it's running
    if (jobs[name].task.getStatus()) {
      jobs[name].task.stop()
    }

    // Remove the job
    delete jobs[name]

    logger.info(`Removed custom job: ${name}`)
    return true
  } catch (error: any) {
    logger.error(`Error removing custom job ${name}: ${error.message}`)
    return false
  }
}

/**
 * Get available job names
 * @returns Array of job names
 */
export const getAvailableJobs = (): string[] => {
  return Object.keys(jobs)
}

/**
 * Validate cron expression
 * @param expression Cron expression to validate
 * @returns True if valid, false otherwise
 */
export const validateCronExpression = (expression: string): boolean => {
  try {
    cron.validate(expression)
    return true
  } catch {
    return false
  }
}
