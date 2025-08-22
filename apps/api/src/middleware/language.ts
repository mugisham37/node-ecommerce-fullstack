import type { Request, Response, NextFunction } from 'express';
import { 
  supportedLanguages, 
  defaultLanguage, 
  detectLanguage,
  isLanguageSupported 
} from '../../../packages/config/src/i18n';

export type SupportedLanguage = string;

/**
 * Language detection middleware for Express/tRPC context
 */
export interface LanguageContext {
  language: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  defaultLanguage: SupportedLanguage;
}

/**
 * Detect language from various sources in order of priority:
 * 1. Query parameter (?lang=en)
 * 2. Cookie (language=en)
 * 3. Accept-Language header
 * 4. Default language
 */
export function detectLanguageFromRequest(
  queryLang?: string,
  cookieLang?: string,
  acceptLanguage?: string
): SupportedLanguage {
  // Priority 1: Query parameter
  if (queryLang && isLanguageSupported(queryLang)) {
    return queryLang as SupportedLanguage;
  }

  // Priority 2: Cookie
  if (cookieLang && isLanguageSupported(cookieLang)) {
    return cookieLang as SupportedLanguage;
  }

  // Priority 3: Accept-Language header
  if (acceptLanguage) {
    return detectLanguage(acceptLanguage) as SupportedLanguage;
  }

  // Priority 4: Default language
  return defaultLanguage as SupportedLanguage;
}

/**
 * Express middleware for language detection
 * Adds language information to the request object
 */
export function languageMiddleware(req: Request, res: Response, next: NextFunction): void {
  const queryLang = req.query.lang as string;
  const cookieLang = req.cookies?.language as string;
  const acceptLanguage = req.headers['accept-language'] as string;

  // Detect language
  const language = detectLanguageFromRequest(queryLang, cookieLang, acceptLanguage);

  // Add language context to request
  (req as any).languageContext = {
    language,
    supportedLanguages,
    defaultLanguage,
  } as LanguageContext;

  // Set language cookie for future requests (if not already set or different)
  if (cookieLang !== language) {
    res.cookie('language', language, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  next();
}

/**
 * Create language context for tRPC procedures
 */
export function createLanguageContext(
  queryLang?: string,
  cookieLang?: string,
  acceptLanguage?: string,
  userLanguage?: string
): LanguageContext {
  // If user has a preferred language, use it first
  let language: SupportedLanguage;
  
  if (userLanguage && isLanguageSupported(userLanguage)) {
    language = userLanguage as SupportedLanguage;
  } else {
    language = detectLanguageFromRequest(queryLang, cookieLang, acceptLanguage);
  }

  return {
    language,
    supportedLanguages,
    defaultLanguage,
  };
}

/**
 * Get language from tRPC context
 */
export function getLanguageFromContext(ctx: any): SupportedLanguage {
  return ctx.languageContext?.language || ctx.language || defaultLanguage;
}

/**
 * Validate and normalize language input
 */
export function validateLanguage(language: string): SupportedLanguage {
  if (isLanguageSupported(language)) {
    return language as SupportedLanguage;
  }
  return defaultLanguage as SupportedLanguage;
}

/**
 * Language preference utilities for user settings
 */
export class LanguagePreferenceManager {
  /**
   * Update user's language preference
   */
  static async updateUserLanguagePreference(
    userId: string,
    language: SupportedLanguage,
    userRepository?: any
  ): Promise<void> {
    if (!isLanguageSupported(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    try {
      // Import the database layer dynamically to avoid circular dependencies
      const { DatabaseLayer } = await import('../database/connection');
      const db = DatabaseLayer.getInstance();
      
      // Update user's language preference in database
      await db.db.update(db.schema.users)
        .set({ 
          languagePreference: language,
          updatedAt: new Date()
        })
        .where(db.eq(db.schema.users.id, userId));
        
      console.log(`Updated language preference for user ${userId} to ${language}`);
    } catch (error) {
      console.error('Failed to update user language preference:', error);
      throw new Error('Failed to update language preference');
    }
  }

  /**
   * Get user's language preference
   */
  static async getUserLanguagePreference(
    userId: string,
    userRepository?: any
  ): Promise<SupportedLanguage | null> {
    try {
      // Import the database layer dynamically to avoid circular dependencies
      const { DatabaseLayer } = await import('../database/connection');
      const db = DatabaseLayer.getInstance();
      
      // Get user's language preference from database
      const result = await db.db.select({ languagePreference: db.schema.users.languagePreference })
        .from(db.schema.users)
        .where(db.eq(db.schema.users.id, userId))
        .limit(1);
        
      const userLanguage = result[0]?.languagePreference;
      return userLanguage && isLanguageSupported(userLanguage) ? userLanguage as SupportedLanguage : null;
    } catch (error) {
      console.error('Failed to get user language preference:', error);
      return null;
    }
  }
}

// Extend Express Request interface to include language context
declare global {
  namespace Express {
    interface Request {
      languageContext?: LanguageContext;
    }
  }
}

export default {
  languageMiddleware,
  createLanguageContext,
  getLanguageFromContext,
  detectLanguageFromRequest,
  validateLanguage,
  LanguagePreferenceManager,
};