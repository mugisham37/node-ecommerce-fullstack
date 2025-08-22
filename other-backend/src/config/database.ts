import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Import the extended Prisma client from the database directory
import prisma from '../database/client';

export const connectDatabase = async (): Promise<void> => {
  try {
    // Test the database connection
    await prisma.$connect();
    
    // Perform a health check
    const isHealthy = await prisma.healthCheck();
    
    if (isHealthy) {
      logger.info('PostgreSQL connected successfully via Prisma');
    } else {
      throw new Error('Database health check failed');
    }

  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from PostgreSQL:', error);
    throw error;
  }
};

// Export the prisma instance for use throughout the application
export { prisma };
