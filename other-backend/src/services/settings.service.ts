import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { getCache, setCache } from '../config/redis'
import { ApiError } from '../utils/api-error'
import {
  SettingValue,
  CreateSettingInput,
  UpdateSettingInput,
  SettingGroupResult,
  BulkUpdateSettingInput,
  ImportExportResult,
  ValidationResult,
  jsonValueToString,
  parseJsonValue,
  validateSettingType,
  serializeValue
} from '../types/settings.types'

// Cache TTL in seconds
const CACHE_TTL = {
  SETTINGS: 3600, // 1 hour
  SETTINGS_GROUP: 3600, // 1 hour
  ALL_SETTINGS: 7200, // 2 hours
}

/**
 * Get setting by key with caching and type safety
 * @param key Setting key
 * @param defaultValue Default value if setting not found
 * @param requestId Request ID for logging
 * @returns Setting value
 */
export const getSetting = async <T>(
  key: string,
  defaultValue: T,
  requestId?: string
): Promise<T> => {
  const logger = createRequestLogger(requestId || 'settings-get')
  logger.info(`Getting setting: ${key}`)

  // Try to get from cache
  const cacheKey = `setting:${key}`
  const cachedValue = await getCache<T>(cacheKey)

  if (cachedValue !== null && cachedValue !== undefined) {
    logger.info(`Retrieved setting from cache: ${key}`)
    return cachedValue
  }

  try {
    // Get setting from database
    const setting = await prisma.setting.findUnique({
      where: { key },
    })

    if (!setting) {
      logger.info(`Setting not found, using default value: ${key}`)
      return defaultValue
    }

    // Parse the value based on type
    const parsedValue = parseJsonValue<T>(setting.value)

    // Cache setting
    await setCache(cacheKey, parsedValue, CACHE_TTL.SETTINGS)

    return parsedValue
  } catch (error: any) {
    logger.error(`Error getting setting: ${error.message}`)
    return defaultValue
  }
}

/**
 * Set setting with automatic type serialization
 * @param key Setting key
 * @param value Setting value
 * @param description Setting description
 * @param group Setting group
 * @param isPublic Whether setting is publicly accessible
 * @param requestId Request ID for logging
 * @returns Updated setting
 */
export const setSetting = async (
  key: string,
  value: any,
  description?: string | null,
  group?: string | null,
  isPublic = false,
  requestId?: string,
): Promise<SettingValue> => {
  const logger = createRequestLogger(requestId || 'settings-set')
  logger.info(`Setting setting: ${key}`)

  try {
    // Serialize value to JsonValue
    const serializedValue = serializeValue(value)

    // Update or create setting
    const setting = await prisma.setting.upsert({
      where: { key },
      update: {
        value: serializedValue,
        description: description || null,
        group: group || null,
        isPublic,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: serializedValue,
        description: description || null,
        group: group || 'general',
        isPublic,
      },
    })

    // Clear cache
    await Promise.all([
      setCache(`setting:${key}`, null, 1),
      setCache(`settings:group:${group || 'general'}`, null, 1),
      setCache('settings:all', null, 1),
      setCache('settings:public', null, 1),
    ])

    return {
      ...setting,
      parsedValue: parseJsonValue(setting.value)
    }
  } catch (error: any) {
    logger.error(`Error setting setting: ${error.message}`)
    throw new ApiError(`Failed to set setting: ${error.message}`, 500)
  }
}

/**
 * Get settings by group
 * @param group Setting group
 * @param requestId Request ID for logging
 * @returns Settings in group
 */
export const getSettingsByGroup = async (group: string, requestId?: string): Promise<SettingValue[]> => {
  const logger = createRequestLogger(requestId || 'settings-group')
  logger.info(`Getting settings for group: ${group}`)

  // Try to get from cache
  const cacheKey = `settings:group:${group}`
  const cachedSettings = await getCache<SettingValue[]>(cacheKey)

  if (cachedSettings) {
    logger.info(`Retrieved settings from cache for group: ${group}`)
    return cachedSettings
  }

  try {
    // Get settings from database
    const settings = await prisma.setting.findMany({
      where: { group },
      orderBy: { key: 'asc' },
    })

    // Parse values
    const parsedSettings: SettingValue[] = settings.map(setting => ({
      ...setting,
      parsedValue: parseJsonValue(setting.value)
    }))

    // Cache settings
    await setCache(cacheKey, parsedSettings, CACHE_TTL.SETTINGS_GROUP)

    return parsedSettings
  } catch (error: any) {
    logger.error(`Error getting settings by group: ${error.message}`)
    throw new ApiError(`Failed to get settings: ${error.message}`, 500)
  }
}

/**
 * Get all settings
 * @param includePrivate Whether to include private settings
 * @param requestId Request ID for logging
 * @returns All settings
 */
export const getAllSettings = async (includePrivate = true, requestId?: string): Promise<SettingValue[]> => {
  const logger = createRequestLogger(requestId || 'settings-all')
  logger.info(`Getting all settings, includePrivate: ${includePrivate}`)

  // Try to get from cache
  const cacheKey = includePrivate ? 'settings:all' : 'settings:public'
  const cachedSettings = await getCache<SettingValue[]>(cacheKey)

  if (cachedSettings) {
    logger.info('Retrieved all settings from cache')
    return cachedSettings
  }

  try {
    // Build where clause
    const where: Prisma.SettingWhereInput = {}
    if (!includePrivate) {
      where.isPublic = true
    }

    // Get settings from database
    const settings = await prisma.setting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { group: 'asc' }, { key: 'asc' }],
    })

    // Parse values
    const parsedSettings: SettingValue[] = settings.map(setting => ({
      ...setting,
      parsedValue: parseJsonValue(setting.value)
    }))

    // Cache settings
    await setCache(cacheKey, parsedSettings, CACHE_TTL.ALL_SETTINGS)

    return parsedSettings
  } catch (error: any) {
    logger.error(`Error getting all settings: ${error.message}`)
    throw new ApiError(`Failed to get settings: ${error.message}`, 500)
  }
}

/**
 * Get public settings (for frontend)
 * @param requestId Request ID for logging
 * @returns Public settings
 */
export const getPublicSettings = async (requestId?: string): Promise<Record<string, any>> => {
  const logger = createRequestLogger(requestId || 'settings-public')
  logger.info('Getting public settings')

  try {
    const settings = await getAllSettings(false, requestId)
    
    // Convert to key-value object
    const settingsObject: Record<string, any> = {}
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.parsedValue
    })

    return settingsObject
  } catch (error: any) {
    logger.error(`Error getting public settings: ${error.message}`)
    throw error
  }
}

/**
 * Delete setting
 * @param key Setting key
 * @param requestId Request ID for logging
 * @returns Deleted setting
 */
export const deleteSetting = async (key: string, requestId?: string): Promise<SettingValue> => {
  const logger = createRequestLogger(requestId || 'settings-delete')
  logger.info(`Deleting setting: ${key}`)

  try {
    // Find setting first to get group info
    const setting = await prisma.setting.findUnique({
      where: { key },
    })

    if (!setting) {
      throw new ApiError('Setting not found', 404)
    }

    // Delete setting
    const deletedSetting = await prisma.setting.delete({
      where: { key },
    })

    // Clear cache
    await Promise.all([
      setCache(`setting:${key}`, null, 1),
      setCache(`settings:group:${setting.group || 'general'}`, null, 1),
      setCache('settings:all', null, 1),
      setCache('settings:public', null, 1),
    ])

    return {
      ...deletedSetting,
      parsedValue: parseJsonValue(deletedSetting.value)
    }
  } catch (error: any) {
    logger.error(`Error deleting setting: ${error.message}`)
    throw error
  }
}

/**
 * Bulk update settings
 * @param settings Array of settings to update
 * @param requestId Request ID for logging
 * @returns Updated settings
 */
export const bulkUpdateSettings = async (
  settings: BulkUpdateSettingInput[],
  requestId?: string,
): Promise<SettingValue[]> => {
  const logger = createRequestLogger(requestId || 'settings-bulk-update')
  logger.info(`Bulk updating ${settings.length} settings`)

  try {
    const updatedSettings: SettingValue[] = []

    // Process settings in transaction
    await prisma.$transaction(async (tx) => {
      for (const settingData of settings) {
        const serializedValue = serializeValue(settingData.value)

        const setting = await tx.setting.upsert({
          where: { key: settingData.key },
          update: {
            value: serializedValue,
            description: settingData.description || null,
            group: settingData.group || null,
            isPublic: settingData.isPublic ?? false,
            updatedAt: new Date(),
          },
          create: {
            key: settingData.key,
            value: serializedValue,
            description: settingData.description || null,
            group: settingData.group || 'general',
            isPublic: settingData.isPublic ?? false,
          },
        })

        updatedSettings.push({
          ...setting,
          parsedValue: parseJsonValue(setting.value)
        })
      }
    })

    // Clear all settings cache
    await invalidateAllSettingsCache()

    return updatedSettings
  } catch (error: any) {
    logger.error(`Error bulk updating settings: ${error.message}`)
    throw new ApiError(`Failed to bulk update settings: ${error.message}`, 500)
  }
}

/**
 * Get settings by keys
 * @param keys Array of setting keys
 * @param requestId Request ID for logging
 * @returns Settings object
 */
export const getSettingsByKeys = async (
  keys: string[],
  requestId?: string,
): Promise<Record<string, any>> => {
  const logger = createRequestLogger(requestId || 'settings-by-keys')
  logger.info(`Getting settings by keys: ${keys.join(', ')}`)

  try {
    const settingsObject: Record<string, any> = {}

    // Get each setting (will use cache if available)
    await Promise.all(
      keys.map(async (key) => {
        try {
          const value = await getSetting(key, null, requestId)
          if (value !== null) {
            settingsObject[key] = value
          }
        } catch (error: any) {
          logger.error(`Error getting setting ${key}: ${error.message}`)
        }
      })
    )

    return settingsObject
  } catch (error: any) {
    logger.error(`Error getting settings by keys: ${error.message}`)
    throw new ApiError(`Failed to get settings: ${error.message}`, 500)
  }
}

/**
 * Initialize default settings
 * @param requestId Request ID for logging
 */
export const initializeDefaultSettings = async (requestId?: string): Promise<void> => {
  const logger = createRequestLogger(requestId || 'settings-init')
  logger.info('Initializing default settings')

  try {
    // Define default settings
    const defaultSettings: CreateSettingInput[] = [
      // General settings
      {
        key: 'site.name',
        value: 'E-Commerce Store',
        description: 'Site name displayed in header and emails',
        group: 'general',
        isPublic: true,
      },
      {
        key: 'site.description',
        value: 'Your one-stop shop for everything',
        description: 'Site description for SEO',
        group: 'general',
        isPublic: true,
      },
      {
        key: 'site.logo',
        value: '/images/logo.png',
        description: 'Site logo URL',
        group: 'general',
        isPublic: true,
      },
      {
        key: 'site.favicon',
        value: '/favicon.ico',
        description: 'Site favicon URL',
        group: 'general',
        isPublic: true,
      },
      {
        key: 'site.timezone',
        value: 'UTC',
        description: 'Default timezone for the application',
        group: 'general',
        isPublic: false,
      },

      // Loyalty program settings
      {
        key: 'loyalty.enabled',
        value: true,
        description: 'Enable loyalty program',
        group: 'loyalty',
        isPublic: true,
      },
      {
        key: 'loyalty.pointsPerCurrency',
        value: 1,
        description: 'Number of loyalty points awarded per currency unit spent',
        group: 'loyalty',
        isPublic: true,
      },
      {
        key: 'loyalty.pointsExpiryDays',
        value: 365,
        description: 'Number of days after which loyalty points expire',
        group: 'loyalty',
        isPublic: false,
      },
      {
        key: 'loyalty.referralBonus.referrer',
        value: 500,
        description: 'Bonus points awarded to the referrer',
        group: 'loyalty',
        isPublic: false,
      },
      {
        key: 'loyalty.referralBonus.referee',
        value: 100,
        description: 'Bonus points awarded to the new user (referee)',
        group: 'loyalty',
        isPublic: false,
      },
      {
        key: 'loyalty.firstPurchaseBonus',
        value: 100,
        description: 'Bonus points awarded for first purchase',
        group: 'loyalty',
        isPublic: false,
      },
      {
        key: 'loyalty.reviewBonus',
        value: 50,
        description: 'Bonus points awarded for writing a review',
        group: 'loyalty',
        isPublic: false,
      },
      {
        key: 'loyalty.birthdayBonus',
        value: 100,
        description: 'Bonus points awarded on user birthday',
        group: 'loyalty',
        isPublic: false,
      },

      // Email settings
      {
        key: 'email.fromName',
        value: 'E-Commerce Store',
        description: 'Default sender name for emails',
        group: 'email',
        isPublic: false,
      },
      {
        key: 'email.fromAddress',
        value: 'noreply@example.com',
        description: 'Default sender email address',
        group: 'email',
        isPublic: false,
      },
      {
        key: 'email.replyTo',
        value: 'support@example.com',
        description: 'Reply-to email address',
        group: 'email',
        isPublic: false,
      },

      // Payment settings
      {
        key: 'payment.currency',
        value: 'USD',
        description: 'Default currency for payments',
        group: 'payment',
        isPublic: true,
      },
      {
        key: 'payment.taxRate',
        value: 0.08,
        description: 'Default tax rate (as decimal)',
        group: 'payment',
        isPublic: true,
      },
      {
        key: 'payment.freeShippingThreshold',
        value: 50,
        description: 'Minimum order amount for free shipping',
        group: 'payment',
        isPublic: true,
      },

      // Shipping settings
      {
        key: 'shipping.defaultRate',
        value: 5.99,
        description: 'Default shipping rate',
        group: 'shipping',
        isPublic: true,
      },
      {
        key: 'shipping.expeditedRate',
        value: 12.99,
        description: 'Expedited shipping rate',
        group: 'shipping',
        isPublic: true,
      },

      // Security settings
      {
        key: 'security.passwordMinLength',
        value: 8,
        description: 'Minimum password length',
        group: 'security',
        isPublic: true,
      },
      {
        key: 'security.sessionTimeout',
        value: 3600,
        description: 'Session timeout in seconds',
        group: 'security',
        isPublic: false,
      },
      {
        key: 'security.maxLoginAttempts',
        value: 5,
        description: 'Maximum login attempts before lockout',
        group: 'security',
        isPublic: false,
      },

      // Feature flags
      {
        key: 'features.reviews',
        value: true,
        description: 'Enable product reviews',
        group: 'features',
        isPublic: true,
      },
      {
        key: 'features.wishlist',
        value: true,
        description: 'Enable wishlist functionality',
        group: 'features',
        isPublic: true,
      },
      {
        key: 'features.recommendations',
        value: true,
        description: 'Enable product recommendations',
        group: 'features',
        isPublic: true,
      },
      {
        key: 'features.abTesting',
        value: false,
        description: 'Enable A/B testing',
        group: 'features',
        isPublic: false,
      },

      // Analytics settings
      {
        key: 'analytics.enabled',
        value: true,
        description: 'Enable analytics tracking',
        group: 'analytics',
        isPublic: false,
      },
      {
        key: 'analytics.retentionDays',
        value: 730,
        description: 'Number of days to retain analytics data',
        group: 'analytics',
        isPublic: false,
      },

      // Maintenance settings
      {
        key: 'maintenance.mode',
        value: false,
        description: 'Enable maintenance mode',
        group: 'maintenance',
        isPublic: true,
      },
      {
        key: 'maintenance.message',
        value: 'We are currently performing maintenance. Please check back soon.',
        description: 'Maintenance mode message',
        group: 'maintenance',
        isPublic: true,
      },
    ]

    // Create or update default settings
    for (const setting of defaultSettings) {
      // Check if setting exists
      const existingSetting = await prisma.setting.findUnique({
        where: { key: setting.key },
      })

      if (!existingSetting) {
        // Create setting
        await setSetting(
          setting.key,
          setting.value,
          setting.description,
          setting.group,
          setting.isPublic,
          requestId
        )
        logger.info(`Created default setting: ${setting.key}`)
      }
    }

    logger.info('Default settings initialized')
  } catch (error: any) {
    logger.error(`Error initializing default settings: ${error.message}`)
    throw new ApiError(`Failed to initialize default settings: ${error.message}`, 500)
  }
}

/**
 * Export settings to JSON
 * @param includePrivate Whether to include private settings
 * @param requestId Request ID for logging
 * @returns Settings as JSON string
 */
export const exportSettings = async (includePrivate = false, requestId?: string): Promise<string> => {
  const logger = createRequestLogger(requestId || 'settings-export')
  logger.info(`Exporting settings, includePrivate: ${includePrivate}`)

  try {
    const settings = await getAllSettings(includePrivate, requestId)
    
    // Convert to exportable format
    const exportData = {
      exportedAt: new Date().toISOString(),
      includePrivate,
      settings: settings.map(setting => ({
        key: setting.key,
        value: setting.parsedValue,
        description: setting.description,
        group: setting.group,
        isPublic: setting.isPublic,
      })),
    }

    return JSON.stringify(exportData, null, 2)
  } catch (error: any) {
    logger.error(`Error exporting settings: ${error.message}`)
    throw new ApiError(`Failed to export settings: ${error.message}`, 500)
  }
}

/**
 * Import settings from JSON
 * @param jsonData Settings JSON data
 * @param overwriteExisting Whether to overwrite existing settings
 * @param requestId Request ID for logging
 * @returns Import results
 */
export const importSettings = async (
  jsonData: string,
  overwriteExisting = false,
  requestId?: string,
): Promise<ImportExportResult> => {
  const logger = createRequestLogger(requestId || 'settings-import')
  logger.info(`Importing settings, overwriteExisting: ${overwriteExisting}`)

  try {
    // Parse JSON data
    const importData = JSON.parse(jsonData)
    
    if (!importData.settings || !Array.isArray(importData.settings)) {
      throw new ApiError('Invalid settings data format', 400)
    }

    const results: ImportExportResult = {
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [],
    }

    // Process each setting
    for (const settingData of importData.settings) {
      try {
        // Check if setting exists
        const existingSetting = await prisma.setting.findUnique({
          where: { key: settingData.key },
        })

        if (existingSetting && !overwriteExisting) {
          results.skipped++
          results.details.push({
            key: settingData.key,
            status: 'skipped',
            message: 'Setting already exists',
          })
          continue
        }

        // Import setting
        await setSetting(
          settingData.key,
          settingData.value,
          settingData.description,
          settingData.group,
          settingData.isPublic,
          requestId
        )

        results.imported++
        results.details.push({
          key: settingData.key,
          status: 'imported',
        })
      } catch (error: any) {
        results.errors++
        results.details.push({
          key: settingData.key,
          status: 'error',
          message: error.message,
        })
      }
    }

    logger.info(`Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors} errors`)
    return results
  } catch (error: any) {
    logger.error(`Error importing settings: ${error.message}`)
    throw new ApiError(`Failed to import settings: ${error.message}`, 500)
  }
}

/**
 * Get setting groups
 * @param requestId Request ID for logging
 * @returns Array of setting groups with counts
 */
export const getSettingGroups = async (requestId?: string): Promise<SettingGroupResult[]> => {
  const logger = createRequestLogger(requestId || 'settings-groups')
  logger.info('Getting setting groups')

  try {
    // Get groups with counts using category instead of group for now
    const groups = await prisma.setting.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
      orderBy: {
        category: 'asc',
      },
    })

    // Add descriptions for known groups
    const groupDescriptions: Record<string, string> = {
      general: 'General site settings',
      loyalty: 'Loyalty program configuration',
      email: 'Email service settings',
      payment: 'Payment and pricing settings',
      shipping: 'Shipping configuration',
      security: 'Security and authentication settings',
      features: 'Feature flags and toggles',
      analytics: 'Analytics and tracking settings',
      maintenance: 'Maintenance mode settings',
    }

    return groups.map(group => ({
      group: group.category,
      count: group._count.id,
      description: groupDescriptions[group.category],
    }))
  } catch (error: any) {
    logger.error(`Error getting setting groups: ${error.message}`)
    throw new ApiError(`Failed to get setting groups: ${error.message}`, 500)
  }
}

/**
 * Get settings with metadata (including private info for admin use)
 * @param category Optional category filter
 * @param group Optional group filter
 * @param requestId Request ID for logging
 * @returns Settings with metadata
 */
export const getSettingsWithMetadata = async (
  category?: string,
  group?: string,
  requestId?: string
): Promise<Array<SettingValue & { valueAsString: string }>> => {
  const logger = createRequestLogger(requestId || 'settings-metadata')
  logger.info('Getting settings with metadata')

  try {
    const where: Prisma.SettingWhereInput = {}
    if (category) where.category = category
    if (group) where.group = group

    const settings = await prisma.setting.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { group: 'asc' },
        { key: 'asc' }
      ],
    })

    return settings.map(setting => ({
      ...setting,
      parsedValue: parseJsonValue(setting.value),
      valueAsString: jsonValueToString(setting.value),
    }))
  } catch (error: any) {
    logger.error(`Error getting settings with metadata: ${error.message}`)
    throw new ApiError(`Failed to get settings with metadata: ${error.message}`, 500)
  }
}

/**
 * Invalidate all settings cache
 */
const invalidateAllSettingsCache = async (): Promise<void> => {
  const logger = createRequestLogger('settings-cache-invalidate')
  logger.info('Invalidating all settings cache')

  try {
    // Get all settings to clear individual caches
    const settings = await prisma.setting.findMany({
      select: { key: true, group: true },
    })

    // Clear individual setting caches
    const cacheKeys = settings.map(setting => `setting:${setting.key}`)
    
    // Clear group caches
    const groups = [...new Set(settings.map(setting => setting.group || 'general'))]
    const groupCacheKeys = groups.map(group => `settings:group:${group}`)

    // Clear all caches
    await Promise.all([
      ...cacheKeys.map(key => setCache(key, null, 1)),
      ...groupCacheKeys.map(key => setCache(key, null, 1)),
      setCache('settings:all', null, 1),
      setCache('settings:public', null, 1),
    ])

    logger.info('Settings cache invalidated')
  } catch (error: any) {
    logger.error(`Error invalidating settings cache: ${error.message}`)
  }
}

/**
 * Validate setting value
 * @param key Setting key
 * @param value Setting value
 * @returns Validation result
 */
export const validateSetting = (key: string, value: any): ValidationResult => {
  // Define validation rules for specific settings
  const validationRules: Record<string, (value: any) => ValidationResult> = {
    'loyalty.pointsPerCurrency': (value) => {
      const num = Number(value)
      return {
        valid: !isNaN(num) && num >= 0,
        message: 'Points per currency must be a non-negative number',
      }
    },
    'loyalty.pointsExpiryDays': (value) => {
      const num = Number(value)
      return {
        valid: !isNaN(num) && num > 0,
        message: 'Points expiry days must be a positive number',
      }
    },
    'payment.taxRate': (value) => {
      const num = Number(value)
      return {
        valid: !isNaN(num) && num >= 0 && num <= 1,
        message: 'Tax rate must be a number between 0 and 1',
      }
    },
    'security.passwordMinLength': (value) => {
      const num = Number(value)
      return {
        valid: !isNaN(num) && num >= 4 && num <= 128,
        message: 'Password minimum length must be between 4 and 128',
      }
    },
    'email.fromAddress': (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return {
        valid: typeof value === 'string' && emailRegex.test(value),
        message: 'Must be a valid email address',
      }
    },
  }

  // Check if there's a specific validation rule
  if (validationRules[key]) {
    return validationRules[key](value)
  }

  // Default validation (just check if value is not null/undefined)
  return {
    valid: value !== null && value !== undefined,
    message: 'Value cannot be null or undefined',
  }
}
