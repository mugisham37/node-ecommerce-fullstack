/**
 * Phone number validation using Zod
 * Converted from ValidPhoneNumberValidator.java
 */

import { z } from 'zod';

// Phone number regex patterns from the Java validator
const PHONE_PATTERN = /^[+]?[1-9]\d{1,14}$|^[+]?[(]?[\d\s\-\(\)]{10,20}$/;

/**
 * Enhanced phone number validation with business rules
 */
export const phoneValidator = (allowEmpty: boolean = false) => {
  let schema = z.string();

  if (allowEmpty) {
    schema = schema.optional().or(z.literal(''));
  }

  return schema
    .refine((value) => {
      if (!value || value.trim() === '') {
        return allowEmpty;
      }
      return true;
    }, 'Phone number is required')
    .refine((value) => {
      if (!value || value.trim() === '') {
        return allowEmpty;
      }

      // Remove common formatting characters for validation
      const cleanedValue = value.replace(/[\s\-\(\)]/g, '');
      
      // Check length
      if (cleanedValue.length < 10 || cleanedValue.length > 15) {
        return false;
      }

      return true;
    }, 'Phone number must be between 10 and 15 digits')
    .refine((value) => {
      if (!value || value.trim() === '') {
        return allowEmpty;
      }

      return PHONE_PATTERN.test(value);
    }, 'Invalid phone number format');
};

/**
 * Standard phone number validation schema
 */
export const PhoneSchema = phoneValidator(false);

/**
 * Optional phone number validation schema
 */
export const OptionalPhoneSchema = phoneValidator(true);

/**
 * International phone number validation
 */
export const InternationalPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((value) => {
    const cleanedValue = value.replace(/[\s\-\(\)]/g, '');
    return cleanedValue.length >= 10 && cleanedValue.length <= 15;
  }, 'International phone number must be between 10 and 15 digits')
  .refine((value) => {
    return /^\+[1-9]\d{1,14}$/.test(value.replace(/[\s\-\(\)]/g, ''));
  }, 'International phone number must start with + and country code');

/**
 * US phone number validation
 */
export const USPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((value) => {
    const cleanedValue = value.replace(/[\s\-\(\)]/g, '');
    return cleanedValue.length === 10;
  }, 'US phone number must be 10 digits')
  .refine((value) => {
    const cleanedValue = value.replace(/[\s\-\(\)]/g, '');
    return /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleanedValue);
  }, 'Invalid US phone number format');

/**
 * Utility function to format phone number
 */
export const formatPhoneNumber = (phone: string, format: 'US' | 'INTERNATIONAL' = 'US'): string => {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (format === 'US' && cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  if (format === 'INTERNATIONAL' && cleaned.startsWith('+')) {
    return cleaned;
  }
  
  return phone;
};

export type PhoneNumber = z.infer<typeof PhoneSchema>;
export type OptionalPhoneNumber = z.infer<typeof OptionalPhoneSchema>;
export type InternationalPhoneNumber = z.infer<typeof InternationalPhoneSchema>;
export type USPhoneNumber = z.infer<typeof USPhoneSchema>;