// Export all validation schemas
export * from "./ab-test.validation"
export * from "./advanced-search.validation"
export * from "./country.validation"
export * from "./currency.validation"
export * from "./loyalty.validation"
export * from "./tax.validation"
export * from "./vendor.validation"

// Re-export commonly used validation patterns
import Joi from "joi"

// Common validation patterns that can be reused across validators
export const commonValidations = {
  // MongoDB ObjectId validation
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    "string.pattern.base": "Must be a valid ObjectId",
  }),

  // Pagination validation
  pagination: {
    page: Joi.number().integer().min(1).max(1000).default(1).messages({
      "number.base": "Page must be a number",
      "number.integer": "Page must be an integer", 
      "number.min": "Page must be at least 1",
      "number.max": "Page cannot exceed 1000",
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1", 
      "number.max": "Limit cannot exceed 100",
    }),
  },

  // Date validation
  dateRange: {
    startDate: Joi.date().iso().messages({
      "date.format": "Start date must be in ISO 8601 format",
    }),
    endDate: Joi.date().iso().messages({
      "date.format": "End date must be in ISO 8601 format",
    }),
  },

  // Price validation
  price: Joi.number().min(0).max(1000000).messages({
    "number.base": "Price must be a number",
    "number.min": "Price must be at least 0",
    "number.max": "Price cannot exceed 1,000,000",
  }),

  // Email validation
  email: Joi.string().email().trim().lowercase().messages({
    "string.email": "Must be a valid email address",
  }),

  // Phone validation
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(20).messages({
    "string.pattern.base": "Must be a valid phone number",
    "string.min": "Phone number must be at least 10 characters",
    "string.max": "Phone number cannot exceed 20 characters",
  }),

  // URL validation
  url: Joi.string().uri().messages({
    "string.uri": "Must be a valid URL",
  }),

  // Currency code validation
  currencyCode: Joi.string().length(3).uppercase().pattern(/^[A-Z]{3}$/).messages({
    "string.length": "Currency code must be exactly 3 characters",
    "string.pattern.base": "Currency code must be 3 uppercase letters",
  }),

  // Country code validation
  countryCode: Joi.string().min(2).max(3).uppercase().pattern(/^[A-Z]{2,3}$/).messages({
    "string.min": "Country code must be at least 2 characters",
    "string.max": "Country code cannot exceed 3 characters",
    "string.pattern.base": "Country code must be uppercase letters only",
  }),

  // Status validation for common entities
  status: {
    active: Joi.boolean().default(true),
    orderStatus: Joi.string().valid("pending", "processing", "shipped", "delivered", "cancelled").messages({
      "any.only": "Status must be one of: pending, processing, shipped, delivered, cancelled",
    }),
    paymentStatus: Joi.string().valid("pending", "processing", "completed", "failed", "refunded").messages({
      "any.only": "Payment status must be one of: pending, processing, completed, failed, refunded",
    }),
    vendorStatus: Joi.string().valid("pending", "approved", "rejected", "suspended").messages({
      "any.only": "Vendor status must be one of: pending, approved, rejected, suspended",
    }),
  },

  // Search and filter validation
  search: {
    query: Joi.string().trim().max(500).allow("").messages({
      "string.max": "Search query cannot exceed 500 characters",
    }),
    sort: Joi.string().pattern(/^-?[a-zA-Z_][a-zA-Z0-9_]*$/).messages({
      "string.pattern.base": "Sort field must be a valid field name, optionally prefixed with '-' for descending order",
    }),
  },

  // Rating validation
  rating: Joi.number().min(0).max(5).messages({
    "number.base": "Rating must be a number",
    "number.min": "Rating must be at least 0",
    "number.max": "Rating cannot exceed 5",
  }),

  // Percentage validation
  percentage: Joi.number().min(0).max(100).messages({
    "number.base": "Percentage must be a number",
    "number.min": "Percentage must be at least 0",
    "number.max": "Percentage cannot exceed 100",
  }),

  // Text fields with common lengths
  text: {
    short: Joi.string().trim().min(1).max(100).messages({
      "string.min": "Must be at least 1 character",
      "string.max": "Cannot exceed 100 characters",
    }),
    medium: Joi.string().trim().min(1).max(500).messages({
      "string.min": "Must be at least 1 character", 
      "string.max": "Cannot exceed 500 characters",
    }),
    long: Joi.string().trim().min(1).max(2000).messages({
      "string.min": "Must be at least 1 character",
      "string.max": "Cannot exceed 2000 characters",
    }),
  },
}

// Validation middleware helper
export const validateRequest = (schema: any) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req, { abortEarly: false, allowUnknown: true })
    
    if (error) {
      const errors = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }))
      
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors,
      })
    }
    
    next()
  }
}
