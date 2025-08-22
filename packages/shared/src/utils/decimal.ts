/**
 * Decimal utility functions for safe numeric operations
 * Handles various numeric types including Decimal objects, strings, numbers, null, and undefined
 */

/**
 * Safely convert a value to a number
 * Handles Decimal types, strings, numbers, null, and undefined
 */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }
  
  // Handle Decimal-like objects with toNumber method
  if (value && typeof value === 'object' && typeof (value as any).toNumber === 'function') {
    return (value as any).toNumber()
  }
  
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }
  
  if (value === null || value === undefined) {
    return 0
  }
  
  // Try to convert other types
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

/**
 * Safely add two values
 */
export function safeAdd(a: unknown, b: unknown): number {
  return toNumber(a) + toNumber(b)
}

/**
 * Safely subtract two values
 */
export function safeSubtract(a: unknown, b: unknown): number {
  return toNumber(a) - toNumber(b)
}

/**
 * Safely multiply two values
 */
export function safeMultiply(a: unknown, b: unknown): number {
  return toNumber(a) * toNumber(b)
}

/**
 * Safely divide two values
 * Returns 0 if divisor is 0 to avoid division by zero
 */
export function safeDivide(a: unknown, b: unknown): number {
  const divisor = toNumber(b)
  if (divisor === 0) {
    return 0
  }
  return toNumber(a) / divisor
}

/**
 * Safely perform percentage calculation
 * Calculates (value * percentage) / 100
 */
export function safePercentage(value: unknown, percentage: unknown): number {
  return safeDivide(safeMultiply(value, percentage), 100)
}

/**
 * Round a number to specified decimal places
 */
export function safeRound(value: unknown, decimals: number = 2): number {
  const num = toNumber(value)
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}

/**
 * Type guard to check if a value is a Decimal-like object
 */
export function isDecimal(value: unknown): boolean {
  return value !== null && 
         typeof value === 'object' && 
         typeof (value as any).toNumber === 'function'
}

/**
 * Type guard to check if a value is a valid number (not NaN or Infinity)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}