import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from './context';
import { appRouter } from './routers';
import { Logger } from '../utils/logger';

/**
 * tRPC Server Setup
 * Configures Express server with tRPC middleware and security features
 */
export function createTRPCServer() {
  const app = express();
  const logger = Logger.getInstance();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || []
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Compression middleware
  app.use(compression());

  // Request logging
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // API info endpoint
  app.get('/api', (req, res) => {
    res.status(200).json({
      name: 'E-commerce Inventory Management API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Full-stack e-commerce inventory management system API',
      endpoints: {
        trpc: '/api/trpc',
        health: '/health',
        docs: '/api/docs',
      },
      features: [
        'Type-safe API with tRPC',
        'Authentication & Authorization',
        'Real-time inventory tracking',
        'Order management',
        'Analytics & reporting',
        'Multi-tenant support',
      ],
    });
  });

  // tRPC middleware
  app.use('/api/trpc', createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ path, error, type, ctx }) => {
      logger.error(`tRPC Error on ${type} ${path}:`, {
        error: error.message,
        code: error.code,
        cause: error.cause,
        stack: error.stack,
        userId: ctx?.user?.isAuthenticated ? ctx.user.id : 'anonymous',
        clientIp: ctx?.clientIp,
      });
    },
  }));

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });

    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : err.message,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

/**
 * Start the tRPC server
 */
export function startServer() {
  const app = createTRPCServer();
  const port = process.env.PORT || 4000;
  const logger = Logger.getInstance();

  const server = app.listen(port, () => {
    logger.info(`🚀 tRPC Server running on port ${port}`);
    logger.info(`📊 Health check: http://localhost:${port}/health`);
    logger.info(`🔗 tRPC endpoint: http://localhost:${port}/api/trpc`);
    logger.info(`📖 API info: http://localhost:${port}/api`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  return server;
}