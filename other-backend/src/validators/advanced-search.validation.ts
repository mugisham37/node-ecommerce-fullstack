import Joi from "joi"

// Advanced search validation schema
export const advancedSearchValidation = {
  query: Joi.object({
    q: Joi.string().trim().max(500).allow("").messages({
      "string.max": "Search query cannot exceed 500 characters",
    }),
    page: Joi.number().integer().min(1).max(1000).default(1).messages({
      "number.base": "Page must be a number",
      "number.integer": "Page must be an integer",
      "number.min": "Page must be at least 1",
      "number.max": "Page cannot exceed 1000",
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),
    sort: Joi.string()
      .valid("relevance", "price_asc", "price_desc", "name_asc", "name_desc", "created_desc", "created_asc", "rating_desc")
      .default("relevance")
      .messages({
        "any.only": "Sort must be one of: relevance, price_asc, price_desc, name_asc, name_desc, created_desc, created_asc, rating_desc",
      }),
    includeFacets: Joi.boolean().default(true),
    category: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        "string.pattern.base": "Category must be a valid ObjectId",
      }),
    vendor: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        "string.pattern.base": "Vendor must be a valid ObjectId",
      }),
    minPrice: Joi.number().min(0).max(1000000).messages({
      "number.base": "Minimum price must be a number",
      "number.min": "Minimum price must be at least 0",
      "number.max": "Minimum price cannot exceed 1,000,000",
    }),
    maxPrice: Joi.number().min(0).max(1000000).messages({
      "number.base": "Maximum price must be a number",
      "number.min": "Maximum price must be at least 0",
      "number.max": "Maximum price cannot exceed 1,000,000",
    }),
    rating: Joi.number().min(0).max(5).messages({
      "number.base": "Rating must be a number",
      "number.min": "Rating must be at least 0",
      "number.max": "Rating cannot exceed 5",
    }),
    inStock: Joi.boolean(),
    featured: Joi.boolean(),
    onSale: Joi.boolean(),
    attributes: Joi.string().custom((value, helpers) => {
      try {
        JSON.parse(value)
        return value
      } catch (error) {
        return helpers.error("any.invalid")
      }
    }, "JSON validation").messages({
      "any.invalid": "Attributes must be valid JSON",
    }),
    tags: Joi.alternatives().try(
      Joi.string().trim(),
      Joi.array().items(Joi.string().trim().max(50)).max(20)
    ).messages({
      "string.max": "Each tag cannot exceed 50 characters",
      "array.max": "Cannot have more than 20 tags",
    }),
    createdAfter: Joi.date().iso().messages({
      "date.format": "Created after date must be in ISO 8601 format",
    }),
    createdBefore: Joi.date().iso().messages({
      "date.format": "Created before date must be in ISO 8601 format",
    }),
  }).custom((value, helpers) => {
    // Validate price range
    if (value.minPrice && value.maxPrice && value.minPrice > value.maxPrice) {
      return helpers.error("any.invalid", { message: "Minimum price cannot be greater than maximum price" })
    }
    
    // Validate date range
    if (value.createdAfter && value.createdBefore && value.createdAfter > value.createdBefore) {
      return helpers.error("any.invalid", { message: "Created after date cannot be after created before date" })
    }
    
    return value
  }),
}

// Product suggestions validation schema
export const productSuggestionsValidation = {
  query: Joi.object({
    q: Joi.string().required().trim().min(2).max(100).messages({
      "string.empty": "Search query is required",
      "string.min": "Search query must be at least 2 characters",
      "string.max": "Search query cannot exceed 100 characters",
      "any.required": "Search query is required",
    }),
    limit: Joi.number().integer().min(1).max(20).default(5).messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 20",
    }),
    includeCategories: Joi.boolean().default(true),
    includeVendors: Joi.boolean().default(true),
  }),
}

// Popular searches validation schema
export const popularSearchesValidation = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10).messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 50",
    }),
    timeframe: Joi.string().valid("day", "week", "month", "all").default("week").messages({
      "any.only": "Timeframe must be one of: day, week, month, all",
    }),
  }),
}

// Filtered search validation schema
export const filteredSearchValidation = {
  body: Joi.object({
    query: Joi.string().trim().max(500).default("").messages({
      "string.max": "Search query cannot exceed 500 characters",
    }),
    filters: Joi.object({
      category: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          "string.pattern.base": "Category must be a valid ObjectId",
        }),
      vendor: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          "string.pattern.base": "Vendor must be a valid ObjectId",
        }),
      minPrice: Joi.number().min(0).max(1000000),
      maxPrice: Joi.number().min(0).max(1000000),
      rating: Joi.number().min(0).max(5),
      inStock: Joi.boolean(),
      featured: Joi.boolean(),
      onSale: Joi.boolean(),
      attributes: Joi.object(),
      tags: Joi.array().items(Joi.string().trim().max(50)).max(20),
      createdAfter: Joi.date().iso(),
      createdBefore: Joi.date().iso(),
    }).default({}).custom((value, helpers) => {
      // Validate price range
      if (value.minPrice && value.maxPrice && value.minPrice > value.maxPrice) {
        return helpers.error("any.invalid", { message: "Minimum price cannot be greater than maximum price" })
      }
      
      // Validate date range
      if (value.createdAfter && value.createdBefore && value.createdAfter > value.createdBefore) {
        return helpers.error("any.invalid", { message: "Created after date cannot be after created before date" })
      }
      
      return value
    }),
    sort: Joi.string()
      .valid("relevance", "price_asc", "price_desc", "name_asc", "name_desc", "created_desc", "created_asc", "rating_desc")
      .default("relevance"),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    includeFacets: Joi.boolean().default(true),
  }),
}

// Search facets validation schema
export const searchFacetsValidation = {
  query: Joi.object({
    q: Joi.string().trim().max(500).allow("").default(""),
    filters: Joi.string().custom((value, helpers) => {
      try {
        JSON.parse(value)
        return value
      } catch (error) {
        return helpers.error("any.invalid")
      }
    }, "JSON validation").default("{}").messages({
      "any.invalid": "Filters must be valid JSON",
    }),
  }),
}
