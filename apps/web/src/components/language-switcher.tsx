'use client';

import { useState } from 'react';
import { useLanguage, webI18nUtils, type SupportedLanguage } from '@/lib/i18n';
import { ChevronDown, Globe, Check } from 'lucide-react';

/**
 * Language switcher component for web application
 * Provides a dropdown to switch between supported languages
 */

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'inline' | 'compact';
  showFlag?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function LanguageSwitcher({
  variant = 'dropdown',
  showFlag = true,
  showLabel = true,
  className = '',
}: LanguageSwitcherProps) {
  const { language, supportedLanguages, isLoading, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    try {
      await setLanguage(newLanguage);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const currentLanguageOption = webI18nUtils.formatLanguageOption(language);
  const languageOptions = webI18nUtils.getAllLanguageOptions();

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 w-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {languageOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleLanguageChange(option.value)}
            className={`
              px-3 py-1 rounded-md text-sm font-medium transition-colors
              ${language === option.value
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }
            `}
          >
            {showFlag && <span className="mr-1">{option.flag}</span>}
            {showLabel && option.label}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-700 hover:text-gray-900 transition-colors"
        >
          <Globe className="h-4 w-4" />
          {showFlag && <span>{currentLanguageOption.flag}</span>}
          {showLabel && <span className="hidden sm:inline">{currentLanguageOption.label}</span>}
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20">
              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleLanguageChange(option.value)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors
                    ${language === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                  `}
                >
                  <span>{option.flag}</span>
                  <span className="flex-1">{option.label}</span>
                  {language === option.value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        {showFlag && <span>{currentLanguageOption.flag}</span>}
        {showLabel && <span className="text-sm font-medium text-gray-700">{currentLanguageOption.label}</span>}
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
            <div className="py-1">
              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleLanguageChange(option.value)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors
                    ${language === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                  `}
                >
                  <span className="text-lg">{option.flag}</span>
                  <span className="flex-1">{option.label}</span>
                  {language === option.value && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Simple language selector for forms
 */
interface LanguageSelectorProps {
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
  className?: string;
  disabled?: boolean;
}

export function LanguageSelector({
  value,
  onChange,
  className = '',
  disabled = false,
}: LanguageSelectorProps) {
  const languageOptions = webI18nUtils.getAllLanguageOptions();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SupportedLanguage)}
      disabled={disabled}
      className={`
        block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {languageOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.flag} {option.label}
        </option>
      ))}
    </select>
  );
}

export default LanguageSwitcher;