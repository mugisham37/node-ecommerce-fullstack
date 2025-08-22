import type { Request, Response, NextFunction } from "express"
import { v4 as uuidv4 } from "uuid"

/**
 * Middleware to add unique request ID to each request
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  const requestId = uuidv4()
  
  // Add to request object
  req.id = requestId
  
  // Add to response headers for debugging
  res.setHeader("X-Request-ID", requestId)
  
  next()
}

// Extend Express Request interface to include id
declare global {
  namespace Express {
    interface Request {
      id: string
    }
  }
}
