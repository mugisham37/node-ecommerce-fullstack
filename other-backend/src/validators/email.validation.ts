import Joi from "joi"

// Common ObjectId validation function
const objectIdValidation = (value: string, helpers: any) => {
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    return helpers.error("any.invalid")
  }
  return value
}

// Test email schema
export const testEmailSchema = {
  body: Joi.object({
    to: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email address is required",
      "any.required": "Email address is required",
    }),
    subject: Joi.string().required().min(1).max(200).trim().messages({
      "string.empty": "Subject is required",
      "string.min": "Subject must be at least 1 character",
      "string.max": "Subject cannot exceed 200 characters",
      "any.required": "Subject is required",
    }),
    html: Joi.string().required().min(1).messages({
      "string.empty": "HTML content is required",
      "string.min": "HTML content must be at least 1 character",
      "any.required": "HTML content is required",
    }),
  }),
}

// Welcome email schema
export const welcomeEmailSchema = {
  body: Joi.object({
    to: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email address is required",
      "any.required": "Email address is required",
    }),
    firstName: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "First name is required",
      "string.min": "First name must be at least 1 character",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),
    storeName: Joi.string().required().min(1).max(100).trim().messages({
      "string.empty": "Store name is required",
      "string.min": "Store name must be at least 1 character",
      "string.max": "Store name cannot exceed 100 characters",
      "any.required": "Store name is required",
    }),
    storeUrl: Joi.string().uri().required().messages({
      "string.uri": "Store URL must be a valid URL",
      "string.empty": "Store URL is required",
      "any.required": "Store URL is required",
    }),
  }),
}

// Order confirmation email schema
export const orderConfirmationEmailSchema = {
  body: Joi.object({
    to: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email address is required",
      "any.required": "Email address is required",
    }),
    firstName: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "First name is required",
      "string.min": "First name must be at least 1 character",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),
    orderId: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "Order ID is required",
      "string.min": "Order ID must be at least 1 character",
      "string.max": "Order ID cannot exceed 50 characters",
      "any.required": "Order ID is required",
    }),
    orderDate: Joi.string().isoDate().required().messages({
      "string.isoDate": "Order date must be a valid ISO date",
      "string.empty": "Order date is required",
      "any.required": "Order date is required",
    }),
    orderItems: Joi.array().items(
      Joi.object({
        name: Joi.string().required().min(1).max(200).trim().messages({
          "string.empty": "Item name is required",
          "string.min": "Item name must be at least 1 character",
          "string.max": "Item name cannot exceed 200 characters",
          "any.required": "Item name is required",
        }),
        price: Joi.number().min(0).required().messages({
          "number.base": "Price must be a number",
          "number.min": "Price must be at least 0",
          "any.required": "Price is required",
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          "number.base": "Quantity must be a number",
          "number.integer": "Quantity must be an integer",
          "number.min": "Quantity must be at least 1",
          "any.required": "Quantity is required",
        }),
        image: Joi.string().allow(null, "").messages({
          "string.base": "Image must be a string",
        }),
      })
    ).min(1).required().messages({
      "array.min": "At least one order item is required",
      "any.required": "Order items are required",
    }),
    subtotal: Joi.number().min(0).required().messages({
      "number.base": "Subtotal must be a number",
      "number.min": "Subtotal must be at least 0",
      "any.required": "Subtotal is required",
    }),
    tax: Joi.number().min(0).required().messages({
      "number.base": "Tax must be a number",
      "number.min": "Tax must be at least 0",
      "any.required": "Tax is required",
    }),
    shipping: Joi.number().min(0).required().messages({
      "number.base": "Shipping must be a number",
      "number.min": "Shipping must be at least 0",
      "any.required": "Shipping is required",
    }),
    total: Joi.number().min(0).required().messages({
      "number.base": "Total must be a number",
      "number.min": "Total must be at least 0",
      "any.required": "Total is required",
    }),
    shippingAddress: Joi.object({
      street: Joi.string().required().min(1).max(200).trim().messages({
        "string.empty": "Street is required",
        "string.min": "Street must be at least 1 character",
        "string.max": "Street cannot exceed 200 characters",
        "any.required": "Street is required",
      }),
      city: Joi.string().required().min(1).max(100).trim().messages({
        "string.empty": "City is required",
        "string.min": "City must be at least 1 character",
        "string.max": "City cannot exceed 100 characters",
        "any.required": "City is required",
      }),
      state: Joi.string().required().min(1).max(100).trim().messages({
        "string.empty": "State is required",
        "string.min": "State must be at least 1 character",
        "string.max": "State cannot exceed 100 characters",
        "any.required": "State is required",
      }),
      postalCode: Joi.string().required().min(1).max(20).trim().messages({
        "string.empty": "Postal code is required",
        "string.min": "Postal code must be at least 1 character",
        "string.max": "Postal code cannot exceed 20 characters",
        "any.required": "Postal code is required",
      }),
      country: Joi.string().required().min(1).max(100).trim().messages({
        "string.empty": "Country is required",
        "string.min": "Country must be at least 1 character",
        "string.max": "Country cannot exceed 100 characters",
        "any.required": "Country is required",
      }),
    }).required().messages({
      "any.required": "Shipping address is required",
    }),
    orderUrl: Joi.string().uri().required().messages({
      "string.uri": "Order URL must be a valid URL",
      "string.empty": "Order URL is required",
      "any.required": "Order URL is required",
    }),
    storeName: Joi.string().required().min(1).max(100).trim().messages({
      "string.empty": "Store name is required",
      "string.min": "Store name must be at least 1 character",
      "string.max": "Store name cannot exceed 100 characters",
      "any.required": "Store name is required",
    }),
  }),
}

// Order shipped email schema
export const orderShippedEmailSchema = {
  body: Joi.object({
    to: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email address is required",
      "any.required": "Email address is required",
    }),
    firstName: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "First name is required",
      "string.min": "First name must be at least 1 character",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),
    orderId: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "Order ID is required",
      "string.min": "Order ID must be at least 1 character",
      "string.max": "Order ID cannot exceed 50 characters",
      "any.required": "Order ID is required",
    }),
    trackingNumber: Joi.string().required().min(1).max(100).trim().messages({
      "string.empty": "Tracking number is required",
      "string.min": "Tracking number must be at least 1 character",
      "string.max": "Tracking number cannot exceed 100 characters",
      "any.required": "Tracking number is required",
    }),
    estimatedDelivery: Joi.string().required().min(1).max(100).trim().messages({
      "string.empty": "Estimated delivery is required",
      "string.min": "Estimated delivery must be at least 1 character",
      "string.max": "Estimated delivery cannot exceed 100 characters",
      "any.required": "Estimated delivery is required",
    }),
    trackingUrl: Joi.string().uri().required().messages({
      "string.uri": "Tracking URL must be a valid URL",
      "string.empty": "Tracking URL is required",
      "any.required": "Tracking URL is required",
    }),
    orderUrl: Joi.string().uri().required().messages({
      "string.uri": "Order URL must be a valid URL",
      "string.empty": "Order URL is required",
      "any.required": "Order URL is required",
    }),
    storeName: Joi.string().required().min(1).max(100).trim().messages({
      "string.empty": "Store name is required",
      "string.min": "Store name must be at least 1 character",
      "string.max": "Store name cannot exceed 100 characters",
      "any.required": "Store name is required",
    }),
  }),
}

// Order delivered email schema
export const orderDeliveredEmailSchema = {
  body: Joi.object({
    to: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email address is required",
      "any.required": "Email address is required",
    }),
    firstName: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "First name is required",
      "string.min": "First name must be at least 1 character",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),
    orderId: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "Order ID is required",
      "string.min": "Order ID must be at least 1 character",
      "string.max": "Order ID cannot exceed 50 characters",
      "any.required": "Order ID is required",
    }),
    reviewUrl: Joi.string().uri().required().messages({
      "string.uri": "Review URL must be a valid URL",
      "string.empty": "Review URL is required",
      "any.required": "Review URL is required",
    }),
    orderUrl: Joi.string().uri().required().messages({
      "string.uri": "Order URL must be a valid URL",
      "string.empty": "Order URL is required",
      "any.required": "Order URL is required",
    }),
    storeName: Joi.string().required().min(1).max(100).trim().messages({
      "string.empty": "Store name is required",
      "string.min": "Store name must be at least 1 character",
      "string.max": "Store name cannot exceed 100 characters",
      "any.required": "Store name is required",
    }),
  }),
}

// Password reset email schema
export const passwordResetEmailSchema = {
  body: Joi.object({
    to: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email address is required",
      "any.required": "Email address is required",
    }),
    firstName: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "First name is required",
      "string.min": "First name must be at least 1 character",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),
    resetUrl: Joi.string().uri().required().messages({
      "string.uri": "Reset URL must be a valid URL",
      "string.empty": "Reset URL is required",
      "any.required": "Reset URL is required",
    }),
    expiryTime: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "Expiry time is required",
      "string.min": "Expiry time must be at least 1 character",
      "string.max": "Expiry time cannot exceed 50 characters",
      "any.required": "Expiry time is required",
    }),
    storeName: Joi.string().required().min(1).max(100).trim().messages({
      "string.empty": "Store name is required",
      "string.min": "Store name must be at least 1 character",
      "string.max": "Store name cannot exceed 100 characters",
      "any.required": "Store name is required",
    }),
  }),
}

// Review request email schema
export const reviewRequestEmailSchema = {
  body: Joi.object({
    to: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email address is required",
      "any.required": "Email address is required",
    }),
    firstName: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "First name is required",
      "string.min": "First name must be at least 1 character",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),
    orderId: Joi.string().required().min(1).max(50).trim().messages({
      "string.empty": "Order ID is required",
      "string.min": "Order ID must be at least 1 character",
      "string.max": "Order ID cannot exceed 50 characters",
      "any.required": "Order ID is required",
    }),
    items: Joi.array().items(
      Joi.object({
        name: Joi.string().required().min(1).max(200).trim().messages({
          "string.empty": "Item name is required",
          "string.min": "Item name must be at least 1 character",
          "string.max": "Item name cannot exceed 200 characters",
          "any.required": "Item name is required",
        }),
        image: Joi.string().allow(null, "").messages({
          "string.base": "Image must be a string",
        }),
        reviewUrl: Joi.string().uri().required().messages({
          "string.uri": "Review URL must be a valid URL",
          "string.empty": "Review URL is required",
          "any.required": "Review URL is required",
        }),
      })
    ).min(1).required().messages({
      "array.min": "At least one item is required",
      "any.required": "Items are required",
    }),
    orderUrl: Joi.string().uri().required().messages({
      "string.uri": "Order URL must be a valid URL",
      "string.empty": "Order URL is required",
      "any.required": "Order URL is required",
    }),
    storeName: Joi.string().required().min(1).max(100).trim().messages({
      "string.empty": "Store name is required",
      "string.min": "Store name must be at least 1 character",
      "string.max": "Store name cannot exceed 100 characters",
      "any.required": "Store name is required",
    }),
  }),
}

// Query parameter validation
export const emailQueryValidation = {
  processQueue: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),
  }),

  languageQuery: Joi.object({
    language: Joi.string().valid("en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko", "ar").default("en").messages({
      "any.only": "Language must be one of: en, es, fr, de, it, pt, ru, zh, ja, ko, ar",
    }),
  }),
}
