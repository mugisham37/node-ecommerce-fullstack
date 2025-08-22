import dotenv from "dotenv"
import app from "./app"
import logger from "./utils/logger"
import { initScheduler, stopAllJobs } from "./services/scheduler.service"
import { closeRedisConnection } from "./config/redis"
import { initializeDefaultSettings } from "./services/settings.service"
import { connectDatabase, disconnectDatabase } from "./config/database"

// Load environment variables
dotenv.config()

// Set up unhandled rejection handler
process.on("unhandledRejection", (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`)
  logger.error(err.stack)

  // Graceful shutdown
  gracefulShutdown("Unhandled Rejection")
})

// Set up uncaught exception handler
process.on("uncaughtException", (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`)
  logger.error(err.stack)

  // For uncaught exceptions, we should exit immediately
  process.exit(1)
})


// Graceful shutdown function
const gracefulShutdown = async (reason: string): Promise<void> => {
  logger.info(`Server is shutting down: ${reason}`)

  try {
    // Stop all scheduled jobs
    logger.info("Stopping all scheduled jobs")
    await stopAllJobs()

    // Close Redis connection
    logger.info("Closing Redis connection")
    await closeRedisConnection()

    // Close Prisma connection
    logger.info("Closing database connection")
    await disconnectDatabase()

    logger.info("All connections closed successfully")
    process.exit(0)
  } catch (error) {
    logger.error(`Error during graceful shutdown: ${(error as Error).message}`)
    process.exit(1)
  }
}

// Handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM received"))
process.on("SIGINT", () => gracefulShutdown("SIGINT received"))

// Start server
const startServer = async (): Promise<any> => {
  try {
    // Connect to database
    await connectDatabase()

    // Initialize default settings
    try {
      await initializeDefaultSettings()
    } catch (error) {
      logger.error(`Error initializing default settings: ${(error as Error).message}`)
      // Continue starting the server even if settings initialization fails
    }

    // Initialize scheduler
    initScheduler()

    // Start server
    const PORT = process.env.PORT || 5000
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/v1/docs`)
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`)
      logger.info(`🌐 API Base URL: http://localhost:${PORT}/api/v1`)
    })

    // Handle server errors
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${PORT} is already in use`)
      } else {
        logger.error(`Server error: ${error.message}`)
      }
      process.exit(1)
    })

    return server
  } catch (error) {
    logger.error(`Error starting server: ${(error as Error).message}`)
    process.exit(1)
  }
}

// Start the server
startServer()
