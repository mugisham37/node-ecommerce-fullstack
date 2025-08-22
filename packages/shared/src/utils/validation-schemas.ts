/**
 * Validation schemas converted from Joi to Zod for tRPC compatibility
 * These schemas provide common validation patterns used across the application
 */

// Zod is optional - will be installed when needed
let z: any;
try {
  z = require('zod').z;
} catch (e) {
  console.warn('Zod not installed. Validation schemas will not work.');
  // Create a mock z object for compilation
  z = {
    object: () => ({ safeParse: () => ({ success: false }) }),
    string: () => ({ uuid: () => ({}), regex: () => ({}), min: () => ({}), max: () => ({}), trim: () => ({}), optional: () => ({}) }),
    number: () => ({ int: () => ({}), min: () => ({}), max: () => ({}), default: () => ({}), optional: () => ({}) }),
    array: () => ({ min: () => ({}), default: () => ({}) }),
    enum: () => ({ default: () => ({}) }),
    record: () => ({ default: () => ({}) }),
    date: () => ({ optional: () => ({}) }),
    boolean: () => ({ default: () => ({}), optional: () => ({}) }),
    any: () => ({}),
  };
}

// Common UUID validation
const uuidSchema = z.string().uuid('Must be a valid UUID');

// Common ObjectId validation (for MongoDB compatibility)
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid ObjectId');

// Batch loyalty points schema
export const batchLoyaltyPointsSchema = z.object({
  operations: z.array(
    z.object({
      userId: uuidSchema,
      points: z.number().int('Points must be an integer'),
      description: z.string().min(1, 'Description is required'),
      referenceId: z.string().optional(),
      type: z.enum(['order', 'referral', 'manual', 'other']).default('other'),
    })
  ).min(1, 'At least one operation is required'),
});

// Send loyalty notification schema
export const sendLoyaltyNotificationSchema = z.object({
  userId: uuidSchema,
  type: z.enum([
    'points_earned',
    'points_expired', 
    'tier_upgrade',
    'reward_redeemed',
    'reward_approved',
    'reward_rejected'
  ]),
  data: z.record(z.any()),
});

// Send batch loyalty notifications schema
export const sendBatchLoyaltyNotificationsSchema = z.object({
  notifications: z.array(
    z.object({
      userId: uuidSchema,
      type: z.enum([
        'points_earned',
        'points_expired',
        'tier_upgrade', 
        'reward_redeemed',
        'reward_approved',
        'reward_rejected'
      ]),
      data: z.record(z.any()),
    })
  ).min(1, 'At least one notification is required'),
});

// A/B Test validation schemas
export const createABTestSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Test name must be at least 2 characters')
    .max(100, 'Test name cannot exceed 100 characters'),
  description: z.string().trim().optional(),
  variants: z.array(
    z.object({
      name: z.string().trim().min(1, 'Variant name is required'),
      weight: z.number().min(0).max(100).default(50),
      config: z.record(z.any()).default({}),
    })
  ).min(2, 'At least 2 variants are required'),
  targetAudience: z.object({
    userSegments: z.array(z.string()).default([]),
    countries: z.array(z.string()).default([]),
    devices: z.array(z.enum(['desktop', 'mobile', 'tablet'])).default([]),
  }).default({}),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isActive: z.boolean().default(false),
}).refine(
  (data) => !data.endDate || !data.startDate || data.endDate > data.startDate,
  {
    message: 'End date must be greater than start date',
    path: ['endDate'],
  }
);

export const updateABTestSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Test name must be at least 2 characters')
    .max(100, 'Test name cannot exceed 100 characters')
    .optional(),
  description: z.string().trim().optional(),
  variants: z.array(
    z.object({
      name: z.string().trim().min(1, 'Variant name is required'),
      weight: z.number().min(0).max(100),
      config: z.record(z.any()).default({}),
    })
  ).min(2, 'At least 2 variants are required').optional(),
  targetAudience: z.object({
    userSegments: z.array(z.string()).optional(),
    countries: z.array(z.string()).optional(),
    devices: z.array(z.enum(['desktop', 'mobile', 'tablet'])).optional(),
  }).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => !data.endDate || !data.startDate || data.endDate > data.startDate,
  {
    message: 'End date must be greater than start date',
    path: ['endDate'],
  }
);

export const trackConversionSchema = z.object({
  userId: uuidSchema.optional(),
  sessionId: z.string().optional(),
  conversionType: z.string().min(1, 'Conversion type is required'),
  value: z.number().min(0).optional(),
  metadata: z.record(z.any()).default({}),
});

// Export validation schemas
export const exportQuerySchemas = {
  orders: z.object({
    format: z.enum(['csv', 'excel', 'pdf', 'json']).default('csv'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
    isPaid: z.enum(['true', 'false']).optional(),
  }).refine(
    (data) => !data.endDate || !data.startDate || new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    }
  ),

  products: z.object({
    format: z.enum(['csv', 'excel', 'pdf', 'json']).default('csv'),
    category: uuidSchema.optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    featured: z.enum(['true', 'false']).optional(),
    active: z.enum(['true', 'false']).optional(),
  }).refine(
    (data) => !data.maxPrice || !data.minPrice || data.maxPrice >= data.minPrice,
    {
      message: 'Maximum price must be greater than or equal to minimum price',
      path: ['maxPrice'],
    }
  ),

  customers: z.object({
    format: z.enum(['csv', 'excel', 'pdf', 'json']).default('csv'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    active: z.enum(['true', 'false']).optional(),
  }).refine(
    (data) => !data.endDate || !data.startDate || new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    }
  ),

  sales: z.object({
    format: z.enum(['csv', 'excel', 'pdf', 'json']).default('csv'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    interval: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
  }).refine(
    (data) => !data.endDate || !data.startDate || new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    }
  ),

  inventory: z.object({
    format: z.enum(['csv', 'excel', 'pdf', 'json']).default('csv'),
    category: uuidSchema.optional(),
    minQuantity: z.number().int().min(0).optional(),
    maxQuantity: z.number().int().min(0).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    includeVariants: z.enum(['true', 'false']).default('false'),
  }).refine(
    (data) => !data.maxQuantity || !data.minQuantity || data.maxQuantity >= data.minQuantity,
    {
      message: 'Maximum quantity must be greater than or equal to minimum quantity',
      path: ['maxQuantity'],
    }
  ),
};

// Common pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Common date range schema
export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be greater than or equal to start date',
    path: ['endDate'],
  }
);