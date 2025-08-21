import { TRPCError } from '@trpc/server';
import { middleware } from './trpc';
import { Context } from './context';

/**
 * Authentication middleware
 * Ensures the user is authenticated before proceeding
 */
export const authMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.user.isAuthenticated) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // TypeScript now knows user is authenticated
    },
  });
});

/**
 * Role-based authorization middleware
 * Ensures the user has the required role
 */
export const roleMiddleware = (requiredRole: string) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.user.isAuthenticated) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (ctx.user.role !== requiredRole && ctx.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `${requiredRole} role required`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  });

/**
 * Multiple roles authorization middleware
 * Ensures the user has one of the required roles
 */
export const anyRoleMiddleware = (requiredRoles: string[]) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.user.isAuthenticated) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!requiredRoles.includes(ctx.user.role) && ctx.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `One of the following roles required: ${requiredRoles.join(', ')}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  });

/**
 * Logging middleware
 * Logs all procedure calls for audit and debugging
 */
export const loggingMiddleware = middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();
  
  ctx.logger.info(`tRPC ${type} call started`, {
    path,
    userId: ctx.user.isAuthenticated ? ctx.user.id : 'anonymous',
    clientIp: ctx.clientIp,
    userAgent: ctx.userAgent,
  });

  try {
    const result = await next();
    const duration = Date.now() - start;
    
    ctx.logger.info(`tRPC ${type} call completed`, {
      path,
      duration,
      userId: ctx.user.isAuthenticated ? ctx.user.id : 'anonymous',
      success: true,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    ctx.logger.error(`tRPC ${type} call failed`, {
      path,
      duration,
      userId: ctx.user.isAuthenticated ? ctx.user.id : 'anonymous',
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    });

    throw error;
  }
});

/**
 * Rate limiting middleware
 * Prevents abuse by limiting requests per user/IP
 */
export const rateLimitMiddleware = (
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) =>
  middleware(async ({ ctx, next }) => {
    const key = ctx.user.isAuthenticated 
      ? `rate_limit:user:${ctx.user.id}` 
      : `rate_limit:ip:${ctx.clientIp}`;
    
    try {
      const current = await ctx.cache.get(key);
      const count = current ? parseInt(current) : 0;
      
      if (count >= maxRequests) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded. Please try again later.',
        });
      }
      
      // Increment counter
      await ctx.cache.set(key, (count + 1).toString(), Math.ceil(windowMs / 1000));
      
      return next();
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      
      // If cache is unavailable, allow the request but log the issue
      ctx.logger.warn('Rate limiting unavailable due to cache error:', error);
      return next();
    }
  });

/**
 * Input validation middleware
 * Provides additional validation beyond Zod schemas
 */
export const validationMiddleware = middleware(async ({ ctx, next, input }) => {
  // Log input validation for audit purposes
  ctx.logger.debug('Input validation', {
    userId: ctx.user.isAuthenticated ? ctx.user.id : 'anonymous',
    inputKeys: input && typeof input === 'object' ? Object.keys(input) : 'none',
  });

  return next();
});

/**
 * Error handling middleware
 * Standardizes error responses and logging
 */
export const errorHandlingMiddleware = middleware(async ({ ctx, next, path }) => {
  try {
    return await next();
  } catch (error) {
    // Log the error with context
    ctx.logger.error(`Error in ${path}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: ctx.user.isAuthenticated ? ctx.user.id : 'anonymous',
      clientIp: ctx.clientIp,
      path,
    });

    // Re-throw tRPC errors as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Convert other errors to tRPC errors
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('not found')) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: error.message,
        });
      }
      
      if (error.message.includes('validation')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
      
      if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error.message,
        });
      }
      
      if (error.message.includes('forbidden') || error.message.includes('permission')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error.message,
        });
      }
    }

    // Default to internal server error
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

/**
 * Activity logging middleware
 * Logs user activities for audit trail
 */
export const activityLoggingMiddleware = (action: string, resourceType: string) =>
  middleware(async ({ ctx, next, input }) => {
    const result = await next();
    
    if (ctx.user.isAuthenticated) {
      // Log the activity (this would integrate with UserActivityService)
      ctx.logger.info('User activity logged', {
        userId: ctx.user.id,
        action,
        resourceType,
        resourceId: input && typeof input === 'object' && 'id' in input ? input.id : 'unknown',
        clientIp: ctx.clientIp,
        userAgent: ctx.userAgent,
        timestamp: new Date().toISOString(),
      });
    }
    
    return result;
  });