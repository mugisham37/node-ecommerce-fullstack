// import type { TFunction } from 'i18next';

// Temporary type definition until i18next is installed
type TFunction = (key: string, options?: any) => string;

// Supported languages
export type SupportedLanguage = 'en' | 'de' | 'es' | 'fr' | 'zh';

// Translation namespaces
export type TranslationNamespace = 'common' | 'errors' | 'validation' | 'emails';

// Language detection options
export interface LanguageDetectionOptions {
  order?: ('querystring' | 'cookie' | 'localStorage' | 'sessionStorage' | 'navigator' | 'htmlTag' | 'path' | 'subdomain')[];
  lookupQuerystring?: string;
  lookupCookie?: string;
  lookupLocalStorage?: string;
  lookupSessionStorage?: string;
  lookupFromPathIndex?: number;
  lookupFromSubdomainIndex?: number;
  caches?: ('localStorage' | 'cookie' | 'sessionStorage')[];
  excludeCacheFor?: string[];
  cookieMinutes?: number;
  cookieDomain?: string;
  cookieOptions?: {
    path?: string;
    sameSite?: 'strict' | 'lax' | 'none';
    secure?: boolean;
    httpOnly?: boolean;
  };
}

// i18n configuration
export interface I18nConfig {
  defaultLanguage: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  namespaces: TranslationNamespace[];
  fallbackLanguage: SupportedLanguage;
  debug?: boolean;
  interpolation?: {
    escapeValue?: boolean;
    format?: (value: any, format?: string, lng?: string) => string;
  };
  detection?: LanguageDetectionOptions;
}

// Translation resources structure
export interface TranslationResources {
  common: {
    welcome: string;
    hello: string;
    product: {
      outOfStock: string;
      inStock: string;
      lowStock: string;
      addToCart: string;
      viewDetails: string;
    };
    cart: {
      title: string;
      empty: string;
      checkout: string;
      continueShopping: string;
      total: string;
      subtotal: string;
      tax: string;
      shipping: string;
    };
    order: {
      status: {
        pending: string;
        processing: string;
        shipped: string;
        delivered: string;
        cancelled: string;
      };
      payment: {
        paid: string;
        unpaid: string;
      };
    };
    user: {
      profile: string;
      orders: string;
      addresses: string;
      paymentMethods: string;
      logout: string;
    };
    common: {
      save: string;
      cancel: string;
      delete: string;
      edit: string;
      add: string;
      remove: string;
      search: string;
      filter: string;
      sort: string;
      loading: string;
      noResults: string;
      error: string;
      success: string;
      confirm: string;
      yes: string;
      no: string;
    };
  };
  errors: {
    general: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
    validation: string;
    server: string;
    database: string;
    network: string;
    timeout: string;
    auth: {
      invalidCredentials: string;
      accountLocked: string;
      emailInUse: string;
      passwordMismatch: string;
      weakPassword: string;
      tokenExpired: string;
      invalidToken: string;
    };
    product: {
      outOfStock: string;
      notFound: string;
      invalidPrice: string;
      invalidQuantity: string;
    };
    order: {
      emptyCart: string;
      insufficientStock: string;
      paymentFailed: string;
      cannotCancel: string;
    };
    user: {
      notFound: string;
      invalidEmail: string;
      invalidPassword: string;
    };
  };
  validation: {
    required: string;
    email: string;
    minLength: string;
    maxLength: string;
    min: string;
    max: string;
    pattern: string;
    enum: string;
    unique: string;
    match: string;
    date: string;
    future: string;
    past: string;
    integer: string;
    number: string;
    boolean: string;
    object: string;
    array: string;
    string: string;
  };
  emails: Record<string, any>; // Will be populated based on actual email templates
}

// Hook return types
export interface UseTranslationReturn {
  t: TFunction;
  i18n: any;
  ready: boolean;
}

export interface UseTranslationOptions {
  ns?: TranslationNamespace | TranslationNamespace[];
  keyPrefix?: string;
}

// Language switcher props
export interface LanguageSwitcherProps {
  className?: string;
  showFlag?: boolean;
  showLabel?: boolean;
  variant?: 'dropdown' | 'buttons' | 'tabs';
  onLanguageChange?: (language: SupportedLanguage) => void;
}

// Language info
export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

// Translation validation result
export interface ValidationResult {
  isValid: boolean;
  missingKeys: string[];
  extraKeys: string[];
  errors: string[];
}

// Translation key paths (for type safety)
export type TranslationKey = 
  | 'common.welcome'
  | 'common.hello'
  | 'common.product.outOfStock'
  | 'common.product.inStock'
  | 'common.product.lowStock'
  | 'common.product.addToCart'
  | 'common.product.viewDetails'
  | 'common.cart.title'
  | 'common.cart.empty'
  | 'common.cart.checkout'
  | 'common.cart.continueShopping'
  | 'common.cart.total'
  | 'common.cart.subtotal'
  | 'common.cart.tax'
  | 'common.cart.shipping'
  | 'common.order.status.pending'
  | 'common.order.status.processing'
  | 'common.order.status.shipped'
  | 'common.order.status.delivered'
  | 'common.order.status.cancelled'
  | 'common.order.payment.paid'
  | 'common.order.payment.unpaid'
  | 'common.user.profile'
  | 'common.user.orders'
  | 'common.user.addresses'
  | 'common.user.paymentMethods'
  | 'common.user.logout'
  | 'common.common.save'
  | 'common.common.cancel'
  | 'common.common.delete'
  | 'common.common.edit'
  | 'common.common.add'
  | 'common.common.remove'
  | 'common.common.search'
  | 'common.common.filter'
  | 'common.common.sort'
  | 'common.common.loading'
  | 'common.common.noResults'
  | 'common.common.error'
  | 'common.common.success'
  | 'common.common.confirm'
  | 'common.common.yes'
  | 'common.common.no'
  | 'errors.general'
  | 'errors.notFound'
  | 'errors.unauthorized'
  | 'errors.forbidden'
  | 'errors.validation'
  | 'errors.server'
  | 'errors.database'
  | 'errors.network'
  | 'errors.timeout'
  | 'validation.required'
  | 'validation.email'
  | 'validation.minLength'
  | 'validation.maxLength'
  | 'validation.min'
  | 'validation.max'
  | 'validation.pattern'
  | 'validation.enum'
  | 'validation.unique'
  | 'validation.match'
  | 'validation.date'
  | 'validation.future'
  | 'validation.past'
  | 'validation.integer'
  | 'validation.number'
  | 'validation.boolean'
  | 'validation.object'
  | 'validation.array'
  | 'validation.string';

// Extend i18next types (commented out until i18next is installed)
// declare module 'i18next' {
//   interface CustomTypeOptions {
//     defaultNS: 'common';
//     resources: TranslationResources;
//   }
// }

export default TranslationResources;