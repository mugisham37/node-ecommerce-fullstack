// import { z } from 'zod';
const z = {} as any;

// Country validation schemas converted from Joi to Zod

const stateSchema = z.object({
  code: z.string().min(1).max(10).toUpperCase().trim(),
  name: z.string().min(2).max(100).trim(),
});

export const createCountrySchema = z.object({
  code: z.string().min(2).max(3).toUpperCase().trim(),
  name: z.string().min(2).max(100).trim(),
  isActive: z.boolean().optional(),
  phoneCode: z.string().min(1).max(10).trim(),
  currency: z.string().regex(/^[0-9a-fA-F]{24}$/, "Currency must be a valid ObjectId"),
  defaultLanguage: z.string().min(2).max(5).trim().optional(),
  states: z.array(stateSchema).optional(),
});

export const updateCountrySchema = z.object({
  code: z.string().min(2).max(3).toUpperCase().trim().optional(),
  name: z.string().min(2).max(100).trim().optional(),
  isActive: z.boolean().optional(),
  phoneCode: z.string().min(1).max(10).trim().optional(),
  currency: z.string().regex(/^[0-9a-fA-F]{24}$/, "Currency must be a valid ObjectId").optional(),
  defaultLanguage: z.string().min(2).max(5).trim().optional(),
  states: z.array(stateSchema).optional(),
});

export const getAllCountriesQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  search: z.string().min(1).max(100).trim().optional(),
  region: z.enum(['africa', 'americas', 'asia', 'europe', 'oceania']).optional(),
  active: z.boolean().optional(),
});

export const getStatesByCountryQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  search: z.string().min(1).max(100).trim().optional(),
});

export const getCountriesByRegionQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  search: z.string().min(1).max(100).trim().optional(),
});

export const searchCountriesQuerySchema = z.object({
  q: z.string().min(2).max(100).trim(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(20).default(20),
  region: z.enum(['africa', 'americas', 'asia', 'europe', 'oceania']).optional(),
});

export const countryCodeParamSchema = z.object({
  code: z.string().min(2).max(3).toUpperCase().trim(),
});

export const regionParamSchema = z.object({
  region: z.enum(['africa', 'americas', 'asia', 'europe', 'oceania']),
});

export const stateParamsSchema = z.object({
  code: z.string().min(2).max(3).toUpperCase().trim(),
  stateCode: z.string().min(1).max(10).toUpperCase().trim(),
});

export const addStateSchema = z.object({
  stateCode: z.string().min(1).max(10).toUpperCase().trim(),
  stateName: z.string().min(2).max(100).trim(),
});

// Type exports
export type CreateCountryInput = any;
export type UpdateCountryInput = any;
export type GetAllCountriesQuery = any;
export type GetStatesByCountryQuery = any;
export type GetCountriesByRegionQuery = any;
export type SearchCountriesQuery = any;
export type CountryCodeParam = any;
export type RegionParam = any;
export type StateParams = any;
export type AddStateInput = any;