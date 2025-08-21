import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { router, publicProcedure, rateLimitedProcedure, protectedProcedure } from '../trpc';
import { authMiddleware, activityLoggingMiddleware } from '../middleware';

// Input validation schemas
const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const TokenValidationRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Response schemas
const JwtAuthenticationResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    fullName: z.string(),
    role: z.string(),
  }),
});

const UserProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  role: z.string(),
  authorities: z.array(z.string()),
});

/**
 * Authentication Router
 * Handles user authentication, token refresh, and logout operations
 * Converted from Spring Boot AuthController.java
 */
export const authRouter = router({
  /**
   * User login endpoint
   * Converts POST /api/v1/auth/login
   */
  login: rateLimitedProcedure
    .input(LoginRequestSchema)
    .output(JwtAuthenticationResponseSchema)
    .use(activityLoggingMiddleware('LOGIN_ATTEMPT', 'USER'))
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;
      
      ctx.logger.info('Login attempt for user:', email);

      try {
        // Check if account is locked
        const isLocked = await ctx.db.queryBuilder
          .selectFrom('users')
          .select(['failed_login_attempts', 'locked_until'])
          .where('email', '=', email)
          .executeTakeFirst();

        if (isLocked?.locked_until && new Date(isLocked.locked_until) > new Date()) {
          ctx.logger.warn('Login attempt for locked account:', email);
          
          // Log failed login attempt for locked account
          await logLoginActivity(ctx, email, false, 'Account locked');
          
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Account is temporarily locked due to multiple failed login attempts',
          });
        }

        // Find user by email
        const user = await ctx.db.queryBuilder
          .selectFrom('users')
          .selectAll()
          .where('email', '=', email)
          .where('active', '=', true)
          .executeTakeFirst();

        if (!user) {
          ctx.logger.warn('Login attempt for non-existent user:', email);
          await handleFailedLogin(ctx, email);
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          ctx.logger.warn('Failed login attempt - invalid password for user:', email);
          await handleFailedLogin(ctx, email);
          await logLoginActivity(ctx, email, false, 'Invalid password');
          
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Update last login and reset failed attempts
        await ctx.db.queryBuilder
          .updateTable('users')
          .set({
            last_login_at: new Date(),
            failed_login_attempts: 0,
            locked_until: null,
            updated_at: new Date(),
          })
          .where('id', '=', user.id)
          .execute();

        // Log successful login activity
        await logLoginActivity(ctx, email, true, 'Successful login');

        const response = {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: 1800, // 30 minutes
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            fullName: `${user.first_name} ${user.last_name}`,
            role: user.role,
          },
        };

        ctx.logger.info('Successful login for user:', email);
        return response;

      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        ctx.logger.error('Login error for user:', email, error);
        await logLoginActivity(ctx, email, false, 'System error');
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Authentication failed',
        });
      }
    }),

  /**
   * Refresh token endpoint
   * Converts POST /api/v1/auth/refresh
   */
  refresh: rateLimitedProcedure
    .input(RefreshTokenRequestSchema)
    .output(JwtAuthenticationResponseSchema)
    .use(activityLoggingMiddleware('TOKEN_REFRESH', 'TOKEN'))
    .mutation(async ({ input, ctx }) => {
      const { refreshToken } = input;
      
      ctx.logger.info('Token refresh attempt');

      try {
        // Validate refresh token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'JWT configuration error',
          });
        }

        const decoded = jwt.verify(refreshToken, jwtSecret) as any;
        
        if (decoded.type !== 'refresh') {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          });
        }

        // Get user information
        const user = await ctx.db.queryBuilder
          .selectFrom('users')
          .selectAll()
          .where('id', '=', decoded.sub)
          .where('active', '=', true)
          .executeTakeFirst();

        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          });
        }

        // Generate new access token
        const newAccessToken = generateAccessToken(user);

        const response = {
          accessToken: newAccessToken,
          refreshToken, // Keep the same refresh token
          tokenType: 'Bearer',
          expiresIn: 1800, // 30 minutes
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            fullName: `${user.first_name} ${user.last_name}`,
            role: user.role,
          },
        };

        ctx.logger.info('Successful token refresh for user:', user.email);
        return response;

      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        ctx.logger.error('Token refresh error:', error);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid refresh token',
        });
      }
    }),

  /**
   * Logout endpoint
   * Converts POST /api/v1/auth/logout
   */
  logout: protectedProcedure
    .use(authMiddleware)
    .use(activityLoggingMiddleware('LOGOUT', 'USER'))
    .mutation(async ({ ctx }) => {
      const user = ctx.requireAuth();
      
      ctx.logger.info('User logout:', user.email);

      // In production, add token to blacklist in Redis
      // await ctx.cache.set(`blacklist:${token}`, 'true', tokenExpirationTime);

      return {
        message: 'Successfully logged out',
        timestamp: Date.now(),
      };
    }),

  /**
   * Get current user information
   * Converts GET /api/v1/auth/me
   */
  me: protectedProcedure
    .use(authMiddleware)
    .output(UserProfileResponseSchema)
    .query(async ({ ctx }) => {
      const user = ctx.requireAuth();
      
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        authorities: user.authorities,
      };
    }),

  /**
   * Validate token endpoint
   * Converts POST /api/v1/auth/validate
   */
  validate: publicProcedure
    .input(TokenValidationRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { token } = input;
      
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          return { valid: false, message: 'JWT configuration error' };
        }

        const decoded = jwt.verify(token, jwtSecret) as any;
        
        return {
          valid: true,
          userId: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          tokenType: decoded.type || 'access',
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
        };
      } catch (error) {
        return {
          valid: false,
          message: 'Invalid or expired token',
        };
      }
    }),
});

// Helper functions

function generateAccessToken(user: any): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      role: user.role,
      authorities: [`ROLE_${user.role}`],
      type: 'access',
    },
    jwtSecret,
    { expiresIn: '30m' }
  );
}

function generateRefreshToken(user: any): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

async function handleFailedLogin(ctx: any, email: string): Promise<void> {
  const maxAttempts = 5;
  const lockDuration = 30 * 60 * 1000; // 30 minutes

  await ctx.db.queryBuilder
    .updateTable('users')
    .set((eb: any) => ({
      failed_login_attempts: eb('failed_login_attempts', '+', 1),
      locked_until: eb.case()
        .when('failed_login_attempts', '>=', maxAttempts - 1)
        .then(new Date(Date.now() + lockDuration))
        .else(null)
        .end(),
      updated_at: new Date(),
    }))
    .where('email', '=', email)
    .execute();
}

async function logLoginActivity(
  ctx: any, 
  email: string, 
  success: boolean, 
  details: string
): Promise<void> {
  try {
    await ctx.db.queryBuilder
      .insertInto('user_activities')
      .values({
        user_id: null, // Will be set if user exists
        action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        resource_type: 'USER',
        resource_id: email,
        details,
        ip_address: ctx.clientIp,
        user_agent: ctx.userAgent,
        created_at: new Date(),
      })
      .execute();
  } catch (error) {
    ctx.logger.error('Failed to log login activity:', error);
  }
}