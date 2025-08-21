import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { router, protectedProcedure } from '../trpc';
import { authMiddleware, roleMiddleware, anyRoleMiddleware, activityLoggingMiddleware } from '../middleware';

// Input validation schemas
const UserCreateRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'USER']),
});

const UserUpdateRequestSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'USER']).optional(),
});

const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  ...PaginationSchema.shape,
});

const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ...PaginationSchema.shape,
});

// Response schemas
const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  role: z.string(),
  active: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const UserActivityResponseSchema = z.object({
  id: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  details: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
});

const PagedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

/**
 * User Management Router
 * Handles user CRUD operations and user management functionality
 * Converted from Spring Boot UserController.java
 */
export const userRouter = router({
  /**
   * Create a new user
   * Converts POST /api/v1/users
   */
  create: protectedProcedure
    .use(authMiddleware)
    .use(roleMiddleware('ADMIN'))
    .use(activityLoggingMiddleware('USER_CREATED', 'USER'))
    .input(UserCreateRequestSchema)
    .output(UserResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password, firstName, lastName, role } = input;

      // Check if user already exists
      const existingUser = await ctx.db.queryBuilder
        .selectFrom('users')
        .select('id')
        .where('email', '=', email)
        .executeTakeFirst();

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const [user] = await ctx.db.queryBuilder
        .insertInto('users')
        .values({
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role,
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning([
          'id',
          'email',
          'first_name',
          'last_name',
          'role',
          'active',
          'last_login_at',
          'created_at',
          'updated_at',
        ])
        .execute();

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`,
        role: user.role,
        active: user.active,
        lastLoginAt: user.last_login_at?.toISOString() || null,
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at.toISOString(),
      };
    }),

  /**
   * Get user by ID
   * Converts GET /api/v1/users/{userId}
   */
  getById: protectedProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string() }))
    .output(UserResponseSchema)
    .query(async ({ input, ctx }) => {
      const user = await ctx.db.queryBuilder
        .selectFrom('users')
        .selectAll()
        .where('id', '=', input.id)
        .executeTakeFirst();

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`,
        role: user.role,
        active: user.active,
        lastLoginAt: user.last_login_at?.toISOString() || null,
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at.toISOString(),
      };
    }),

  /**
   * Update user information
   * Converts PUT /api/v1/users/{userId}
   */
  update: protectedProcedure
    .use(authMiddleware)
    .use(activityLoggingMiddleware('USER_UPDATED', 'USER'))
    .input(z.object({
      id: z.string(),
      data: UserUpdateRequestSchema,
    }))
    .output(UserResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;

      // Check if user exists
      const existingUser = await ctx.db.queryBuilder
        .selectFrom('users')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst();

      if (!existingUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Check email uniqueness if email is being updated
      if (data.email) {
        const emailExists = await ctx.db.queryBuilder
          .selectFrom('users')
          .select('id')
          .where('email', '=', data.email)
          .where('id', '!=', id)
          .executeTakeFirst();

        if (emailExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email already in use by another user',
          });
        }
      }

      // Update user
      const [user] = await ctx.db.queryBuilder
        .updateTable('users')
        .set({
          ...(data.email && { email: data.email }),
          ...(data.firstName && { first_name: data.firstName }),
          ...(data.lastName && { last_name: data.lastName }),
          ...(data.role && { role: data.role }),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .returning([
          'id',
          'email',
          'first_name',
          'last_name',
          'role',
          'active',
          'last_login_at',
          'created_at',
          'updated_at',
        ])
        .execute();

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`,
        role: user.role,
        active: user.active,
        lastLoginAt: user.last_login_at?.toISOString() || null,
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at.toISOString(),
      };
    }),

  /**
   * Get all users with pagination
   * Converts GET /api/v1/users
   */
  getAll: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(PaginationSchema)
    .output(PagedResponseSchema(UserResponseSchema))
    .query(async ({ input, ctx }) => {
      const { page, limit } = input;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('users')
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get users
      const users = await ctx.db.queryBuilder
        .selectFrom('users')
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: `${user.first_name} ${user.last_name}`,
          role: user.role,
          active: user.active,
          lastLoginAt: user.last_login_at?.toISOString() || null,
          createdAt: user.created_at.toISOString(),
          updatedAt: user.updated_at.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Search users
   * Converts GET /api/v1/users/search
   */
  search: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(SearchQuerySchema)
    .output(PagedResponseSchema(UserResponseSchema))
    .query(async ({ input, ctx }) => {
      const { q, page, limit } = input;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('users')
        .select((eb) => eb.fn.count('id').as('count'))
        .where((eb) => eb.or([
          eb('first_name', 'ilike', `%${q}%`),
          eb('last_name', 'ilike', `%${q}%`),
          eb('email', 'ilike', `%${q}%`),
        ]))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Search users
      const users = await ctx.db.queryBuilder
        .selectFrom('users')
        .selectAll()
        .where((eb) => eb.or([
          eb('first_name', 'ilike', `%${q}%`),
          eb('last_name', 'ilike', `%${q}%`),
          eb('email', 'ilike', `%${q}%`),
        ]))
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: `${user.first_name} ${user.last_name}`,
          role: user.role,
          active: user.active,
          lastLoginAt: user.last_login_at?.toISOString() || null,
          createdAt: user.created_at.toISOString(),
          updatedAt: user.updated_at.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get users by role
   * Converts GET /api/v1/users/by-role/{role}
   */
  getByRole: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(z.object({ role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'USER']) }))
    .output(z.array(UserResponseSchema))
    .query(async ({ input, ctx }) => {
      const users = await ctx.db.queryBuilder
        .selectFrom('users')
        .selectAll()
        .where('role', '=', input.role)
        .where('active', '=', true)
        .orderBy('created_at', 'desc')
        .execute();

      return users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`,
        role: user.role,
        active: user.active,
        lastLoginAt: user.last_login_at?.toISOString() || null,
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at.toISOString(),
      }));
    }),

  /**
   * Deactivate user
   * Converts PUT /api/v1/users/{userId}/deactivate
   */
  deactivate: protectedProcedure
    .use(authMiddleware)
    .use(roleMiddleware('ADMIN'))
    .use(activityLoggingMiddleware('USER_DEACTIVATED', 'USER'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.queryBuilder
        .updateTable('users')
        .set({
          active: false,
          updated_at: new Date(),
        })
        .where('id', '=', input.id)
        .execute();

      return {
        message: 'User deactivated successfully',
        userId: input.id,
      };
    }),

  /**
   * Activate user
   * Converts PUT /api/v1/users/{userId}/activate
   */
  activate: protectedProcedure
    .use(authMiddleware)
    .use(roleMiddleware('ADMIN'))
    .use(activityLoggingMiddleware('USER_ACTIVATED', 'USER'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.queryBuilder
        .updateTable('users')
        .set({
          active: true,
          updated_at: new Date(),
        })
        .where('id', '=', input.id)
        .execute();

      return {
        message: 'User activated successfully',
        userId: input.id,
      };
    }),

  /**
   * Change user password
   * Converts PUT /api/v1/users/{userId}/change-password
   */
  changePassword: protectedProcedure
    .use(authMiddleware)
    .use(activityLoggingMiddleware('PASSWORD_CHANGED', 'USER'))
    .input(z.object({
      id: z.string(),
      data: ChangePasswordRequestSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      const { currentPassword, newPassword } = data;

      // Get current user
      const user = await ctx.db.queryBuilder
        .selectFrom('users')
        .select(['password_hash'])
        .where('id', '=', id)
        .executeTakeFirst();

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect',
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await ctx.db.queryBuilder
        .updateTable('users')
        .set({
          password_hash: newPasswordHash,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      return {
        message: 'Password changed successfully',
      };
    }),

  /**
   * Unlock user account
   * Converts PUT /api/v1/users/{userId}/unlock
   */
  unlock: protectedProcedure
    .use(authMiddleware)
    .use(roleMiddleware('ADMIN'))
    .use(activityLoggingMiddleware('ACCOUNT_UNLOCKED', 'USER'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.queryBuilder
        .updateTable('users')
        .set({
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date(),
        })
        .where('id', '=', input.id)
        .execute();

      return {
        message: 'User account unlocked successfully',
        userId: input.id,
      };
    }),

  /**
   * Get user statistics
   * Converts GET /api/v1/users/statistics
   */
  getStatistics: protectedProcedure
    .use(authMiddleware)
    .use(roleMiddleware('ADMIN'))
    .query(async ({ ctx }) => {
      const stats = await ctx.db.queryBuilder
        .selectFrom('users')
        .select([
          (eb) => eb.fn.count('id').as('total'),
          (eb) => eb.fn.count('id').filterWhere('active', '=', true).as('active'),
          (eb) => eb.fn.count('id').filterWhere('role', '=', 'ADMIN').as('admins'),
          (eb) => eb.fn.count('id').filterWhere('role', '=', 'MANAGER').as('managers'),
          (eb) => eb.fn.count('id').filterWhere('role', '=', 'EMPLOYEE').as('employees'),
          (eb) => eb.fn.count('id').filterWhere('role', '=', 'USER').as('users'),
        ])
        .executeTakeFirst();

      return {
        total: Number(stats?.total || 0),
        active: Number(stats?.active || 0),
        inactive: Number(stats?.total || 0) - Number(stats?.active || 0),
        byRole: {
          admin: Number(stats?.admins || 0),
          manager: Number(stats?.managers || 0),
          employee: Number(stats?.employees || 0),
          user: Number(stats?.users || 0),
        },
      };
    }),

  /**
   * Get user activities
   * Converts GET /api/v1/users/{userId}/activities
   */
  getActivities: protectedProcedure
    .use(authMiddleware)
    .input(z.object({
      userId: z.string(),
      ...PaginationSchema.shape,
    }))
    .output(PagedResponseSchema(UserActivityResponseSchema))
    .query(async ({ input, ctx }) => {
      const { userId, page, limit } = input;
      const offset = (page - 1) * limit;

      // Check authorization
      const currentUser = ctx.requireAuth();
      if (currentUser.id !== userId && !ctx.hasAnyRole(['ADMIN', 'MANAGER'])) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('user_activities')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('user_id', '=', userId)
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get activities
      const activities = await ctx.db.queryBuilder
        .selectFrom('user_activities')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: activities.map(activity => ({
          id: activity.id,
          action: activity.action,
          resourceType: activity.resource_type,
          resourceId: activity.resource_id,
          details: activity.details,
          ipAddress: activity.ip_address,
          userAgent: activity.user_agent,
          createdAt: activity.created_at.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),
});