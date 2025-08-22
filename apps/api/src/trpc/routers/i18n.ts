import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { 
  supportedLanguages, 
  defaultLanguage, 
  isLanguageSupported
} from '../../../../packages/config/src/i18n';
import { LanguagePreferenceManager, type SupportedLanguage } from '../../middleware/language';

/**
 * i18n router for language management and switching
 */
export const i18nRouter = router({
  /**
   * Get supported languages and current language
   */
  getLanguages: publicProcedure
    .query(async ({ ctx }) => {
      return {
        supportedLanguages,
        defaultLanguage,
        currentLanguage: ctx.language,
        isAuthenticated: ctx.user.isAuthenticated,
      };
    }),

  /**
   * Get current language context
   */
  getCurrentLanguage: publicProcedure
    .query(async ({ ctx }) => {
      return {
        language: ctx.language,
        supportedLanguages,
        defaultLanguage,
      };
    }),

  /**
   * Set language preference for authenticated users
   */
  setLanguagePreference: protectedProcedure
    .input(z.object({
      language: z.enum(supportedLanguages as [string, ...string[]]),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.requireAuth();
      
      if (!isLanguageSupported(input.language)) {
        throw new Error(`Unsupported language: ${input.language}`);
      }

      // Update user's language preference
      await LanguagePreferenceManager.updateUserLanguagePreference(
        user.id,
        input.language as SupportedLanguage
      );

      // Set language cookie
      ctx.res.cookie('language', input.language, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return {
        success: true,
        language: input.language,
        message: `Language preference updated to ${input.language}`,
      };
    }),

  /**
   * Get user's language preference
   */
  getUserLanguagePreference: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.requireAuth();
      
      const preference = await LanguagePreferenceManager.getUserLanguagePreference(user.id);
      
      return {
        userId: user.id,
        languagePreference: preference,
        currentLanguage: ctx.language,
        supportedLanguages,
      };
    }),

  /**
   * Validate language code
   */
  validateLanguage: publicProcedure
    .input(z.object({
      language: z.string(),
    }))
    .query(async ({ input }) => {
      const isSupported = isLanguageSupported(input.language);
      
      return {
        language: input.language,
        isSupported,
        supportedLanguages,
        suggestion: isSupported ? null : defaultLanguage,
      };
    }),

  /**
   * Get language statistics (for admin)
   */
  getLanguageStats: protectedProcedure
    .query(async ({ ctx }) => {
      // This would require admin role in a real implementation
      // For now, just return mock data
      return {
        totalUsers: 0,
        languageDistribution: supportedLanguages.map(lang => ({
          language: lang,
          userCount: 0,
          percentage: 0,
        })),
        defaultLanguage,
        supportedLanguages,
      };
    }),
});

export type I18nRouter = typeof i18nRouter;