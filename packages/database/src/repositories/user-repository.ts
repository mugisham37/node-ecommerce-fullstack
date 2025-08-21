import { eq, and, or, ilike } from 'drizzle-orm';
import { users } from '../schema/users';
import { BaseRepository, FilterOptions, PaginationOptions } from './base/base-repository';
import { DatabaseConnection } from '../connection';
import type { User, NewUser } from '../schema/users';

export interface UserFilters extends FilterOptions {
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  search?: string; // Search across name and email
}

export interface UserUpdateData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  passwordHash?: string;
}

/**
 * Repository for user-related database operations
 */
export class UserRepository extends BaseRepository<
  typeof users,
  User,
  NewUser,
  UserUpdateData
> {
  protected table = users;
  protected tableName = 'users';

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
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.findOneBy({ email });
  }

  /**
   * Find users by role
   */
  async findByRole(role: string): Promise<User[]> {
    return await this.findBy({ role });
  }

  /**
   * Search users by name or email
   */
  async search(
    searchTerm: string,
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<ReturnType<typeof this.findAll>> {
    const filters: UserFilters = {
      search: searchTerm,
    };
    
    return await this.findAll(pagination, filters);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const filters: FilterOptions = { email };
    
    if (excludeId) {
      filters.id = { operator: 'not', value: excludeId };
    }
    
    return await this.exists(filters);
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    byRole: Record<string, number>;
    recentlyCreated: number;
  }> {
    // Get total count
    const total = await this.count();
    
    // Get count by role using Kysely for complex aggregation
    const roleStats = await this.executeKyselyQuery(async (db) => {
      return await db
        .selectFrom('users')
        .select(['role', db.fn.count('id').as('count')])
        .groupBy('role')
        .execute();
    });
    
    const byRole = roleStats.reduce((acc, stat) => {
      acc[stat.role] = Number(stat.count);
      return acc;
    }, {} as Record<string, number>);
    
    // Get recently created users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentlyCreated = await this.count({
      createdAt: { operator: 'gte', value: thirtyDaysAgo },
    });
    
    return {
      total,
      byRole,
      recentlyCreated,
    };
  }

  /**
   * Get users with their activity count
   */
  async getUsersWithActivityCount(
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<Array<User & { activityCount: number }>> {
    return await this.executeKyselyQuery(async (db) => {
      const offset = (pagination.page - 1) * pagination.limit;
      
      return await db
        .selectFrom('users')
        .leftJoin('user_activities', 'users.id', 'user_activities.user_id')
        .select([
          'users.id',
          'users.email',
          'users.first_name as firstName',
          'users.last_name as lastName',
          'users.role',
          'users.created_at as createdAt',
          'users.updated_at as updatedAt',
          db.fn.count('user_activities.id').as('activityCount'),
        ])
        .groupBy([
          'users.id',
          'users.email',
          'users.first_name',
          'users.last_name',
          'users.role',
          'users.created_at',
          'users.updated_at',
        ])
        .orderBy('users.created_at', 'desc')
        .limit(pagination.limit)
        .offset(offset)
        .execute();
    });
  }

  /**
   * Override buildWhereConditions to handle user-specific filters
   */
  protected buildWhereConditions(filters: UserFilters): any[] {
    const conditions = super.buildWhereConditions(filters);
    
    // Handle search across multiple fields
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm),
          ilike(users.email, searchTerm)
        )
      );
    }
    
    return conditions;
  }
}