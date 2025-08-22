import Joi from "joi"

// Custom ObjectId validation function
const objectIdValidation = (value: string, helpers: any) => {
  // Basic ObjectId pattern validation (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    return helpers.error("any.invalid")
  }
  return value
}

export const createTaxRateSchema = Joi.object({
  name: Joi.string().required().min(2).max(100).trim().messages({
    "string.empty": "Tax rate name is required",
    "string.min": "Tax rate name must be at least 2 characters",
    "string.max": "Tax rate name cannot exceed 100 characters",
    "any.required": "Tax rate name is required",
  }),
  rate: Joi.number().required().min(0).max(100).messages({
    "number.base": "Tax rate must be a number",
    "number.min": "Tax rate must be at least 0",
    "number.max": "Tax rate cannot exceed 100",
    "any.required": "Tax rate is required",
  }),
  country: Joi.string().required().min(2).max(3).uppercase().trim().messages({
    "string.empty": "Country is required",
    "string.min": "Country code must be at least 2 characters",
    "string.max": "Country code cannot exceed 3 characters",
    "any.required": "Country is required",
  }),
  state: Joi.string().min(1).max(50).trim().messages({
    "string.min": "State must be at least 1 character",
    "string.max": "State cannot exceed 50 characters",
  }),
  postalCode: Joi.string().min(1).max(20).trim().messages({
    "string.min": "Postal code must be at least 1 character",
    "string.max": "Postal code cannot exceed 20 characters",
  }),
  isDefault: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  priority: Joi.number().integer().min(0).default(0).messages({
    "number.base": "Priority must be a number",
    "number.integer": "Priority must be an integer",
    "number.min": "Priority must be at least 0",
  }),
  productCategories: Joi.array().items(
    Joi.string().custom(objectIdValidation, "MongoDB ObjectId validation").messages({
      "any.invalid": "Product category must be a valid ID",
    })
  ).default([]),
})

export const updateTaxRateSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().messages({
    "string.min": "Tax rate name must be at least 2 characters",
    "string.max": "Tax rate name cannot exceed 100 characters",
  }),
  rate: Joi.number().min(0).max(100).messages({
    "number.base": "Tax rate must be a number",
    "number.min": "Tax rate must be at least 0",
    "number.max": "Tax rate cannot exceed 100",
  }),
  country: Joi.string().min(2).max(3).uppercase().trim().messages({
    "string.min": "Country code must be at least 2 characters",
    "string.max": "Country code cannot exceed 3 characters",
  }),
  state: Joi.string().min(1).max(50).trim().messages({
    "string.min": "State must be at least 1 character",
    "string.max": "State cannot exceed 50 characters",
  }),
  postalCode: Joi.string().min(1).max(20).trim().messages({
    "string.min": "Postal code must be at least 1 character",
    "string.max": "Postal code cannot exceed 20 characters",
  }),
  isDefault: Joi.boolean(),
  isActive: Joi.boolean(),
  priority: Joi.number().integer().min(0).messages({
    "number.base": "Priority must be a number",
    "number.integer": "Priority must be an integer",
    "number.min": "Priority must be at least 0",
  }),
  productCategories: Joi.array().items(
    Joi.string().custom(objectIdValidation, "MongoDB ObjectId validation").messages({
      "any.invalid": "Product category must be a valid ID",
    })
  ),
})

// Query parameter validation
export const taxQueryValidation = {
  getApplicableTaxRate: Joi.object({
    country: Joi.string().required().min(2).max(3).uppercase().trim().messages({
      "string.empty": "Country is required",
      "string.min": "Country code must be at least 2 characters",
      "string.max": "Country code cannot exceed 3 characters",
      "any.required": "Country is required",
    }),
    state: Joi.string().min(1).max(50).trim().messages({
      "string.min": "State must be at least 1 character",
      "string.max": "State cannot exceed 50 characters",
    }),
    postalCode: Joi.string().min(1).max(20).trim().messages({
      "string.min": "Postal code must be at least 1 character",
      "string.max": "Postal code cannot exceed 20 characters",
    }),
    categoryId: Joi.string().custom(objectIdValidation, "MongoDB ObjectId validation").messages({
      "any.invalid": "Category ID must be a valid ID",
    }),
  }),

  calculateTax: Joi.object({
    amount: Joi.number().required().min(0).messages({
      "number.base": "Amount must be a number",
      "number.min": "Amount must be at least 0",
      "any.required": "Amount is required",
    }),
    country: Joi.string().required().min(2).max(3).uppercase().trim().messages({
      "string.empty": "Country is required",
      "string.min": "Country code must be at least 2 characters",
      "string.max": "Country code cannot exceed 3 characters",
      "any.required": "Country is required",
    }),
    state: Joi.string().min(1).max(50).trim().messages({
      "string.min": "State must be at least 1 character",
      "string.max": "State cannot exceed 50 characters",
    }),
    postalCode: Joi.string().min(1).max(20).trim().messages({
      "string.min": "Postal code must be at least 1 character",
      "string.max": "Postal code cannot exceed 20 characters",
    }),
    categoryId: Joi.string().custom(objectIdValidation, "MongoDB ObjectId validation").messages({
      "any.invalid": "Category ID must be a valid ID",
    }),
  }),
}

// Params validation
export const taxParamsValidation = {
  taxRateId: Joi.object({
    id: Joi.string()
      .custom(objectIdValidation, "MongoDB ObjectId validation")
      .required()
      .messages({
        "any.invalid": "Tax rate ID must be a valid ID",
        "any.required": "Tax rate ID is required",
      }),
  }),
}
