'use client';

import { useLanguage, useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/language-switcher';

/**
 * Test page for language switching functionality
 * This page demonstrates the language middleware integration
 */
export default function TestLanguagePage() {
  const { language, supportedLanguages, defaultLanguage, isLoading, error } = useLanguage();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading language settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              🌐 Language Switching Test
            </h1>
            <p className="text-gray-600">
              Testing the language middleware integration across all applications
            </p>
          </div>

          {/* Current Language Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">Current Language Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center"></div>        <div className="text-2xl font-bold text-blue-600">{language.toUpperCase()}</div>
                <div className="text-sm text-blue-700">Current Language</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{supportedLanguages.length}</div>
                <div className="text-sm text-blue-700">Supported Languages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{defaultLanguage.toUpperCase()}</div>
                <div className="text-sm text-blue-700">Default Language</div>
              </div>
            </div>
          </div>

          {/* Language Switcher Variants */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Language Switcher Variants</h2>
            
            <div className="space-y-6">
              {/* Dropdown Variant */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Dropdown Variant</h3>
                  <p className="text-sm text-gray-600">Full dropdown with flags and labels</p>
                </div>
                <LanguageSwitcher variant="dropdown" />
              </div>

              {/* Compact Variant */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Compact Variant</h3>
                  <p className="text-sm text-gray-600">Minimal space usage</p>
                </div>
                <LanguageSwitcher variant="compact" />
              </div>

              {/* Inline Variant */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="mb-3">
                  <h3 className="font-medium text-gray-900">Inline Variant</h3>
                  <p className="text-sm text-gray-600">All languages visible as buttons</p>
                </div>
                <LanguageSwitcher variant="inline" />
              </div>
            </div>
          </div>

          {/* Supported Languages */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Supported Languages</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {supportedLanguages.map((lang) => (
                <div
                  key={lang}
                  className={`p-4 rounded-lg border-2 text-center ${
                    lang === language
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <div className="text-2xl mb-2">
                    {lang === 'en' && '🇺🇸'}
                    {lang === 'de' && '🇩🇪'}
                    {lang === 'es' && '🇪🇸'}
                    {lang === 'fr' && '🇫🇷'}
                    {lang === 'zh' && '🇨🇳'}
                  </div>
                  <div className="font-medium">{lang.toUpperCase()}</div>
                  <div className="text-sm">
                    {lang === 'en' && 'English'}
                    {lang === 'de' && 'Deutsch'}
                    {lang === 'es' && 'Español'}
                    {lang === 'fr' && 'Français'}
                    {lang === 'zh' && '中文'}
                  </div>
                  {lang === language && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Active
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Translation Test */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Translation Test</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 mb-2">
                <strong>Note:</strong> Translation system is integrated but placeholder translations are shown.
              </p>
              <div className="space-y-2">
                <div><strong>Welcome:</strong> {t('welcome')}</div>
                <div><strong>Hello:</strong> {t('hello')}</div>
                <div><strong>Goodbye:</strong> {t('goodbye')}</div>
                <div><strong>Thank you:</strong> {t('thank_you')}</div>
              </div>
            </div>
          </div>

          {/* Integration Status */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-4">✅ Integration Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-green-800 mb-2">Backend Integration</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✅ Language middleware created</li>
                  <li>✅ tRPC context updated</li>
                  <li>✅ i18n router implemented</li>
                  <li>✅ Language preference management</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-green-800 mb-2">Frontend Integration</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✅ Web i18n hooks created</li>
                  <li>✅ Language switcher components</li>
                  <li>✅ Cookie and localStorage support</li>
                  <li>✅ Browser language detection</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-6 bg-gray-100 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">🧪 Test Instructions</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Use any of the language switchers above to change the language</li>
              <li>Notice how the current language updates immediately</li>
              <li>Check browser cookies to see language preference stored</li>
              <li>Refresh the page to see language persistence</li>
              <li>Test with different browser language settings</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}