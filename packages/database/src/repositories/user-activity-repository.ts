import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { userActivities } from '../schema/user-activities';
import { BaseRepository, FilterOptions, PaginationOptions } from './base/base-repository';
import { DatabaseConnection } from '../connection';
import type { UserActivity, NewUserActivity } from '../schema/user-activities';

export interface UserActivityFilters extends FilterOptions {
  userId?: string;
  action?: string;
  resource?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UserActivityUpdateData {
  action?: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserActivityWithUser extends UserActivity {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Repository for user activity-related database operations
 */
export class UserActivityRepository extends BaseRepository<
  typeof userActivities,
  UserActivity,
  NewUserActivity,
  UserActivityUpdateData
> {
  protected table = userActivities;
  protected tableName = 'user_activities';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find activities by user ID
   */
  async findByUserId(
    userId: string,
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<ReturnType<typeof this.findAll>> {
    return await this.findAll(pagination, { userId });
  }

  /**
   * Find activities by action
   */
  async findByAction(action: string): Promise<UserActivity[]> {
    return await this.findBy({ action });
  }

  /**
   * Find activities by resource
   */
  async findByResource(resource: string): Promise<UserActivity[]> {
    return await this.findBy({ resource });
  }

  /**
   * Get activities with user details
   */
  async getActivitiesWithUser(
    pagination: PaginationOptions = { page: 1, limit: 10 },
    filters: UserActivityFilters = {}
  ): Promise<{
    data: UserActivityWithUser[];
    pagination: ReturnType<typeof this.findAll>['pagination'];
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const offset = (pagination.page - 1) * pagination.limit;
      
      let query = db
        .selectFrom('user_activities')
        .leftJoin('users', 'user_activities.user_id', 'users.id')
        .select([
          'user_activities.id',
          'user_activities.user_id as userId',
          'user_activities.action',
          'user_activities.resource',
          'user_activities.resource_id as resourceId',
          'user_activities.details',
          'user_activities.ip_address as ipAddress',
          'user_activities.user_agent as userAgent',
          'user_activities.created_at as createdAt',
          'user_activities.updated_at as updatedAt',
          'users.email as user_email',
          'users.first_name as user_firstName',
          'users.last_name as user_lastName',
        ]);

      // Apply filters
      if (filters.userId) {
        query = query.where('user_activities.user_id', '=', filters.userId);
      }

      if (filters.action) {
        query = query.where('user_activities.action', '=', filters.action);
      }

      if (filters.resource) {
        query = query.where('user_activities.resource', '=', filters.resource);
      }

      if (filters.dateFrom) {
        query = query.where('user_activities.created_at', '>=', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.where('user_activities.created_at', '<=', filters.dateTo);
      }

      // Get total count
      const countQuery = query.clearSelect().select(db.fn.count('user_activities.id').as('count'));
      const [{ count: total }] = await countQuery.execute();

      // Apply pagination and sorting
      query = query
        .orderBy('user_activities.created_at', 'desc')
        .limit(pagination.limit)
        .offset(offset);

      const data = await query.execute();

      // Transform the result
      const transformedData: UserActivityWithUser[] = data.map((row: any) => ({
        id: row.id,
        userId: row.userId,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        details: row.details,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: row.user_email ? {
          id: row.userId,
          email: row.user_email,
          firstName: row.user_firstName,
          lastName: row.user_lastName,
        } : undefined,
      }));

      const totalPages = Math.ceil(Number(total) / pagination.limit);

      return {
        data: transformedData,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: Number(total),
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        },
      };
    });
  }

  /**
   * Log user activity
   */
  async logActivity(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserActivity> {
    const activityData: NewUserActivity = {
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
    };

    return await this.create(activityData);
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(): Promise<{
    totalActivities: number;
    activitiesByAction: Record<string, number>;
    activitiesByResource: Record<string, number>;
    recentActivities: number;
    topUsers: Array<{ userId: string; userEmail: string; activityCount: number }>;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      // Get total activities
      const [totalResult] = await db
        .selectFrom('user_activities')
        .select([db.fn.count('id').as('total')])
        .execute();

      // Get activities by action
      const actionStats = await db
        .selectFrom('user_activities')
        .select(['action', db.fn.count('id').as('count')])
        .groupBy('action')
        .execute();

      const activitiesByAction = actionStats.reduce((acc, stat) => {
        acc[stat.action] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      // Get activities by resource
      const resourceStats = await db
        .selectFrom('user_activities')
        .select(['resource', db.fn.count('id').as('count')])
        .groupBy('resource')
        .execute();

      const activitiesByResource = resourceStats.reduce((acc, stat) => {
        acc[stat.resource] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      // Get recent activities (last 24 hours)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const [recentResult] = await db
        .selectFrom('user_activities')
        .select([db.fn.count('id').as('recent')])
        .where('created_at', '>=', twentyFourHoursAgo)
        .execute();

      // Get top users by activity count
      const topUsers = await db
        .selectFrom('user_activities')
        .innerJoin('users', 'user_activities.user_id', 'users.id')
        .select([
          'users.id as userId',
          'users.email as userEmail',
          db.fn.count('user_activities.id').as('activityCount'),
        ])
        .groupBy(['users.id', 'users.email'])
        .orderBy('activityCount', 'desc')
        .limit(10)
        .execute();

      return {
        totalActivities: Number(totalResult.total),
        activitiesByAction,
        activitiesByResource,
        recentActivities: Number(recentResult.recent),
        topUsers: topUsers.map((user: any) => ({
          userId: user.userId,
          userEmail: user.userEmail,
          activityCount: Number(user.activityCount),
        })),
      };
    });
  }

  /**
   * Get daily activity statistics
   */
  async getDailyActivityStats(
    dateFrom: Date,
    dateTo: Date
  ): Promise<Array<{
    date: string;
    activityCount: number;
    uniqueUsers: number;
  }>> {
    return await this.executeKyselyQuery(async (db) => {
      return await db
        .selectFrom('user_activities')
        .select([
          db.fn('DATE', ['created_at']).as('date'),
          db.fn.count('id').as('activityCount'),
          db.fn.countDistinct('user_id').as('uniqueUsers'),
        ])
        .where('created_at', '>=', dateFrom)
        .where('created_at', '<=', dateTo)
        .groupBy(db.fn('DATE', ['created_at']))
        .orderBy('date', 'asc')
        .execute()
        .then((results: any[]) =>
          results.map(row => ({
            date: row.date,
            activityCount: Number(row.activityCount),
            uniqueUsers: Number(row.uniqueUsers),
          }))
        );
    });
  }

  /**
   * Clean up old activities (older than specified days)
   */
  async cleanupOldActivities(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.db.drizzle
      .delete(userActivities)
      .where(lte(userActivities.createdAt, cutoffDate))
      .returning();

    return result.length;
  }

  /**
   * Override buildWhereConditions to handle user activity-specific filters
   */
  protected buildWhereConditions(filters: UserActivityFilters): any[] {
    const conditions = super.buildWhereConditions(filters);
    
    // Handle date range filters
    if (filters.dateFrom) {
      conditions.push(gte(userActivities.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(userActivities.createdAt, filters.dateTo));
    }
    
    return conditions;
  }
}