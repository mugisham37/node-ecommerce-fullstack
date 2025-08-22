import { Router } from "express"
import * as abTestController from "../controllers/ab-test.controller"
import { authenticate, authorize } from "../middleware/auth.middleware"
import { validateRequest } from "../middleware/validation.middleware"
import { abTestValidation } from "../utils/validation.schemas"

const router = Router()

// Admin routes
router
  .route("/")
  .get(authenticate, authorize(["admin", "superadmin"]), abTestController.getABTests)
  .post(
    authenticate,
    authorize(["admin", "superadmin"]),
    validateRequest(abTestValidation.createTest),
    abTestController.createABTest,
  )

router
  .route("/:testId")
  .get(authenticate, authorize(["admin", "superadmin"]), abTestController.getABTestById)
  .put(
    authenticate,
    authorize(["admin", "superadmin"]),
    validateRequest(abTestValidation.updateTest),
    abTestController.updateABTest,
  )
  .delete(authenticate, authorize(["admin", "superadmin"]), abTestController.deleteABTest)

// Start/pause/complete test
router.patch("/:testId/start", authenticate, authorize(["admin", "superadmin"]), abTestController.startABTest)
router.patch("/:testId/pause", authenticate, authorize(["admin", "superadmin"]), abTestController.pauseABTest)
router.patch("/:testId/complete", authenticate, authorize(["admin", "superadmin"]), abTestController.completeABTest)

// Get test results and statistics
router.get("/:testId/results", authenticate, authorize(["admin", "superadmin"]), abTestController.getTestResults)
router.get("/:testId/statistics", authenticate, authorize(["admin", "superadmin"]), abTestController.getABTestStatistics)

// Get active tests
router.get("/active", authenticate, authorize(["admin", "superadmin"]), abTestController.getActiveABTests)

// User assignment routes
router.get("/:testId/assignment", authenticate, abTestController.getUserTestAssignment)
router.get("/assignments", authenticate, abTestController.getUserTestAssignments)

// Track test event
router.post("/:testId/track", authenticate, abTestController.trackTestEvent)

export default router
