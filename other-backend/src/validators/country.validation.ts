import Joi from "joi"

// Custom ObjectId validation function
const objectIdValidation = (value: string, helpers: any) => {
  // Basic ObjectId pattern validation (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    return helpers.error("any.invalid")
  }
  return value
}

export const createCountrySchema = Joi.object({
  code: Joi.string().required().min(2).max(3).uppercase().trim(),
  name: Joi.string().required().min(2).max(100).trim(),
  isActive: Joi.boolean(),
  phoneCode: Joi.string().required().min(1).max(10).trim(),
  currency: Joi.string()
    .required()
    .custom(objectIdValidation, "MongoDB ObjectId validation"),
  defaultLanguage: Joi.string().min(2).max(5).trim(),
  states: Joi.array().items(
    Joi.object({
      code: Joi.string().required().min(1).max(10).uppercase().trim(),
      name: Joi.string().required().min(2).max(100).trim(),
    }),
  ),
})

export const updateCountrySchema = Joi.object({
  code: Joi.string().min(2).max(3).uppercase().trim(),
  name: Joi.string().min(2).max(100).trim(),
  isActive: Joi.boolean(),
  phoneCode: Joi.string().min(1).max(10).trim(),
  currency: Joi.string().custom(objectIdValidation, "MongoDB ObjectId validation"),
  defaultLanguage: Joi.string().min(2).max(5).trim(),
  states: Joi.array().items(
    Joi.object({
      code: Joi.string().required().min(1).max(10).uppercase().trim(),
      name: Joi.string().required().min(2).max(100).trim(),
    }),
  ),
})

// Query parameter validation
export const countryQueryValidation = {
  getAllCountries: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().min(1).max(100).trim(),
    region: Joi.string().valid("africa", "americas", "asia", "europe", "oceania"),
    active: Joi.boolean(),
  }),

  getStatesByCountry: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().min(1).max(100).trim(),
  }),

  getCountriesByRegion: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().min(1).max(100).trim(),
  }),

  searchCountries: Joi.object({
    q: Joi.string().required().min(2).max(100).trim().messages({
      "string.min": "Search query must be at least 2 characters long",
      "any.required": "Search query is required",
    }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(20).default(20),
    region: Joi.string().valid("africa", "americas", "asia", "europe", "oceania"),
  }),
}

// Params validation
export const countryParamsValidation = {
  countryCode: Joi.object({
    code: Joi.string().required().min(2).max(3).uppercase().trim().messages({
      "string.min": "Country code must be at least 2 characters",
      "string.max": "Country code cannot exceed 3 characters",
      "any.required": "Country code is required",
    }),
  }),

  regionParam: Joi.object({
    region: Joi.string().required().valid("africa", "americas", "asia", "europe", "oceania").messages({
      "any.only": "Invalid region. Must be one of: africa, americas, asia, europe, oceania",
      "any.required": "Region is required",
    }),
  }),

  stateParams: Joi.object({
    code: Joi.string().required().min(2).max(3).uppercase().trim(),
    stateCode: Joi.string().required().min(1).max(10).uppercase().trim(),
  }),
}

// Body validation for adding states
export const addStateSchema = Joi.object({
  stateCode: Joi.string().required().min(1).max(10).uppercase().trim().messages({
    "string.empty": "State code is required",
    "string.min": "State code must be at least 1 character",
    "string.max": "State code cannot exceed 10 characters",
    "any.required": "State code is required",
  }),
  stateName: Joi.string().required().min(2).max(100).trim().messages({
    "string.empty": "State name is required",
    "string.min": "State name must be at least 2 characters",
    "string.max": "State name cannot exceed 100 characters",
    "any.required": "State name is required",
  }),
})
