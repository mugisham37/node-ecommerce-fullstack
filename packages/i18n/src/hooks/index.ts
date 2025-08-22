// Re-export all hooks
export { 
  useTranslation, 
  useCurrentLanguage, 
  useLanguagePreference 
} from './useTranslation';

export { 
  useTranslationRN, 
  useCurrentLanguageRN, 
  useLanguagePreferenceRN,
  useDeviceLanguageChange 
} from './useTranslationRN';

// Default export for convenience
export { default } from './useTranslation';