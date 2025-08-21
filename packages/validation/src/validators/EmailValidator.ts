/**
 * Email validation using Zod
 * Converted from ValidEmailValidator.java
 */

import { z } from 'zod';

// Email regex pattern from the Java validator
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Enhanced email validation with business rules
 */
export const emailValidator = (allowEmpty: boolean = false) => {
  let schema = z.string();

  if (allowEmpty) {
    schema = schema.optional().or(z.literal(''));
  }

  return schema
    .max(255, 'Email address cannot exceed 255 characters')
    .refine((value) => {
      if (!value || value.trim() === '') {
        return allowEmpty;
      }
      return true;
    }, 'Email is required')
    .refine((value) => {
      if (!value || value.trim() === '') {
        return allowEmpty;
      }
      return EMAIL_PATTERN.test(value);
    }, 'Invalid email format')
    .refine((value) => {
      if (!value || value.trim() === '') {
        return allowEmpty;
      }

      const parts = value.split('@');
      if (parts.length !== 2) {
        return false;
      }

      const [localPart, domainPart] = parts;

      // Local part validation
      if (
        localPart.length > 64 ||
        localPart.startsWith('.') ||
        localPart.endsWith('.') ||
        localPart.includes('..')
      ) {
        return false;
      }

      // Domain part validation
      if (
        domainPart.length > 253 ||
        domainPart.startsWith('-') ||
        domainPart.endsWith('-')
      ) {
        return false;
      }

      return true;
    }, 'Invalid email format');
};

/**
 * Standard email validation schema
 */
export const EmailSchema = emailValidator(false);

/**
 * Optional email validation schema
 */
export const OptionalEmailSchema = emailValidator(true);

/**
 * Email validation for user registration
 */
export const RegistrationEmailSchema = EmailSchema.refine(
  async (email) => {
    // This would typically check against a database
    // For now, we'll just validate the format
    return true;
  },
  'Email address is already registered'
);

export type Email = z.infer<typeof EmailSchema>;
export type OptionalEmail = z.infer<typeof OptionalEmailSchema>;