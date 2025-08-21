/**
 * User validation schemas
 */

import { z } from 'zod';
import { UUIDSchema, RoleSchema, PasswordSchema } from './CommonValidators';
import { EmailSchema, OptionalEmailSchema } from './EmailValidator';
import { PhoneSchema, OptionalPhoneSchema } from './PhoneValidator';

/**
 * User registration validation
 */
export const UserRegistrationSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name cannot exceed 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name cannot exceed 50 characters'),
  phoneNumber: OptionalPhoneSchema,
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * User login validation
 */
export const UserLoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * User profile update validation
 */
export const UserProfileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name cannot exceed 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name cannot exceed 50 characters'),
  phoneNumber: OptionalPhoneSchema,
  dateOfBirth: z.string().datetime().optional(),
  address: z.object({
    street: z.string().max(100).optional(),
    city: z.string().max(50).optional(),
    state: z.string().max(50).optional(),
    zipCode: z.string().max(20).optional(),
    country: z.string().max(50).optional(),
  }).optional(),
  preferences: z.object({
    newsletter: z.boolean().default(false),
    notifications: z.boolean().default(true),
    language: z.string().length(2).default('en'),
    timezone: z.string().default('UTC'),
  }).optional(),
});

/**
 * Password change validation
 */
export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'New passwords do not match',
  path: ['confirmNewPassword'],
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

/**
 * Password reset request validation
 */
export const PasswordResetRequestSchema = z.object({
  email: EmailSchema,
});

/**
 * Password reset validation
 */
export const PasswordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: PasswordSchema,
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});

/**
 * User creation by admin validation
 */
export const AdminUserCreateSchema = z.object({
  email: EmailSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: RoleSchema,
  phoneNumber: OptionalPhoneSchema,
  isActive: z.boolean().default(true),
  sendWelcomeEmail: z.boolean().default(true),
});

/**
 * User update by admin validation
 */
export const AdminUserUpdateSchema = z.object({
  id: UUIDSchema,
  email: OptionalEmailSchema,
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  role: RoleSchema.optional(),
  phoneNumber: OptionalPhoneSchema,
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
});

/**
 * User query/filter validation
 */
export const UserQuerySchema = z.object({
  role: RoleSchema.optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
  search: z.string().min(1).max(100).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
});

/**
 * Email verification validation
 */
export const EmailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

/**
 * Two-factor authentication setup validation
 */
export const TwoFactorSetupSchema = z.object({
  secret: z.string().min(1, 'Secret is required'),
  code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
});

/**
 * Two-factor authentication verification validation
 */
export const TwoFactorVerificationSchema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
});

/**
 * User session validation
 */
export const UserSessionSchema = z.object({
  userId: UUIDSchema,
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().ip().optional(),
    deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional(),
  }).optional(),
  expiresAt: z.string().datetime(),
});

/**
 * Bulk user operation validation
 */
export const BulkUserOperationSchema = z.object({
  userIds: z.array(UUIDSchema).min(1, 'At least one user ID is required').max(100, 'Cannot process more than 100 users at once'),
  operation: z.enum(['activate', 'deactivate', 'delete', 'update_role', 'send_email']),
  data: z.record(z.any()).optional(),
});

// Export types
export type UserRegistration = z.infer<typeof UserRegistrationSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
export type PasswordChange = z.infer<typeof PasswordChangeSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordReset = z.infer<typeof PasswordResetSchema>;
export type AdminUserCreate = z.infer<typeof AdminUserCreateSchema>;
export type AdminUserUpdate = z.infer<typeof AdminUserUpdateSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type EmailVerification = z.infer<typeof EmailVerificationSchema>;
export type TwoFactorSetup = z.infer<typeof TwoFactorSetupSchema>;
export type TwoFactorVerification = z.infer<typeof TwoFactorVerificationSchema>;
export type UserSession = z.infer<typeof UserSessionSchema>;
export type BulkUserOperation = z.infer<typeof BulkUserOperationSchema>;