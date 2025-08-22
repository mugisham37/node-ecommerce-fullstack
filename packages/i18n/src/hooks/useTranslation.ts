// import { useTranslation as useI18nextTranslation } from 'react-i18next';
import type { 
  UseTranslationReturn, 
  UseTranslationOptions, 
  TranslationNamespace,
  SupportedLanguage 
} from '../types';
import { 
  setLanguagePreference, 
  getLanguagePreference,
  isLanguageSupported,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE 
} from '../utils/language-detector';

// Temporary mock for useI18nextTranslation until dependencies are installed
const useI18nextTranslation = (ns?: any, options?: any) => ({
  t: (key: string, options?: any) => key,
  i18n: { 
    language: DEFAULT_LANGUAGE, 
    changeLanguage: async (lng: string) => Promise.resolve() 
  },
  ready: true,
});

/**
 * Enhanced useTranslation hook for React web applications
 */
export function useTranslation(
  ns?: TranslationNamespace | TranslationNamespace[],
  options?: UseTranslationOptions
): UseTranslationReturn & {
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  currentLanguage: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  isLanguageSupported: (lang: string) => boolean;
} {
  const { t, i18n, ready } = useI18nextTranslation(ns, options);

  const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
    if (!isLanguageSupported(language)) {
      console.warn(`Language ${language} is not supported. Using default language.`);
      language = DEFAULT_LANGUAGE;
    }

    try {
      await i18n.changeLanguage(language);
      setLanguagePreference(language);
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  };

  const currentLanguage = (i18n.language || DEFAULT_LANGUAGE) as SupportedLanguage;

  return {
    t,
    i18n,
    ready,
    changeLanguage,
    currentLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    isLanguageSupported,
  };
}

/**
 * Hook for getting current language without translation function
 */
export function useCurrentLanguage(): {
  language: SupportedLanguage;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  supportedLanguages: SupportedLanguage[];
} {
  const { i18n } = useI18nextTranslation();

  const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
    if (!isLanguageSupported(language)) {
      console.warn(`Language ${language} is not supported. Using default language.`);
      language = DEFAULT_LANGUAGE;
    }

    try {
      await i18n.changeLanguage(language);
      setLanguagePreference(language);
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  };

  return {
    language: (i18n.language || DEFAULT_LANGUAGE) as SupportedLanguage,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

/**
 * Hook for language preference management
 */
export function useLanguagePreference(): {
  preferredLanguage: SupportedLanguage | null;
  setPreferredLanguage: (language: SupportedLanguage) => void;
  clearPreferredLanguage: () => void;
  hasPreference: boolean;
} {
  const preferredLanguage = getLanguagePreference();

  const setPreferredLanguage = (language: SupportedLanguage): void => {
    if (isLanguageSupported(language)) {
      setLanguagePreference(language);
    } else {
      console.warn(`Language ${language} is not supported.`);
    }
  };

  const clearPreferredLanguage = (): void => {
    setLanguagePreference(DEFAULT_LANGUAGE);
  };

  return {
    preferredLanguage,
    setPreferredLanguage,
    clearPreferredLanguage,
    hasPreference: preferredLanguage !== null,
  };
}

export default useTranslation;