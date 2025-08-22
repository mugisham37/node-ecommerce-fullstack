// import { z } from 'zod';
const z = {} as any;

// Loyalty program validation schemas converted from Joi to Zod

export const createLoyaltyTierSchema = z.object({
  name: z.string().trim().min(2).max(50),
  level: z.number().int().min(1),
  pointsThreshold: z.number().int().min(0),
  benefits: z.array(z.string().trim()).default([]),
  discountPercentage: z.number().min(0).max(100).default(0),
  active: z.boolean().default(true),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color code").default('#000000'),
  icon: z.string().trim().nullable().optional(),
});

export const updateLoyaltyTierSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  level: z.number().int().min(1).optional(),
  pointsThreshold: z.number().int().min(0).optional(),
  benefits: z.array(z.string().trim()).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color code").optional(),
  icon: z.string().trim().nullable().optional(),
});

export const createRewardSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10),
  pointsCost: z.number().int().min(1),
  requiredTier: z.string().regex(/^[0-9a-fA-F]{24}$/, "Required tier must be a valid ObjectId").nullable().optional(),
  type: z.enum(['discount', 'freeProduct', 'freeShipping', 'giftCard', 'other']).default('other'),
  value: z.number().min(0).nullable().optional(),
  code: z.string().trim().nullable().optional(),
  active: z.boolean().default(true),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  limitPerCustomer: z.number().int().min(1).nullable().optional(),
  limitTotal: z.number().int().min(1).nullable().optional(),
  redemptionExpiryDays: z.number().int().min(1).nullable().optional(),
  image: z.string().trim().nullable().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be greater than start date",
  path: ["endDate"],
});

export const updateRewardSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(10).optional(),
  pointsCost: z.number().int().min(1).optional(),
  requiredTier: z.string().regex(/^[0-9a-fA-F]{24}$/, "Required tier must be a valid ObjectId").nullable().optional(),
  type: z.enum(['discount', 'freeProduct', 'freeShipping', 'giftCard', 'other']).optional(),
  value: z.number().min(0).nullable().optional(),
  code: z.string().trim().nullable().optional(),
  active: z.boolean().optional(),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  limitPerCustomer: z.number().int().min(1).nullable().optional(),
  limitTotal: z.number().int().min(1).nullable().optional(),
  redemptionExpiryDays: z.number().int().min(1).nullable().optional(),
  image: z.string().trim().nullable().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be greater than start date",
  path: ["endDate"],
});

export const redeemRewardSchema = z.object({
  rewardId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Reward ID must be a valid ObjectId"),
});

export const applyReferralCodeSchema = z.object({
  referralCode: z.string(),
});

export const updateRedemptionStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'used', 'expired']),
  notes: z.string().trim().nullable().optional(),
});

export const adjustCustomerPointsSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "User ID must be a valid ObjectId"),
  points: z.number().int(),
  reason: z.string(),
});

export const getLoyaltyHistoryQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort: z.enum(['createdAt', '-createdAt', 'points', '-points']).default('-createdAt'),
});

export const getCustomerRedemptionsQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort: z.enum(['createdAt', '-createdAt', 'status', '-status']).default('-createdAt'),
});

export const getAllLoyaltyProgramsQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort: z.enum(['loyaltyPoints', '-loyaltyPoints', 'createdAt', '-createdAt']).default('-loyaltyPoints'),
  minPoints: z.number().int().min(0).optional(),
  maxPoints: z.number().int().min(0).optional(),
  search: z.string().min(1).max(100).trim().optional(),
});

export const getAllRedemptionsQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort: z.enum(['createdAt', '-createdAt', 'status', '-status']).default('-createdAt'),
  status: z.enum(['pending', 'approved', 'rejected', 'used', 'expired']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be greater than start date",
  path: ["endDate"],
});

export const rewardIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Reward ID must be a valid ObjectId"),
});

export const redemptionIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Redemption ID must be a valid ObjectId"),
});

export const periodParamSchema = z.object({
  period: z.enum(['week', 'month', 'year', 'all']),
});

// Type exports
export type CreateLoyaltyTierInput = z.infer<typeof createLoyaltyTierSchema>;
export type UpdateLoyaltyTierInput = z.infer<typeof updateLoyaltyTierSchema>;
export type CreateRewardInput = z.infer<typeof createRewardSchema>;
export type UpdateRewardInput = z.infer<typeof updateRewardSchema>;
export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;
export type ApplyReferralCodeInput = z.infer<typeof applyReferralCodeSchema>;
export type UpdateRedemptionStatusInput = z.infer<typeof updateRedemptionStatusSchema>;
export type AdjustCustomerPointsInput = z.infer<typeof adjustCustomerPointsSchema>;
export type GetLoyaltyHistoryQuery = z.infer<typeof getLoyaltyHistoryQuerySchema>;
export type GetCustomerRedemptionsQuery = z.infer<typeof getCustomerRedemptionsQuerySchema>;
export type GetAllLoyaltyProgramsQuery = z.infer<typeof getAllLoyaltyProgramsQuerySchema>;
export type GetAllRedemptionsQuery = z.infer<typeof getAllRedemptionsQuerySchema>;
export type RewardIdParam = z.infer<typeof rewardIdParamSchema>;
export type RedemptionIdParam = z.infer<typeof redemptionIdParamSchema>;
export type PeriodParam = z.infer<typeof periodParamSchema>;