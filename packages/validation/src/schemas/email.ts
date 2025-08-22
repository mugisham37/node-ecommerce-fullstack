// import { z } from 'zod';
const z = {} as any;

// Email validation schemas converted from Joi to Zod

export const testEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200).trim(),
  html: z.string().min(1),
});

export const welcomeEmailSchema = z.object({
  to: z.string().email(),
  firstName: z.string().min(1).max(50).trim(),
  storeName: z.string().min(1).max(100).trim(),
  storeUrl: z.string().url(),
});

const orderItemSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  image: z.string().nullable().optional(),
});

const shippingAddressSchema = z.object({
  street: z.string().min(1).max(200).trim(),
  city: z.string().min(1).max(100).trim(),
  state: z.string().min(1).max(100).trim(),
  postalCode: z.string().min(1).max(20).trim(),
  country: z.string().min(1).max(100).trim(),
});

export const orderConfirmationEmailSchema = z.object({
  to: z.string().email(),
  firstName: z.string().min(1).max(50).trim(),
  orderId: z.string().min(1).max(50).trim(),
  orderDate: z.string().datetime(),
  orderItems: z.array(orderItemSchema).min(1),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  shipping: z.number().min(0),
  total: z.number().min(0),
  shippingAddress: shippingAddressSchema,
  orderUrl: z.string().url(),
  storeName: z.string().min(1).max(100).trim(),
});

export const orderShippedEmailSchema = z.object({
  to: z.string().email(),
  firstName: z.string().min(1).max(50).trim(),
  orderId: z.string().min(1).max(50).trim(),
  trackingNumber: z.string().min(1).max(100).trim(),
  estimatedDelivery: z.string().min(1).max(100).trim(),
  trackingUrl: z.string().url(),
  orderUrl: z.string().url(),
  storeName: z.string().min(1).max(100).trim(),
});

export const orderDeliveredEmailSchema = z.object({
  to: z.string().email(),
  firstName: z.string().min(1).max(50).trim(),
  orderId: z.string().min(1).max(50).trim(),
  reviewUrl: z.string().url(),
  orderUrl: z.string().url(),
  storeName: z.string().min(1).max(100).trim(),
});

export const passwordResetEmailSchema = z.object({
  to: z.string().email(),
  firstName: z.string().min(1).max(50).trim(),
  resetUrl: z.string().url(),
  expiryTime: z.string().min(1).max(50).trim(),
  storeName: z.string().min(1).max(100).trim(),
});

const reviewItemSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  image: z.string().nullable().optional(),
  reviewUrl: z.string().url(),
});

export const reviewRequestEmailSchema = z.object({
  to: z.string().email(),
  firstName: z.string().min(1).max(50).trim(),
  orderId: z.string().min(1).max(50).trim(),
  items: z.array(reviewItemSchema).min(1),
  orderUrl: z.string().url(),
  storeName: z.string().min(1).max(100).trim(),
});

export const processQueueQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
});

export const languageQuerySchema = z.object({
  language: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar']).default('en'),
});

// Type exports
export type TestEmailInput = z.infer<typeof testEmailSchema>;
export type WelcomeEmailInput = z.infer<typeof welcomeEmailSchema>;
export type OrderConfirmationEmailInput = z.infer<typeof orderConfirmationEmailSchema>;
export type OrderShippedEmailInput = z.infer<typeof orderShippedEmailSchema>;
export type OrderDeliveredEmailInput = z.infer<typeof orderDeliveredEmailSchema>;
export type PasswordResetEmailInput = z.infer<typeof passwordResetEmailSchema>;
export type ReviewRequestEmailInput = z.infer<typeof reviewRequestEmailSchema>;
export type ProcessQueueQuery = z.infer<typeof processQueueQuerySchema>;
export type LanguageQuery = z.infer<typeof languageQuerySchema>;