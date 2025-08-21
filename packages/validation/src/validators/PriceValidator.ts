/**
 * Price validation using Zod
 * Converted from ValidPriceValidator.java
 */

import { z } from 'zod';

/**
 * Price validation options
 */
export interface PriceValidationOptions {
  min?: number;
  max?: number;
  allowZero?: boolean;
  maxDecimalPlaces?: number;
}

/**
 * Enhanced price validation with business rules
 */
export const priceValidator = (options: PriceValidationOptions = {}) => {
  const {
    min = 0,
    max = 999999.99,
    allowZero = false,
    maxDecimalPlaces = 2,
  } = options;

  return z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((value) => !isNaN(value), 'Price must be a valid number')
    .refine((value) => {
      if (value === 0) {
        return allowZero;
      }
      return true;
    }, 'Price cannot be zero')
    .refine((value) => value >= 0, 'Price cannot be negative')
    .refine((value) => value >= min, `Price must be at least ${min.toFixed(2)}`)
    .refine((value) => value <= max, `Price cannot exceed ${max.toFixed(2)}`)
    .refine((value) => {
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      return decimalPlaces <= maxDecimalPlaces;
    }, `Price cannot have more than ${maxDecimalPlaces} decimal places`)
    .transform((value) => Number(value.toFixed(maxDecimalPlaces)));
};

/**
 * Standard price validation schema
 */
export const PriceSchema = priceValidator();

/**
 * Price validation that allows zero (for free products)
 */
export const PriceWithZeroSchema = priceValidator({ allowZero: true });

/**
 * High-value price validation (for expensive items)
 */
export const HighValuePriceSchema = priceValidator({
  min: 0,
  max: 9999999.99,
  allowZero: false,
});

/**
 * Discount percentage validation
 */
export const DiscountPercentageSchema = z
  .number()
  .min(0, 'Discount percentage cannot be negative')
  .max(100, 'Discount percentage cannot exceed 100%')
  .refine((value) => {
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    return decimalPlaces <= 2;
  }, 'Discount percentage cannot have more than 2 decimal places');

/**
 * Tax rate validation
 */
export const TaxRateSchema = z
  .number()
  .min(0, 'Tax rate cannot be negative')
  .max(50, 'Tax rate cannot exceed 50%')
  .refine((value) => {
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    return decimalPlaces <= 4;
  }, 'Tax rate cannot have more than 4 decimal places');

/**
 * Currency validation
 */
export const CurrencySchema = z
  .string()
  .length(3, 'Currency code must be exactly 3 characters')
  .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters only')
  .refine((value) => {
    // Common currency codes validation
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
      'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW'
    ];
    return validCurrencies.includes(value);
  }, 'Invalid currency code');

/**
 * Money object validation (price with currency)
 */
export const MoneySchema = z.object({
  amount: PriceSchema,
  currency: CurrencySchema,
});

/**
 * Price range validation
 */
export const PriceRangeSchema = z
  .object({
    min: PriceSchema,
    max: PriceSchema,
  })
  .refine((data) => data.min <= data.max, 'Minimum price cannot be greater than maximum price');

/**
 * Utility functions for price formatting
 */
export const formatPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

export const formatPriceRange = (min: number, max: number, currency: string = 'USD'): string => {
  return `${formatPrice(min, currency)} - ${formatPrice(max, currency)}`;
};

export type Price = z.infer<typeof PriceSchema>;
export type Money = z.infer<typeof MoneySchema>;
export type PriceRange = z.infer<typeof PriceRangeSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type DiscountPercentage = z.infer<typeof DiscountPercentageSchema>;
export type TaxRate = z.infer<typeof TaxRateSchema>;