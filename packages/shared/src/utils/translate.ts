/**
 * Translation utility functions
 * Note: This will be integrated with packages/i18n when that package is created
 */

// Default language fallback
const defaultLanguage = 'en';

/**
 * Translation function interface
 * This will be replaced with actual i18next integration when packages/i18n is created
 */
type TranslationFunction = (key: string, options?: Record<string, any>, language?: string) => string;

// Placeholder translation function - will be replaced with actual i18next integration
const mockTranslate: TranslationFunction = (key: string, options?: Record<string, any>, language?: string) => {
  // For now, return the key as fallback until i18n package is integrated
  console.warn(`Translation not yet integrated. Key: ${key}, Language: ${language || defaultLanguage}`);
  return key;
};

/**
 * Translate a key
 * @param key Translation key
 * @param options Translation options
 * @param language Language code
 * @returns Translated string
 */
export const t = (key: string, options?: Record<string, any>, language?: string): string => {
  return mockTranslate(key, { lng: language || defaultLanguage, ...options });
};

/**
 * Translate an error message
 * @param key Error key
 * @param options Translation options
 * @param language Language code
 * @returns Translated error message
 */
export const translateError = (key: string, options?: Record<string, any>, language?: string): string => {
  return mockTranslate(`errors:${key}`, { lng: language || defaultLanguage, ...options });
};

/**
 * Translate a validation message
 * @param key Validation key
 * @param options Translation options
 * @param language Language code
 * @returns Translated validation message
 */
export const translateValidation = (key: string, options?: Record<string, any>, language?: string): string => {
  return mockTranslate(`validation:${key}`, { lng: language || defaultLanguage, ...options });
};

/**
 * Translate an email template
 * @param key Email template key
 * @param options Translation options
 * @param language Language code
 * @returns Translated email template
 */
export const translateEmail = (key: string, options?: Record<string, any>, language?: string): string => {
  return mockTranslate(`emails:${key}`, { lng: language || defaultLanguage, ...options });
};

/**
 * Set the translation function (to be called when i18n package is integrated)
 * @param translationFn The actual translation function from i18next
 */
export const setTranslationFunction = (translationFn: TranslationFunction): void => {
  // This will be implemented when packages/i18n is created
  console.log('Translation function will be set when i18n package is integrated');
};