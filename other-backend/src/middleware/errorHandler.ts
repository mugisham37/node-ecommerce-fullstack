import type { Request, Response, NextFunction } from "express"
import { ApiError } from "../utils/api-error"
import { createRequestLogger } from "../utils/logger"
import { translateError } from "../utils/translate"
import { Prisma } from "@prisma/client"
import Joi from "joi"

/**
 * Type guard functions for different error types
 */
const isPrismaValidationError = (error: any): error is Prisma.PrismaClientValidationError => {
  return error instanceof Prisma.PrismaClientValidationError
}

const isPrismaKnownRequestError = (error: any): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError
}

const isPrismaUnknownRequestError = (error: any): error is Prisma.PrismaClientUnknownRequestError => {
  return error instanceof Prisma.PrismaClientUnknownRequestError
}

const isPrismaRustPanicError = (error: any): error is Prisma.PrismaClientRustPanicError => {
  return error instanceof Prisma.PrismaClientRustPanicError
}

const isPrismaInitializationError = (error: any): error is Prisma.PrismaClientInitializationError => {
  return error instanceof Prisma.PrismaClientInitializationError
}

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const requestLogger = createRequestLogger(req.id)
  const language = req.language || "en"

  // Log error
  requestLogger.error(`Error: ${err.message}`)
  requestLogger.error(err.stack || "No stack trace")

  // Default error status and message
  let statusCode = 500
  let message = translateError("server", {}, language)
  let errorDetails: any = null

  // Handle specific error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode
    message = err.message
  } else if (isPrismaValidationError(err)) {
    statusCode = 400
    message = translateError("validation", {}, language)
    errorDetails = {
      type: "ValidationError",
      details: err.message
    }
  } else if (isPrismaKnownRequestError(err)) {
    statusCode = 400
    message = translateError("validation", {}, language)
    
    // Handle specific Prisma error codes
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        const target = err.meta?.target as string[] | undefined
        const field = target?.[0] || 'field'
        message = `Duplicate value for ${field}`
        break
      case 'P2025':
        // Record not found
        statusCode = 404
        message = 'Record not found'
        break
      case 'P2003':
        // Foreign key constraint violation
        message = 'Invalid reference to related record'
        break
      case 'P2014':
        // Required relation violation
        message = 'Required relation is missing'
        break
      default:
        message = err.message || 'Database operation failed'
    }
    
    errorDetails = {
      type: "DatabaseError",
      code: err.code,
      meta: err.meta
    }
  } else if (isPrismaUnknownRequestError(err)) {
    statusCode = 500
    message = translateError("server", {}, language)
    errorDetails = {
      type: "UnknownDatabaseError",
      details: err.message
    }
  } else if (isPrismaRustPanicError(err)) {
    statusCode = 500
    message = translateError("server", {}, language)
    errorDetails = {
      type: "DatabasePanicError",
      details: err.message
    }
  } else if (isPrismaInitializationError(err)) {
    statusCode = 500
    message = "Database connection failed"
    errorDetails = {
      type: "DatabaseConnectionError",
      details: err.message
    }
  } else if (err instanceof Joi.ValidationError) {
    statusCode = 400
    message = translateError("validation", {}, language)
    errorDetails = err.details.map((detail) => ({
      message: detail.message,
      path: detail.path,
      type: detail.type,
    }))
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401
    message = translateError("auth.invalidToken", {}, language)
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401
    message = translateError("auth.tokenExpired", {}, language)
  } else if (err.name === "PayloadTooLargeError") {
    statusCode = 413
    message = translateError("payloadTooLarge", {}, language)
  } else if (err.name === "SyntaxError" && (err as any).type === "entity.parse.failed") {
    statusCode = 400
    message = translateError("invalidJson", {}, language)
  }

  // Send error response
  res.status(statusCode).json({
    status: "error",
    message,
    error:
      process.env.NODE_ENV === "development"
        ? {
            name: err.name,
            details: errorDetails,
            stack: err.stack,
          }
        : undefined,
    requestId: req.id,
  })
}
