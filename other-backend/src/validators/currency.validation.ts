import Joi from "joi"

export const createCurrencySchema = Joi.object({
  code: Joi.string().required().min(2).max(3).uppercase().trim(),
  name: Joi.string().required().min(2).max(100).trim(),
  symbol: Joi.string().required().min(1).max(10).trim(),
  rate: Joi.number().required().min(0),
  isBase: Joi.boolean(),
  isActive: Joi.boolean(),
  decimalPlaces: Joi.number().integer().min(0).max(10),
})

export const updateCurrencySchema = Joi.object({
  code: Joi.string().min(2).max(3).uppercase().trim(),
  name: Joi.string().min(2).max(100).trim(),
  symbol: Joi.string().min(1).max(10).trim(),
  rate: Joi.number().min(0),
  isActive: Joi.boolean(),
  decimalPlaces: Joi.number().integer().min(0).max(10),
})

export const updateRatesSchema = Joi.object({
  apiKey: Joi.string().required(),
})

// Query parameter validation
export const currencyQueryValidation = {
  convertCurrency: Joi.object({
    amount: Joi.number().required().min(0).messages({
      "number.base": "Amount must be a number",
      "number.min": "Amount must be non-negative",
      "any.required": "Amount is required",
    }),
    from: Joi.string().required().min(2).max(3).uppercase().trim().messages({
      "string.min": "From currency code must be at least 2 characters",
      "string.max": "From currency code cannot exceed 3 characters",
      "any.required": "From currency is required",
    }),
    to: Joi.string().required().min(2).max(3).uppercase().trim().messages({
      "string.min": "To currency code must be at least 2 characters",
      "string.max": "To currency code cannot exceed 3 characters",
      "any.required": "To currency is required",
    }),
  }),

  formatCurrency: Joi.object({
    amount: Joi.number().required().min(0).messages({
      "number.base": "Amount must be a number",
      "number.min": "Amount must be non-negative",
      "any.required": "Amount is required",
    }),
    currency: Joi.string().required().min(2).max(3).uppercase().trim().messages({
      "string.min": "Currency code must be at least 2 characters",
      "string.max": "Currency code cannot exceed 3 characters",
      "any.required": "Currency is required",
    }),
  }),
}

// Params validation
export const currencyParamsValidation = {
  currencyCode: Joi.object({
    code: Joi.string().required().min(2).max(3).uppercase().trim().messages({
      "string.min": "Currency code must be at least 2 characters",
      "string.max": "Currency code cannot exceed 3 characters",
      "any.required": "Currency code is required",
    }),
  }),
}
