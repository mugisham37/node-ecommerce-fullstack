import type { SupportedLanguage, LanguageDetectionOptions } from '../types';

// Default supported languages
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'de', 'es', 'fr', 'zh'];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Language information
export const LANGUAGE_INFO = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳', rtl: false },
} as const;

/**
 * Detect language from Accept-Language header
 */
export function detectLanguageFromHeader(acceptLanguage?: string): SupportedLanguage {
  if (!acceptLanguage) return DEFAULT_LANGUAGE;

  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, quality = '1'] = lang.trim().split(';q=');
      return { 
        code: code.toLowerCase().split('-')[0] as SupportedLanguage, 
        quality: parseFloat(quality) 
      };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find first supported language
  for (const { code } of languages) {
    if (SUPPORTED_LANGUAGES.includes(code)) {
      return code;
    }
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Detect language from various sources (browser environment)
 */
export function detectLanguageFromBrowser(): SupportedLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  // Check localStorage first
  const storedLang = localStorage.getItem('language') as SupportedLanguage;
  if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
    return storedLang;
  }

  // Check cookie
  const cookieLang = getCookieValue('language') as SupportedLanguage;
  if (cookieLang && SUPPORTED_LANGUAGES.includes(cookieLang)) {
    return cookieLang;
  }

  // Check navigator language
  const navigatorLang = (navigator.language || navigator.languages?.[0] || DEFAULT_LANGUAGE)
    .toLowerCase()
    .split('-')[0] as SupportedLanguage;
  
  if (SUPPORTED_LANGUAGES.includes(navigatorLang)) {
    return navigatorLang;
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Detect language from React Native environment
 */
export function detectLanguageFromReactNative(): SupportedLanguage {
  try {
    // This will be dynamically imported in React Native environment
    const RNLocalize = require('react-native-localize');
    const locales = RNLocalize.getLocales();
    
    if (locales && locales.length > 0) {
      for (const locale of locales) {
        const langCode = locale.languageCode.toLowerCase() as SupportedLanguage;
        if (SUPPORTED_LANGUAGES.includes(langCode)) {
          return langCode;
        }
      }
    }
  } catch (error) {
    console.warn('React Native Localize not available:', error);
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Validate if language is supported
 */
export function isLanguageSupported(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

/**
 * Get language info
 */
export function getLanguageInfo(language: SupportedLanguage) {
  return LANGUAGE_INFO[language];
}

/**
 * Get all supported languages with their info
 */
export function getAllLanguages() {
  return SUPPORTED_LANGUAGES.map(lang => ({
    code: lang,
    ...LANGUAGE_INFO[lang],
  }));
}

/**
 * Set language preference in browser storage
 */
export function setLanguagePreference(language: SupportedLanguage): void {
  if (typeof window === 'undefined') return;

  // Set in localStorage
  localStorage.setItem('language', language);

  // Set in cookie
  setCookie('language', language, {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: '/',
    sameSite: 'strict',
  });
}

/**
 * Get language preference from browser storage
 */
export function getLanguagePreference(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null;

  const storedLang = localStorage.getItem('language') as SupportedLanguage;
  if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
    return storedLang;
  }

  return null;
}

/**
 * Clear language preference from browser storage
 */
export function clearLanguagePreference(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('language');
  setCookie('language', '', { maxAge: -1, path: '/' });
}

/**
 * Utility function to get cookie value
 */
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Utility function to set cookie
 */
function setCookie(name: string, value: string, options: {
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}): void {
  if (typeof document === 'undefined') return;

  let cookieString = `${name}=${value}`;

  if (options.maxAge !== undefined) {
    cookieString += `; Max-Age=${options.maxAge}`;
  }

  if (options.path) {
    cookieString += `; Path=${options.path}`;
  }

  if (options.domain) {
    cookieString += `; Domain=${options.domain}`;
  }

  if (options.secure) {
    cookieString += `; Secure`;
  }

  if (options.sameSite) {
    cookieString += `; SameSite=${options.sameSite}`;
  }

  document.cookie = cookieString;
}

/**
 * Format language code for display
 */
export function formatLanguageCode(language: SupportedLanguage): string {
  const info = getLanguageInfo(language);
  return `${info.flag} ${info.name}`;
}

/**
 * Get RTL languages
 */
export function isRTLLanguage(language: SupportedLanguage): boolean {
  return LANGUAGE_INFO[language].rtl || false;
}

/**
 * Default language detection configuration for browser
 */
export const DEFAULT_BROWSER_DETECTION: LanguageDetectionOptions = {
  order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
  lookupQuerystring: 'lng',
  lookupCookie: 'language',
  lookupLocalStorage: 'language',
  caches: ['localStorage', 'cookie'],
  cookieMinutes: 525600, // 1 year
  cookieOptions: {
    path: '/',
    sameSite: 'strict',
  },
};

/**
 * Default language detection configuration for React Native
 */
export const DEFAULT_RN_DETECTION: LanguageDetectionOptions = {
  order: ['querystring', 'navigator'],
  lookupQuerystring: 'lng',
  caches: [],
};

export default {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_INFO,
  detectLanguageFromHeader,
  detectLanguageFromBrowser,
  detectLanguageFromReactNative,
  isLanguageSupported,
  getLanguageInfo,
  getAllLanguages,
  setLanguagePreference,
  getLanguagePreference,
  clearLanguagePreference,
  formatLanguageCode,
  isRTLLanguage,
  DEFAULT_BROWSER_DETECTION,
  DEFAULT_RN_DETECTION,
};