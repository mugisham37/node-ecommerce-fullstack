'use client';

import React, { useEffect, useState } from 'react';
import { 
  supportedLanguages, 
  defaultLanguage, 
  isLanguageSupported
} from '../../../packages/config/src/i18n';
import { api } from './trpc';

export type SupportedLanguage = string;

/**
 * Web application i18n integration
 * Provides language management for Next.js web app
 */

/**
 * Language context for web application
 */
export interface WebLanguageContext {
  language: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  defaultLanguage: SupportedLanguage;
  isLoading: boolean;
  error: string | null;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  isAuthenticated: boolean;
}

/**
 * Custom hook for language management in web app
 */
export function useLanguage(): WebLanguageContext {
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
    onSuccess: (data) => {
      setCurrentLanguage(data.language as SupportedLanguage);
      // Refresh the page to apply language changes
      window.location.reload();
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
        // For unauthenticated users, just set cookie and reload
        document.cookie = `language=${newLanguage}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=strict`;
        setCurrentLanguage(newLanguage);
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set language');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize language from cookie or browser preference
  useEffect(() => {
    if (!languageData) {
      // Try to get language from cookie
      const cookieLanguage = getCookieValue('language');
      if (cookieLanguage && isLanguageSupported(cookieLanguage)) {
        setCurrentLanguage(cookieLanguage as SupportedLanguage);
      } else {
        // Try to detect from browser
        const browserLanguage = detectBrowserLanguage();
        setCurrentLanguage(browserLanguage);
      }
      setIsLoading(false);
    }
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
 * Hook for translations in web app
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
 * Get cookie value by name
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
 * Detect browser language preference
 */
function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;

  const browserLanguages = navigator.languages || [navigator.language];
  
  for (const lang of browserLanguages) {
    const langCode = lang.split('-')[0].toLowerCase();
    if (isLanguageSupported(langCode)) {
      return langCode as SupportedLanguage;
    }
  }
  
  return defaultLanguage;
}

/**
 * Language utilities for web app
 */
export const webI18nUtils = {
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
    label: webI18nUtils.getLanguageDisplayName(language),
    flag: webI18nUtils.getLanguageFlag(language),
  }),

  /**
   * Get all language options for dropdowns
   */
  getAllLanguageOptions: () => 
    supportedLanguages.map(lang => webI18nUtils.formatLanguageOption(lang)),
};

/**
 * Higher-order component for language context
 */
export function withLanguage<P extends object>(
  Component: React.ComponentType<P & { language: SupportedLanguage }>
) {
  return function LanguageWrappedComponent(props: P) {
    const { language } = useLanguage();
    // @ts-ignore - TypeScript has issues with HOC typing
    return React.createElement(Component, { ...props, language });
  };
}

export default {
  useLanguage,
  useTranslation,
  webI18nUtils,
  withLanguage,
};