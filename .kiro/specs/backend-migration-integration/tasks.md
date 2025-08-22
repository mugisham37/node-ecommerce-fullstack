# Implementation Plan

- [x] 1. Foundation Layer Migration - Database Schema and Core Infrastructure



  - Analyze other-backend/src/database/client.ts and connection.ts to understand Prisma setup
  - Extract all Prisma model definitions and convert to Drizzle schema in packages/database/src/schema/
  - Create migration files in packages/database/migrations/ for all new entities
  - Update packages/database/src/repositories/ with repository classes for new entities
  - Clean up: Remove any temporary analysis files after successful migration
  - _Requirements: 1.1, 1.6_

- [x] 1.1 Database Schema Analysis and Migration


  - Read other-backend/prisma/schema.prisma (if exists) or analyze models in other-backend/src/database/
  - Create packages/database/src/schema/loyalty.ts for loyalty programs, tiers, points, and redemptions
  - Create packages/database/src/schema/ab-tests.ts for A/B testing tables (tests, assignments, conversions)
  - Create packages/database/src/schema/vendor-analytics.ts for vendor performance tracking
  - Create packages/database/src/schema/advanced-search.ts for search indexing and analytics
  - Create packages/database/src/schema/notifications.ts for notification system
  - Create packages/database/src/schema/settings.ts for application settings management
  - Write packages/database/migrations/0001_add_loyalty_system.sql for loyalty program tables
  - Write packages/database/migrations/0002_add_ab_testing.sql for A/B testing infrastructure
  - Write packages/database/migrations/0003_add_vendor_analytics.sql for vendor analytics
  - Write packages/database/migrations/0004_add_advanced_search.sql for search functionality
  - Write packages/database/migrations/0005_add_notifications.sql for notification system
  - Write packages/database/migrations/0006_add_settings.sql for settings management
  - Run migrations: npm run db:migrate in packages/database
  - Test schema: npm run db:generate && npm run type-check in packages/database
  - Clean up: Remove any temporary schema analysis files
  - _Requirements: 1.1_

- [x] 1.2 Repository Pattern Implementation
  - Copy other-backend/src/repositories/base.repository.ts to analyze base functionality
  - Create packages/database/src/repositories/base-repository.ts adapted for Drizzle ORM
  - Migrate other-backend/src/repositories/product.repository.ts to packages/database/src/repositories/product-repository.ts
  - Migrate other-backend/src/repositories/user.repository.ts to packages/database/src/repositories/user-repository.ts
  - Create packages/database/src/repositories/loyalty-repository.ts based on loyalty service requirements
  - Create packages/database/src/repositories/ab-test-repository.ts for A/B testing functionality
  - Create packages/database/src/repositories/vendor-analytics-repository.ts for vendor data
  - Create packages/database/src/repositories/notification-repository.ts for notifications
  - Create packages/database/src/repositories/settings-repository.ts for settings management
  - Update packages/database/src/repositories/index.ts to export all new repositories
  - Create packages/database/src/repositories/__tests__/ directory with unit tests for each repository
  - Test repositories: npm test in packages/database
  - Clean up: Delete copied other-backend repository files after successful migration
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 1.3 Validation Schema Migration






  - Copy other-backend/src/validators/ab-test.validation.ts and convert Joi schemas to Zod in packages/validation/src/schemas/ab-test.ts
  - Copy other-backend/src/validators/advanced-search.validation.ts and convert to packages/validation/src/schemas/advanced-search.ts
  - Copy other-backend/src/validators/country.validation.ts and convert to packages/validation/src/schemas/country.ts
  - Copy other-backend/src/validators/currency.validation.ts and convert to packages/validation/src/schemas/currency.ts
  - Copy other-backend/src/validators/email.validation.ts and convert to packages/validation/src/schemas/email.ts
  - Copy other-backend/src/validators/loyalty.validation.ts and convert to packages/validation/src/schemas/loyalty.ts
  - Copy other-backend/src/validators/tax.validation.ts and convert to packages/validation/src/schemas/tax.ts
  - Copy other-backend/src/validators/vendor.validation.ts and convert to packages/validation/src/schemas/vendor.ts
  - Update packages/validation/src/schemas/index.ts to export all new schemas
  - Create packages/validation/src/middleware/trpc-validation.ts for tRPC integration
  - Test validation: npm test in packages/validation
  - Clean up: Delete copied validator files from other-backend after successful conversion
  - _Requirements: 1.2_

- [x] 1.4 Configuration and Environment Setup





  - Copy other-backend/src/config/cors.ts to apps/api/src/config/cors.ts
  - Copy other-backend/src/config/database.ts and adapt to packages/config/src/database.ts for Drizzle
  - Copy other-backend/src/config/i18n.ts to packages/config/src/i18n.ts
  - Copy other-backend/src/config/redis.ts to packages/config/src/redis.ts
  - Copy other-backend/src/config/swagger.ts to apps/api/src/config/swagger.ts
  - Copy other-backend/.env.example and merge with root .env.example, adding new variables
  - Update packages/config/src/environments/development.ts with new configuration options
  - Update packages/config/src/environments/production.ts with production settings
  - Update infrastructure/docker/.env.example with all new environment variables
  - Update docker-compose.yml with new service configurations (Redis, additional databases)
  - Test configuration: npm run build in packages/config
  - Clean up: Remove copied config files from other-backend after integration
  - _Requirements: 1.3_

- [x] 1.5 Utility Functions Integration





  - Copy other-backend/src/utils/analytics.utils.ts to packages/shared/src/utils/analytics.ts
  - Copy other-backend/src/utils/api-error.ts to packages/shared/src/utils/api-error.ts
  - Copy other-backend/src/utils/async-handler.ts to packages/shared/src/utils/async-handler.ts
  - Copy other-backend/src/utils/decimal.utils.ts to packages/shared/src/utils/decimal.ts
  - Copy other-backend/src/utils/logger.ts to packages/shared/src/utils/logger.ts (merge with existing)
  - Copy other-backend/src/utils/translate.ts to packages/shared/src/utils/translate.ts
  - Copy other-backend/src/utils/type-guards.ts to packages/shared/src/utils/type-guards.ts
  - Copy other-backend/src/utils/validation.schemas.ts to packages/shared/src/utils/validation-schemas.ts
  - Update packages/shared/src/utils/index.ts to export all new utilities
  - Create packages/shared/src/utils/__tests__/ with unit tests for each utility
  - Test utilities: npm test in packages/shared
  - Clean up: Delete copied utility files from other-backend after successful migration
  - _Requirements: 1.4_

- [x] 1.6 TypeScript Types Migration





  - Copy other-backend/src/types/analytics.types.ts to packages/shared/src/types/analytics.ts
  - Copy other-backend/src/types/export.types.ts to packages/shared/src/types/export.ts
  - Copy other-backend/src/types/settings.types.ts to packages/shared/src/types/settings.ts
  - Copy other-backend/src/types/vendor-analytics.types.ts to packages/shared/src/types/vendor-analytics.ts
  - Create packages/shared/src/types/loyalty.ts for loyalty program types
  - Create packages/shared/src/types/ab-test.ts for A/B testing types
  - Create packages/shared/src/types/notification.ts for notification system types
  - Create packages/shared/src/types/search.ts for advanced search types
  - Update packages/shared/src/types/index.ts to export all new types
  - Ensure all types are compatible with tRPC by adding proper serialization
  - Test types: npm run type-check in packages/shared
  - Clean up: Delete copied type files from other-backend after successful migration
  - _Requirements: 1.6_

- [ ] 2. Internationalization System Setup
  - Create packages/i18n package with complete i18next configuration
  - Copy all translation files from other-backend/src/locales/ to packages/i18n/src/locales/
  - Implement language detection middleware for apps/api/src/middleware/
  - Create i18n hooks for apps/web/src/ and apps/mobile/src/
  - Clean up: Remove other-backend/src/locales/ after successful migration
  - _Requirements: 1.5_

- [ ] 2.1 I18n Package Creation
  - Create packages/i18n/package.json with i18next, react-i18next, and react-native-localize dependencies
  - Create packages/i18n/tsconfig.json with proper TypeScript configuration
  - Create packages/i18n/src/index.ts with i18next initialization and configuration
  - Create packages/i18n/src/types.ts with TypeScript types for all translation namespaces
  - Create packages/i18n/src/hooks/useTranslation.ts for React web applications
  - Create packages/i18n/src/hooks/useTranslationRN.ts for React Native applications
  - Create packages/i18n/src/utils/language-detector.ts for automatic language detection
  - Test package: npm run build && npm run type-check in packages/i18n
  - _Requirements: 1.5_

- [ ] 2.2 Translation Files Migration
  - Copy other-backend/src/locales/en/ to packages/i18n/src/locales/en/ (common.json, emails.json, errors.json, validation.json)
  - Copy other-backend/src/locales/de/ to packages/i18n/src/locales/de/ (all JSON files)
  - Copy other-backend/src/locales/es/ to packages/i18n/src/locales/es/ (all JSON files)
  - Copy other-backend/src/locales/fr/ to packages/i18n/src/locales/fr/ (all JSON files)
  - Copy other-backend/src/locales/zh/ to packages/i18n/src/locales/zh/ (all JSON files)
  - Create packages/i18n/src/locales/index.ts to export all translation resources
  - Create packages/i18n/scripts/validate-translations.ts to check for missing keys
  - Run validation: npm run validate-translations in packages/i18n
  - Clean up: Delete other-backend/src/locales/ directory after successful copy
  - _Requirements: 1.5_

- [ ] 2.3 Language Middleware Integration
  - Copy other-backend/src/middleware/language.middleware.ts to analyze language detection logic
  - Create apps/api/src/middleware/language.ts adapted for tRPC context
  - Update apps/api/src/trpc/context.ts to include language detection and user language preferences
  - Create apps/api/src/trpc/routers/i18n.ts with language switching endpoints
  - Update apps/web/src/lib/i18n.ts to integrate with packages/i18n
  - Update apps/mobile/src/lib/i18n.ts for React Native i18n integration
  - Create apps/web/src/components/language-switcher.tsx for web language switching
  - Create apps/mobile/src/components/LanguageSwitcher.tsx for mobile language switching
  - Test language switching: npm run dev and test language changes in all apps
  - Clean up: Delete copied other-backend/src/middleware/language.middleware.ts
  - _Requirements: 1.7_

- [ ] 3. Core Business Logic Services Migration
  - Copy all service files from other-backend/src/services/ to analyze business logic
  - Create corresponding service files in apps/api/src/services/ adapted for Drizzle ORM
  - Update service dependencies to use new repository patterns and shared utilities
  - Create service unit tests in apps/api/src/services/__tests__/
  - Clean up: Delete copied other-backend service files after successful migration
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12_

- [ ] 3.1 Analytics Services Migration
  - Copy other-backend/src/services/analytics.service.ts to apps/api/src/services/analytics.service.ts
  - Copy other-backend/src/services/vendor-analytics.service.ts to apps/api/src/services/vendor-analytics.service.ts
  - Update analytics.service.ts to use LoyaltyRepository, OrderRepository, ProductRepository from packages/database
  - Update vendor-analytics.service.ts to use VendorAnalyticsRepository and VendorRepository
  - Replace Prisma aggregation queries with Drizzle equivalents using sql`` template literals
  - Add Redis caching integration using packages/cache for analytics data
  - Create apps/api/src/services/__tests__/analytics.service.test.ts with comprehensive unit tests
  - Create apps/api/src/services/__tests__/vendor-analytics.service.test.ts
  - Test services: npm test apps/api/src/services/__tests__/analytics*
  - Clean up: Delete copied other-backend analytics service files
  - _Requirements: 2.1_

- [ ] 3.2 Loyalty Program Services Migration
  - Copy other-backend/src/services/loyalty.service.ts to apps/api/src/services/loyalty.service.ts
  - Copy other-backend/src/services/batch-loyalty.service.ts to apps/api/src/services/batch-loyalty.service.ts
  - Copy other-backend/src/services/loyalty-report.service.ts to apps/api/src/services/loyalty-report.service.ts
  - Update loyalty.service.ts to use LoyaltyRepository, UserRepository, and EmailService
  - Update batch-loyalty.service.ts to use database transactions for bulk operations
  - Update loyalty-report.service.ts to use ExportService for report generation
  - Implement points calculation logic with proper decimal handling using packages/shared/src/utils/decimal.ts
  - Add tier upgrade logic with email notifications using packages/email
  - Create apps/api/src/services/__tests__/loyalty.service.test.ts
  - Create apps/api/src/services/__tests__/batch-loyalty.service.test.ts
  - Create apps/api/src/services/__tests__/loyalty-report.service.test.ts
  - Test services: npm test apps/api/src/services/__tests__/loyalty*
  - Clean up: Delete copied other-backend loyalty service files
  - _Requirements: 2.2_

- [ ] 3.3 A/B Testing Service Migration
  - Copy other-backend/src/services/ab-test.service.ts to apps/api/src/services/ab-test.service.ts
  - Update ab-test.service.ts to use ABTestRepository and ABTestAssignmentRepository
  - Implement user assignment algorithm with proper variant distribution
  - Add conversion tracking with statistical significance calculation
  - Implement A/B test result analysis with confidence intervals
  - Add experiment lifecycle management (draft, running, paused, completed)
  - Create apps/api/src/services/__tests__/ab-test.service.test.ts with statistical test validation
  - Test service: npm test apps/api/src/services/__tests__/ab-test.service.test.ts
  - Clean up: Delete copied other-backend/src/services/ab-test.service.ts
  - _Requirements: 2.3_

- [ ] 3.4 Search and Recommendation Services
  - Copy other-backend/src/services/search.service.ts to apps/api/src/services/search.service.ts
  - Copy other-backend/src/services/recommendation.service.ts to apps/api/src/services/recommendation.service.ts
  - Update search.service.ts to use ProductRepository with advanced search capabilities
  - Implement search indexing using PostgreSQL full-text search or Elasticsearch integration
  - Update recommendation.service.ts with collaborative filtering and content-based algorithms
  - Add search analytics tracking and query optimization
  - Create recommendation caching with Redis for performance
  - Create apps/api/src/services/__tests__/search.service.test.ts
  - Create apps/api/src/services/__tests__/recommendation.service.test.ts
  - Test services: npm test apps/api/src/services/__tests__/search* apps/api/src/services/__tests__/recommendation*
  - Clean up: Delete copied other-backend search and recommendation service files
  - _Requirements: 2.4, 2.11_

- [ ] 3.5 Vendor Management Services
  - Copy other-backend/src/services/vendor.service.ts to apps/api/src/services/vendor.service.ts
  - Copy other-backend/src/services/vendor-dashboard.service.ts to apps/api/src/services/vendor-dashboard.service.ts
  - Update vendor.service.ts to use VendorRepository and VendorAnalyticsRepository
  - Implement vendor onboarding workflow with document verification
  - Add vendor performance tracking and payout calculation
  - Update vendor-dashboard.service.ts with comprehensive vendor analytics
  - Add vendor communication and notification system
  - Create apps/api/src/services/__tests__/vendor.service.test.ts
  - Create apps/api/src/services/__tests__/vendor-dashboard.service.test.ts
  - Test services: npm test apps/api/src/services/__tests__/vendor*
  - Clean up: Delete copied other-backend vendor service files
  - _Requirements: 2.5_

- [ ] 3.6 Export and Reporting Services
  - Copy other-backend/src/services/export.service.ts to apps/api/src/services/export.service.ts
  - Copy other-backend/src/services/report.service.ts to apps/api/src/services/report.service.ts
  - Update export.service.ts to use new repository patterns for data extraction
  - Implement Excel export using exceljs library
  - Implement PDF export using puppeteer or similar library
  - Implement CSV export with proper formatting and encoding
  - Update report.service.ts with scheduled report generation
  - Add report template system for customizable reports
  - Create apps/api/src/services/__tests__/export.service.test.ts
  - Create apps/api/src/services/__tests__/report.service.test.ts
  - Test services: npm test apps/api/src/services/__tests__/export* apps/api/src/services/__tests__/report*
  - Clean up: Delete copied other-backend export and report service files
  - _Requirements: 2.6_

- [ ] 3.7 Email and Notification Services
  - Copy other-backend/src/services/email.service.ts to apps/api/src/services/email.service.ts
  - Copy other-backend/src/services/notification.service.ts to apps/api/src/services/notification.service.ts
  - Update email.service.ts to use packages/email for template rendering and sending
  - Implement email queue with Redis for reliable delivery
  - Update notification.service.ts with push notification support for mobile apps
  - Add email delivery tracking and bounce handling
  - Implement notification preferences and subscription management
  - Create apps/api/src/services/__tests__/email.service.test.ts
  - Create apps/api/src/services/__tests__/notification.service.test.ts
  - Test services: npm test apps/api/src/services/__tests__/email* apps/api/src/services/__tests__/notification*
  - Clean up: Delete copied other-backend email and notification service files
  - _Requirements: 2.7, 2.9_

- [ ] 3.8 Scheduling and Background Jobs
  - Copy other-backend/src/services/scheduler.service.ts to apps/api/src/jobs/scheduler.service.ts
  - Create apps/api/src/jobs/cron-jobs.ts for cron job definitions
  - Update scheduler.service.ts to use node-cron for job scheduling
  - Implement job queue using Bull or similar Redis-based queue
  - Add job monitoring and failure handling with retry logic
  - Create background jobs for analytics processing, report generation, and data cleanup
  - Add job dashboard for monitoring job status and performance
  - Create apps/api/src/jobs/__tests__/scheduler.service.test.ts
  - Test jobs: npm test apps/api/src/jobs/__tests__/
  - Clean up: Delete copied other-backend/src/services/scheduler.service.ts
  - _Requirements: 2.8_

- [ ] 3.9 Tax and Currency Services
  - Copy other-backend/src/services/tax.service.ts to apps/api/src/services/tax.service.ts
  - Copy other-backend/src/services/currency.service.ts to apps/api/src/services/currency.service.ts
  - Update tax.service.ts to use TaxRepository for tax rule management
  - Implement location-based tax calculation with postal code lookup
  - Update currency.service.ts with real-time exchange rate integration
  - Add currency conversion caching with Redis
  - Implement tax exemption handling and compliance reporting
  - Create apps/api/src/services/__tests__/tax.service.test.ts
  - Create apps/api/src/services/__tests__/currency.service.test.ts
  - Test services: npm test apps/api/src/services/__tests__/tax* apps/api/src/services/__tests__/currency*
  - Clean up: Delete copied other-backend tax and currency service files
  - _Requirements: 2.10_

- [ ] 3.10 Settings and Configuration Services
  - Copy other-backend/src/services/settings.service.ts to apps/api/src/services/settings.service.ts
  - Update settings.service.ts to use SettingsRepository for configuration management
  - Implement dynamic configuration updates with validation
  - Add settings versioning and rollback functionality
  - Create settings backup and restore capabilities
  - Implement settings UI integration with proper access controls
  - Add settings change audit logging
  - Create apps/api/src/services/__tests__/settings.service.test.ts
  - Test service: npm test apps/api/src/services/__tests__/settings.service.test.ts
  - Clean up: Delete copied other-backend/src/services/settings.service.ts
  - _Requirements: 2.12_

- [ ] 4. tRPC Router Creation and API Layer
  - Copy all controller files from other-backend/src/controllers/ to analyze endpoint structure
  - Create corresponding tRPC routers in apps/api/src/trpc/routers/ for each controller
  - Update apps/api/src/trpc/routers/index.ts to include all new routers
  - Create comprehensive integration tests in apps/api/src/trpc/__tests__/
  - Clean up: Delete copied other-backend controller files after router creation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

- [ ] 4.1 Analytics tRPC Routers
  - Copy other-backend/src/controllers/analytics.controller.ts to analyze endpoint structure
  - Create apps/api/src/trpc/routers/analytics.ts with getDashboard, getSalesTrend, getTopProducts procedures
  - Copy other-backend/src/routes/analytics.routes.ts to understand route parameters and validation
  - Implement adminProcedure for all analytics endpoints with proper authorization
  - Add input validation using Zod schemas from packages/validation/src/schemas/analytics.ts
  - Create real-time analytics subscription using tRPC subscriptions
  - Create apps/api/src/trpc/__tests__/analytics.test.ts with comprehensive endpoint testing
  - Test router: npm test apps/api/src/trpc/__tests__/analytics.test.ts
  - Clean up: Delete copied other-backend analytics controller and route files
  - _Requirements: 4.1_

- [ ] 4.2 Loyalty Program tRPC Routers
  - Copy other-backend/src/controllers/loyalty.controller.ts and loyalty-customer.controller.ts
  - Copy other-backend/src/controllers/loyalty-dashboard.controller.ts to analyze dashboard endpoints
  - Create apps/api/src/trpc/routers/loyalty.ts with createProgram, getUserPoints, awardPoints, redeemPoints procedures
  - Copy other-backend/src/routes/loyalty.routes.ts and admin-loyalty.routes.ts for route structure
  - Implement protectedProcedure for customer endpoints and adminProcedure for admin endpoints
  - Add input validation using packages/validation/src/schemas/loyalty.ts
  - Create loyalty leaderboard and tier management endpoints
  - Create apps/api/src/trpc/__tests__/loyalty.test.ts
  - Test router: npm test apps/api/src/trpc/__tests__/loyalty.test.ts
  - Clean up: Delete copied other-backend loyalty controller and route files
  - _Requirements: 4.2_

- [ ] 4.3 A/B Testing tRPC Routers
  - Copy other-backend/src/controllers/ab-test.controller.ts to analyze A/B testing endpoints
  - Create apps/api/src/trpc/routers/ab-test.ts with createTest, getAssignment, recordConversion, getResults procedures
  - Copy other-backend/src/routes/ab-test.routes.ts for route validation patterns
  - Implement adminProcedure for test management and publicProcedure for assignment/conversion
  - Add statistical analysis procedures for test results and significance testing
  - Create A/B test lifecycle management (start, pause, stop, archive)
  - Create apps/api/src/trpc/__tests__/ab-test.test.ts with statistical validation
  - Test router: npm test apps/api/src/trpc/__tests__/ab-test.test.ts
  - Clean up: Delete copied other-backend A/B test controller and route files
  - _Requirements: 4.3_

- [ ] 4.4 Search and Recommendation Routers
  - Copy other-backend/src/controllers/search.controller.ts and advanced-search.controller.ts
  - Copy other-backend/src/controllers/recommendation.controller.ts for recommendation logic
  - Create apps/api/src/trpc/routers/search.ts with search, advancedSearch, getSuggestions procedures
  - Create apps/api/src/trpc/routers/recommendation.ts with getRecommendations, getRelatedProducts procedures
  - Copy other-backend/src/routes/search.routes.ts and advanced-search.routes.ts for validation
  - Implement publicProcedure for search and protectedProcedure for personalized recommendations
  - Add search analytics tracking and query optimization
  - Create apps/api/src/trpc/__tests__/search.test.ts and recommendation.test.ts
  - Test routers: npm test apps/api/src/trpc/__tests__/search* apps/api/src/trpc/__tests__/recommendation*
  - Clean up: Delete copied other-backend search and recommendation controller files
  - _Requirements: 4.4, 4.12_

- [ ] 4.5 Vendor Management Routers
  - Copy other-backend/src/controllers/vendor.controller.ts and vendor-dashboard.controller.ts
  - Create apps/api/src/trpc/routers/vendor.ts with createVendor, updateVendor, getVendorProfile procedures
  - Create apps/api/src/trpc/routers/vendor-dashboard.ts with getVendorAnalytics, getVendorOrders procedures
  - Copy other-backend/src/routes/vendor.routes.ts and vendor-dashboard.routes.ts
  - Implement vendorProcedure for vendor-specific endpoints and adminProcedure for admin management
  - Add vendor onboarding workflow with document upload and verification
  - Create vendor payout management and performance tracking endpoints
  - Create apps/api/src/trpc/__tests__/vendor.test.ts and vendor-dashboard.test.ts
  - Test routers: npm test apps/api/src/trpc/__tests__/vendor*
  - Clean up: Delete copied other-backend vendor controller and route files
  - _Requirements: 4.5_

- [ ] 4.6 Export and Admin Routers
  - Copy other-backend/src/controllers/export.controller.ts and batch.controller.ts
  - Create apps/api/src/trpc/routers/export.ts with exportData, generateReport, downloadFile procedures
  - Create apps/api/src/trpc/routers/admin.ts with bulk operations and system management
  - Copy other-backend/src/routes/export.routes.ts and admin.routes.ts
  - Implement adminProcedure for all export and admin endpoints
  - Add file generation tracking and download management
  - Create system health monitoring and maintenance endpoints
  - Create apps/api/src/trpc/__tests__/export.test.ts and admin.test.ts
  - Test routers: npm test apps/api/src/trpc/__tests__/export* apps/api/src/trpc/__tests__/admin*
  - Clean up: Delete copied other-backend export and admin controller files
  - _Requirements: 4.6, 4.7_

- [ ] 4.7 Webhook and Integration Routers
  - Copy other-backend/src/controllers/webhook.controller.ts to analyze webhook handling
  - Create apps/api/src/trpc/routers/webhook.ts with handleStripeWebhook, handlePayPalWebhook procedures
  - Copy other-backend/src/routes/webhook.routes.ts for webhook validation patterns
  - Implement webhook signature validation and security measures
  - Add webhook event processing and order status updates
  - Create webhook retry logic and failure handling
  - Create apps/api/src/trpc/__tests__/webhook.test.ts with mock webhook testing
  - Test router: npm test apps/api/src/trpc/__tests__/webhook.test.ts
  - Clean up: Delete copied other-backend webhook controller and route files
  - _Requirements: 4.8_

- [ ] 4.8 Utility and Settings Routers
  - Copy other-backend/src/controllers/tax.controller.ts, currency.controller.ts, settings.controller.ts
  - Copy other-backend/src/controllers/country.controller.ts and notification.controller.ts
  - Create apps/api/src/trpc/routers/tax.ts with calculateTax, getTaxRates procedures
  - Create apps/api/src/trpc/routers/currency.ts with convertCurrency, getExchangeRates procedures
  - Create apps/api/src/trpc/routers/settings.ts with getSettings, updateSettings procedures
  - Create apps/api/src/trpc/routers/country.ts with getCountries, getRegions procedures
  - Create apps/api/src/trpc/routers/notification.ts with sendNotification, getNotifications procedures
  - Copy other-backend/src/routes/tax.routes.ts, currency.routes.ts, countries.routes.ts for validation
  - Implement appropriate authorization for each router (public, protected, admin)
  - Create apps/api/src/trpc/__tests__/tax.test.ts, currency.test.ts, settings.test.ts, country.test.ts, notification.test.ts
  - Test routers: npm test apps/api/src/trpc/__tests__/tax* apps/api/src/trpc/__tests__/currency* apps/api/src/trpc/__tests__/settings* apps/api/src/trpc/__tests__/country* apps/api/src/trpc/__tests__/notification*
  - Clean up: Delete copied other-backend utility controller and route files
  - _Requirements: 4.9, 4.10, 4.11_

- [ ] 5. Email System and Template Integration
  - Create packages/email package with Nodemailer and Handlebars integration
  - Copy all HTML templates from other-backend/src/templates/ to packages/email/src/templates/
  - Integrate email system with packages/i18n for multi-language support
  - Create email queue system using Redis for reliable delivery
  - Clean up: Delete other-backend/src/templates/ after successful migration
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 5.1 Email Package Creation
  - Create packages/email/package.json with nodemailer, handlebars, and bull dependencies
  - Create packages/email/tsconfig.json with proper TypeScript configuration
  - Create packages/email/src/index.ts with EmailService class export
  - Create packages/email/src/service/email.service.ts with SMTP configuration and template rendering
  - Create packages/email/src/queue/email-queue.ts using Bull for Redis-based email queue
  - Create packages/email/src/types/email.types.ts with email template and configuration types
  - Create packages/email/src/config/smtp.ts with SMTP configuration management
  - Test package: npm run build && npm run type-check in packages/email
  - _Requirements: 6.1, 6.6_

- [ ] 5.2 Email Template Migration
  - Copy other-backend/src/templates/welcome.html to packages/email/src/templates/welcome.hbs
  - Copy other-backend/src/templates/order-confirmation.html to packages/email/src/templates/order-confirmation.hbs
  - Copy other-backend/src/templates/order-shipped.html to packages/email/src/templates/order-shipped.hbs
  - Copy other-backend/src/templates/order-delivered.html to packages/email/src/templates/order-delivered.hbs
  - Copy other-backend/src/templates/password-reset.html to packages/email/src/templates/password-reset.hbs
  - Convert all HTML templates to Handlebars format with proper variable substitution
  - Create packages/email/src/templates/loyalty-tier-upgrade.hbs for loyalty program
  - Create packages/email/src/templates/points-awarded.hbs for points notifications
  - Create packages/email/src/utils/template-loader.ts for template compilation and caching
  - Create packages/email/src/utils/template-validator.ts for template validation
  - Create packages/email/src/__tests__/template-rendering.test.ts
  - Test templates: npm test in packages/email
  - Clean up: Delete other-backend/src/templates/ directory after successful copy
  - _Requirements: 6.2_

- [ ] 5.3 Multi-language Email Support
  - Create packages/email/src/templates/en/ directory for English templates
  - Create packages/email/src/templates/de/ directory for German templates
  - Create packages/email/src/templates/es/ directory for Spanish templates
  - Create packages/email/src/templates/fr/ directory for French templates
  - Create packages/email/src/templates/zh/ directory for Chinese templates
  - Copy and translate all template files to each language directory
  - Create packages/email/src/service/i18n-email.service.ts for language-aware email sending
  - Update packages/email/src/service/email.service.ts to support language parameter
  - Create packages/email/src/utils/language-detector.ts for recipient language detection
  - Create packages/email/src/__tests__/i18n-email.test.ts
  - Test i18n emails: npm test packages/email/src/__tests__/i18n-email.test.ts
  - _Requirements: 6.4_

- [ ] 5.4 Email API Integration
  - Create apps/api/src/trpc/routers/email.ts with sendEmail, previewTemplate, getEmailStatus procedures
  - Copy other-backend/src/controllers/email.controller.ts to analyze email endpoints
  - Copy other-backend/src/routes/email.routes.ts for email route validation
  - Implement adminProcedure for email management and template testing
  - Add email delivery tracking and bounce handling
  - Create email campaign management with bulk sending capabilities
  - Create email analytics tracking (open rates, click rates, bounces)
  - Create apps/api/src/trpc/__tests__/email.test.ts
  - Test email router: npm test apps/api/src/trpc/__tests__/email.test.ts
  - Clean up: Delete copied other-backend email controller and route files
  - _Requirements: 6.7_

- [ ] 6. Frontend Web Application Integration
  - Create comprehensive React components and pages for all migrated functionality
  - Implement responsive designs using Tailwind CSS for desktop, tablet, and mobile
  - Create admin panels with proper role-based access control
  - Integrate all components with tRPC for type-safe API communication
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

- [ ] 6.1 Analytics Dashboard Implementation
  - Create apps/web/src/app/dashboard/analytics/page.tsx with main analytics dashboard
  - Create apps/web/src/components/analytics/dashboard.tsx with analytics overview
  - Create apps/web/src/components/analytics/sales-chart.tsx using Chart.js or Recharts
  - Create apps/web/src/components/analytics/top-products-chart.tsx for product performance
  - Create apps/web/src/components/analytics/metric-card.tsx for KPI display
  - Create apps/web/src/components/analytics/date-range-picker.tsx for date filtering
  - Create apps/web/src/components/analytics/export-button.tsx for data export
  - Create apps/web/src/hooks/use-analytics.ts for analytics data management
  - Add real-time updates using tRPC subscriptions
  - Create apps/web/src/components/analytics/__tests__/ with component tests
  - Test components: npm test apps/web/src/components/analytics/__tests__/
  - _Requirements: 5.1_

- [ ] 6.2 Loyalty Program Web Interface
  - Create apps/web/src/app/loyalty/page.tsx with customer loyalty dashboard
  - Create apps/web/src/components/loyalty/points-card.tsx for points display
  - Create apps/web/src/components/loyalty/tier-progress.tsx for tier visualization
  - Create apps/web/src/components/loyalty/rewards-list.tsx for available rewards
  - Create apps/web/src/components/loyalty/points-history.tsx for transaction history
  - Create apps/web/src/components/loyalty/leaderboard.tsx for points leaderboard
  - Create apps/web/src/app/admin/loyalty/page.tsx for loyalty program administration
  - Create apps/web/src/components/loyalty/admin/program-manager.tsx
  - Create apps/web/src/hooks/use-loyalty.ts for loyalty data management
  - Create apps/web/src/components/loyalty/__tests__/ with component tests
  - Test components: npm test apps/web/src/components/loyalty/__tests__/
  - _Requirements: 5.2_

- [ ] 6.3 A/B Testing Management Interface
  - Create apps/web/src/app/admin/ab-tests/page.tsx with A/B test management dashboard
  - Create apps/web/src/components/ab-test/test-list.tsx for test overview
  - Create apps/web/src/components/ab-test/test-creator.tsx for test creation wizard
  - Create apps/web/src/components/ab-test/variant-editor.tsx for variant configuration
  - Create apps/web/src/components/ab-test/results-dashboard.tsx for test results
  - Create apps/web/src/components/ab-test/statistical-analysis.tsx for significance testing
  - Create apps/web/src/components/ab-test/test-monitor.tsx for real-time monitoring
  - Create apps/web/src/hooks/use-ab-test.ts for A/B test data management
  - Create apps/web/src/components/ab-test/__tests__/ with component tests
  - Test components: npm test apps/web/src/components/ab-test/__tests__/
  - _Requirements: 5.3_

- [ ] 6.4 Vendor Dashboard Implementation
  - Create apps/web/src/app/vendor/page.tsx with vendor dashboard overview
  - Create apps/web/src/components/vendor/analytics-overview.tsx for vendor metrics
  - Create apps/web/src/components/vendor/sales-chart.tsx for vendor sales visualization
  - Create apps/web/src/components/vendor/product-performance.tsx for product analytics
  - Create apps/web/src/components/vendor/payout-history.tsx for payment tracking
  - Create apps/web/src/components/vendor/profile-editor.tsx for vendor profile management
  - Create apps/web/src/app/admin/vendors/page.tsx for vendor administration
  - Create apps/web/src/components/vendor/admin/vendor-manager.tsx
  - Create apps/web/src/hooks/use-vendor.ts for vendor data management
  - Create apps/web/src/components/vendor/__tests__/ with component tests
  - Test components: npm test apps/web/src/components/vendor/__tests__/
  - _Requirements: 5.4_

- [ ] 6.5 Advanced Search Interface
  - Create apps/web/src/components/search/advanced-search.tsx with comprehensive search interface
  - Create apps/web/src/components/search/search-filters.tsx for filter management
  - Create apps/web/src/components/search/search-suggestions.tsx for autocomplete
  - Create apps/web/src/components/search/search-results.tsx for result display
  - Create apps/web/src/components/search/faceted-search.tsx for category facets
  - Create apps/web/src/components/search/search-analytics.tsx for search performance
  - Create apps/web/src/hooks/use-search.ts for search state management
  - Create apps/web/src/hooks/use-search-suggestions.ts for suggestion handling
  - Create apps/web/src/components/search/__tests__/ with component tests
  - Test components: npm test apps/web/src/components/search/__tests__/
  - _Requirements: 5.5_

- [ ] 6.6 Admin Panel and Export Interface
  - Create apps/web/src/app/admin/page.tsx with admin dashboard overview
  - Create apps/web/src/app/admin/exports/page.tsx with data export interface
  - Create apps/web/src/components/admin/export-manager.tsx for export configuration
  - Create apps/web/src/components/admin/bulk-operations.tsx for batch processing
  - Create apps/web/src/components/admin/user-manager.tsx for user administration
  - Create apps/web/src/components/admin/system-monitor.tsx for system health
  - Create apps/web/src/components/admin/settings-manager.tsx for system settings
  - Create apps/web/src/hooks/use-admin.ts for admin functionality
  - Create apps/web/src/components/admin/__tests__/ with component tests
  - Test components: npm test apps/web/src/components/admin/__tests__/
  - _Requirements: 5.6, 5.7_

- [ ] 6.7 Settings and Configuration Interface
  - Create apps/web/src/app/settings/page.tsx with settings management interface
  - Create apps/web/src/components/settings/general-settings.tsx for basic configuration
  - Create apps/web/src/components/settings/email-settings.tsx for email configuration
  - Create apps/web/src/components/settings/notification-settings.tsx for notification preferences
  - Create apps/web/src/components/settings/tax-settings.tsx for tax configuration
  - Create apps/web/src/components/settings/currency-settings.tsx for currency management
  - Create apps/web/src/components/settings/template-manager.tsx for email template management
  - Create apps/web/src/hooks/use-settings.ts for settings data management
  - Create apps/web/src/components/settings/__tests__/ with component tests
  - Test components: npm test apps/web/src/components/settings/__tests__/
  - _Requirements: 5.10_

- [ ] 7. Mobile Application Integration
  - Create React Native screens and components for all major functionality
  - Implement native mobile features using React Native libraries
  - Create mobile-optimized interfaces with proper navigation
  - Integrate with tRPC using @trpc/react-query for mobile
  - _Requirements: 5.8_

- [ ] 7.1 Core Mobile Screens Implementation
  - Create apps/mobile/src/screens/analytics/AnalyticsScreen.tsx with mobile analytics dashboard
  - Create apps/mobile/src/screens/loyalty/LoyaltyScreen.tsx with loyalty program interface
  - Create apps/mobile/src/components/analytics/AnalyticsCard.tsx for metric display
  - Create apps/mobile/src/components/analytics/SalesChart.tsx using react-native-chart-kit
  - Create apps/mobile/src/components/loyalty/PointsCard.tsx for points display
  - Create apps/mobile/src/components/loyalty/RewardsList.tsx for available rewards
  - Create apps/mobile/src/navigation/AnalyticsNavigator.tsx for analytics navigation
  - Create apps/mobile/src/navigation/LoyaltyNavigator.tsx for loyalty navigation
  - Implement pull-to-refresh using RefreshControl component
  - Add offline data caching using AsyncStorage and React Query
  - Create apps/mobile/src/hooks/useAnalytics.ts for mobile analytics data
  - Create apps/mobile/src/hooks/useLoyalty.ts for mobile loyalty data
  - Test screens: npm run test:ios and npm run test:android in apps/mobile
  - _Requirements: 5.8_

- [ ] 7.2 Mobile Push Notifications
  - Install and configure @react-native-firebase/messaging for push notifications
  - Create apps/mobile/src/services/NotificationService.ts for notification handling
  - Create apps/mobile/src/screens/notifications/NotificationSettings.tsx for preferences
  - Create apps/mobile/src/components/notifications/NotificationCard.tsx for notification display
  - Implement deep linking using @react-navigation/native for notification actions
  - Add notification permission handling for iOS and Android
  - Create notification analytics tracking with event logging
  - Configure notification channels for Android and categories for iOS
  - Create apps/mobile/src/utils/notification-utils.ts for notification helpers
  - Test notifications: npm run test:notifications in apps/mobile
  - _Requirements: 5.8_

- [ ] 7.3 Mobile Vendor Interface
  - Create apps/mobile/src/screens/vendor/VendorDashboard.tsx with vendor metrics
  - Create apps/mobile/src/screens/vendor/VendorAnalytics.tsx for vendor performance
  - Create apps/mobile/src/components/vendor/MetricCard.tsx for vendor KPIs
  - Create apps/mobile/src/components/vendor/SalesChart.tsx for vendor sales visualization
  - Install and configure react-native-camera for barcode scanning
  - Create apps/mobile/src/components/vendor/BarcodeScanner.tsx for product scanning
  - Create apps/mobile/src/components/vendor/PhotoUpload.tsx for product images
  - Create apps/mobile/src/screens/vendor/InventoryManager.tsx for mobile inventory
  - Create apps/mobile/src/navigation/VendorNavigator.tsx for vendor navigation
  - Create apps/mobile/src/hooks/useVendor.ts for vendor data management
  - Test vendor features: npm run test:vendor in apps/mobile
  - _Requirements: 5.8_

- [ ] 8. Security and Authentication Enhancement
  - Copy all middleware from other-backend/src/middleware/ to analyze security patterns
  - Implement comprehensive security middleware in apps/api/src/middleware/
  - Create audit trails and security monitoring systems
  - Ensure all tRPC procedures have proper authorization
  - Clean up: Delete copied other-backend middleware files after integration
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ] 8.1 Authentication System Migration
  - Copy other-backend/src/middleware/auth.middleware.ts to analyze JWT implementation
  - Create apps/api/src/middleware/auth.ts adapted for tRPC context
  - Update apps/api/src/trpc/context.ts to include JWT verification and user extraction
  - Create apps/api/src/auth/jwt.ts for token generation and validation
  - Create apps/api/src/auth/refresh-token.ts for refresh token handling
  - Implement role-based access control with adminProcedure, vendorProcedure, protectedProcedure
  - Create apps/api/src/auth/session-manager.ts for user session tracking
  - Add multi-factor authentication support with TOTP
  - Create apps/api/src/auth/__tests__/auth.test.ts
  - Test authentication: npm test apps/api/src/auth/__tests__/
  - Clean up: Delete copied other-backend/src/middleware/auth.middleware.ts
  - _Requirements: 8.1_

- [ ] 8.2 Security Middleware Integration
  - Copy other-backend/src/middleware/request-id.middleware.ts to apps/api/src/middleware/request-id.ts
  - Copy other-backend/src/middleware/validation.middleware.ts and adapt for tRPC
  - Create apps/api/src/middleware/rate-limit.ts using express-rate-limit or similar
  - Create apps/api/src/middleware/security-headers.ts using helmet
  - Update apps/api/src/config/cors.ts with comprehensive CORS configuration
  - Create apps/api/src/middleware/audit-logger.ts for security event tracking
  - Create apps/api/src/middleware/input-sanitizer.ts for request sanitization
  - Implement different rate limits for auth endpoints vs general API
  - Create apps/api/src/middleware/__tests__/security.test.ts
  - Test security middleware: npm test apps/api/src/middleware/__tests__/
  - Clean up: Delete copied other-backend middleware files
  - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 8.3 Vendor Security Implementation
  - Copy other-backend/src/middleware/vendor.middleware.ts to analyze vendor security
  - Create apps/api/src/middleware/vendor.ts for vendor-specific security checks
  - Implement vendor data isolation in all vendor-related repositories
  - Create vendor permission system with granular access controls
  - Add vendor audit trails in apps/api/src/audit/vendor-audit.ts
  - Implement vendor API key management system
  - Create vendor-specific rate limiting and usage monitoring
  - Create apps/api/src/middleware/__tests__/vendor-security.test.ts
  - Test vendor security: npm test apps/api/src/middleware/__tests__/vendor-security.test.ts
  - Clean up: Delete copied other-backend/src/middleware/vendor.middleware.ts
  - _Requirements: 8.7_

- [ ] 9. Monitoring, Logging, and Health Checks
  - Copy other-backend/src/utils/logger.ts and integrate with existing logging system
  - Create comprehensive health check endpoints for all services and dependencies
  - Implement performance monitoring and error tracking systems
  - Create operational dashboards and monitoring tools
  - Clean up: Delete copied other-backend logging files after integration
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ] 9.1 Logging System Integration
  - Copy other-backend/src/utils/logger.ts to analyze Winston configuration
  - Merge with existing packages/shared/src/utils/logger.ts, preserving best features
  - Create packages/shared/src/utils/structured-logger.ts with request correlation IDs
  - Create apps/api/src/middleware/request-logger.ts for API request logging
  - Implement log levels and environment-specific logging configuration
  - Create log rotation and retention policies in infrastructure/docker/
  - Add log aggregation configuration for production environments
  - Create packages/shared/src/utils/__tests__/logger.test.ts
  - Test logging: npm test packages/shared/src/utils/__tests__/logger.test.ts
  - Clean up: Delete copied other-backend/src/utils/logger.ts
  - _Requirements: 9.1, 9.5_

- [ ] 9.2 Health Check Implementation
  - Create apps/api/src/health/health-check.service.ts for comprehensive health monitoring
  - Create apps/api/src/health/database-health.ts for database connection monitoring
  - Create apps/api/src/health/redis-health.ts for Redis connection monitoring
  - Create apps/api/src/health/external-service-health.ts for third-party service monitoring
  - Create apps/api/src/trpc/routers/health.ts with health check endpoints
  - Implement cascade failure detection and dependency mapping
  - Create apps/web/src/app/admin/health/page.tsx for health dashboard
  - Create health check alerting system with email notifications
  - Create apps/api/src/health/__tests__/health-check.test.ts
  - Test health checks: npm test apps/api/src/health/__tests__/
  - _Requirements: 9.2_

- [ ] 9.3 Error Handling and Monitoring
  - Ensure packages/shared/src/utils/api-error.ts is properly integrated from task 1.5
  - Create apps/api/src/middleware/error-handler.ts for global error handling
  - Create apps/api/src/monitoring/error-tracker.ts for error analytics
  - Implement error reporting system with email alerts for critical errors
  - Create error trend analysis and monitoring dashboard
  - Add automated error escalation based on error frequency and severity
  - Create apps/web/src/app/admin/errors/page.tsx for error monitoring interface
  - Create apps/api/src/monitoring/__tests__/error-tracker.test.ts
  - Test error handling: npm test apps/api/src/monitoring/__tests__/
  - _Requirements: 9.3_

- [ ] 9.4 Performance Monitoring
  - Create apps/api/src/monitoring/performance-monitor.ts for API performance tracking
  - Create apps/api/src/monitoring/database-monitor.ts for query performance monitoring
  - Implement slow query detection and optimization recommendations
  - Add API endpoint response time tracking and alerting
  - Create user experience monitoring with Core Web Vitals tracking
  - Implement performance benchmarking and regression detection
  - Create apps/web/src/app/admin/performance/page.tsx for performance dashboard
  - Create apps/api/src/monitoring/__tests__/performance-monitor.test.ts
  - Test performance monitoring: npm test apps/api/src/monitoring/__tests__/
  - _Requirements: 9.6_

- [ ] 10. Testing and Quality Assurance
  - Create comprehensive test suites for all migrated functionality
  - Implement unit, integration, and end-to-end tests across all packages and applications
  - Create performance and load testing for critical operations
  - Validate that all functionality from other-backend works correctly in new architecture
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [ ] 10.1 Unit Test Implementation
  - Create packages/database/src/repositories/__tests__/ with unit tests for all repository classes
  - Create apps/api/src/services/__tests__/ with unit tests for all service classes
  - Create packages/shared/src/utils/__tests__/ with tests for all utility functions
  - Create packages/validation/src/schemas/__tests__/ with validation schema tests
  - Create packages/email/src/__tests__/ with email service and template tests
  - Create packages/i18n/src/__tests__/ with internationalization tests
  - Mock all external dependencies using Jest mocks and test doubles
  - Achieve minimum 80% code coverage for all business logic
  - Run unit tests: npm run test:unit in root directory
  - _Requirements: 10.1_

- [ ] 10.2 Integration Test Suite
  - Create apps/api/src/trpc/__tests__/ with integration tests for all tRPC routers
  - Create tests/integration/database/ with database integration tests
  - Create tests/integration/auth/ with authentication and authorization tests
  - Create tests/integration/email/ with email system integration tests
  - Create tests/integration/cache/ with Redis caching integration tests
  - Set up test database with Docker for isolated integration testing
  - Implement test data factories and fixtures for consistent test data
  - Create data flow tests that validate end-to-end business processes
  - Run integration tests: npm run test:integration in root directory
  - _Requirements: 10.2, 10.4_

- [ ] 10.3 Frontend Testing Implementation
  - Create apps/web/src/components/__tests__/ with React component tests using React Testing Library
  - Create apps/web/src/app/__tests__/ with page component tests
  - Create apps/web/src/hooks/__tests__/ with custom hook tests
  - Create apps/mobile/src/components/__tests__/ with React Native component tests
  - Create apps/mobile/src/screens/__tests__/ with mobile screen tests
  - Implement user interaction tests with fireEvent and userEvent
  - Add accessibility tests using @testing-library/jest-dom and axe-core
  - Create visual regression tests using Storybook and Chromatic
  - Run frontend tests: npm run test:frontend in root directory
  - _Requirements: 10.6_

- [ ] 10.4 End-to-End Testing
  - Create tests/e2e/analytics/ with E2E tests for analytics dashboard workflows
  - Create tests/e2e/loyalty/ with E2E tests for loyalty program user journeys
  - Create tests/e2e/ab-testing/ with E2E tests for A/B testing management
  - Create tests/e2e/vendor/ with E2E tests for vendor dashboard and management
  - Create tests/e2e/admin/ with E2E tests for administrative functions
  - Set up Playwright for cross-browser testing (Chrome, Firefox, Safari)
  - Create mobile E2E tests using Detox for React Native applications
  - Implement performance testing scenarios with load testing tools
  - Run E2E tests: npm run test:e2e in root directory
  - _Requirements: 10.3, 10.7_

- [ ] 10.5 Migration Validation Testing
  - Create tests/migration-validation/ directory for migration validation tests
  - Create tests/migration-validation/feature-parity.test.ts to validate all features work
  - Create tests/migration-validation/data-integrity.test.ts for database migration validation
  - Create tests/migration-validation/api-compatibility.test.ts to ensure API compatibility
  - Create tests/migration-validation/performance-comparison.test.ts to compare performance
  - Create migration checklist with all features from other-backend
  - Implement automated regression tests to prevent functionality loss
  - Create test reports comparing old vs new implementation
  - Run migration validation: npm run test:migration-validation in root directory
  - _Requirements: 10.5, 10.8_

- [ ] 11. Documentation and Cleanup
  - Create comprehensive documentation for all migrated functionality
  - Update API documentation and developer guides
  - Perform final validation and clean up other-backend directory
  - Create migration guide and troubleshooting documentation
  - _Requirements: All requirements validation_

- [ ] 11.1 API Documentation Creation
  - Generate tRPC API documentation using @trpc/openapi for all routers
  - Create docs/api/ directory with comprehensive API documentation
  - Create docs/developer-guides/ with integration guides for each migrated feature
  - Create docs/examples/ with code examples for analytics, loyalty, A/B testing, etc.
  - Update README.md files in all packages with usage instructions
  - Create interactive API documentation using Swagger UI or similar
  - Add code examples for web and mobile integration
  - Create docs/migration-guide.md documenting the migration process
  - _Requirements: Documentation for all migrated features_

- [ Implement in-app help and onboarding flows
  - _Requirements: User experience documentation_

- [ ] 11.3 Migration Validation and Cleanup
  - Perform final validation that all functionality has been successfully migrated
  - Create migration checklist and verification procedures
  - Remove other-backend directory and clean up unused dependencies
  - Update deployment scripts and infrastructure configurations
  - _Requirements: Complete migration validation_

- [ ] 11.4 Performance Optimization
  - Optimize database queries and indexes for migrated functionality
  - Implement caching strategies for frequently accessed data
  - Add performance monitoring and optimization recommendations
  - Create performance benchmarks and comparison with original backend
  - _Requirements: System performance validation_