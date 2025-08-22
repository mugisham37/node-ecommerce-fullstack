import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import { getCache, setCache } from '../config/redis'
import * as loyaltyService from './loyalty.service'
import * as emailService from './email.service'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Cache TTL in seconds
const CACHE_TTL = {
  USER: 3600, // 1 hour
  USER_PROFILE: 1800, // 30 minutes
}

/**
 * Generate a unique referral code for a user
 * @param userId User ID
 * @returns Referral code
 */
const generateReferralCode = (userId: string): string => {
  const hash = crypto.createHash('sha256')
  hash.update(userId + Date.now().toString())
  return hash.digest('hex').substring(0, 8).toUpperCase()
}

/**
 * Create a new user with loyalty program initialization
 * @param userData User data
 * @param requestId Request ID for logging
 * @returns Created user
 */
export const createUser = async (
  userData: Prisma.UserCreateInput & { referralCode?: string },
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'user-create')
  logger.info('Creating new user')

  try {
    // Check if user with same email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (existingUser) {
      throw new ApiError('User with this email already exists', 400)
    }

    // Hash password if provided
    if (userData.password) {
      const saltRounds = 12
      userData.password = await bcrypt.hash(userData.password, saltRounds)
    }

    // Extract birth date components if dateOfBirth is provided
    if (userData.dateOfBirth) {
      const birthDate = new Date(userData.dateOfBirth)
      userData.birthMonth = birthDate.getMonth() + 1
      userData.birthDay = birthDate.getDate()
      userData.birthYear = birthDate.getFullYear()
    }

    // Create user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create new user
      const user = await tx.user.create({
        data: {
          ...userData,
          role: userData.role || 'CUSTOMER',
          isActive: true,
          isEmailVerified: false,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
        },
      })

      // Initialize loyalty program for customers
      if (user.role === 'CUSTOMER') {
        try {
          // Get the default tier (Bronze/lowest level)
          const defaultTier = await tx.loyaltyTier.findFirst({
            where: { active: true },
            orderBy: { level: 'asc' },
          })

          if (defaultTier) {
            // Generate unique referral code
            let referralCode: string
            let isUnique = false
            let attempts = 0
            const maxAttempts = 10

            do {
              referralCode = generateReferralCode(user.id)
              const existing = await tx.loyaltyProgram.findUnique({
                where: { referralCode },
              })
              isUnique = !existing
              attempts++
            } while (!isUnique && attempts < maxAttempts)

            if (!isUnique) {
              throw new ApiError('Failed to generate unique referral code', 500)
            }

            // Create loyalty program
            await tx.loyaltyProgram.create({
              data: {
                userId: user.id,
                tierId: defaultTier.id,
                points: 0,
                lifetimePoints: 0,
                referralCode: referralCode!,
              },
            })
          }
        } catch (loyaltyError: any) {
          logger.error(`Error initializing loyalty program: ${loyaltyError.message}`)
          // Continue processing even if loyalty program initialization fails
        }
      }

      return user
    })

    // Send welcome email (outside transaction to avoid blocking)
    if (result.email) {
      try {
        await emailService.sendWelcomeEmail(
          result.email,
          {
            firstName: result.firstName,
            storeName: process.env.STORE_NAME || 'Our Store',
            year: new Date().getFullYear(),
            storeUrl: process.env.FRONTEND_URL || 'https://example.com',
          },
          'en',
          requestId
        )
      } catch (emailError: any) {
        logger.error(`Error sending welcome email: ${emailError.message}`)
        // Continue processing even if email fails
      }
    }

    // Process referral code if provided (outside transaction)
    if (userData.referralCode && result.role === 'CUSTOMER') {
      try {
        await loyaltyService.processReferralPoints(userData.referralCode, result.id, requestId)
      } catch (referralError: any) {
        logger.error(`Error processing referral code: ${referralError.message}`)
        // Continue processing even if referral code application fails
      }
    }

    return result
  } catch (error: any) {
    logger.error(`Error creating user: ${error.message}`)
    throw error
  }
}

/**
 * Get user by ID
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns User object
 */
export const getUserById = async (userId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'user-get-by-id')
  logger.info(`Getting user by ID: ${userId}`)

  // Try to get from cache
  const cacheKey = `user:${userId}`
  const cachedUser = await getCache<any>(cacheKey)

  if (cachedUser) {
    logger.info(`Retrieved user from cache`)
    return cachedUser
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        lastLoginAt: true,
        bio: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new ApiError('User not found', 404)
    }

    // Cache the user
    await setCache(cacheKey, user, CACHE_TTL.USER)

    return user
  } catch (error: any) {
    logger.error(`Error getting user: ${error.message}`)
    throw error
  }
}

/**
 * Get user by email
 * @param email User email
 * @param requestId Request ID for logging
 * @returns User object
 */
export const getUserByEmail = async (email: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'user-get-by-email')
  logger.info(`Getting user by email: ${email}`)

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        lastLoginAt: true,
        bio: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new ApiError('User not found', 404)
    }

    return user
  } catch (error: any) {
    logger.error(`Error getting user by email: ${error.message}`)
    throw error
  }
}

/**
 * Update user
 * @param userId User ID
 * @param updateData Update data
 * @param requestId Request ID for logging
 * @returns Updated user
 */
export const updateUser = async (
  userId: string,
  updateData: Prisma.UserUpdateInput,
  requestId?: string
): Promise<any> => {
  const logger = createRequestLogger(requestId || 'user-update')
  logger.info(`Updating user: ${userId}`)

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      throw new ApiError('User not found', 404)
    }

    // Hash password if being updated
    if (updateData.password && typeof updateData.password === 'string') {
      const saltRounds = 12
      updateData.password = await bcrypt.hash(updateData.password, saltRounds)
      updateData.passwordChangedAt = new Date()
    }

    // Extract birth date components if dateOfBirth is being updated
    if (updateData.dateOfBirth) {
      const birthDate = new Date(updateData.dateOfBirth as Date)
      updateData.birthMonth = birthDate.getMonth() + 1
      updateData.birthDay = birthDate.getDate()
      updateData.birthYear = birthDate.getFullYear()
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        lastLoginAt: true,
        bio: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Clear cache
    await setCache(`user:${userId}`, null, 1)

    return updatedUser
  } catch (error: any) {
    logger.error(`Error updating user: ${error.message}`)
    throw error
  }
}

/**
 * Delete user (soft delete)
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns Deleted user
 */
export const deleteUser = async (userId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'user-delete')
  logger.info(`Deleting user: ${userId}`)

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      throw new ApiError('User not found', 404)
    }

    // Soft delete user
    const deletedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        email: `deleted_${Date.now()}_${existingUser.email}`, // Prevent email conflicts
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        deletedAt: true,
      },
    })

    // Clear cache
    await setCache(`user:${userId}`, null, 1)

    return deletedUser
  } catch (error: any) {
    logger.error(`Error deleting user: ${error.message}`)
    throw error
  }
}

/**
 * Get user profile with loyalty information
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns User profile with loyalty data
 */
export const getUserProfile = async (userId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'user-profile')
  logger.info(`Getting user profile: ${userId}`)

  // Try to get from cache
  const cacheKey = `user_profile:${userId}`
  const cachedProfile = await getCache<any>(cacheKey)

  if (cachedProfile) {
    logger.info('Retrieved user profile from cache')
    return cachedProfile
  }

  try {
    // Get user with loyalty program
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        loyaltyProgram: {
          include: {
            tier: true,
          },
        },
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
      },
    })

    if (!user) {
      throw new ApiError('User not found', 404)
    }

    // Get loyalty statistics if user has loyalty program
    let loyaltyStats = null
    if (user.loyaltyProgram) {
      try {
        loyaltyStats = await loyaltyService.getLoyaltyStatistics(userId, 'all', requestId)
      } catch (loyaltyError: any) {
        logger.error(`Error getting loyalty statistics: ${loyaltyError.message}`)
      }
    }

    // Prepare profile data
    const profile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      bio: user.bio,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      defaultAddress: user.addresses[0] || null,
      orderCount: user._count.orders,
      reviewCount: user._count.reviews,
      loyaltyProgram: user.loyaltyProgram ? {
        points: user.loyaltyProgram.points,
        lifetimePoints: user.loyaltyProgram.lifetimePoints,
        referralCode: user.loyaltyProgram.referralCode,
        tier: user.loyaltyProgram.tier,
        statistics: loyaltyStats,
      } : null,
    }

    // Cache the profile
    await setCache(cacheKey, profile, CACHE_TTL.USER_PROFILE)

    return profile
  } catch (error: any) {
    logger.error(`Error getting user profile: ${error.message}`)
    throw error
  }
}

/**
 * Get all users with pagination
 * @param options Query options
 * @param requestId Request ID for logging
 * @returns Users with pagination
 */
export const getAllUsers = async (
  options: {
    page?: number
    limit?: number
    role?: string
    isActive?: boolean
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {},
  requestId?: string
): Promise<{
  users: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}> => {
  const logger = createRequestLogger(requestId || 'user-get-all')
  logger.info('Getting all users')

  try {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options

    // Build where clause
    const where: Prisma.UserWhereInput = {}

    if (role) {
      where.role = role as any
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Calculate skip value
    const skip = (page - 1) * limit

    // Get users and total count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              reviews: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  } catch (error: any) {
    logger.error(`Error getting all users: ${error.message}`)
    throw new ApiError(`Failed to get users: ${error.message}`, 500)
  }
}

/**
 * Update user last login
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns Updated user
 */
export const updateLastLogin = async (userId: string, requestId?: string): Promise<void> => {
  const logger = createRequestLogger(requestId || 'user-update-login')
  logger.info(`Updating last login for user: ${userId}`)

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    })

    // Clear cache
    await setCache(`user:${userId}`, null, 1)
    await setCache(`user_profile:${userId}`, null, 1)
  } catch (error: any) {
    logger.error(`Error updating last login: ${error.message}`)
    // Don't throw error to avoid breaking login flow
  }
}

/**
 * Verify user email
 * @param userId User ID
 * @param requestId Request ID for logging
 * @returns Updated user
 */
export const verifyUserEmail = async (userId: string, requestId?: string): Promise<any> => {
  const logger = createRequestLogger(requestId || 'user-verify-email')
  logger.info(`Verifying email for user: ${userId}`)

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
      },
    })

    // Clear cache
    await setCache(`user:${userId}`, null, 1)
    await setCache(`user_profile:${userId}`, null, 1)

    return updatedUser
  } catch (error: any) {
    logger.error(`Error verifying user email: ${error.message}`)
    throw error
  }
}

/**
 * Get user statistics
 * @param requestId Request ID for logging
 * @returns User statistics
 */
export const getUserStatistics = async (requestId?: string): Promise<{
  totalUsers: number
  activeUsers: number
  verifiedUsers: number
  customerCount: number
  vendorCount: number
  adminCount: number
  newUsersThisMonth: number
  newUsersThisWeek: number
}> => {
  const logger = createRequestLogger(requestId || 'user-statistics')
  logger.info('Getting user statistics')

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      customerCount,
      vendorCount,
      adminCount,
      newUsersThisMonth,
      newUsersThisWeek,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isEmailVerified: true } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'VENDOR' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    ])

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      customerCount,
      vendorCount,
      adminCount,
      newUsersThisMonth,
      newUsersThisWeek,
    }
  } catch (error: any) {
    logger.error(`Error getting user statistics: ${error.message}`)
    throw new ApiError(`Failed to get user statistics: ${error.message}`, 500)
  }
}
