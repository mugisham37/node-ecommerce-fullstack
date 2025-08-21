/**
 * User Service for managing user operations
 * Handles user creation, authentication, role management, and user lifecycle
 * Converted from Java Spring Boot UserService
 */

import { AbstractBaseService, ServiceContext, PaginationOptions, PagedResult } from '../base/BaseService';
import { 
  User, 
  UserCreateDTO, 
  UserUpdateDTO, 
  UserRole,
  NotFoundError,
  ConflictError,
  ValidationError 
} from '../base/types';

export interface UserStatistics {
  totalUsers: number;
  adminCount: number;
  managerCount: number;
  employeeCount: number;
  lockedUsers: number;
}

export class UserService extends AbstractBaseService<User, UserCreateDTO, UserUpdateDTO> {
  constructor(context: ServiceContext) {
    super(context, 'User');
  }

  /**
   * Create a new user with validation and cache warming
   */
  async create(request: UserCreateDTO): Promise<User> {
    this.log('info', `Creating new user with email: ${request.email}`);

    // Check if user already exists
    const existingUser = await this.findByEmail(request.email);
    if (existingUser) {
      throw new ConflictError(`User with email ${request.email} already exists`);
    }

    // Hash password
    const passwordHash = await this.hashPassword(request.password);

    // Create user entity
    const userData = {
      id: this.generateId(),
      email: request.email,
      passwordHash,
      firstName: request.firstName,
      lastName: request.lastName,
      role: request.role,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    const savedUser = await this.saveUser(userData);

    // Warm cache
    await this.warmCache(savedUser);

    // Publish event
    await this.publishEvent('USER_CREATED', {
      userId: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
    });

    this.log('info', `Successfully created user with ID: ${savedUser.id}`);
    return this.sanitizeUser(savedUser);
  }

  /**
   * Update user information with cache invalidation
   */
  async update(userId: string, request: UserUpdateDTO): Promise<User> {
    this.log('info', `Updating user with ID: ${userId}`);

    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Check email uniqueness if email is being updated
    if (request.email && request.email !== user.email) {
      const existingUser = await this.findByEmail(request.email);
      if (existingUser) {
        throw new ConflictError(`User with email ${request.email} already exists`);
      }
    }

    // Update user fields
    const updatedData = {
      ...user,
      ...request,
      updatedAt: new Date(),
    };

    const updatedUser = await this.saveUser(updatedData);

    // Invalidate caches
    await this.invalidateUserCaches(userId, user.email);

    // Publish event
    await this.publishEvent('USER_UPDATED', {
      userId: updatedUser.id,
      changes: request,
    });

    this.log('info', `Successfully updated user with ID: ${updatedUser.id}`);
    return this.sanitizeUser(updatedUser);
  }

  /**
   * Find user by ID with caching
   */
  async findById(userId: string): Promise<User> {
    const cacheKey = this.getCacheKey('findById', userId);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return this.sanitizeUser(cached);
      }
    }

    // Query database
    const user = await this.queryUserById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, user, 300); // 5 minutes TTL
    }

    return this.sanitizeUser(user);
  }

  /**
   * Find all users with pagination and caching
   */
  async findAll(pagination: PaginationOptions): Promise<PagedResult<User>> {
    const cacheKey = this.getCacheKey('findAll', pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          data: cached.data.map((user: any) => this.sanitizeUser(user))
        };
      }
    }

    // Query database
    const result = await this.queryUsers(pagination);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, result, 180); // 3 minutes TTL
    }

    return {
      ...result,
      data: result.data.map(user => this.sanitizeUser(user))
    };
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = this.getCacheKey('findByEmail', email);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached ? this.sanitizeUser(cached) : null;
      }
    }

    // Query database
    const user = await this.queryUserByEmail(email);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, user, 300); // 5 minutes TTL
    }

    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Search users by name or email
   */
  async searchUsers(searchTerm: string, pagination: PaginationOptions): Promise<PagedResult<User>> {
    this.log('debug', `Searching users with term: ${searchTerm}`);

    const result = await this.querySearchUsers(searchTerm, pagination);
    
    return {
      ...result,
      data: result.data.map(user => this.sanitizeUser(user))
    };
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    const cacheKey = this.getCacheKey('getUsersByRole', role);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached.map((user: any) => this.sanitizeUser(user));
      }
    }

    // Query database
    const users = await this.queryUsersByRole(role);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, users, 300); // 5 minutes TTL
    }

    return users.map(user => this.sanitizeUser(user));
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    this.log('info', `Changing password for user ID: ${userId}`);

    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Verify current password (skip for admin)
    const currentUser = this.context.currentUser;
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      const isValidPassword = await this.verifyPassword(currentPassword, (user as any).passwordHash);
      if (!isValidPassword) {
        throw new ValidationError('Current password is incorrect');
      }
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    await this.updateUserPassword(userId, newPasswordHash);

    // Publish event
    await this.publishEvent('USER_PASSWORD_CHANGED', {
      userId,
      changedBy: this.getCurrentUserId(),
    });

    this.log('info', `Successfully changed password for user ID: ${userId}`);
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(userId: string): Promise<void> {
    this.log('info', `Deactivating user with ID: ${userId}`);

    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    await this.updateUserStatus(userId, false);

    // Invalidate caches
    await this.invalidateUserCaches(userId, user.email);

    // Publish event
    await this.publishEvent('USER_DEACTIVATED', {
      userId,
      deactivatedBy: this.getCurrentUserId(),
    });

    this.log('info', `Successfully deactivated user with ID: ${userId}`);
  }

  /**
   * Activate user
   */
  async activateUser(userId: string): Promise<void> {
    this.log('info', `Activating user with ID: ${userId}`);

    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    await this.updateUserStatus(userId, true);
    await this.resetFailedLoginAttempts(userId);

    // Warm cache
    const updatedUser = await this.queryUserById(userId);
    if (updatedUser) {
      await this.warmCache(updatedUser);
    }

    // Publish event
    await this.publishEvent('USER_ACTIVATED', {
      userId,
      activatedBy: this.getCurrentUserId(),
    });

    this.log('info', `Successfully activated user with ID: ${userId}`);
  }

  /**
   * Handle successful login
   */
  async handleSuccessfulLogin(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User', email);
    }

    await this.updateLastLogin(user.id);
    await this.resetFailedLoginAttempts(user.id);

    // Publish event
    await this.publishEvent('USER_LOGIN_SUCCESS', {
      userId: user.id,
      email,
      timestamp: new Date(),
    });

    this.log('info', `Updated last login for user: ${email}`);
  }

  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (user) {
      await this.incrementFailedLoginAttempts(user.id);
      
      const isLocked = await this.isAccountLocked(user.id);
      if (isLocked) {
        this.log('warn', `Account locked for user: ${email} due to failed login attempts`);
        
        // Publish event
        await this.publishEvent('USER_ACCOUNT_LOCKED', {
          userId: user.id,
          email,
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Check if user account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    return await this.queryAccountLockStatus(userId);
  }

  /**
   * Unlock user account
   */
  async unlockUserAccount(userId: string): Promise<void> {
    this.log('info', `Unlocking account for user ID: ${userId}`);

    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    await this.resetFailedLoginAttempts(userId);

    // Publish event
    await this.publishEvent('USER_ACCOUNT_UNLOCKED', {
      userId,
      unlockedBy: this.getCurrentUserId(),
    });

    this.log('info', `Successfully unlocked account for user ID: ${userId}`);
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<UserStatistics> {
    const cacheKey = this.getCacheKey('getUserStatistics');
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const stats = await this.queryUserStatistics();
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, stats, 600); // 10 minutes TTL
    }

    return stats;
  }

  /**
   * Delete user (hard delete)
   */
  async delete(userId: string): Promise<void> {
    this.log('info', `Deleting user with ID: ${userId}`);

    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Check if user can be deleted (business rules)
    const canDelete = await this.canDeleteUser(userId);
    if (!canDelete) {
      throw new ValidationError('User cannot be deleted due to existing dependencies');
    }

    await this.deleteUserFromDatabase(userId);

    // Invalidate caches
    await this.invalidateUserCaches(userId, user.email);

    // Publish event
    await this.publishEvent('USER_DELETED', {
      userId,
      deletedBy: this.getCurrentUserId(),
    });

    this.log('info', `Successfully deleted user with ID: ${userId}`);
  }

  // Private helper methods

  private async hashPassword(password: string): Promise<string> {
    // Implementation would use bcrypt or similar
    // For now, returning a mock hash
    return `hashed_${password}`;
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Implementation would use bcrypt or similar
    return hash === `hashed_${password}`;
  }

  private generateId(): string {
    // Implementation would generate UUID
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeUser(user: any): User {
    // Remove sensitive fields like passwordHash
    const { passwordHash, ...sanitized } = user;
    return sanitized as User;
  }

  private async warmCache(user: any): Promise<void> {
    if (this.context.cache) {
      await this.context.cache.set(this.getCacheKey('findById', user.id), user, 300);
      await this.context.cache.set(this.getCacheKey('findByEmail', user.email), user, 300);
    }
  }

  private async invalidateUserCaches(userId: string, email: string): Promise<void> {
    if (this.context.cache) {
      await this.context.cache.del(this.getCacheKey('findById', userId));
      await this.context.cache.del(this.getCacheKey('findByEmail', email));
      await this.context.cache.del(this.getCacheKey('findAll', '*'));
      await this.context.cache.del(this.getCacheKey('getUserStatistics'));
    }
  }

  // Database query methods (to be implemented with actual database layer)
  private async saveUser(userData: any): Promise<any> {
    // Implementation would use database layer
    return userData;
  }

  private async queryUserById(userId: string): Promise<any> {
    // Implementation would use database layer
    return null;
  }

  private async queryUserByEmail(email: string): Promise<any> {
    // Implementation would use database layer
    return null;
  }

  private async queryUsers(pagination: PaginationOptions): Promise<PagedResult<any>> {
    // Implementation would use database layer
    return {
      data: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  private async querySearchUsers(searchTerm: string, pagination: PaginationOptions): Promise<PagedResult<any>> {
    // Implementation would use database layer
    return {
      data: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  private async queryUsersByRole(role: UserRole): Promise<any[]> {
    // Implementation would use database layer
    return [];
  }

  private async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    // Implementation would use database layer
  }

  private async updateUserStatus(userId: string, active: boolean): Promise<void> {
    // Implementation would use database layer
  }

  private async updateLastLogin(userId: string): Promise<void> {
    // Implementation would use database layer
  }

  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    // Implementation would use database layer
  }

  private async incrementFailedLoginAttempts(userId: string): Promise<void> {
    // Implementation would use database layer
  }

  private async queryAccountLockStatus(userId: string): Promise<boolean> {
    // Implementation would use database layer
    return false;
  }

  private async queryUserStatistics(): Promise<UserStatistics> {
    // Implementation would use database layer
    return {
      totalUsers: 0,
      adminCount: 0,
      managerCount: 0,
      employeeCount: 0,
      lockedUsers: 0,
    };
  }

  private async canDeleteUser(userId: string): Promise<boolean> {
    // Implementation would check business rules
    return true;
  }

  private async deleteUserFromDatabase(userId: string): Promise<void> {
    // Implementation would use database layer
  }
}