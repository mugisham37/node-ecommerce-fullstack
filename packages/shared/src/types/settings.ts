// Settings types for tRPC compatibility
// Migrated from other-backend/src/types/settings.types.ts

/**
 * Extended Setting interface with parsed value
 */
export interface SettingValue {
  id: string;
  key: string;
  value: any; // JSON value compatible with tRPC
  type?: string;
  category?: string;
  group?: string | null;
  description?: string | null;
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
  parsedValue?: any;
}

/**
 * Input interface for creating new settings
 */
export interface CreateSettingInput {
  key: string;
  value: any; // JSON value compatible with tRPC
  type?: string;
  category?: string;
  group?: string | null;
  description?: string | null;
  isPublic?: boolean;
}

/**
 * Input interface for updating existing settings
 */
export interface UpdateSettingInput {
  key?: string;
  value?: any; // JSON value compatible with tRPC
  type?: string;
  category?: string;
  group?: string | null;
  description?: string | null;
  isPublic?: boolean;
}

/**
 * Result interface for setting groups with counts
 */
export interface SettingGroupResult {
  group: string;
  count: number;
  description?: string;
}

/**
 * Bulk update settings input
 */
export interface BulkUpdateSettingInput {
  key: string;
  value: any;
  description?: string;
  group?: string;
  isPublic?: boolean;
}

/**
 * Import/Export result interface
 */
export interface ImportExportResult {
  imported: number;
  skipped: number;
  errors: number;
  details: Array<{ 
    key: string; 
    status: 'imported' | 'skipped' | 'error'; 
    message?: string 
  }>;
}

/**
 * Setting validation result
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Helper function to safely convert JSON value to string
 * @param value JSON value to convert
 * @returns String representation of the value
 */
export function jsonValueToString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Helper function to safely parse JSON value
 * @param value JSON value to parse
 * @returns Parsed value or original if parsing fails
 */
export function parseJsonValue<T = any>(value: any): T {
  if (value === null || value === undefined) {
    return null as T;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
  return value as T;
}

/**
 * Helper function to validate setting type
 * @param type Setting type to validate
 * @returns True if valid type
 */
export function validateSettingType(type: string): boolean {
  const validTypes = ['string', 'number', 'boolean', 'json', 'array', 'object'];
  return validTypes.includes(type.toLowerCase());
}

/**
 * Helper function to serialize value for storage
 * @param value Value to serialize
 * @returns Serialized value compatible with tRPC
 */
export function serializeValue(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Type guard to check if value is valid JSON value
 * @param value Value to check
 * @returns True if value is valid JSON value
 */
export function isJsonValue(value: any): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    Array.isArray(value) ||
    (typeof value === 'object' && value !== null)
  );
}