import type { Request, Response, NextFunction } from "express"
import { asyncHandler } from "../utils/async-handler"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import { User } from "@shared/types/auth.types"

// Note: Vendor model will be created in later phases
// For now, we'll create a placeholder interface
interface IVendor {
  _id: string
  user: string
  status: "pending" | "approved" | "rejected" | "suspended"
  businessName: string
  businessEmail: string
  businessPhone: string
  businessAddress: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  taxId?: string
  bankAccount?: {
    accountNumber: string
    routingNumber: string
    accountHolderName: string
  }
  documents?: {
    businessLicense?: string
    taxCertificate?: string
    bankStatement?: string
  }
  commission: number
  createdAt: Date
  updatedAt: Date
}

// Extend Express Request interface to include vendor
declare global {
  namespace Express {
    interface Request {
      vendor?: IVendor
    }
  }
}

/**
 * Check if user is a vendor
 * @param req Request object
 * @param res Response object
 * @param next Next function
 */
export const isVendor = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  
  if (!req.user) {
    return next(new ApiError("Authentication required", 401))
  }
  
  const userId = req.user._id

  requestLogger.info(`Checking if user ${userId} is a vendor`)

  // TODO: Replace with actual Vendor model when available
  // For now, we'll create a mock implementation
  const mockVendor: IVendor = {
    _id: "mock-vendor-id",
    user: userId,
    status: "approved",
    businessName: "Mock Business",
    businessEmail: "business@example.com",
    businessPhone: "+1234567890",
    businessAddress: {
      street: "123 Business St",
      city: "Business City",
      state: "BC",
      postalCode: "12345",
      country: "US"
    },
    commission: 0.1,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // Mock vendor lookup - replace with actual database query
  const vendor = mockVendor // await Vendor.findOne({ user: userId })

  if (!vendor) {
    return next(new ApiError("You are not authorized as a vendor", 403))
  }

  // Check if vendor is approved
  if (vendor.status !== "approved") {
    return next(new ApiError(`Your vendor account is ${vendor.status}. Please contact support.`, 403))
  }

  // Add vendor to request
  req.vendor = vendor

  next()
})

/**
 * Check if user is the owner of the vendor
 * @param req Request object
 * @param res Response object
 * @param next Next function
 */
export const isVendorOwner = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = createRequestLogger(req.id)
  
  if (!req.user) {
    return next(new ApiError("Authentication required", 401))
  }
  
  const userId = req.user._id
  const { vendorId } = req.params

  requestLogger.info(`Checking if user ${userId} is the owner of vendor ${vendorId}`)

  // TODO: Replace with actual Vendor model when available
  // Mock vendor lookup - replace with actual database query
  const mockVendor: IVendor = {
    _id: vendorId,
    user: userId,
    status: "approved",
    businessName: "Mock Business",
    businessEmail: "business@example.com",
    businessPhone: "+1234567890",
    businessAddress: {
      street: "123 Business St",
      city: "Business City",
      state: "BC",
      postalCode: "12345",
      country: "US"
    },
    commission: 0.1,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const vendor = mockVendor // await Vendor.findById(vendorId)

  if (!vendor) {
    return next(new ApiError("Vendor not found", 404))
  }

  // Check if user is the owner
  if (vendor.user.toString() !== userId.toString()) {
    return next(new ApiError("You are not authorized to access this vendor", 403))
  }

  // Add vendor to request
  req.vendor = vendor

  next()
})
