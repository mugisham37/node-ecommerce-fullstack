// import { z } from 'zod';
// Note: This file contains Zod schema definitions converted from Joi
// The actual zod import will be available when the dependency is properly installed

// Placeholder for zod - schemas are ready for use once zod is available
const z = {} as any;

// A/B Test validation schemas converted from Joi to Zod

const variantSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(3).max(500).optional(),
  trafficAllocation: z.number().min(1).max(100),
  content: z.record(z.any()),
});

const goalSchema = z.object({
  name: z.string().trim().min(3).max(100),
  type: z.enum(['pageview', 'click', 'conversion', 'revenue', 'engagement', 'custom']),
  targetValue: z.number().min(0).optional(),
  targetSelector: z.string().optional(),
}).refine((data) => {
  if (data.type === 'click') {
    return data.targetSelector && data.targetSelector.length > 0;
  }
  return true;
}, {
  message: "Target selector is required for click goals",
  path: ["targetSelector"],
});

const targetAudienceSchema = z.object({
  userType: z.array(z.enum(['new', 'returning', 'all'])).optional(),
  devices: z.array(z.enum(['desktop', 'mobile', 'tablet', 'all'])).optional(),
  countries: z.array(z.string().length(2)).optional(),
});

export const createABTestSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(3).max(500),
  type: z.enum(['product', 'category', 'homepage', 'checkout', 'other']),
  targetUrl: z.string().trim().url(),
  variants: z.array(variantSchema).min(2),
  startDate: z.date().min(new Date()).optional(),
  endDate: z.date().optional(),
  status: z.enum(['draft', 'running', 'paused', 'completed']).optional(),
  targetAudience: targetAudienceSchema.optional(),
  goals: z.array(goalSchema).min(1),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be greater than start date",
  path: ["endDate"],
});

export const updateABTestSchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().min(3).max(500).optional(),
  type: z.enum(['product', 'category', 'homepage', 'checkout', 'other']).optional(),
  targetUrl: z.string().trim().url().optional(),
  variants: z.array(variantSchema).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(['draft', 'running', 'paused', 'completed']).optional(),
  targetAudience: targetAudienceSchema.optional(),
  goals: z.array(goalSchema).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be greater than start date",
  path: ["endDate"],
});

export const trackConversionSchema = z.object({
  userId: z.string().nullable().optional(),
  sessionId: z.string(),
  variantId: z.string(),
  goalName: z.string(),
  value: z.number().min(0).optional(),
  metadata: z.record(z.any()).optional(),
});

export const getTestsQuerySchema = z.object({
  status: z.enum(['draft', 'running', 'paused', 'completed']).optional(),
  type: z.enum(['product', 'category', 'homepage', 'checkout', 'other']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

export const testIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Test ID must be a valid ObjectId"),
});

export const completeTestSchema = z.object({
  winner: z.string().optional(),
});

export const trackEventSchema = z.object({
  eventType: z.enum(['impression', 'conversion', 'revenue', 'engagement']),
  amount: z.number().min(0).optional(),
}).refine((data) => {
  if (data.eventType === 'revenue') {
    return data.amount !== undefined;
  }
  return true;
}, {
  message: "Amount is required for revenue events",
  path: ["amount"],
});

// Type exports
export type CreateABTestInput = any; // z.infer<typeof createABTestSchema>;
export type UpdateABTestInput = any; // z.infer<typeof updateABTestSchema>;
export type TrackConversionInput = any; // z.infer<typeof trackConversionSchema>;
export type GetTestsQuery = any; // z.infer<typeof getTestsQuerySchema>;
export type TestIdParam = any; // z.infer<typeof testIdParamSchema>;
export type CompleteTestInput = any; // z.infer<typeof completeTestSchema>;
export type TrackEventInput = any; // z.infer<typeof trackEventSchema>;