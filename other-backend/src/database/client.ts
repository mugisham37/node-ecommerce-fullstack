import { PrismaClient } from '@prisma/client'
import { createRequestLogger } from '../utils/logger'

const logger = createRequestLogger('database')

// Extend PrismaClient with custom functionality
class ExtendedPrismaClient extends PrismaClient {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ] as any,
      errorFormat: 'pretty',
    })

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      (this as any).$on('query', (e: any) => {
        logger.debug(`Query: ${e.query}`)
        logger.debug(`Params: ${e.params}`)
        logger.debug(`Duration: ${e.duration}ms`)
      })
    }

    // Log errors
    ;(this as any).$on('error', (e: any) => {
      logger.error('Prisma error:', e)
    })

    // Log info
    ;(this as any).$on('info', (e: any) => {
      logger.info('Prisma info:', e.message)
    })

    // Log warnings
    ;(this as any).$on('warn', (e: any) => {
      logger.warn('Prisma warning:', e.message)
    })
  }

  // Soft delete functionality
  async softDelete(model: string, where: any) {
    const modelDelegate = (this as any)[model]
    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`)
    }

    return modelDelegate.update({
      where,
      data: {
        deletedAt: new Date(),
      },
    })
  }

  // Find many excluding soft deleted
  async findManyActive(model: string, args: any = {}): Promise<any> {
    const modelDelegate = (this as any)[model]
    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`)
    }

    return modelDelegate.findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    })
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      logger.error('Database health check failed:', error)
      return false
    }
  }

  // Transaction with retry logic
  async transactionWithRetry<T>(
    fn: (prisma: any) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(fn)
      } catch (error: any) {
        lastError = error
        logger.warn(`Transaction attempt ${attempt} failed:`, error.message)

        if (attempt === maxRetries) {
          break
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
      }
    }

    throw lastError!
  }
}

// Create global instance
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new ExtendedPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export default prisma
