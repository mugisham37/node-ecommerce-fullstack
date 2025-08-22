import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User, JWTPayload } from '@shared/types/auth.types'
import { ApiError } from '../utils/api-error'
import { asyncHandler } from '../utils/async-handler'

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }
  // Check for token in cookies
  else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken
  }

  if (!token) {
    throw new ApiError('Access token is required', 401)
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload

    // Add user info to request
    req.user = {
      _id: decoded._id || decoded.id,
      id: decoded.id || decoded._id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    }

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError('Access token has expired', 401)
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError('Invalid access token', 401)
    } else {
      throw new ApiError('Authentication failed', 401)
    }
  }
})

/**
 * Authorization middleware - checks user roles
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError('Authentication required', 401)
    }

    const userRole = req.user.role
    const allowedRoles = roles

    if (!allowedRoles.includes(userRole)) {
      throw new ApiError('Insufficient permissions', 403)
    }

    next()
  }
}

/**
 * Alternative authentication middleware (alias for authenticate)
 */
export const protect = authenticate

/**
 * Alternative authorization middleware with different signature
 */
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError('Authentication required', 401)
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError('You do not have permission to perform this action', 403)
    }

    next()
  }
}

/**
 * Optional authentication middleware - doesn't throw error if no token
 */
export const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
      req.user = {
        _id: decoded._id || decoded.id,
        id: decoded.id || decoded._id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || []
      }
    } catch (error) {
      // Silently ignore invalid tokens for optional auth
    }
  }

  next()
})

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError('Authentication required', 401)
    }

    if (!req.user.permissions.includes(permission)) {
      throw new ApiError(`Permission '${permission}' required`, 403)
    }

    next()
  }
}

/**
 * Check if user owns resource or is admin
 */
export const ownerOrAdmin = (userIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError('Authentication required', 401)
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField]
    const isOwner = req.user.id === resourceUserId
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role)

    if (!isOwner && !isAdmin) {
      throw new ApiError('Access denied: You can only access your own resources', 403)
    }

    next()
  }
}
