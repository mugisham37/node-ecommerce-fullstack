/**
 * Custom API Error class for consistent error handling
 */
export class ApiError extends Error {
  public statusCode: number
  public isOperational: boolean
  public status: string

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error"

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Create a bad request error (400)
   */
  static badRequest(message: string = "Bad Request"): ApiError {
    return new ApiError(message, 400)
  }

  /**
   * Create an unauthorized error (401)
   */
  static unauthorized(message: string = "Unauthorized"): ApiError {
    return new ApiError(message, 401)
  }

  /**
   * Create a forbidden error (403)
   */
  static forbidden(message: string = "Forbidden"): ApiError {
    return new ApiError(message, 403)
  }

  /**
   * Create a not found error (404)
   */
  static notFound(message: string = "Not Found"): ApiError {
    return new ApiError(message, 404)
  }

  /**
   * Create a conflict error (409)
   */
  static conflict(message: string = "Conflict"): ApiError {
    return new ApiError(message, 409)
  }

  /**
   * Create an unprocessable entity error (422)
   */
  static unprocessableEntity(message: string = "Unprocessable Entity"): ApiError {
    return new ApiError(message, 422)
  }

  /**
   * Create a too many requests error (429)
   */
  static tooManyRequests(message: string = "Too Many Requests"): ApiError {
    return new ApiError(message, 429)
  }

  /**
   * Create an internal server error (500)
   */
  static internal(message: string = "Internal Server Error"): ApiError {
    return new ApiError(message, 500)
  }

  /**
   * Create a service unavailable error (503)
   */
  static serviceUnavailable(message: string = "Service Unavailable"): ApiError {
    return new ApiError(message, 503)
  }
}
