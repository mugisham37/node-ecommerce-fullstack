import express from "express"
// Import existing route files
import webhookRoutes from "./webhook.routes"
import adminRoutes from "./admin.routes"
import swaggerRoutes from "./swagger.routes"
import exportRoutes from "./export.routes"
import recommendationRoutes from "./recommendations.routes"
import emailRoutes from "./email.routes"
import schedulerRoutes from "./scheduler.routes"
import analyticsRoutes from "./analytics.routes"
import abTestRoutes from "./ab-test.routes"
import vendorRoutes from "./vendor.routes"
import searchRoutes from "./search.routes"
import advancedSearchRoutes from "./advanced-search.routes"
import loyaltyRoutes from "./loyalty.routes"
import adminLoyaltyRoutes from "./admin-loyalty.routes"
import countriesRoutes from "./countries.routes"
import currencyRoutes from "./currency.routes"
import taxRoutes from "./tax.routes"
import vendorDashboardRoutes from "./vendor-dashboard.routes"

const router = express.Router()

// API Routes - Only include routes that exist
// TODO: Add these routes when they are created:
// router.use("/auth", authRoutes)
// router.use("/users", userRoutes)
// router.use("/products", productRoutes)
// router.use("/categories", categoryRoutes)
// router.use("/orders", orderRoutes)
// router.use("/reviews", reviewRoutes)
// router.use("/cart", cartRoutes)
// router.use("/payment", paymentRoutes)

// Existing routes
router.use("/webhooks", webhookRoutes)
router.use("/admin", adminRoutes)
router.use("/docs", swaggerRoutes)
router.use("/export", exportRoutes)
router.use("/recommendations", recommendationRoutes)
router.use("/email", emailRoutes)
router.use("/scheduler", schedulerRoutes)
router.use("/analytics", analyticsRoutes)
router.use("/ab-test", abTestRoutes)
router.use("/vendors", vendorRoutes)
router.use("/search", searchRoutes)
router.use("/advanced-search", advancedSearchRoutes)
router.use("/loyalty", loyaltyRoutes)
router.use("/admin/loyalty", adminLoyaltyRoutes)
router.use("/countries", countriesRoutes)
router.use("/currencies", currencyRoutes)
router.use("/taxes", taxRoutes)
router.use("/vendor-dashboard", vendorDashboardRoutes)

export default router
