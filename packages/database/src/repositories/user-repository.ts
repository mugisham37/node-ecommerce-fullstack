import { eq, and, or, ilike, gte, lte } from 'drizzle-orm';
import { users } from '../schema/users';
import { BaseRepository, FilterOptions, PaginationOptions, PagedResult } from './base/base-repository';
import { DatabaseConnection } from '../connection';
import type { User, NewUser } from '../schema/users';

export interface UserFilters extends FilterOptions {
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  registeredAfter?: Date;
  registeredBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  search?: string; // Search across name and email
}

export interface UserUpdateData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  passwordHash?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  passwordChangedAt?: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  preferences?: any;
}

export interface UserWithRelations extends User {
  // Add relations when needed
}

export interface UserStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  loyaltyPoints: number;
  loyaltyTier: string;
  accountAge: number;
  lastOrderDate: Date | null;
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
   * Update last login
   */
  async updateLastLogin(id: string): Promise<User | null> {
    return await this.update(id, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * Verify email
   */
  async verifyEmail(id: string): Promise<User | null> {
    return await this.update(id, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  /**
   * Verify phone
   */
  async verifyPhone(id: string): Promise<User | null> {
    return await this.update(id, {
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
    });
  }

  /**
   * Update password
   */
  async updatePassword(id: string, hashedPassword: string): Promise<User | null> {
    return await this.update(id, {
      passwordHash: hashedPassword,
      passwordChangedAt: new Date(),
    });
  }

  /**
   * Enable/disable two-factor authentication
   */
  async updateTwoFactor(id: string, enabled: boolean, secret?: string): Promise<User | null> {
    return await this.update(id, {
      twoFactorEnabled: enabled,
      twoFactorSecret: secret,
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats(id: string): Promise<UserStats> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return await this.executeKyselyQuery(async (db) => {
      // This would need to be implemented based on your order schema
      const orderStats = {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
      };

      const accountAge = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        totalOrders: orderStats.totalOrders,
        totalSpent: orderStats.totalSpent,
        averageOrderValue: orderStats.averageOrderValue,
        loyaltyPoints: 0, // Would come from loyalty system
        loyaltyTier: 'None',
        accountAge,
        lastOrderDate: null,
      };
    });
  }

  /**
   * Get active users count
   */
  async getActiveUsersCount(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return await this.count({
      isActive: true,
      lastLoginAt: { operator: 'gte', value: thirtyDaysAgo },
    });
  }

  /**
   * Get new users count for a period
   */
  async getNewUsersCount(startDate: Date, endDate: Date): Promise<number> {
    return await this.count({
      createdAt: { operator: 'between', min: startDate, max: endDate },
    });
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(id: string, preferences: any): Promise<User | null> {
    return await this.update(id, {
      preferences,
    });
  }

  /**
   * Get users for email campaigns
   */
  async getUsersForEmailCampaign(criteria: {
    roles?: string[];
    isActive?: boolean;
    isEmailVerified?: boolean;
    hasOrders?: boolean;
  }): Promise<Array<Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'preferences'>>> {
    return await this.executeKyselyQuery(async (db) => {
      let query = db
        .selectFrom('users')
        .select([
          'id',
          'email',
          'first_name as firstName',
          'last_name as lastName',
          'preferences',
        ])
        .where('is_active', '=', criteria.isActive ?? true)
        .where('is_email_verified', '=', criteria.isEmailVerified ?? true);

      if (criteria.roles?.length) {
        query = query.where('role', 'in', criteria.roles);
      }

      // Note: hasOrders would need to be implemented based on your order schema

      return await query.execute();
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

    // Handle date range filters
    if (filters.registeredAfter) {
      conditions.push(gte(users.createdAt, filters.registeredAfter));
    }
    if (filters.registeredBefore) {
      conditions.push(lte(users.createdAt, filters.registeredBefore));
    }
    if (filters.lastLoginAfter) {
      conditions.push(gte(users.lastLoginAt, filters.lastLoginAfter));
    }
    if (filters.lastLoginBefore) {
      conditions.push(lte(users.lastLoginAt, filters.lastLoginBefore));
    }
    
    return conditions;
  }
}