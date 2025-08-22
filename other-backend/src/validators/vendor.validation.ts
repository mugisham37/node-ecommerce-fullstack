import Joi from "joi"

// Custom ObjectId validation function
const objectIdValidation = (value: string, helpers: any) => {
  // Basic ObjectId pattern validation (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    return helpers.error("any.invalid")
  }
  return value
}

export const vendorValidation = {
  createVendor: Joi.object({
    businessName: Joi.string().required().trim().min(3).max(100).messages({
      "string.empty": "Business name is required",
      "string.min": "Business name must be at least 3 characters",
      "string.max": "Business name cannot exceed 100 characters",
      "any.required": "Business name is required",
    }),
    email: Joi.string().required().email().trim().lowercase().messages({
      "string.empty": "Email is required",
      "string.email": "Email must be a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().min(8).messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
      "any.required": "Password is required",
    }),
    phone: Joi.string().required().trim().messages({
      "string.empty": "Phone number is required",
      "any.required": "Phone number is required",
    }),
    description: Joi.string().required().trim().min(10).max(2000).messages({
      "string.empty": "Description is required",
      "string.min": "Description must be at least 10 characters",
      "string.max": "Description cannot exceed 2000 characters",
      "any.required": "Description is required",
    }),
    logo: Joi.string().uri().messages({
      "string.uri": "Logo must be a valid URL",
    }),
    bannerImage: Joi.string().uri().messages({
      "string.uri": "Banner image must be a valid URL",
    }),
    website: Joi.string().uri().messages({
      "string.uri": "Website must be a valid URL",
    }),
    socialMedia: Joi.object({
      facebook: Joi.string().uri().messages({
        "string.uri": "Facebook URL must be a valid URL",
      }),
      twitter: Joi.string().uri().messages({
        "string.uri": "Twitter URL must be a valid URL",
      }),
      instagram: Joi.string().uri().messages({
        "string.uri": "Instagram URL must be a valid URL",
      }),
      pinterest: Joi.string().uri().messages({
        "string.uri": "Pinterest URL must be a valid URL",
      }),
      youtube: Joi.string().uri().messages({
        "string.uri": "YouTube URL must be a valid URL",
      }),
    }),
    addresses: Joi.array().items(
      Joi.object({
        street: Joi.string().required().trim().messages({
          "string.empty": "Street address is required",
          "any.required": "Street address is required",
        }),
        city: Joi.string().required().trim().messages({
          "string.empty": "City is required",
          "any.required": "City is required",
        }),
        state: Joi.string().required().trim().messages({
          "string.empty": "State is required",
          "any.required": "State is required",
        }),
        postalCode: Joi.string().required().trim().messages({
          "string.empty": "Postal code is required",
          "any.required": "Postal code is required",
        }),
        country: Joi.string().required().trim().messages({
          "string.empty": "Country is required",
          "any.required": "Country is required",
        }),
        isDefault: Joi.boolean().default(false),
      })
    ),
    bankAccounts: Joi.array().items(
      Joi.object({
        accountName: Joi.string().required().trim().messages({
          "string.empty": "Account name is required",
          "any.required": "Account name is required",
        }),
        accountNumber: Joi.string().required().trim().messages({
          "string.empty": "Account number is required",
          "any.required": "Account number is required",
        }),
        bankName: Joi.string().required().trim().messages({
          "string.empty": "Bank name is required",
          "any.required": "Bank name is required",
        }),
        routingNumber: Joi.string().required().trim().messages({
          "string.empty": "Routing number is required",
          "any.required": "Routing number is required",
        }),
        swiftCode: Joi.string().trim(),
        isDefault: Joi.boolean().default(false),
      })
    ),
    taxInformation: Joi.object({
      taxId: Joi.string().required().trim().messages({
        "string.empty": "Tax ID is required",
        "any.required": "Tax ID is required",
      }),
      businessType: Joi.string().required().valid("sole_proprietorship", "partnership", "corporation", "llc", "other").messages({
        "any.only": "Business type must be one of: sole_proprietorship, partnership, corporation, llc, other",
        "any.required": "Business type is required",
      }),
      taxDocuments: Joi.array().items(Joi.string().uri().messages({
        "string.uri": "Tax document must be a valid URL",
      })),
      vatRegistered: Joi.boolean().default(false),
      vatNumber: Joi.string().trim(),
    }),
    commissionRate: Joi.number().min(0).max(100).default(10).messages({
      "number.base": "Commission rate must be a number",
      "number.min": "Commission rate must be at least 0",
      "number.max": "Commission rate cannot exceed 100",
    }),
    minimumPayoutAmount: Joi.number().min(0).default(100).messages({
      "number.base": "Minimum payout amount must be a number",
      "number.min": "Minimum payout amount must be at least 0",
    }),
    payoutSchedule: Joi.string().valid("daily", "weekly", "biweekly", "monthly").default("monthly").messages({
      "any.only": "Payout schedule must be one of: daily, weekly, biweekly, monthly",
    }),
    status: Joi.string().valid("pending", "approved", "rejected", "suspended").default("pending").messages({
      "any.only": "Status must be one of: pending, approved, rejected, suspended",
    }),
    verificationDocuments: Joi.array().items(Joi.string().uri().messages({
      "string.uri": "Verification document must be a valid URL",
    })),
    verificationNotes: Joi.string().trim(),
    returnPolicy: Joi.string().trim().max(5000).messages({
      "string.max": "Return policy cannot exceed 5000 characters",
    }),
    shippingPolicy: Joi.string().trim().max(5000).messages({
      "string.max": "Shipping policy cannot exceed 5000 characters",
    }),
    contactPerson: Joi.object({
      firstName: Joi.string().required().trim().messages({
        "string.empty": "Contact person first name is required",
        "any.required": "Contact person first name is required",
      }),
      lastName: Joi.string().required().trim().messages({
        "string.empty": "Contact person last name is required",
        "any.required": "Contact person last name is required",
      }),
      email: Joi.string().required().email().trim().messages({
        "string.empty": "Contact person email is required",
        "string.email": "Contact person email must be a valid email address",
        "any.required": "Contact person email is required",
      }),
      phone: Joi.string().required().trim().messages({
        "string.empty": "Contact person phone is required",
        "any.required": "Contact person phone is required",
      }),
      position: Joi.string().required().trim().messages({
        "string.empty": "Contact person position is required",
        "any.required": "Contact person position is required",
      }),
    }).required().messages({
      "any.required": "Contact person information is required",
    }),
    active: Joi.boolean().default(true),
  }),

  updateVendor: Joi.object({
    businessName: Joi.string().trim().min(3).max(100).messages({
      "string.min": "Business name must be at least 3 characters",
      "string.max": "Business name cannot exceed 100 characters",
    }),
    email: Joi.string().email().trim().lowercase().messages({
      "string.email": "Email must be a valid email address",
    }),
    phone: Joi.string().trim(),
    description: Joi.string().trim().min(10).max(2000).messages({
      "string.min": "Description must be at least 10 characters",
      "string.max": "Description cannot exceed 2000 characters",
    }),
    logo: Joi.string().uri().messages({
      "string.uri": "Logo must be a valid URL",
    }),
    bannerImage: Joi.string().uri().messages({
      "string.uri": "Banner image must be a valid URL",
    }),
    website: Joi.string().uri().messages({
      "string.uri": "Website must be a valid URL",
    }),
    socialMedia: Joi.object({
      facebook: Joi.string().uri().messages({
        "string.uri": "Facebook URL must be a valid URL",
      }),
      twitter: Joi.string().uri().messages({
        "string.uri": "Twitter URL must be a valid URL",
      }),
      instagram: Joi.string().uri().messages({
        "string.uri": "Instagram URL must be a valid URL",
      }),
      pinterest: Joi.string().uri().messages({
        "string.uri": "Pinterest URL must be a valid URL",
      }),
      youtube: Joi.string().uri().messages({
        "string.uri": "YouTube URL must be a valid URL",
      }),
    }),
    addresses: Joi.array().items(
      Joi.object({
        street: Joi.string().required().trim().messages({
          "string.empty": "Street address is required",
          "any.required": "Street address is required",
        }),
        city: Joi.string().required().trim().messages({
          "string.empty": "City is required",
          "any.required": "City is required",
        }),
        state: Joi.string().required().trim().messages({
          "string.empty": "State is required",
          "any.required": "State is required",
        }),
        postalCode: Joi.string().required().trim().messages({
          "string.empty": "Postal code is required",
          "any.required": "Postal code is required",
        }),
        country: Joi.string().required().trim().messages({
          "string.empty": "Country is required",
          "any.required": "Country is required",
        }),
        isDefault: Joi.boolean().default(false),
      })
    ),
    bankAccounts: Joi.array().items(
      Joi.object({
        accountName: Joi.string().required().trim().messages({
          "string.empty": "Account name is required",
          "any.required": "Account name is required",
        }),
        accountNumber: Joi.string().required().trim().messages({
          "string.empty": "Account number is required",
          "any.required": "Account number is required",
        }),
        bankName: Joi.string().required().trim().messages({
          "string.empty": "Bank name is required",
          "any.required": "Bank name is required",
        }),
        routingNumber: Joi.string().required().trim().messages({
          "string.empty": "Routing number is required",
          "any.required": "Routing number is required",
        }),
        swiftCode: Joi.string().trim(),
        isDefault: Joi.boolean().default(false),
      })
    ),
    taxInformation: Joi.object({
      taxId: Joi.string().trim(),
      businessType: Joi.string().valid("sole_proprietorship", "partnership", "corporation", "llc", "other").messages({
        "any.only": "Business type must be one of: sole_proprietorship, partnership, corporation, llc, other",
      }),
      taxDocuments: Joi.array().items(Joi.string().uri().messages({
        "string.uri": "Tax document must be a valid URL",
      })),
      vatRegistered: Joi.boolean(),
      vatNumber: Joi.string().trim(),
    }),
    commissionRate: Joi.number().min(0).max(100).messages({
      "number.base": "Commission rate must be a number",
      "number.min": "Commission rate must be at least 0",
      "number.max": "Commission rate cannot exceed 100",
    }),
    minimumPayoutAmount: Joi.number().min(0).messages({
      "number.base": "Minimum payout amount must be a number",
      "number.min": "Minimum payout amount must be at least 0",
    }),
    payoutSchedule: Joi.string().valid("daily", "weekly", "biweekly", "monthly").messages({
      "any.only": "Payout schedule must be one of: daily, weekly, biweekly, monthly",
    }),
    verificationDocuments: Joi.array().items(Joi.string().uri().messages({
      "string.uri": "Verification document must be a valid URL",
    })),
    returnPolicy: Joi.string().trim().max(5000).messages({
      "string.max": "Return policy cannot exceed 5000 characters",
    }),
    shippingPolicy: Joi.string().trim().max(5000).messages({
      "string.max": "Shipping policy cannot exceed 5000 characters",
    }),
    contactPerson: Joi.object({
      firstName: Joi.string().trim(),
      lastName: Joi.string().trim(),
      email: Joi.string().email().trim().messages({
        "string.email": "Contact person email must be a valid email address",
      }),
      phone: Joi.string().trim(),
      position: Joi.string().trim(),
    }),
    active: Joi.boolean(),
  }),

  updateVendorStatus: Joi.object({
    status: Joi.string().required().valid("pending", "approved", "rejected", "suspended").messages({
      "any.only": "Status must be one of: pending, approved, rejected, suspended",
      "any.required": "Status is required",
    }),
    notes: Joi.string().trim(),
  }),

  calculatePayout: Joi.object({
    startDate: Joi.date().iso().required().messages({
      "date.base": "Start date must be a valid date",
      "any.required": "Start date is required",
    }),
    endDate: Joi.date().iso().required().greater(Joi.ref("startDate")).messages({
      "date.base": "End date must be a valid date",
      "date.greater": "End date must be after start date",
      "any.required": "End date is required",
    }),
  }),

  createPayout: Joi.object({
    vendor: Joi.string().required().custom(objectIdValidation, "MongoDB ObjectId validation").messages({
      "any.invalid": "Vendor ID must be a valid ID",
      "any.required": "Vendor ID is required",
    }),
    amount: Joi.number().required().min(0).messages({
      "number.base": "Amount must be a number",
      "number.min": "Amount must be at least 0",
      "any.required": "Amount is required",
    }),
    fee: Joi.number().required().min(0).messages({
      "number.base": "Fee must be a number",
      "number.min": "Fee must be at least 0",
      "any.required": "Fee is required",
    }),
    netAmount: Joi.number().required().min(0).messages({
      "number.base": "Net amount must be a number",
      "number.min": "Net amount must be at least 0",
      "any.required": "Net amount is required",
    }),
    currency: Joi.string().default("USD").uppercase().length(3).messages({
      "string.length": "Currency must be a 3-character code",
    }),
    status: Joi.string().valid("pending", "processing", "completed", "failed", "cancelled").default("pending").messages({
      "any.only": "Status must be one of: pending, processing, completed, failed, cancelled",
    }),
    paymentMethod: Joi.string().required().valid("bank_transfer", "paypal", "stripe", "other").messages({
      "any.only": "Payment method must be one of: bank_transfer, paypal, stripe, other",
      "any.required": "Payment method is required",
    }),
    paymentDetails: Joi.object({
      accountName: Joi.string(),
      accountNumber: Joi.string(),
      bankName: Joi.string(),
      routingNumber: Joi.string(),
      swiftCode: Joi.string(),
      paypalEmail: Joi.string().email().messages({
        "string.email": "PayPal email must be a valid email address",
      }),
      stripeAccountId: Joi.string(),
      other: Joi.object(),
    }),
    reference: Joi.string().required().messages({
      "string.empty": "Reference is required",
      "any.required": "Reference is required",
    }),
    description: Joi.string().trim(),
    periodStart: Joi.date().iso().required().messages({
      "date.base": "Period start must be a valid date",
      "any.required": "Period start is required",
    }),
    periodEnd: Joi.date().iso().required().greater(Joi.ref("periodStart")).messages({
      "date.base": "Period end must be a valid date",
      "date.greater": "Period end must be after period start",
      "any.required": "Period end is required",
    }),
    orders: Joi.array().items(Joi.string().custom(objectIdValidation, "MongoDB ObjectId validation").messages({
      "any.invalid": "Order ID must be a valid ID",
    })),
  }),

  updatePayoutStatus: Joi.object({
    status: Joi.string().required().valid("pending", "processing", "completed", "failed", "cancelled").messages({
      "any.only": "Status must be one of: pending, processing, completed, failed, cancelled",
      "any.required": "Status is required",
    }),
    transactionId: Joi.string().trim(),
    notes: Joi.string().trim(),
  }),
}

// Query parameter validation
export const vendorQueryValidation = {
  getAllVendors: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid("createdAt", "-createdAt", "businessName", "-businessName", "status", "-status").default("-createdAt"),
    select: Joi.string(),
    status: Joi.string().valid("pending", "approved", "rejected", "suspended"),
    active: Joi.boolean(),
    search: Joi.string().min(1).max(100).trim(),
  }),

  getVendorProducts: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid("createdAt", "-createdAt", "name", "-name", "price", "-price").default("-createdAt"),
    category: Joi.string().custom(objectIdValidation, "MongoDB ObjectId validation").messages({
      "any.invalid": "Category ID must be a valid ID",
    }),
    active: Joi.boolean(),
    featured: Joi.boolean(),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    search: Joi.string().min(1).max(100).trim(),
  }),

  getVendorPayouts: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid("createdAt", "-createdAt", "amount", "-amount", "status", "-status").default("-createdAt"),
    status: Joi.string().valid("pending", "processing", "completed", "failed", "cancelled"),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref("startDate")),
  }),

  getVendorMetrics: Joi.object({
    period: Joi.string().valid("day", "week", "month", "year", "all").default("all"),
  }),
}

// Params validation
export const vendorParamsValidation = {
  vendorId: Joi.object({
    id: Joi.string()
      .custom(objectIdValidation, "MongoDB ObjectId validation")
      .required()
      .messages({
        "any.invalid": "Vendor ID must be a valid ID",
        "any.required": "Vendor ID is required",
      }),
  }),

  vendorSlug: Joi.object({
    slug: Joi.string()
      .pattern(/^[a-z0-9-]+$/)
      .required()
      .messages({
        "string.pattern.base": "Slug must contain only lowercase letters, numbers, and hyphens",
        "any.required": "Vendor slug is required",
      }),
  }),

  payoutId: Joi.object({
    id: Joi.string()
      .custom(objectIdValidation, "MongoDB ObjectId validation")
      .required()
      .messages({
        "any.invalid": "Payout ID must be a valid ID",
        "any.required": "Payout ID is required",
      }),
  }),
}
