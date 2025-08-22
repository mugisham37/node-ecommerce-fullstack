import express from "express"
import * as vendorDashboardController from "../controllers/vendor-dashboard.controller"
import { protect } from "../middleware/auth.middleware"
import { isVendor } from "../middleware/vendor.middleware"

const router = express.Router()

// Protected vendor routes
router.use(protect)
router.use(isVendor)

/**
 * @swagger
 * /vendor-dashboard/dashboard:
 *   get:
 *     summary: Get vendor dashboard summary
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor dashboard summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 requestId:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSales:
 *                           type: number
 *                         totalOrders:
 *                           type: number
 *                         totalProducts:
 *                           type: number
 *                         totalRevenue:
 *                           type: number
 *                         pendingPayouts:
 *                           type: number
 *                         averageOrderValue:
 *                           type: number
 *                         conversionRate:
 *                           type: number
 *                         topSellingProducts:
 *                           type: array
 *                           items:
 *                             type: object
 *                         recentOrders:
 *                           type: array
 *                           items:
 *                             type: object
 */
router.get("/dashboard", vendorDashboardController.getVendorDashboardSummary)

/**
 * @swagger
 * /vendor-dashboard/analytics/sales:
 *   get:
 *     summary: Get vendor sales analytics
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (default is 30 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (default is today)
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Interval for aggregating data
 *     responses:
 *       200:
 *         description: Vendor sales analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 requestId:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     salesData:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           sales:
 *                             type: number
 *                           orders:
 *                             type: number
 *                           revenue:
 *                             type: number
 *                     totalSales:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *                     averageOrderValue:
 *                       type: number
 *                     growthRate:
 *                       type: number
 */
router.get("/analytics/sales", vendorDashboardController.getVendorSalesAnalytics)

/**
 * @swagger
 * /vendor-dashboard/analytics/products:
 *   get:
 *     summary: Get vendor product analytics
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (default is 30 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (default is today)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Limit for top products
 *     responses:
 *       200:
 *         description: Vendor product analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 requestId:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     topSellingProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           totalSold:
 *                             type: number
 *                           revenue:
 *                             type: number
 *                           averageRating:
 *                             type: number
 *                     topViewedProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     lowStockProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     productPerformance:
 *                       type: object
 */
router.get("/analytics/products", vendorDashboardController.getVendorProductAnalytics)

/**
 * @swagger
 * /vendor-dashboard/analytics/orders:
 *   get:
 *     summary: Get vendor order analytics
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (default is 30 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (default is today)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: Vendor order analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 requestId:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ordersByStatus:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: number
 *                         processing:
 *                           type: number
 *                         shipped:
 *                           type: number
 *                         delivered:
 *                           type: number
 *                         cancelled:
 *                           type: number
 *                     recentOrders:
 *                       type: array
 *                       items:
 *                         type: object
 *                     orderTrends:
 *                       type: array
 *                       items:
 *                         type: object
 *                     fulfillmentMetrics:
 *                       type: object
 */
router.get("/analytics/orders", vendorDashboardController.getVendorOrderAnalytics)

/**
 * @swagger
 * /vendor-dashboard/analytics/payouts:
 *   get:
 *     summary: Get vendor payout analytics
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (default is 30 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (default is today)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         description: Filter by payout status
 *     responses:
 *       200:
 *         description: Vendor payout analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 requestId:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalEarnings:
 *                       type: number
 *                     pendingPayouts:
 *                       type: number
 *                     completedPayouts:
 *                       type: number
 *                     payoutHistory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                           completedAt:
 *                             type: string
 *                     payoutTrends:
 *                       type: array
 *                       items:
 *                         type: object
 *                     commissionRate:
 *                       type: number
 */
router.get("/analytics/payouts", vendorDashboardController.getVendorPayoutAnalytics)

export default router
