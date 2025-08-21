import dotenv from 'dotenv';
import { startServer } from './trpc/server';
import { Logger } from './utils/logger';
import { DatabaseLayer } from './database/connection';
import { CacheService } from './services/cache/CacheService';

// Load environment variables
dotenv.config();

const logger = Logger.getInstance();

/**
 * Application Entry Point
 * Initializes and starts the e-commerce inventory management API server
 */
async function main() {
  try {
    logger.info('🚀 Starting E-commerce Inventory Management API...');
    
    // Initialize database connection
    const db = DatabaseLayer.getInstance();
    const dbHealthy = await db.healthCheck();
    
    if (!dbHealthy) {
      logger.error('❌ Database health check failed');
      process.exit(1);
    }
    
    logger.info('✅ Database connection established');

    // Initialize cache service
    const cache = CacheService.getInstance();
    const cacheHealthy = await cache.healthCheck();
    
    if (cacheHealthy) {
      logger.info('✅ Cache service connected');
    } else {
      logger.warn('⚠️  Cache service not available (continuing without cache)');
    }

    // Start the tRPC server
    const server = startServer();
    
    logger.info('🎉 E-commerce Inventory Management API started successfully');
    logger.info('📋 Available features:');
    logger.info('   • Authentication & Authorization');
    logger.info('   • User Management');
    logger.info('   • Product Catalog Management');
    logger.info('   • Real-time Inventory Tracking');
    logger.info('   • Order Processing & Fulfillment');
    logger.info('   • Supplier Management');
    logger.info('   • Category Hierarchy');
    logger.info('   • Analytics & Reporting');

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, initiating graceful shutdown...`);
      
      try {
        // Close server
        server.close(() => {
          logger.info('✅ HTTP server closed');
        });

        // Close database connection
        await db.close();
        logger.info('✅ Database connection closed');

        // Close cache connection
        await cache.close();
        logger.info('✅ Cache connection closed');

        logger.info('🏁 Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.error('❌ Application startup failed:', error);
  process.exit(1);
});