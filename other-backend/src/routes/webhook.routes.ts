import express from "express"
const router = express.Router()
import * as webhookController from "../controllers/webhook.controller"

/**
 * @swagger
 * /webhooks/loyalty:
 *   post:
 *     summary: Handle loyalty webhook
 *     tags: [Webhooks]
 *     description: Webhook endpoint for loyalty program events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [points_earned, points_redeemed, tier_upgraded, reward_claimed]
 *                 example: points_earned
 *               data:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                     example: 60d21b4667d0d8992e610c85
 *                   points:
 *                     type: number
 *                     example: 100
 *                   orderId:
 *                     type: string
 *                     example: ORD12345
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: 2023-01-01T12:00:00Z
 *               signature:
 *                 type: string
 *                 description: Webhook signature for verification
 *                 example: sha256=abc123def456
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Loyalty webhook processed successfully
 *       400:
 *         description: Invalid webhook payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid webhook payload
 *       401:
 *         description: Invalid webhook signature
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid webhook signature
 */
router.post("/loyalty", webhookController.handleLoyaltyWebhook)

export default router
