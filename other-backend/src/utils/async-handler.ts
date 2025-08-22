import type { Request, Response, NextFunction } from "express"

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param fn Async function to wrap
 * @returns Express middleware function
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
