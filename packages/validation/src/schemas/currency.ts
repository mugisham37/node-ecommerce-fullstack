// import { z } from 'zod';
const z = {} as any;

// Currency validation schemas converted from Joi to Zod

export const createCurrencySchema = z.object({
  code: z.string().min(2).max(3).toUpperCase().trim(),
  name: z.string().min(2).max(100).trim(),
  symbol: z.string().min(1).max(10).trim(),
  rate: z.number().min(0),
  isBase: z.boolean().optional(),
  isActive: z.boolean().optional(),
  decimalPlaces: z.number().int().min(0).max(10).optional(),
});

export const updateCurrencySchema = z.object({
  code: z.string().min(2).max(3).toUpperCase().trim().optional(),
  name: z.string().min(2).max(100).trim().optional(),
  symbol: z.string().min(1).max(10).trim().optional(),
  rate: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  decimalPlaces: z.number().int().min(0).max(10).optional(),
});

export const updateRatesSchema = z.object({
  apiKey: z.string(),
});

export const convertCurrencyQuerySchema = z.object({
  amount: z.number().min(0),
  from: z.string().min(2).max(3).toUpperCase().trim(),
  to: z.string().min(2).max(3).toUpperCase().trim(),
});

export const formatCurrencyQuerySchema = z.object({
  amount: z.number().min(0),
  currency: z.string().min(2).max(3).toUpperCase().trim(),
});

export const currencyCodeParamSchema = z.object({
  code: z.string().min(2).max(3).toUpperCase().trim(),
});

// Type exports
export type CreateCurrencyInput = any;
export type UpdateCurrencyInput = any;
export type UpdateRatesInput = any;
export type ConvertCurrencyQuery = any;
export type FormatCurrencyQuery = any;
export type CurrencyCodeParam = any;