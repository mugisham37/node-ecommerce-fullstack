// import i18n from 'i18next';
// import { initReactI18next } from 'react-i18next';
// import LanguageDetector from 'i18next-browser-languagedetector';
// import Backend from 'i18next-http-backend';
import type { I18nConfig, SupportedLanguage, TranslationNamespace } from './types';
import { 
  SUPPORTED_LANGUAGES, 
  DEFAULT_LANGUAGE, 
  DEFAULT_BROWSER_DETECTION,
  detectLanguageFromHeader,
  isLanguageSupported 
} from './utils/language-detector';

// Temporary mock i18n object until dependencies are installed
const i18n = {
  isInitialized: false,
  language: DEFAULT_LANGUAGE,
  use: (plugin: any) => i18n,
  init: async (config: any) => i18n,
  createInstance: () => i18n,
  changeLanguage: async (lng: string) => Promise.resolve(),
  t: (key: string, options?: any) => key,
  addResourceBundle: (lng: string, ns: string, resources: any, deep?: boolean, overwrite?: boolean) => {},
  hasResourceBundle: (lng: string, ns: string) => true,
};

// Default configuration
const DEFAULT_CONFIG: I18nConfig = {
  defaultLanguage: DEFAULT_LANGUAGE,
  supportedLanguages: SUPPORTED_LANGUAGES,
  namespaces: ['common', 'errors', 'validation', 'emails'],
  fallbackLanguage: DEFAULT_LANGUAGE,
  debug: process.env.NODE_ENV === 'development',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  detection: DEFAULT_BROWSER_DETECTION,
};

/**
 * Initialize i18next for browser environment
 */
export async function initI18nBrowser(config: Partial<I18nConfig> = {}): Promise<typeof i18n> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!i18n.isInitialized) {
    // TODO: Uncomment when dependencies are installed
    // await i18n
    //   .use(Backend)
    //   .use(LanguageDetector)
    //   .use(initReactI18next)
    //   .init({
    //     lng: finalConfig.defaultLanguage,
    //     fallbackLng: finalConfig.fallbackLanguage,
    //     supportedLngs: finalConfig.supportedLanguages,
    //     
    //     ns: finalConfig.namespaces,
    //     defaultNS: 'common',
    //     
    //     debug: finalConfig.debug,
    //     
    //     interpolation: finalConfig.interpolation,
    //     
    //     detection: finalConfig.detection,
    //     
    //     backend: {
    //       loadPath: '/locales/{{lng}}/{{ns}}.json',
    //       requestOptions: {
    //         cache: 'default',
    //       },
    //     },
    //     
    //     react: {
    //       useSuspense: false,
    //       bindI18n: 'languageChanged',
    //       bindI18nStore: 'added removed',
    //       transEmptyNodeValue: '',
    //       transSupportBasicHtmlNodes: true,
    //       transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em'],
    //     },
    //   });
  }

  return i18n;
}

/**
 * Initialize i18next for React Native environment
 */
export async function initI18nReactNative(
  config: Partial<I18nConfig> = {},
  resources?: any
): Promise<typeof i18n> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!i18n.isInitialized) {
    // TODO: Uncomment when dependencies are installed
    // await i18n
    //   .use(initReactI18next)
    //   .init({
    //     lng: finalConfig.defaultLanguage,
    //     fallbackLng: finalConfig.fallbackLanguage,
    //     supportedLngs: finalConfig.supportedLanguages,
    //     
    //     ns: finalConfig.namespaces,
    //     defaultNS: 'common',
    //     
    //     debug: finalConfig.debug,
    //     
    //     interpolation: finalConfig.interpolation,
    //     
    //     resources: resources || {},
    //     
    //     react: {
    //       useSuspense: false,
    //       bindI18n: 'languageChanged',
    //       bindI18nStore: 'added removed',
    //       transEmptyNodeValue: '',
    //       transSupportBasicHtmlNodes: true,
    //       transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em'],
    //     },
    //   });
  }

  return i18n;
}

/**
 * Initialize i18next for server-side rendering
 */
export async function initI18nServer(
  config: Partial<I18nConfig> = {},
  resources?: any,
  language?: string
): Promise<typeof i18n> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const detectedLanguage = language || finalConfig.defaultLanguage;

  // Create a new instance for server-side to avoid conflicts
  const serverI18n = i18n.createInstance();

  // TODO: Uncomment when dependencies are installed
  // await serverI18n
  //   .use(initReactI18next)
  //   .init({
  //     lng: detectedLanguage,
  //     fallbackLng: finalConfig.fallbackLanguage,
  //     supportedLngs: finalConfig.supportedLanguages,
  //     
  //     ns: finalConfig.namespaces,
  //     defaultNS: 'common',
  //     
  //     debug: finalConfig.debug,
  //     
  //     interpolation: finalConfig.interpolation,
  //     
  //     resources: resources || {},
  //     
  //     react: {
  //       useSuspense: false,
  //     },
  //   });

  return serverI18n;
}

/**
 * Load translation resources dynamically
 */
export async function loadTranslationResources(
  languages: SupportedLanguage[] = SUPPORTED_LANGUAGES,
  namespaces: TranslationNamespace[] = ['common', 'errors', 'validation', 'emails']
): Promise<Record<string, any>> {
  const resources: Record<string, any> = {};

  for (const lang of languages) {
    resources[lang] = {};
    
    for (const ns of namespaces) {
      try {
        // Dynamic import for each translation file
        const module = await import(`./locales/${lang}/${ns}.json`);
        resources[lang][ns] = module.default || module;
      } catch (error) {
        console.warn(`Failed to load translation file: ${lang}/${ns}.json`, error);
        resources[lang][ns] = {};
      }
    }
  }

  return resources;
}

/**
 * Add translation resources to existing i18n instance
 */
export function addTranslationResources(
  resources: Record<string, any>,
  languages: SupportedLanguage[] = SUPPORTED_LANGUAGES
): void {
  for (const lang of languages) {
    if (resources[lang]) {
      for (const [namespace, translations] of Object.entries(resources[lang])) {
        i18n.addResourceBundle(lang, namespace, translations, true, true);
      }
    }
  }
}

/**
 * Change language and persist preference
 */
export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  if (!isLanguageSupported(language)) {
    console.warn(`Language ${language} is not supported. Using default language.`);
    language = DEFAULT_LANGUAGE;
  }

  await i18n.changeLanguage(language);
}

/**
 * Get current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  return (i18n.language || DEFAULT_LANGUAGE) as SupportedLanguage;
}

/**
 * Check if i18n is ready
 */
export function isI18nReady(): boolean {
  return i18n.isInitialized && i18n.hasResourceBundle(getCurrentLanguage(), 'common');
}

/**
 * Get translation function
 */
export function getTranslationFunction() {
  return i18n.t;
}

/**
 * Detect language from request (server-side)
 */
export function detectLanguageFromRequest(
  acceptLanguage?: string,
  cookieLanguage?: string,
  queryLanguage?: string
): SupportedLanguage {
  // Priority: query > cookie > header > default
  if (queryLanguage && isLanguageSupported(queryLanguage)) {
    return queryLanguage as SupportedLanguage;
  }

  if (cookieLanguage && isLanguageSupported(cookieLanguage)) {
    return cookieLanguage as SupportedLanguage;
  }

  return detectLanguageFromHeader(acceptLanguage);
}

// Re-export types and utilities
export type * from './types';
export * from './utils/language-detector';
export { default as useTranslation } from './hooks/useTranslation';
export { default as useTranslationRN } from './hooks/useTranslationRN';

// Export the i18n instance
export { i18n };
export default i18n;