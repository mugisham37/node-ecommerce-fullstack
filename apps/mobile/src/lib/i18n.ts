import { useState, useEffect } from 'react';
import { 
  supportedLanguages, 
  defaultLanguage, 
  isLanguageSupported
} from '../../../packages/config/src/i18n';

export type SupportedLanguage = string;

// Mock AsyncStorage for now - in real implementation would use @react-native-async-storage/async-storage
const AsyncStorage = {
  getItem: async (key: string) => null,
  setItem: async (key: string, value: string) => {},
  removeItem: async (key: string) => {},
};

// Mock getLocales for now - in real implementation would use react-native-localize
const getLocales = () => [{ languageCode: 'en' }];

// Mock api for now - in real implementation would use actual tRPC client
const api = {
  i18n: {
    getLanguages: {
      useQuery: (params: any, options: any) => ({
        data: null,
        refetch: () => {},
      }),
    },
    setLanguagePreference: {
      useMutation: (options: any) => ({
        mutateAsync: async (input: any) => ({ language: input.language }),
      }),
    },
  },
};

/**
 * Mobile application i18n integration
 * Provides language management for React Native mobile app
 */

const LANGUAGE_STORAGE_KEY = '@ecommerce/language';

/**
 * Language context for mobile application
 */
export interface MobileLanguageContext {
  language: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  defaultLanguage: SupportedLanguage;
  isLoading: boolean;
  error: string | null;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  isAuthenticated: boolean;
}

/**
 * Custom hook for language management in mobile app
 */
export function useLanguage(): MobileLanguageContext {
  const [language, setCurrentLanguage] = useState<SupportedLanguage>(defaultLanguage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get current language from server
  const { data: languageData, refetch: refetchLanguage } = api.i18n.getLanguages.useQuery(
    undefined,
    {
      onSuccess: (data) => {
        setCurrentLanguage(data.currentLanguage);
        setIsAuthenticated(data.isAuthenticated);
        setIsLoading(false);
      },
      onError: (err) => {
        setError(err.message);
        setIsLoading(false);
      },
    }
  );

  // Mutation for setting language preference
  const setLanguagePreferenceMutation = api.i18n.setLanguagePreference.useMutation({
    onSuccess: async (data) => {
      setCurrentLanguage(data.language as SupportedLanguage);
      // Store language preference locally
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, data.language);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  /**
   * Set language preference
   */
  const setLanguage = async (newLanguage: SupportedLanguage): Promise<void> => {
    if (!isLanguageSupported(newLanguage)) {
      throw new Error(`Unsupported language: ${newLanguage}`);
    }

    setError(null);
    setIsLoading(true);

    try {
      if (isAuthenticated) {
        // For authenticated users, save preference to server
        await setLanguagePreferenceMutation.mutateAsync({ language: newLanguage });
      } else {
        // For unauthenticated users, just store locally
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
        setCurrentLanguage(newLanguage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set language');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize language from storage or device preference
  useEffect(() => {
    const initializeLanguage = async () => {
      if (!languageData) {
        try {
          // Try to get language from AsyncStorage
          const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
          if (storedLanguage && isLanguageSupported(storedLanguage)) {
            setCurrentLanguage(storedLanguage as SupportedLanguage);
          } else {
            // Try to detect from device locale
            const deviceLanguage = detectDeviceLanguage();
            setCurrentLanguage(deviceLanguage);
          }
        } catch (err) {
          console.warn('Failed to load language preference:', err);
          setCurrentLanguage(DEFAULT_LANGUAGE);
        }
        setIsLoading(false);
      }
    };

    initializeLanguage();
  }, [languageData]);

  return {
    language,
    supportedLanguages,
    defaultLanguage,
    isLoading,
    error,
    setLanguage,
    isAuthenticated,
  };
}

/**
 * Hook for translations in mobile app
 * This is a placeholder - actual translation logic would be implemented here
 */
export function useTranslation(namespace?: string) {
  const { language } = useLanguage();
  
  // Placeholder translation function
  const t = (key: string, options?: any) => {
    // In a real implementation, this would load translations from packages/i18n
    return key;
  };
  
  return { t, language };
}

/**
 * Detect device language preference
 */
function detectDeviceLanguage(): SupportedLanguage {
  try {
    const locales = getLocales();
    
    for (const locale of locales) {
      const langCode = locale.languageCode.toLowerCase();
      if (isLanguageSupported(langCode)) {
        return langCode as SupportedLanguage;
      }
    }
  } catch (err) {
    console.warn('Failed to detect device language:', err);
  }
  
  return defaultLanguage;
}

/**
 * Language utilities for mobile app
 */
export const mobileI18nUtils = {
  /**
   * Get language display name
   */
  getLanguageDisplayName: (language: SupportedLanguage): string => {
    const displayNames: Record<SupportedLanguage, string> = {
      en: 'English',
      de: 'Deutsch',
      es: 'Español',
      fr: 'Français',
      zh: '中文',
    };
    return displayNames[language] || language;
  },

  /**
   * Get language flag emoji
   */
  getLanguageFlag: (language: SupportedLanguage): string => {
    const flags: Record<SupportedLanguage, string> = {
      en: '🇺🇸',
      de: '🇩🇪',
      es: '🇪🇸',
      fr: '🇫🇷',
      zh: '🇨🇳',
    };
    return flags[language] || '🌐';
  },

  /**
   * Format language for display
   */
  formatLanguageOption: (language: SupportedLanguage) => ({
    value: language,
    label: mobileI18nUtils.getLanguageDisplayName(language),
    flag: mobileI18nUtils.getLanguageFlag(language),
  }),

  /**
   * Get all language options for pickers
   */
  getAllLanguageOptions: () => 
    supportedLanguages.map(lang => mobileI18nUtils.formatLanguageOption(lang)),

  /**
   * Clear stored language preference
   */
  clearStoredLanguage: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear stored language:', err);
    }
  },

  /**
   * Get stored language preference
   */
  getStoredLanguage: async (): Promise<SupportedLanguage | null> => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      return stored && isLanguageSupported(stored) ? stored as SupportedLanguage : null;
    } catch (err) {
      console.warn('Failed to get stored language:', err);
      return null;
    }
  },
};

/**
 * Higher-order component for language context
 */
export function withLanguage<P extends object>(
  Component: React.ComponentType<P & { language: SupportedLanguage }>
) {
  return function LanguageWrappedComponent(props: P) {
    const { language } = useLanguage();
    return <Component {...props} language={language} />;
  };
}

export default {
  useLanguage,
  useTranslation,
  mobileI18nUtils,
  withLanguage,
};