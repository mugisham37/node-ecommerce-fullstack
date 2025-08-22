import { eq, and, or, desc, asc, sql, gte, lte, inArray, ilike } from 'drizzle-orm';
import { 
  settings, 
  settingHistory, 
  userSettings, 
  featureFlags, 
  configurationTemplates,
  Setting,
  NewSetting,
  SettingHistory,
  NewSettingHistory,
  UserSetting,
  NewUserSetting,
  FeatureFlag,
  NewFeatureFlag,
  ConfigurationTemplate,
  NewConfigurationTemplate,
  SettingType,
  SettingCategory,
  ChangeType,
  FlagType,
  TemplateType
} from '../schema/settings';
import { BaseRepository, FilterOptions, PaginationOptions, PagedResult } from './base/base-repository';
import { DatabaseConnection } from '../connection';

export interface SettingFilters extends FilterOptions {
  key?: string;
  category?: string;
  type?: string;
  isPublic?: boolean;
  isActive?: boolean;
  environment?: string;
  search?: string;
}

export interface SettingHistoryFilters extends FilterOptions {
  settingId?: string;
  settingKey?: string;
  changeType?: string;
  changedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface FeatureFlagFilters extends FilterOptions {
  name?: string;
  key?: string;
  isEnabled?: boolean;
  environment?: string;
  owner?: string;
  search?: string;
}

export interface SettingWithHistory extends Setting {
  history?: SettingHistory[];
}

export interface FeatureFlagEvaluation {
  enabled: boolean;
  value?: any;
  reason: string;
}

/**
 * Repository for application settings
 */
export class SettingsRepository extends BaseRepository<
  typeof settings,
  Setting,
  NewSetting
> {
  protected table = settings;
  protected tableName = 'settings';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find setting by key
   */
  async findByKey(key: string): Promise<Setting | null> {
    return await this.findOneBy({ key });
  }

  /**
   * Get setting value by key
   */
  async getSettingValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    const setting = await this.findByKey(key);
    
    if (!setting || !setting.isActive) {
      return defaultValue as T;
    }

    return setting.value as T;
  }

  /**
   * Set setting value
   */
  async setSettingValue(
    key: string,
    value: any,
    changedBy?: string,
    changeReason?: string
  ): Promise<Setting> {
    const existing = await this.findByKey(key);
    
    if (existing) {
      // Record history before updating
      await this.recordSettingChange(
        existing.id,
        key,
        existing.value,
        value,
        ChangeType.UPDATE,
        changedBy,
        changeReason
      );

      return await this.update(existing.id, {
        value,
        lastModifiedBy: changedBy,
        updatedAt: new Date(),
      }) as Setting;
    } else {
      throw new Error(`Setting with key '${key}' not found`);
    }
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string, environment?: string): Promise<Setting[]> {
    const filters: FilterOptions = { category, isActive: true };
    if (environment) {
      filters.environment = environment;
    }
    
    return await this.findBy(filters);
  }

  /**
   * Get public settings
   */
  async getPublicSettings(environment?: string): Promise<Setting[]> {
    const filters: FilterOptions = { isPublic: true, isActive: true };
    if (environment) {
      filters.environment = environment;
    }
    
    return await this.findBy(filters);
  }

  /**
   * Search settings with filters
   */
  async searchSettings(
    filters: SettingFilters,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PagedResult<Setting>> {
    if (filters.search) {
      return await this.search(
        {
          query: filters.search,
          searchFields: ['key', 'name', 'description'],
        },
        pagination,
        { 
          category: filters.category,
          type: filters.type,
          isPublic: filters.isPublic,
          isActive: filters.isActive,
          environment: filters.environment
        }
      );
    }

    return await this.findAll(pagination, filters);
  }

  /**
   * Get setting with history
   */
  async getSettingWithHistory(settingId: string, historyLimit: number = 10): Promise<SettingWithHistory | null> {
    const setting = await this.findById(settingId);
    if (!setting) return null;

    return await this.executeKyselyQuery(async (db) => {
      const history = await db
        .selectFrom('setting_history')
        .selectAll()
        .where('setting_id', '=', settingId)
        .orderBy('timestamp', 'desc')
        .limit(historyLimit)
        .execute();

      return {
        ...setting,
        history: history.map(h => ({
          id: h.id,
          settingId: h.setting_id,
          settingKey: h.setting_key,
          previousValue: h.previous_value,
          newValue: h.new_value,
          changeType: h.change_type,
          changeReason: h.change_reason,
          changedBy: h.changed_by,
          ipAddress: h.ip_address,
          userAgent: h.user_agent,
          metadata: h.metadata,
          timestamp: h.timestamp,
        })),
      } as SettingWithHistory;
    });
  }

  /**
   * Validate setting value
   */
  async validateSettingValue(key: string, value: any): Promise<{ valid: boolean; errors: string[] }> {
    const setting = await this.findByKey(key);
    if (!setting) {
      return { valid: false, errors: ['Setting not found'] };
    }

    const errors: string[] = [];

    // Type validation
    switch (setting.type) {
      case SettingType.STRING:
        if (typeof value !== 'string') {
          errors.push('Value must be a string');
        }
        break;
      case SettingType.NUMBER:
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push('Value must be a number');
        }
        break;
      case SettingType.BOOLEAN:
        if (typeof value !== 'boolean') {
          errors.push('Value must be a boolean');
        }
        break;
      case SettingType.OBJECT:
        if (typeof value !== 'object' || value === null) {
          errors.push('Value must be an object');
        }
        break;
      case SettingType.ARRAY:
        if (!Array.isArray(value)) {
          errors.push('Value must be an array');
        }
        break;
    }

    // Custom validation rules
    if (setting.validation) {
      const validation = setting.validation as any;
      
      if (validation.min !== undefined && value < validation.min) {
        errors.push(`Value must be at least ${validation.min}`);
      }
      
      if (validation.max !== undefined && value > validation.max) {
        errors.push(`Value must be at most ${validation.max}`);
      }
      
      if (validation.pattern && typeof value === 'string') {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push('Value does not match required pattern');
        }
      }
      
      if (validation.enum && !validation.enum.includes(value)) {
        errors.push(`Value must be one of: ${validation.enum.join(', ')}`);
      }
    }

    // Options validation
    if (setting.options && Array.isArray(setting.options)) {
      const validOptions = (setting.options as any[]).map(opt => 
        typeof opt === 'object' ? opt.value : opt
      );
      if (!validOptions.includes(value)) {
        errors.push(`Value must be one of: ${validOptions.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Record setting change in history
   */
  private async recordSettingChange(
    settingId: string,
    settingKey: string,
    previousValue: any,
    newValue: any,
    changeType: string,
    changedBy?: string,
    changeReason?: string,
    metadata?: any
  ): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .insertInto('setting_history')
        .values({
          setting_id: settingId,
          setting_key: settingKey,
          previous_value: JSON.stringify(previousValue),
          new_value: JSON.stringify(newValue),
          change_type: changeType,
          change_reason: changeReason,
          changed_by: changedBy,
          metadata: JSON.stringify(metadata),
          timestamp: new Date(),
        })
        .execute();
    });
  }

  /**
   * Bulk update settings
   */
  async bulkUpdateSettings(
    updates: Array<{ key: string; value: any }>,
    changedBy?: string,
    changeReason?: string
  ): Promise<Setting[]> {
    const results: Setting[] = [];
    
    for (const update of updates) {
      try {
        const result = await this.setSettingValue(update.key, update.value, changedBy, changeReason);
        results.push(result);
      } catch (error) {
        // Log error but continue with other updates
        console.error(`Failed to update setting ${update.key}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Reset setting to default value
   */
  async resetToDefault(key: string, changedBy?: string): Promise<Setting | null> {
    const setting = await this.findByKey(key);
    if (!setting || !setting.defaultValue) return null;

    return await this.setSettingValue(
      key,
      setting.defaultValue,
      changedBy,
      'Reset to default value'
    );
  }
}/**

 * Repository for setting history
 */
export class SettingHistoryRepository extends BaseRepository<
  typeof settingHistory,
  SettingHistory,
  NewSettingHistory
> {
  protected table = settingHistory;
  protected tableName = 'setting_history';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'timestamp',
      },
    });
  }

  /**
   * Get history by setting ID
   */
  async getHistoryBySettingId(
    settingId: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PagedResult<SettingHistory>> {
    return await this.findAll(pagination, { settingId });
  }

  /**
   * Get history by setting key
   */
  async getHistoryBySettingKey(
    settingKey: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PagedResult<SettingHistory>> {
    return await this.findAll(pagination, { settingKey });
  }

  /**
   * Get recent changes
   */
  async getRecentChanges(days: number = 7, limit: number = 50): Promise<SettingHistory[]> {
    return await this.executeKyselyQuery(async (db) => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const history = await db
        .selectFrom('setting_history')
        .selectAll()
        .where('timestamp', '>=', startDate)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .execute();

      return history.map(h => ({
        id: h.id,
        settingId: h.setting_id,
        settingKey: h.setting_key,
        previousValue: h.previous_value,
        newValue: h.new_value,
        changeType: h.change_type,
        changeReason: h.change_reason,
        changedBy: h.changed_by,
        ipAddress: h.ip_address,
        userAgent: h.user_agent,
        metadata: h.metadata,
        timestamp: h.timestamp,
      }));
    });
  }

  /**
   * Get changes by user
   */
  async getChangesByUser(
    userId: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PagedResult<SettingHistory>> {
    return await this.findAll(pagination, { changedBy: userId });
  }
}

/**
 * Repository for user settings
 */
export class UserSettingsRepository extends BaseRepository<
  typeof userSettings,
  UserSetting,
  NewUserSetting
> {
  protected table = userSettings;
  protected tableName = 'user_settings';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Get user setting by key
   */
  async getUserSetting(userId: string, key: string): Promise<UserSetting | null> {
    return await this.findOneBy({ userId, key });
  }

  /**
   * Get user setting value
   */
  async getUserSettingValue<T = any>(userId: string, key: string, defaultValue?: T): Promise<T> {
    const setting = await this.getUserSetting(userId, key);
    
    if (!setting) {
      return defaultValue as T;
    }

    return setting.value as T;
  }

  /**
   * Set user setting value
   */
  async setUserSettingValue(userId: string, key: string, value: any, category?: string): Promise<UserSetting> {
    const existing = await this.getUserSetting(userId, key);
    
    if (existing) {
      return await this.update(existing.id, {
        value,
        updatedAt: new Date(),
      }) as UserSetting;
    } else {
      return await this.create({
        userId,
        key,
        value,
        category: category || 'general',
        type: this.inferType(value),
      } as NewUserSetting);
    }
  }

  /**
   * Get all user settings
   */
  async getUserSettings(userId: string, category?: string): Promise<UserSetting[]> {
    const filters: FilterOptions = { userId };
    if (category) filters.category = category;
    
    return await this.findBy(filters);
  }

  /**
   * Get user settings by category
   */
  async getUserSettingsByCategory(userId: string, category: string): Promise<UserSetting[]> {
    return await this.findBy({ userId, category });
  }

  /**
   * Bulk update user settings
   */
  async bulkUpdateUserSettings(
    userId: string,
    updates: Array<{ key: string; value: any; category?: string }>
  ): Promise<UserSetting[]> {
    const results: UserSetting[] = [];
    
    for (const update of updates) {
      try {
        const result = await this.setUserSettingValue(userId, update.key, update.value, update.category);
        results.push(result);
      } catch (error) {
        console.error(`Failed to update user setting ${update.key}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Delete user setting
   */
  async deleteUserSetting(userId: string, key: string): Promise<boolean> {
    const setting = await this.getUserSetting(userId, key);
    if (!setting) return false;
    
    return await this.delete(setting.id);
  }

  /**
   * Infer type from value
   */
  private inferType(value: any): string {
    if (typeof value === 'string') return SettingType.STRING;
    if (typeof value === 'number') return SettingType.NUMBER;
    if (typeof value === 'boolean') return SettingType.BOOLEAN;
    if (Array.isArray(value)) return SettingType.ARRAY;
    if (typeof value === 'object') return SettingType.OBJECT;
    return SettingType.STRING;
  }
}

/**
 * Repository for feature flags
 */
export class FeatureFlagRepository extends BaseRepository<
  typeof featureFlags,
  FeatureFlag,
  NewFeatureFlag
> {
  protected table = featureFlags;
  protected tableName = 'feature_flags';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find flag by key
   */
  async findByKey(key: string): Promise<FeatureFlag | null> {
    return await this.findOneBy({ key });
  }

  /**
   * Evaluate feature flag for user
   */
  async evaluateFlag(
    key: string,
    userId?: string,
    userRole?: string,
    environment?: string
  ): Promise<FeatureFlagEvaluation> {
    const flag = await this.findByKey(key);
    
    if (!flag) {
      return {
        enabled: false,
        reason: 'Flag not found',
      };
    }

    // Check if flag is enabled
    if (!flag.isEnabled) {
      return {
        enabled: false,
        reason: 'Flag is disabled',
      };
    }

    // Check environment
    if (flag.environment && environment && flag.environment !== environment) {
      return {
        enabled: false,
        reason: 'Environment mismatch',
      };
    }

    // Check date range
    const now = new Date();
    if (flag.startDate && flag.startDate > now) {
      return {
        enabled: false,
        reason: 'Flag not yet active',
      };
    }
    
    if (flag.endDate && flag.endDate < now) {
      return {
        enabled: false,
        reason: 'Flag has expired',
      };
    }

    // Check user targeting
    if (userId) {
      const targetUsers = flag.targetUsers as string[] || [];
      if (targetUsers.length > 0 && targetUsers.includes(userId)) {
        return {
          enabled: true,
          value: flag.value,
          reason: 'User is in target list',
        };
      }
    }

    // Check role targeting
    if (userRole) {
      const targetRoles = flag.targetRoles as string[] || [];
      if (targetRoles.length > 0 && targetRoles.includes(userRole)) {
        return {
          enabled: true,
          value: flag.value,
          reason: 'User role is targeted',
        };
      }
    }

    // Check rollout percentage
    const rolloutPercentage = parseInt(flag.rolloutPercentage || '0');
    if (rolloutPercentage > 0) {
      // Simple hash-based rollout (in production, use more sophisticated algorithm)
      const hash = this.simpleHash(userId || 'anonymous');
      const userPercentile = hash % 100;
      
      if (userPercentile < rolloutPercentage) {
        return {
          enabled: true,
          value: flag.value,
          reason: `User in rollout (${rolloutPercentage}%)`,
        };
      }
    }

    return {
      enabled: false,
      reason: 'User not in target audience',
    };
  }

  /**
   * Check if feature is enabled for user
   */
  async isEnabled(
    key: string,
    userId?: string,
    userRole?: string,
    environment?: string
  ): Promise<boolean> {
    const evaluation = await this.evaluateFlag(key, userId, userRole, environment);
    return evaluation.enabled;
  }

  /**
   * Get feature flag value
   */
  async getFlagValue<T = any>(
    key: string,
    userId?: string,
    userRole?: string,
    environment?: string,
    defaultValue?: T
  ): Promise<T> {
    const evaluation = await this.evaluateFlag(key, userId, userRole, environment);
    
    if (evaluation.enabled && evaluation.value !== undefined) {
      return evaluation.value as T;
    }
    
    return defaultValue as T;
  }

  /**
   * Search feature flags
   */
  async searchFlags(
    filters: FeatureFlagFilters,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PagedResult<FeatureFlag>> {
    if (filters.search) {
      return await this.search(
        {
          query: filters.search,
          searchFields: ['name', 'key', 'description'],
        },
        pagination,
        { 
          isEnabled: filters.isEnabled,
          environment: filters.environment,
          owner: filters.owner
        }
      );
    }

    return await this.findAll(pagination, filters);
  }

  /**
   * Toggle feature flag
   */
  async toggleFlag(key: string): Promise<FeatureFlag | null> {
    const flag = await this.findByKey(key);
    if (!flag) return null;

    return await this.update(flag.id, {
      isEnabled: !flag.isEnabled,
      updatedAt: new Date(),
    });
  }

  /**
   * Update rollout percentage
   */
  async updateRollout(key: string, percentage: number): Promise<FeatureFlag | null> {
    const flag = await this.findByKey(key);
    if (!flag) return null;

    return await this.update(flag.id, {
      rolloutPercentage: Math.max(0, Math.min(100, percentage)).toString(),
      updatedAt: new Date(),
    });
  }

  /**
   * Get flags by environment
   */
  async getFlagsByEnvironment(environment: string): Promise<FeatureFlag[]> {
    return await this.executeKyselyQuery(async (db) => {
      const flags = await db
        .selectFrom('feature_flags')
        .selectAll()
        .where((eb) => eb.or([
          eb('environment', 'is', null),
          eb('environment', '=', environment)
        ]))
        .orderBy('name', 'asc')
        .execute();

      return flags.map(f => ({
        id: f.id,
        name: f.name,
        key: f.key,
        description: f.description,
        isEnabled: f.is_enabled,
        type: f.type,
        value: f.value,
        rolloutPercentage: f.rollout_percentage,
        targetUsers: f.target_users,
        targetRoles: f.target_roles,
        targetSegments: f.target_segments,
        environment: f.environment,
        conditions: f.conditions,
        startDate: f.start_date,
        endDate: f.end_date,
        tags: f.tags,
        owner: f.owner,
        createdBy: f.created_by,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));
    });
  }

  /**
   * Simple hash function for rollout
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Repository for configuration templates
 */
export class ConfigurationTemplateRepository extends BaseRepository<
  typeof configurationTemplates,
  ConfigurationTemplate,
  NewConfigurationTemplate
> {
  protected table = configurationTemplates;
  protected tableName = 'configuration_templates';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find templates by type
   */
  async findByType(type: string): Promise<ConfigurationTemplate[]> {
    return await this.findBy({ type, isActive: true });
  }

  /**
   * Find default template by type
   */
  async findDefaultByType(type: string): Promise<ConfigurationTemplate | null> {
    return await this.findOneBy({ type, isDefault: true, isActive: true });
  }

  /**
   * Apply template configuration
   */
  async applyTemplate(templateId: string, overrides?: any): Promise<any> {
    const template = await this.findById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    let configuration = template.configuration as any;
    
    // Apply overrides if provided
    if (overrides) {
      configuration = this.mergeConfigurations(configuration, overrides);
    }

    // Validate against schema if available
    if (template.schema) {
      const validation = this.validateConfiguration(configuration, template.schema as any);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
    }

    return configuration;
  }

  /**
   * Validate configuration against schema
   */
  private validateConfiguration(config: any, schema: any): { valid: boolean; errors: string[] } {
    // Simplified validation - in production, use a proper JSON schema validator
    const errors: string[] = [];
    
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in config)) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Merge configurations with deep merge
   */
  private mergeConfigurations(base: any, overrides: any): any {
    const result = { ...base };
    
    for (const key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        if (typeof overrides[key] === 'object' && !Array.isArray(overrides[key]) && overrides[key] !== null) {
          result[key] = this.mergeConfigurations(result[key] || {}, overrides[key]);
        } else {
          result[key] = overrides[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Clone template
   */
  async cloneTemplate(templateId: string, newName: string): Promise<ConfigurationTemplate | null> {
    const template = await this.findById(templateId);
    if (!template) return null;

    const clonedData = {
      ...template,
      name: newName,
      isDefault: false,
      createdAt: undefined,
      updatedAt: undefined,
    };
    delete clonedData.id;

    return await this.create(clonedData as NewConfigurationTemplate);
  }

  /**
   * Set as default template
   */
  async setAsDefault(templateId: string): Promise<ConfigurationTemplate | null> {
    const template = await this.findById(templateId);
    if (!template) return null;

    // First, unset any existing default for this type
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('configuration_templates')
        .set({ is_default: false })
        .where('type', '=', template.type)
        .where('is_default', '=', true)
        .execute();
    });

    // Then set this template as default
    return await this.update(templateId, {
      isDefault: true,
      updatedAt: new Date(),
    });
  }
}