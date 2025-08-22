import { Router } from "express"
import * as vendorController from "../controllers/vendor.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { validateRequest } from "../middleware/validation.middleware"
import { vendorValidation } from "../validators/vendor.validation"

const router = Router()

/**
 * @swagger
 * /vendors/slug/{slug}:
 *   get:
 *     summary: Get vendor by slug
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor slug
 *     responses:
 *       200:
 *         description: Vendor details retrieved successfully
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
 *                     vendor:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         slug:
 *                           type: string
 *                         description:
 *                           type: string
 *                         logo:
 *                           type: string
 *                         banner:
 *                           type: string
 *                         status:
 *                           type: string
 *                         rating:
 *                           type: number
 *                         totalProducts:
 *                           type: number
 *                         totalSales:
 *                           type: number
 *                         joinedDate:
 *                           type: string
 *                         contactInfo:
 *                           type: object
 */
router.get("/slug/:slug", vendorController.getVendorBySlug)

/**
 * @swagger
 * /vendors/{id}/products:
 *   get:
 *     summary: Get vendor products
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of products per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, name_asc, name_desc, newest, oldest, rating]
 *           default: newest
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Vendor products retrieved successfully
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
 *                 results:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalResults:
 *                           type: integer
 */
router.get("/:id/products", vendorController.getVendorProducts)

/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: Get all vendors (Admin only)
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of vendors per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending, suspended]
 *         description: Filter by vendor status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search vendors by name or email
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name_asc, name_desc, created_asc, created_desc, sales_asc, sales_desc]
 *           default: created_desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
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
 *                 results:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendors:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *   post:
 *     summary: Create vendor (Admin only)
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - businessName
 *               - businessType
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: vendor@example.com
 *               businessName:
 *                 type: string
 *                 example: Tech Solutions Inc
 *               businessType:
 *                 type: string
 *                 example: Technology
 *               description:
 *                 type: string
 *                 example: Leading provider of tech solutions
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *                   country:
 *                     type: string
 *               bankDetails:
 *                 type: object
 *                 properties:
 *                   accountName:
 *                     type: string
 *                   accountNumber:
 *                     type: string
 *                   bankName:
 *                     type: string
 *                   routingNumber:
 *                     type: string
 *               commissionRate:
 *                 type: number
 *                 example: 15
 *               status:
 *                 type: string
 *                 enum: [active, inactive, pending, suspended]
 *                 default: pending
 *     responses:
 *       201:
 *         description: Vendor created successfully
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
 *                     vendor:
 *                       type: object
 */
router
  .route("/")
  .get(authenticate, authorize(["admin", "superadmin"]), vendorController.getAllVendors)
  .post(
    authenticate,
    authorize(["admin", "superadmin"]),
    validateRequest(vendorValidation.createVendor),
    vendorController.createVendor,
  )

/**
 * @swagger
 * /vendors/{id}:
 *   get:
 *     summary: Get vendor by ID
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor details retrieved successfully
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
 *                     vendor:
 *                       type: object
 *   put:
 *     summary: Update vendor
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               businessName:
 *                 type: string
 *               businessType:
 *                 type: string
 *               description:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *               bankDetails:
 *                 type: object
 *               commissionRate:
 *                 type: number
 *               logo:
 *                 type: string
 *               banner:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor updated successfully
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
 *                     vendor:
 *                       type: object
 *   delete:
 *     summary: Delete vendor (Admin only)
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor deleted successfully
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
 *                 message:
 *                   type: string
 *                   example: Vendor deleted successfully
 */
router
  .route("/:id")
  .get(authenticate, authorize(["admin", "superadmin", "vendor"]), vendorController.getVendorById)
  .put(
    authenticate,
    authorize(["admin", "superadmin", "vendor"]),
    validateRequest(vendorValidation.updateVendor),
    vendorController.updateVendor,
  )
  .delete(authenticate, authorize(["admin", "superadmin"]), vendorController.deleteVendor)

/**
 * @swagger
 * /vendors/{id}/status:
 *   patch:
 *     summary: Update vendor status (Admin only)
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, pending, suspended]
 *                 example: active
 *               reason:
 *                 type: string
 *                 example: Account approved after verification
 *     responses:
 *       200:
 *         description: Vendor status updated successfully
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
 *                     vendor:
 *                       type: object
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize(["admin", "superadmin"]),
  validateRequest(vendorValidation.updateVendorStatus),
  vendorController.updateVendorStatus,
)

/**
 * @swagger
 * /vendors/{id}/metrics:
 *   get:
 *     summary: Get vendor metrics
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for metrics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for metrics
 *     responses:
 *       200:
 *         description: Vendor metrics retrieved successfully
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
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         totalSales:
 *                           type: number
 *                         totalRevenue:
 *                           type: number
 *                         totalOrders:
 *                           type: number
 *                         totalProducts:
 *                           type: number
 *                         averageOrderValue:
 *                           type: number
 *                         conversionRate:
 *                           type: number
 *                         customerSatisfaction:
 *                           type: number
 *                         returnRate:
 *                           type: number
 */
router.get(
  "/:id/metrics",
  authenticate,
  authorize(["admin", "superadmin", "vendor"]),
  vendorController.getVendorMetrics,
)

/**
 * @swagger
 * /vendors/{id}/payouts:
 *   get:
 *     summary: Get vendor payouts
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of payouts per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         description: Filter by payout status
 *     responses:
 *       200:
 *         description: Vendor payouts retrieved successfully
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
 *                 results:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     payouts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 */
router.get(
  "/:id/payouts",
  authenticate,
  authorize(["admin", "superadmin", "vendor"]),
  vendorController.getVendorPayouts,
)

/**
 * @swagger
 * /vendors/{id}/calculate-payout:
 *   post:
 *     summary: Calculate vendor payout (Admin only)
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: 2023-01-01
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: 2023-01-31
 *               includeShipping:
 *                 type: boolean
 *                 default: false
 *               includeTax:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Payout calculated successfully
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
 *                     calculation:
 *                       type: object
 *                       properties:
 *                         totalSales:
 *                           type: number
 *                         commission:
 *                           type: number
 *                         fees:
 *                           type: number
 *                         netPayout:
 *                           type: number
 *                         orderCount:
 *                           type: number
 *                         period:
 *                           type: object
 */
router.post(
  "/:id/calculate-payout",
  authenticate,
  authorize(["admin", "superadmin"]),
  validateRequest(vendorValidation.calculatePayout),
  vendorController.calculateVendorPayout,
)

/**
 * @swagger
 * /vendors/payouts:
 *   post:
 *     summary: Create vendor payout (Admin only)
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendorId
 *               - amount
 *               - period
 *             properties:
 *               vendorId:
 *                 type: string
 *                 example: 60d21b4667d0d8992e610c85
 *               amount:
 *                 type: number
 *                 example: 1500.00
 *               period:
 *                 type: object
 *                 required:
 *                   - startDate
 *                   - endDate
 *                 properties:
 *                   startDate:
 *                     type: string
 *                     format: date
 *                   endDate:
 *                     type: string
 *                     format: date
 *               description:
 *                 type: string
 *                 example: Monthly payout for January 2023
 *               paymentMethod:
 *                 type: string
 *                 enum: [bank_transfer, paypal, stripe]
 *                 default: bank_transfer
 *     responses:
 *       201:
 *         description: Payout created successfully
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
 *                     payout:
 *                       type: object
 */
router.post(
  "/payouts",
  authenticate,
  authorize(["admin", "superadmin"]),
  validateRequest(vendorValidation.createPayout),
  vendorController.createVendorPayout,
)

/**
 * @swagger
 * /vendors/payouts/{id}:
 *   get:
 *     summary: Get payout by ID
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout ID
 *     responses:
 *       200:
 *         description: Payout details retrieved successfully
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
 *                     payout:
 *                       type: object
 */
router.get("/payouts/:id", authenticate, authorize(["admin", "superadmin", "vendor"]), vendorController.getPayoutById)

/**
 * @swagger
 * /vendors/payouts/{id}/status:
 *   patch:
 *     summary: Update payout status (Admin only)
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, completed, failed]
 *                 example: completed
 *               notes:
 *                 type: string
 *                 example: Payment processed successfully
 *               transactionId:
 *                 type: string
 *                 example: TXN123456789
 *     responses:
 *       200:
 *         description: Payout status updated successfully
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
 *                     payout:
 *                       type: object
 */
router.patch(
  "/payouts/:id/status",
  authenticate,
  authorize(["admin", "superadmin"]),
  validateRequest(vendorValidation.updatePayoutStatus),
  vendorController.updatePayoutStatus,
)

export default router
