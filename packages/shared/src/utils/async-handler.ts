/**
 * Async handler wrapper to catch errors in async functions
 * Adapted for use with tRPC and other async contexts
 */

/**
 * Generic async handler wrapper for Express-style middleware
 * @param fn Async function to wrap
 * @returns Express middleware function
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Generic async wrapper for any async function
 * @param fn Async function to wrap
 * @returns Wrapped function that catches errors
 */
export const wrapAsync = <T extends (...args: any[]) => Promise<any>>(fn: T): T => {
  return ((...args: any[]) => {
    return Promise.resolve(fn(...args)).catch((error) => {
      // Re-throw the error to be handled by the calling context
      throw error;
    });
  }) as T;
}

/**
 * Async handler for tRPC procedures
 * @param fn Async function to wrap
 * @returns Wrapped function that handles errors appropriately for tRPC
 */
export const trpcAsyncHandler = <T extends (...args: any[]) => Promise<any>>(fn: T): T => {
  return ((...args: any[]) => {
    return Promise.resolve(fn(...args)).catch((error) => {
      // For tRPC, we want to preserve the original error
      // tRPC will handle the error formatting
      throw error;
    });
  }) as T;
}