import { initTRPC } from '@trpc/server';
import { Context } from './context';
import { 
  loggingMiddleware, 
  errorHandlingMiddleware, 
  validationMiddleware,
  rateLimitMiddleware 
} from './middleware';

/**
 * Initialize tRPC with context
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
      },
    };
  },
});

/**
 * Base router
 */
export const router = t.router;

/**
 * Middleware function
 */
export const middleware = t.middleware;

/**
 * Public procedure (no authentication required)
 */
export const publicProcedure = t.procedure
  .use(loggingMiddleware)
  .use(errorHandlingMiddleware)
  .use(validationMiddleware);

/**
 * Rate-limited public procedure
 */
export const rateLimitedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(errorHandlingMiddleware)
  .use(validationMiddleware)
  .use(rateLimitMiddleware(10, 60000)); // 10 requests per minute

/**
 * Protected procedure (authentication required)
 */
export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(errorHandlingMiddleware)
  .use(validationMiddleware)
  .use(rateLimitMiddleware(100, 60000)); // 100 requests per minute for authenticated users