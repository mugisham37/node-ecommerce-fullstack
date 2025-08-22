import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { ApiError } from '../utils/api-error'

/**
 * Validation middleware that validates request data against Joi schemas
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req, { 
      abortEarly: false, 
      allowUnknown: true,
      stripUnknown: true 
    })
    
    if (error) {
      const errors = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }))
      
      throw new ApiError('Validation failed', 400)
    }
    
    next()
  }
}

/**
 * Alternative validation middleware with different signature
 */
export const validate = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false, 
      allowUnknown: false,
      stripUnknown: true 
    })
    
    if (error) {
      const errors = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }))
      
      throw new ApiError('Validation failed', 400)
    }
    
    // Replace request body with validated and sanitized data
    req.body = value
    next()
  }
}

/**
 * Validate query parameters
 */
export const validateQuery = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, { 
      abortEarly: false, 
      allowUnknown: false,
      stripUnknown: true 
    })
    
    if (error) {
      const errors = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }))
      
      throw new ApiError('Query validation failed', 400)
    }
    
    // Replace request query with validated and sanitized data
    req.query = value
    next()
  }
}

/**
 * Validate route parameters
 */
export const validateParams = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, { 
      abortEarly: false, 
      allowUnknown: false,
      stripUnknown: true 
    })
    
    if (error) {
      const errors = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }))
      
      throw new ApiError('Parameter validation failed', 400)
    }
    
    // Replace request params with validated and sanitized data
    req.params = value
    next()
  }
}

/**
 * Combined validation for body, query, and params
 */
export const validateAll = (schemas: {
  body?: any
  query?: any
  params?: any
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: any[] = []

    // Validate body
    if (schemas.body) {
      const { error: bodyError, value: bodyValue } = schemas.body.validate(req.body, { 
        abortEarly: false, 
        allowUnknown: false,
        stripUnknown: true 
      })
      
      if (bodyError) {
        errors.push(...bodyError.details.map((detail: any) => ({
          field: `body.${detail.path.join('.')}`,
          message: detail.message,
          value: detail.context?.value,
        })))
      } else {
        req.body = bodyValue
      }
    }

    // Validate query
    if (schemas.query) {
      const { error: queryError, value: queryValue } = schemas.query.validate(req.query, { 
        abortEarly: false, 
        allowUnknown: false,
        stripUnknown: true 
      })
      
      if (queryError) {
        errors.push(...queryError.details.map((detail: any) => ({
          field: `query.${detail.path.join('.')}`,
          message: detail.message,
          value: detail.context?.value,
        })))
      } else {
        req.query = queryValue
      }
    }

    // Validate params
    if (schemas.params) {
      const { error: paramsError, value: paramsValue } = schemas.params.validate(req.params, { 
        abortEarly: false, 
        allowUnknown: false,
        stripUnknown: true 
      })
      
      if (paramsError) {
        errors.push(...paramsError.details.map((detail: any) => ({
          field: `params.${detail.path.join('.')}`,
          message: detail.message,
          value: detail.context?.value,
        })))
      } else {
        req.params = paramsValue
      }
    }

    if (errors.length > 0) {
      throw new ApiError('Validation failed', 400)
    }
    
    next()
  }
}

/**
 * Sanitize and validate file uploads
 */
export const validateFileUpload = (options: {
  required?: boolean
  maxSize?: number
  allowedTypes?: string[]
  maxFiles?: number
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as any
    const errors: any[] = []

    if (options.required && (!files || Object.keys(files).length === 0)) {
      errors.push({
        field: 'files',
        message: 'File upload is required',
        value: null
      })
    }

    if (files && Object.keys(files).length > 0) {
      const fileArray = Array.isArray(files) ? files : Object.values(files).flat()
      
      if (options.maxFiles && fileArray.length > options.maxFiles) {
        errors.push({
          field: 'files',
          message: `Maximum ${options.maxFiles} files allowed`,
          value: fileArray.length
        })
      }

      fileArray.forEach((file: any, index: number) => {
        if (options.maxSize && file.size > options.maxSize) {
          errors.push({
            field: `files[${index}].size`,
            message: `File size must be less than ${options.maxSize} bytes`,
            value: file.size
          })
        }

        if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
          errors.push({
            field: `files[${index}].type`,
            message: `File type must be one of: ${options.allowedTypes.join(', ')}`,
            value: file.mimetype
          })
        }
      })
    }

    if (errors.length > 0) {
      throw new ApiError('File validation failed', 400)
    }
    
    next()
  }
}
