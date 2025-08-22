import { Router } from "express"
import * as recommendationController from "../controllers/recommendation.controller"
import { authenticate } from "../middleware/auth.middleware"
import { validateQuery } from "../middleware/validation.middleware"
import Joi from "joi"

const router = Router()

// Query validation schemas
const popularProductsQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
})

const relatedProductsQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
})

const personalizedQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
})

const recentlyViewedQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
})

const frequentlyBoughtQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(10).default(3).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 10",
  }),
})

/**
 * @swagger
 * /recommendations/popular:
 *   get:
 *     summary: Get popular products
 *     tags: [Recommendations]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: List of popular products
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
 *                         $ref: '#/components/schemas/Product'
 */
router.get("/popular", validateQuery(popularProductsQuery), recommendationController.getPopularProducts)

/**
 * @swagger
 * /recommendations/related/{productId}:
 *   get:
 *     summary: Get related products
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: List of related products
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
 *                         $ref: '#/components/schemas/Product'
 */
router.get("/related/:productId", validateQuery(relatedProductsQuery), recommendationController.getRelatedProducts)

/**
 * @swagger
 * /recommendations/personalized:
 *   get:
 *     summary: Get personalized recommendations
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: List of personalized recommended products
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
 *                         $ref: '#/components/schemas/Product'
 */
router.get("/personalized", authenticate, validateQuery(personalizedQuery), recommendationController.getPersonalizedRecommendations)

/**
 * @swagger
 * /recommendations/track-view/{productId}:
 *   post:
 *     summary: Track recently viewed product
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product view tracked successfully
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
 *                   example: Product view tracked successfully
 */
router.post("/track-view/:productId", authenticate, recommendationController.trackRecentlyViewedProduct)

/**
 * @swagger
 * /recommendations/recently-viewed:
 *   get:
 *     summary: Get recently viewed products
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: List of recently viewed products
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
 *                         $ref: '#/components/schemas/Product'
 */
router.get("/recently-viewed", authenticate, validateQuery(recentlyViewedQuery), recommendationController.getRecentlyViewedProducts)

/**
 * @swagger
 * /recommendations/frequently-bought-together/{productId}:
 *   get:
 *     summary: Get frequently bought together products
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: List of frequently bought together products
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
 *                         $ref: '#/components/schemas/Product'
 */
router.get("/frequently-bought-together/:productId", validateQuery(frequentlyBoughtQuery), recommendationController.getFrequentlyBoughtTogether)

export default router
