/**
 * Type guard utilities for handling type safety issues
 */

/**
 * Ensures a value is a string, providing a fallback if undefined or null
 * @param value The value to check
 * @param fallback Fallback string to use if value is null/undefined
 * @returns A guaranteed string value
 */
export function ensureString(value: string | undefined | null, fallback: string): string {
  return value ?? fallback;
}

/**
 * Converts null values to undefined for TypeScript compatibility
 * @param value The value to convert
 * @returns The value with null converted to undefined
 */
export function convertNullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Type guard to check if a value is a valid non-empty string
 * @param value The value to check
 * @returns True if value is a non-empty string
 */
export function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Safely extracts a string value from an object property
 * @param obj The object to extract from
 * @param key The property key
 * @param fallback Fallback value if property is missing or invalid
 * @returns The extracted string or fallback
 */
export function safeStringExtract(obj: any, key: string, fallback: string): string {
  const value = obj?.[key];
  return isValidString(value) ? value : fallback;
}

/**
 * Generates a unique request ID for logging purposes
 * @returns A unique string identifier
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
