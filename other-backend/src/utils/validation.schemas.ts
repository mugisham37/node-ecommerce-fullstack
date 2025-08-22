import Joi from "joi"

// Common ObjectId validation function
const objectIdValidation = (value: string, helpers: any) => {
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    return helpers.error("any.invalid")
  }
  return value
}

// Batch loyalty points schema
export const batchLoyaltyPointsSchema = {
  body: Joi.object({
    operations: Joi.array().items(
      Joi.object({
        userId: Joi.string()
          .custom(objectIdValidation, "MongoDB ObjectId validation")
          .required()
          .messages({
            "string.empty": "User ID is required",
            "any.invalid": "User ID must be a valid ID",
            "any.required": "User ID is required",
          }),
        points: Joi.number().integer().required().messages({
          "number.base": "Points must be a number",
          "number.integer": "Points must be an integer",
          "any.required": "Points are required",
        }),
        description: Joi.string().required().messages({
          "string.empty": "Description is required",
          "any.required": "Description is required",
        }),
        referenceId: Joi.string().allow(null, ""),
        type: Joi.string().valid("order", "referral", "manual", "other").default("other").messages({
          "any.only": "Type must be one of: order, referral, manual, other",
        }),
      })
    ).min(1).required().messages({
      "array.min": "At least one operation is required",
      "any.required": "Operations are required",
    }),
  }),
}

// Send loyalty notification schema
export const sendLoyaltyNotificationSchema = {
  body: Joi.object({
    userId: Joi.string()
      .custom(objectIdValidation, "MongoDB ObjectId validation")
      .required()
      .messages({
        "string.empty": "User ID is required",
        "any.invalid": "User ID must be a valid ID",
        "any.required": "User ID is required",
      }),
    type: Joi.string()
      .valid("points_earned", "points_expired", "tier_upgrade", "reward_redeemed", "reward_approved", "reward_rejected")
      .required()
      .messages({
        "string.empty": "Type is required",
        "any.required": "Type is required",
        "any.only": "Type must be one of: points_earned, points_expired, tier_upgrade, reward_redeemed, reward_approved, reward_rejected",
      }),
    data: Joi.object().required().messages({
      "any.required": "Data is required",
    }),
  }),
}

// Send batch loyalty notifications schema
export const sendBatchLoyaltyNotificationsSchema = {
  body: Joi.object({
    notifications: Joi.array().items(
      Joi.object({
        userId: Joi.string()
          .custom(objectIdValidation, "MongoDB ObjectId validation")
          .required()
          .messages({
            "string.empty": "User ID is required",
            "any.invalid": "User ID must be a valid ID",
            "any.required": "User ID is required",
          }),
        type: Joi.string()
          .valid("points_earned", "points_expired", "tier_upgrade", "reward_redeemed", "reward_approved", "reward_rejected")
          .required()
          .messages({
            "string.empty": "Type is required",
            "any.required": "Type is required",
            "any.only": "Type must be one of: points_earned, points_expired, tier_upgrade, reward_redeemed, reward_approved, reward_rejected",
          }),
        data: Joi.object().required().messages({
          "any.required": "Data is required",
        }),
      })
    ).min(1).required().messages({
      "array.min": "At least one notification is required",
      "any.required": "Notifications are required",
    }),
  }),
}

// A/B Test validation schemas
export const abTestValidation = {
  createTest: {
    body: Joi.object({
      name: Joi.string().required().trim().min(2).max(100).messages({
        "string.empty": "Test name is required",
        "string.min": "Test name must be at least 2 characters",
        "string.max": "Test name cannot exceed 100 characters",
        "any.required": "Test name is required",
      }),
      description: Joi.string().trim().allow(""),
      variants: Joi.array().items(
        Joi.object({
          name: Joi.string().required().trim().messages({
            "string.empty": "Variant name is required",
            "any.required": "Variant name is required",
          }),
          weight: Joi.number().min(0).max(100).default(50).messages({
            "number.base": "Weight must be a number",
            "number.min": "Weight must be at least 0",
            "number.max": "Weight cannot exceed 100",
          }),
          config: Joi.object().default({}),
        })
      ).min(2).required().messages({
        "array.min": "At least 2 variants are required",
        "any.required": "Variants are required",
      }),
      targetAudience: Joi.object({
        userSegments: Joi.array().items(Joi.string()).default([]),
        countries: Joi.array().items(Joi.string()).default([]),
        devices: Joi.array().items(Joi.string().valid("desktop", "mobile", "tablet")).default([]),
      }).default({}),
      startDate: Joi.date().allow(null),
      endDate: Joi.date().greater(Joi.ref("startDate")).allow(null).messages({
        "date.greater": "End date must be greater than start date",
      }),
      isActive: Joi.boolean().default(false),
    }),
  },
  updateTest: {
    body: Joi.object({
      name: Joi.string().trim().min(2).max(100).messages({
        "string.min": "Test name must be at least 2 characters",
        "string.max": "Test name cannot exceed 100 characters",
      }),
      description: Joi.string().trim().allow(""),
      variants: Joi.array().items(
        Joi.object({
          name: Joi.string().required().trim().messages({
            "string.empty": "Variant name is required",
            "any.required": "Variant name is required",
          }),
          weight: Joi.number().min(0).max(100).messages({
            "number.base": "Weight must be a number",
            "number.min": "Weight must be at least 0",
            "number.max": "Weight cannot exceed 100",
          }),
          config: Joi.object().default({}),
        })
      ).min(2).messages({
        "array.min": "At least 2 variants are required",
      }),
      targetAudience: Joi.object({
        userSegments: Joi.array().items(Joi.string()),
        countries: Joi.array().items(Joi.string()),
        devices: Joi.array().items(Joi.string().valid("desktop", "mobile", "tablet")),
      }),
      startDate: Joi.date().allow(null),
      endDate: Joi.date().greater(Joi.ref("startDate")).allow(null).messages({
        "date.greater": "End date must be greater than start date",
      }),
      isActive: Joi.boolean(),
    }),
  },
  trackConversion: {
    body: Joi.object({
      userId: Joi.string()
        .custom(objectIdValidation, "MongoDB ObjectId validation")
        .allow(null, "")
        .messages({
          "any.invalid": "User ID must be a valid ID",
        }),
      sessionId: Joi.string().allow(null, ""),
      conversionType: Joi.string().required().messages({
        "string.empty": "Conversion type is required",
        "any.required": "Conversion type is required",
      }),
      value: Joi.number().min(0).allow(null).messages({
        "number.base": "Value must be a number",
        "number.min": "Value must be at least 0",
      }),
      metadata: Joi.object().default({}),
    }),
  },
}

// Export validation schemas
export const exportQueryValidation = {
  orders: Joi.object({
    format: Joi.string().valid("csv", "excel", "pdf", "json").default("csv").messages({
      "any.only": "Format must be one of: csv, excel, pdf, json",
    }),
    startDate: Joi.date().iso().allow(null, "").messages({
      "date.format": "Start date must be a valid ISO date",
    }),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).allow(null, "").messages({
      "date.format": "End date must be a valid ISO date",
      "date.min": "End date must be greater than or equal to start date",
    }),
    status: Joi.string().valid("pending", "processing", "shipped", "delivered", "cancelled").allow(null, "").messages({
      "any.only": "Status must be one of: pending, processing, shipped, delivered, cancelled",
    }),
    isPaid: Joi.string().valid("true", "false").allow(null, "").messages({
      "any.only": "isPaid must be 'true' or 'false'",
    }),
  }),

  products: Joi.object({
    format: Joi.string().valid("csv", "excel", "pdf", "json").default("csv").messages({
      "any.only": "Format must be one of: csv, excel, pdf, json",
    }),
    category: Joi.string().custom(objectIdValidation, "MongoDB ObjectId validation").allow(null, "").messages({
      "any.invalid": "Category must be a valid ID",
    }),
    minPrice: Joi.number().min(0).allow(null, "").messages({
      "number.base": "Minimum price must be a number",
      "number.min": "Minimum price must be at least 0",
    }),
    maxPrice: Joi.number().min(Joi.ref("minPrice")).allow(null, "").messages({
      "number.base": "Maximum price must be a number",
      "number.min": "Maximum price must be greater than or equal to minimum price",
    }),
    inStock: Joi.string().valid("true", "false").allow(null, "").messages({
      "any.only": "inStock must be 'true' or 'false'",
    }),
    featured: Joi.string().valid("true", "false").allow(null, "").messages({
      "any.only": "featured must be 'true' or 'false'",
    }),
    active: Joi.string().valid("true", "false").allow(null, "").messages({
      "any.only": "active must be 'true' or 'false'",
    }),
  }),

  customers: Joi.object({
    format: Joi.string().valid("csv", "excel", "pdf", "json").default("csv").messages({
      "any.only": "Format must be one of: csv, excel, pdf, json",
    }),
    startDate: Joi.date().iso().allow(null, "").messages({
      "date.format": "Start date must be a valid ISO date",
    }),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).allow(null, "").messages({
      "date.format": "End date must be a valid ISO date",
      "date.min": "End date must be greater than or equal to start date",
    }),
    active: Joi.string().valid("true", "false").allow(null, "").messages({
      "any.only": "active must be 'true' or 'false'",
    }),
  }),

  sales: Joi.object({
    format: Joi.string().valid("csv", "excel", "pdf", "json").default("csv").messages({
      "any.only": "Format must be one of: csv, excel, pdf, json",
    }),
    startDate: Joi.date().iso().allow(null, "").messages({
      "date.format": "Start date must be a valid ISO date",
    }),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).allow(null, "").messages({
      "date.format": "End date must be a valid ISO date",
      "date.min": "End date must be greater than or equal to start date",
    }),
    interval: Joi.string().valid("hourly", "daily", "weekly", "monthly").default("daily").messages({
      "any.only": "Interval must be one of: hourly, daily, weekly, monthly",
    }),
  }),

  inventory: Joi.object({
    format: Joi.string().valid("csv", "excel", "pdf", "json").default("csv").messages({
      "any.only": "Format must be one of: csv, excel, pdf, json",
    }),
    category: Joi.string().custom(objectIdValidation, "MongoDB ObjectId validation").allow(null, "").messages({
      "any.invalid": "Category must be a valid ID",
    }),
    minQuantity: Joi.number().integer().min(0).allow(null, "").messages({
      "number.base": "Minimum quantity must be a number",
      "number.integer": "Minimum quantity must be an integer",
      "number.min": "Minimum quantity must be at least 0",
    }),
    maxQuantity: Joi.number().integer().min(Joi.ref("minQuantity")).allow(null, "").messages({
      "number.base": "Maximum quantity must be a number",
      "number.integer": "Maximum quantity must be an integer",
      "number.min": "Maximum quantity must be greater than or equal to minimum quantity",
    }),
    inStock: Joi.string().valid("true", "false").allow(null, "").messages({
      "any.only": "inStock must be 'true' or 'false'",
    }),
    includeVariants: Joi.string().valid("true", "false").default("false").messages({
      "any.only": "includeVariants must be 'true' or 'false'",
    }),
  }),
}
