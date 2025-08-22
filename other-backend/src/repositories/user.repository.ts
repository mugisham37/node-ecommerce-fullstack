import { User, Prisma, UserRole } from '@prisma/client'
import prisma from '../database/client'
import { BaseRepository } from './base.repository'

export type UserCreateInput = Prisma.UserCreateInput
export type UserUpdateInput = Prisma.UserUpdateInput
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    addresses: true
    loyaltyProgram: true
    cart: true
  }
}>

export interface UserSearchParams {
  query?: string
  role?: UserRole
  isActive?: boolean
  isEmailVerified?: boolean
  registeredAfter?: Date
  registeredBefore?: Date
  lastLoginAfter?: Date
  lastLoginBefore?: Date
}

export class UserRepository extends BaseRepository<User, UserCreateInput, UserUpdateInput> {
  protected modelName = 'User'
  protected model = prisma.user

  protected supportsSoftDelete(): boolean {
    return true
  }

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return this.model.findUnique({
      where: { email },
    })
  }

  // Find user with all relations
  async findByIdWithRelations(id: string): Promise<UserWithRelations | null> {
    return this.model.findUnique({
      where: { id },
      include: {
        addresses: true,
        loyaltyProgram: {
          include: {
            tier: true,
          },
        },
        cart: {
          include: {
            items: {
              include: {
                product: true,
                productVariant: true,
              },
            },
          },
        },
      },
    })
  }

  // Search users with advanced filters
  async searchUsers(params: UserSearchParams) {
    const {
      query,
      role,
      isActive,
      isEmailVerified,
      registeredAfter,
      registeredBefore,
      lastLoginAfter,
      lastLoginBefore,
    } = params

    const where: Prisma.UserWhereInput = {}

    // Text search
    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ]
    }

    // Role filter
    if (role) {
      where.role = role
    }

    // Status filters
    if (typeof isActive === 'boolean') {
      where.isActive = isActive
    }

    if (typeof isEmailVerified === 'boolean') {
      where.isEmailVerified = isEmailVerified
    }

    // Date range filters
    if (registeredAfter || registeredBefore) {
      where.createdAt = {}
      if (registeredAfter) {
        where.createdAt.gte = registeredAfter
      }
      if (registeredBefore) {
        where.createdAt.lte = registeredBefore
      }
    }

    if (lastLoginAfter || lastLoginBefore) {
      where.lastLoginAt = {}
      if (lastLoginAfter) {
        where.lastLoginAt.gte = lastLoginAfter
      }
      if (lastLoginBefore) {
        where.lastLoginAt.lte = lastLoginBefore
      }
    }

    return this.findMany({ where })
  }

  // Update last login
  async updateLastLogin(id: string): Promise<User> {
    return this.model.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    })
  }

  // Verify email
  async verifyEmail(id: string): Promise<User> {
    return this.model.update({
      where: { id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    })
  }

  // Verify phone
  async verifyPhone(id: string): Promise<User> {
    return this.model.update({
      where: { id },
      data: {
        isPhoneVerified: true,
        phoneVerifiedAt: new Date(),
      },
    })
  }

  // Update password
  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    return this.model.update({
      where: { id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    })
  }

  // Enable/disable two-factor authentication
  async updateTwoFactor(id: string, enabled: boolean, secret?: string): Promise<User> {
    return this.model.update({
      where: { id },
      data: {
        twoFactorEnabled: enabled,
        twoFactorSecret: secret,
      },
    })
  }

  // Get user statistics
  async getUserStats(id: string) {
    const [user, orderStats, loyaltyProgram] = await Promise.all([
      this.findById(id),
      prisma.order.aggregate({
        where: {
          userId: id,
          status: 'DELIVERED',
        },
        _count: true,
        _sum: {
          total: true,
        },
        _avg: {
          total: true,
        },
      }),
      prisma.loyaltyProgram.findUnique({
        where: { userId: id },
        include: { tier: true },
      }),
    ])

    if (!user) {
      throw new Error('User not found')
    }

    const accountAge = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      totalOrders: orderStats._count || 0,
      totalSpent: orderStats._sum.total || 0,
      averageOrderValue: orderStats._avg.total || 0,
      loyaltyPoints: loyaltyProgram?.points || 0,
      loyaltyTier: loyaltyProgram?.tier?.name || 'None',
      accountAge,
      lastOrderDate: await this.getLastOrderDate(id),
    }
  }

  // Get last order date
  private async getLastOrderDate(userId: string): Promise<Date | null> {
    const lastOrder = await prisma.order.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    return lastOrder?.createdAt || null
  }

  // Get users by birth month (for birthday campaigns)
  async getUsersByBirthMonth(month: number) {
    return this.findMany({
      where: {
        birthMonth: month,
        isActive: true,
      },
    })
  }

  // Get active users count
  async getActiveUsersCount(): Promise<number> {
    return this.count({
      isActive: true,
      lastLoginAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    })
  }

  // Get new users count for a period
  async getNewUsersCount(startDate: Date, endDate: Date): Promise<number> {
    return this.count({
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    })
  }

  // Bulk update user preferences
  async updateUserPreferences(id: string, preferences: any): Promise<User> {
    return this.model.update({
      where: { id },
      data: {
        preferences,
      },
    })
  }

  // Get users for email campaigns
  async getUsersForEmailCampaign(criteria: {
    roles?: UserRole[]
    isActive?: boolean
    isEmailVerified?: boolean
    hasOrders?: boolean
    loyaltyTierIds?: string[]
  }) {
    const where: Prisma.UserWhereInput = {
      isActive: criteria.isActive ?? true,
      isEmailVerified: criteria.isEmailVerified ?? true,
    }

    if (criteria.roles?.length) {
      where.role = { in: criteria.roles }
    }

    if (criteria.hasOrders) {
      where.orders = {
        some: {},
      }
    }

    if (criteria.loyaltyTierIds?.length) {
      where.loyaltyProgram = {
        tierId: { in: criteria.loyaltyTierIds },
      }
    }

    return this.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        preferences: true,
      },
    })
  }
}

export const userRepository = new UserRepository()
