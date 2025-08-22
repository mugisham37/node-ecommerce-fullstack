// import { z } from 'zod';
const z = {} as any;

// Vendor validation schemas converted from Joi to Zod

const addressSchema = z.object({
  street: z.string().trim(),
  city: z.string().trim(),
  state: z.string().trim(),
  postalCode: z.string().trim(),
  country: z.string().trim(),
  isDefault: z.boolean().default(false),
});

const bankAccountSchema = z.object({
  accountName: z.string().trim(),
  accountNumber: z.string().trim(),
  bankName: z.string().trim(),
  routingNumber: z.string().trim(),
  swiftCode: z.string().trim().optional(),
  isDefault: z.boolean().default(false),
});

const taxInformationSchema = z.object({
  taxId: z.string().trim(),
  businessType: z.enum(['sole_proprietorship', 'partnership', 'corporation', 'llc', 'other']),
  taxDocuments: z.array(z.string().url()).optional(),
  vatRegistered: z.boolean().default(false),
  vatNumber: z.string().trim().optional(),
});

const socialMediaSchema = z.object({
  facebook: z.string().url().optional(),
  twitter: z.string().url().optional(),
  instagram: z.string().url().optional(),
  pinterest: z.string().url().optional(),
  youtube: z.string().url().optional(),
});

const contactPersonSchema = z.object({
  firstName: z.string().trim(),
  lastName: z.string().trim(),
  email: z.string().email().trim(),
  phone: z.string().trim(),
  position: z.string().trim(),
});

export const createVendorSchema = z.object({
  businessName: z.string().trim().min(3).max(100),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
  phone: z.string().trim(),
  description: z.string().trim().min(10).max(2000),
  logo: z.string().url().optional(),
  bannerImage: z.string().url().optional(),
  website: z.string().url().optional(),
  socialMedia: socialMediaSchema.optional(),
  addresses: z.array(addressSchema).optional(),
  bankAccounts: z.array(bankAccountSchema).optional(),
  taxInformation: taxInformationSchema.optional(),
  commissionRate: z.number().min(0).max(100).default(10),
  minimumPayoutAmount: z.number().min(0).default(100),
  payoutSchedule: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).default('monthly'),
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).default('pending'),
  verificationDocuments: z.array(z.string().url()).optional(),
  verificationNotes: z.string().trim().optional(),
  returnPolicy: z.string().trim().max(5000).optional(),
  shippingPolicy: z.string().trim().max(5000).optional(),
  contactPerson: contactPersonSchema,
  active: z.boolean().default(true),
});

export const updateVendorSchema = z.object({
  businessName: z.string().trim().min(3).max(100).optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  phone: z.string().trim().optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  logo: z.string().url().optional(),
  bannerImage: z.string().url().optional(),
  website: z.string().url().optional(),
  socialMedia: socialMediaSchema.optional(),
  addresses: z.array(addressSchema).optional(),
  bankAccounts: z.array(bankAccountSchema).optional(),
  taxInformation: taxInformationSchema.optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  minimumPayoutAmount: z.number().min(0).optional(),
  payoutSchedule: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  verificationDocuments: z.array(z.string().url()).optional(),
  returnPolicy: z.string().trim().max(5000).optional(),
  shippingPolicy: z.string().trim().max(5000).optional(),
  contactPerson: contactPersonSchema.partial().optional(),
  active: z.boolean().optional(),
});

export const updateVendorStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  notes: z.string().trim().optional(),
});

export const calculatePayoutSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

const paymentDetailsSchema = z.object({
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  routingNumber: z.string().optional(),
  swiftCode: z.string().optional(),
  paypalEmail: z.string().email().optional(),
  stripeAccountId: z.string().optional(),
  other: z.record(z.any()).optional(),
});

export const createPayoutSchema = z.object({
  vendor: z.string().regex(/^[0-9a-fA-F]{24}$/, "Vendor ID must be a valid ObjectId"),
  amount: z.number().min(0),
  fee: z.number().min(0),
  netAmount: z.number().min(0),
  currency: z.string().toUpperCase().length(3).default('USD'),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).default('pending'),
  paymentMethod: z.enum(['bank_transfer', 'paypal', 'stripe', 'other']),
  paymentDetails: paymentDetailsSchema.optional(),
  reference: z.string(),
  description: z.string().trim().optional(),
  periodStart: z.date(),
  periodEnd: z.date(),
  orders: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Order ID must be a valid ObjectId")).optional(),
}).refine((data) => data.periodEnd > data.periodStart, {
  message: "Period end must be after period start",
  path: ["periodEnd"],
});

export const updatePayoutStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  transactionId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const getAllVendorsQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort: z.enum(['createdAt', '-createdAt', 'businessName', '-businessName', 'status', '-status']).default('-createdAt'),
  select: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
  active: z.boolean().optional(),
  search: z.string().min(1).max(100).trim().optional(),
});

export const getVendorProductsQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort: z.enum(['createdAt', '-createdAt', 'name', '-name', 'price', '-price']).default('-createdAt'),
  category: z.string().regex(/^[0-9a-fA-F]{24}$/, "Category ID must be a valid ObjectId").optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  search: z.string().min(1).max(100).trim().optional(),
});

export const getVendorPayoutsQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort: z.enum(['createdAt', '-createdAt', 'amount', '-amount', 'status', '-status']).default('-createdAt'),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
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

export const getVendorMetricsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year', 'all']).default('all'),
});

export const vendorIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Vendor ID must be a valid ObjectId"),
});

export const vendorSlugParamSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

export const payoutIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Payout ID must be a valid ObjectId"),
});

// Type exports
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type UpdateVendorStatusInput = z.infer<typeof updateVendorStatusSchema>;
export type CalculatePayoutInput = z.infer<typeof calculatePayoutSchema>;
export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;
export type UpdatePayoutStatusInput = z.infer<typeof updatePayoutStatusSchema>;
export type GetAllVendorsQuery = z.infer<typeof getAllVendorsQuerySchema>;
export type GetVendorProductsQuery = z.infer<typeof getVendorProductsQuerySchema>;
export type GetVendorPayoutsQuery = z.infer<typeof getVendorPayoutsQuerySchema>;
export type GetVendorMetricsQuery = z.infer<typeof getVendorMetricsQuerySchema>;
export type VendorIdParam = z.infer<typeof vendorIdParamSchema>;
export type VendorSlugParam = z.infer<typeof vendorSlugParamSchema>;
export type PayoutIdParam = z.infer<typeof payoutIdParamSchema>;