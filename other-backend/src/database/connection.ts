import prisma from './client'
import { createRequestLogger } from '../utils/logger'

const logger = createRequestLogger('database-connection')

export class DatabaseConnection {
  private static instance: DatabaseConnection
  private isConnected: boolean = false

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection()
    }
    return DatabaseConnection.instance
  }

  public async connect(): Promise<void> {
    try {
      // Test the connection
      await prisma.$connect()
      
      // Verify database is accessible
      const isHealthy = await prisma.healthCheck()
      
      if (!isHealthy) {
        throw new Error('Database health check failed')
      }

      this.isConnected = true
      logger.info('PostgreSQL connected successfully via Prisma')

      // Set up connection event handlers
      this.setupEventHandlers()

    } catch (error: any) {
      logger.error('Failed to connect to PostgreSQL:', error.message)
      throw error
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await prisma.$disconnect()
      this.isConnected = false
      logger.info('PostgreSQL disconnected successfully')
    } catch (error: any) {
      logger.error('Error disconnecting from PostgreSQL:', error.message)
      throw error
    }
  }

  public async reconnect(): Promise<void> {
    logger.info('Attempting to reconnect to PostgreSQL...')
    await this.disconnect()
    await this.connect()
  }

  public isConnectionActive(): boolean {
    return this.isConnected
  }

  public async getConnectionStatus(): Promise<{
    connected: boolean
    healthy: boolean
    uptime?: number
  }> {
    try {
      const healthy = await prisma.healthCheck()
      return {
        connected: this.isConnected,
        healthy,
        uptime: process.uptime()
      }
    } catch (error) {
      return {
        connected: false,
        healthy: false
      }
    }
  }

  private setupEventHandlers(): void {
    // Handle process termination
    process.on('SIGINT', this.gracefulShutdown.bind(this))
    process.on('SIGTERM', this.gracefulShutdown.bind(this))
    process.on('SIGUSR2', this.gracefulShutdown.bind(this)) // nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error)
      this.gracefulShutdown()
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason)
      this.gracefulShutdown()
    })
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Received shutdown signal, closing database connection...')
    
    try {
      await this.disconnect()
      logger.info('Database connection closed successfully')
      process.exit(0)
    } catch (error) {
      logger.error('Error during graceful shutdown:', error)
      process.exit(1)
    }
  }

  // Database migration utilities
  public async runMigrations(): Promise<void> {
    try {
      logger.info('Running database migrations...')
      
      // Note: In production, migrations should be run separately
      // This is mainly for development convenience
      if (process.env.NODE_ENV === 'development') {
        const { execSync } = require('child_process')
        execSync('npx prisma migrate deploy', { stdio: 'inherit' })
        logger.info('Database migrations completed successfully')
      }
    } catch (error: any) {
      logger.error('Failed to run migrations:', error.message)
      throw error
    }
  }

  // Database seeding utilities
  public async seedDatabase(): Promise<void> {
    try {
      logger.info('Seeding database...')
      
      // Check if database is already seeded
      const userCount = await prisma.user.count()
      if (userCount > 0) {
        logger.info('Database already contains data, skipping seed')
        return
      }

      // Run seed script if it exists
      if (process.env.NODE_ENV === 'development') {
        const { execSync } = require('child_process')
        try {
          execSync('npx prisma db seed', { stdio: 'inherit' })
          logger.info('Database seeding completed successfully')
        } catch (error) {
          logger.warn('No seed script found or seed failed')
        }
      }
    } catch (error: any) {
      logger.error('Failed to seed database:', error.message)
      throw error
    }
  }

  // Reset database (development only)
  public async resetDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production')
    }

    try {
      logger.warn('Resetting database...')
      const { execSync } = require('child_process')
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' })
      logger.info('Database reset completed successfully')
    } catch (error: any) {
      logger.error('Failed to reset database:', error.message)
      throw error
    }
  }
}

// Export singleton instance
export const databaseConnection = DatabaseConnection.getInstance()

// Export connection function for backward compatibility
export const connectDatabase = async (): Promise<void> => {
  await databaseConnection.connect()
}

export const disconnectDatabase = async (): Promise<void> => {
  await databaseConnection.disconnect()
}

export default databaseConnection
