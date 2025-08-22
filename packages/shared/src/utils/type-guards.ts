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

/**
 * Type guard to check if a value is a valid number
 * @param value The value to check
 * @returns True if value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Type guard to check if a value is a valid UUID
 * @param value The value to check
 * @returns True if value is a valid UUID
 */
export function isValidUUID(value: unknown): value is string {
  if (!isValidString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Type guard to check if a value is a valid email
 * @param value The value to check
 * @returns True if value is a valid email format
 */
export function isValidEmail(value: unknown): value is string {
  if (!isValidString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Type guard to check if a value is a valid date
 * @param value The value to check
 * @returns True if value is a valid Date object
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Safely extracts a number value from an object property
 * @param obj The object to extract from
 * @param key The property key
 * @param fallback Fallback value if property is missing or invalid
 * @returns The extracted number or fallback
 */
export function safeNumberExtract(obj: any, key: string, fallback: number): number {
  const value = obj?.[key];
  return isValidNumber(value) ? value : fallback;
}