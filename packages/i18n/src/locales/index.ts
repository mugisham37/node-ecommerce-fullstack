// Translation resources export
import type { SupportedLanguage, TranslationNamespace } from '../types';

// English translations
import enCommon from './en/common.json';
import enErrors from './en/errors.json';
import enValidation from './en/validation.json';
import enEmails from './en/emails.json';

// German translations
import deCommon from './de/common.json';
import deErrors from './de/errors.json';
import deValidation from './de/validation.json';
import deEmails from './de/emails.json';

// Spanish translations
import esCommon from './es/common.json';
import esErrors from './es/errors.json';
import esValidation from './es/validation.json';
import esEmails from './es/emails.json';

// French translations
import frCommon from './fr/common.json';
import frErrors from './fr/errors.json';
import frValidation from './fr/validation.json';
import frEmails from './fr/emails.json';

// Chinese translations
import zhCommon from './zh/common.json';
import zhErrors from './zh/errors.json';
import zhValidation from './zh/validation.json';
import zhEmails from './zh/emails.json';

// Organize translations by language and namespace
export const translationResources = {
  en: {
    common: enCommon,
    errors: enErrors,
    validation: enValidation,
    emails: enEmails,
  },
  de: {
    common: deCommon,
    errors: deErrors,
    validation: deValidation,
    emails: deEmails,
  },
  es: {
    common: esCommon,
    errors: esErrors,
    validation: esValidation,
    emails: esEmails,
  },
  fr: {
    common: frCommon,
    errors: frErrors,
    validation: frValidation,
    emails: frEmails,
  },
  zh: {
    common: zhCommon,
    errors: zhErrors,
    validation: zhValidation,
    emails: zhEmails,
  },
} as const;

// Helper function to get translations for a specific language
export function getTranslationsForLanguage(language: SupportedLanguage) {
  return translationResources[language] || translationResources.en;
}

// Helper function to get translations for a specific namespace
export function getTranslationsForNamespace(
  language: SupportedLanguage,
  namespace: TranslationNamespace
) {
  const languageResources = getTranslationsForLanguage(language);
  return languageResources[namespace] || translationResources.en[namespace];
}

// Export individual language resources
export const resources = translationResources;

export default translationResources;