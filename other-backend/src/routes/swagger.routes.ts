import { Router } from "express"
import swaggerUi from "swagger-ui-express"
import * as swaggerController from "../controllers/swagger.controller"
import swaggerSpec from "../config/swagger"

const router = Router()

/**
 * @swagger
 * /docs:
 *   get:
 *     summary: Serve Swagger UI documentation
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Swagger UI served successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.use("/", swaggerUi.serve)
router.get(
  "/",
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "E-Commerce Platform API Documentation",
    customfavIcon: "/favicon.ico",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "none",
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  }),
)

/**
 * @swagger
 * /docs/swagger.json:
 *   get:
 *     summary: Get Swagger specification as JSON
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Swagger specification retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get("/swagger.json", swaggerController.getSwaggerSpec)

export default router
