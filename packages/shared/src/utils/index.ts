/**
 * Shared utilities export
 */

export * from './DateUtils';
export * from './StringUtils';
export * from './NumberUtils';
export * from './ObjectUtils';

// Migrated utilities from other-backend
export * from './analytics';
export * from './api-error';
export * from './async-handler';
export * from './decimal';
export * from './logger';
export * from './translate';
export {
  ensureString,
  convertNullToUndefined,
  isValidString,
  safeStringExtract,
  generateRequestId,
  isValidUUID,
  isValidEmail,
  isValidDate,
  safeNumberExtract,
} from './type-guards';
export * from './validation-schemas';