import { appConfig } from './index';
import path from "path";
import fs from "fs";

// Get supported languages from config
export const supportedLanguages = appConfig.SUPPORTED_LANGUAGES.split(',');

// Get default language from config
export const defaultLanguage = appConfig.DEFAULT_LANGUAGE;

// Define namespaces
export const namespaces = ["common", "errors", "validation", "emails"];

/**
 * i18next configuration for server-side usage
 */
export const getI18nConfig = () => ({
  backend: {
    loadPath: path.join(process.cwd(), "packages/i18n/src/locales/{{lng}}/{{ns}}.json"),
  },
  fallbackLng: defaultLanguage,
  supportedLngs: supportedLanguages,
  ns: namespaces,
  defaultNS: "common",
  preload: supportedLanguages,
  interpolation: {
    escapeValue: false,
  },
  debug: process.env.NODE_ENV === 'development',
});

/**
 * Create locales directory structure if it doesn't exist
 */
export const initLocales = (): void => {
  const localesDir = path.join(process.cwd(), "packages/i18n/src/locales");

  // Create locales directory if it doesn't exist
  if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir, { recursive: true });
    console.log(`Created locales directory: ${localesDir}`);
  }

  // Create language directories and default files
  supportedLanguages.forEach((lang) => {
    const langDir = path.join(localesDir, lang);
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
      console.log(`Created language directory: ${langDir}`);
    }

    // Create default files for each namespace
    namespaces.forEach((ns) => {
      const filePath = path.join(langDir, `${ns}.json`);
      if (!fs.existsSync(filePath)) {
        // Create empty JSON file
        fs.writeFileSync(filePath, "{}");
        console.log(`Created empty translation file: ${filePath}`);
      }
    });
  });
};

/**
 * Detect language from request headers
 */
export const detectLanguage = (acceptLanguage?: string): string => {
  if (!acceptLanguage) return defaultLanguage;

  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, quality = '1'] = lang.trim().split(';q=');
      return { code: code.toLowerCase(), quality: parseFloat(quality) };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find first supported language
  for (const { code } of languages) {
    const langCode = code.split('-')[0]; // Handle cases like 'en-US'
    if (supportedLanguages.includes(langCode)) {
      return langCode;
    }
  }

  return defaultLanguage;
};

/**
 * Validate if language is supported
 */
export const isLanguageSupported = (language: string): boolean => {
  return supportedLanguages.includes(language);
};

/**
 * Language configuration constants
 */
export const I18N_CONSTANTS = {
  SUPPORTED_LANGUAGES: supportedLanguages,
  DEFAULT_LANGUAGE: defaultLanguage,
  NAMESPACES: namespaces,
  LOCALES_PATH: path.join(process.cwd(), "packages/i18n/src/locales"),
} as const;

// Export i18n configuration
export default getI18nConfig;