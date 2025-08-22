// import { useTranslation as useI18nextTranslation } from 'react-i18next';
// import { useEffect, useState } from 'react';
import type { 
  UseTranslationReturn, 
  UseTranslationOptions, 
  TranslationNamespace,
  SupportedLanguage 
} from '../types';
import { 
  detectLanguageFromReactNative,
  isLanguageSupported,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE 
} from '../utils/language-detector';

// Temporary mocks until dependencies are installed
const useI18nextTranslation = (ns?: any, options?: any) => ({
  t: (key: string, options?: any) => key,
  i18n: { 
    language: DEFAULT_LANGUAGE, 
    changeLanguage: async (lng: string) => Promise.resolve() 
  },
  ready: true,
});

const useEffect = (fn: () => void, deps: any[]) => {};
const useState = <T>(initial: T): [T, (value: T) => void] => [initial, () => {}];

/**
 * Enhanced useTranslation hook for React Native applications
 */
export function useTranslationRN(
  ns?: TranslationNamespace | TranslationNamespace[],
  options?: UseTranslationOptions
): UseTranslationReturn & {
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  currentLanguage: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  isLanguageSupported: (lang: string) => boolean;
  deviceLanguage: SupportedLanguage;
} {
  const { t, i18n, ready } = useI18nextTranslation(ns, options);
  const [deviceLanguage, setDeviceLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);

  // Detect device language on mount
  useEffect(() => {
    const detectedLanguage = detectLanguageFromReactNative();
    setDeviceLanguage(detectedLanguage);
  }, []);

  const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
    if (!isLanguageSupported(language)) {
      console.warn(`Language ${language} is not supported. Using default language.`);
      language = DEFAULT_LANGUAGE;
    }

    try {
      await i18n.changeLanguage(language);
      // In React Native, we might want to store preference in AsyncStorage
      await storeLanguagePreference(language);
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
    deviceLanguage,
  };
}

/**
 * Hook for getting current language without translation function (React Native)
 */
export function useCurrentLanguageRN(): {
  language: SupportedLanguage;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  supportedLanguages: SupportedLanguage[];
  deviceLanguage: SupportedLanguage;
} {
  const { i18n } = useI18nextTranslation();
  const [deviceLanguage, setDeviceLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const detectedLanguage = detectLanguageFromReactNative();
    setDeviceLanguage(detectedLanguage);
  }, []);

  const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
    if (!isLanguageSupported(language)) {
      console.warn(`Language ${language} is not supported. Using default language.`);
      language = DEFAULT_LANGUAGE;
    }

    try {
      await i18n.changeLanguage(language);
      await storeLanguagePreference(language);
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  };

  return {
    language: (i18n.language || DEFAULT_LANGUAGE) as SupportedLanguage,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    deviceLanguage,
  };
}

/**
 * Hook for language preference management in React Native
 */
export function useLanguagePreferenceRN(): {
  preferredLanguage: SupportedLanguage | null;
  setPreferredLanguage: (language: SupportedLanguage) => Promise<void>;
  clearPreferredLanguage: () => Promise<void>;
  hasPreference: boolean;
  isLoading: boolean;
} {
  const [preferredLanguage, setPreferredLanguageState] = useState<SupportedLanguage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load preference on mount
  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async (): Promise<void> => {
    try {
      const stored = await getStoredLanguagePreference();
      setPreferredLanguageState(stored);
    } catch (error) {
      console.error('Failed to load language preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setPreferredLanguage = async (language: SupportedLanguage): Promise<void> => {
    if (isLanguageSupported(language)) {
      try {
        await storeLanguagePreference(language);
        setPreferredLanguageState(language);
      } catch (error) {
        console.error('Failed to store language preference:', error);
        throw error;
      }
    } else {
      console.warn(`Language ${language} is not supported.`);
    }
  };

  const clearPreferredLanguage = async (): Promise<void> => {
    try {
      await removeLanguagePreference();
      setPreferredLanguageState(null);
    } catch (error) {
      console.error('Failed to clear language preference:', error);
      throw error;
    }
  };

  return {
    preferredLanguage,
    setPreferredLanguage,
    clearPreferredLanguage,
    hasPreference: preferredLanguage !== null,
    isLoading,
  };
}

/**
 * Store language preference in AsyncStorage
 */
async function storeLanguagePreference(language: SupportedLanguage): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('language_preference', language);
  } catch (error) {
    console.error('Failed to store language preference:', error);
    throw error;
  }
}

/**
 * Get stored language preference from AsyncStorage
 */
async function getStoredLanguagePreference(): Promise<SupportedLanguage | null> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const stored = await AsyncStorage.getItem('language_preference');
    
    if (stored && isLanguageSupported(stored)) {
      return stored as SupportedLanguage;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get stored language preference:', error);
    return null;
  }
}

/**
 * Remove language preference from AsyncStorage
 */
async function removeLanguagePreference(): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('language_preference');
  } catch (error) {
    console.error('Failed to remove language preference:', error);
    throw error;
  }
}

/**
 * Hook to listen for device language changes
 */
export function useDeviceLanguageChange(): {
  deviceLanguage: SupportedLanguage;
  isDeviceLanguageSupported: boolean;
} {
  const [deviceLanguage, setDeviceLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const updateDeviceLanguage = () => {
      const detectedLanguage = detectLanguageFromReactNative();
      setDeviceLanguage(detectedLanguage);
    };

    // Initial detection
    updateDeviceLanguage();

    // Listen for language changes (if available)
    try {
      const RNLocalize = require('react-native-localize');
      const unsubscribe = RNLocalize.addEventListener('change', updateDeviceLanguage);
      
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (error) {
      console.warn('React Native Localize event listener not available:', error);
    }
  }, []);

  return {
    deviceLanguage,
    isDeviceLanguageSupported: isLanguageSupported(deviceLanguage),
  };
}

export default useTranslationRN;