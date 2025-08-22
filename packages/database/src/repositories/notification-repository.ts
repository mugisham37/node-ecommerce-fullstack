import { eq, and, or, desc, asc, sql, gte, lte, inArray, ilike } from 'drizzle-orm';
import { 
  notificationTemplates, 
  notifications, 
  userNotificationPreferences, 
  pushNotificationDevices, 
  notificationCampaigns,
  notificationEvents,
  NotificationTemplate,
  NewNotificationTemplate,
  Notification,
  NewNotification,
  UserNotificationPreferences,
  NewUserNotificationPreferences,
  PushNotificationDevice,
  NewPushNotificationDevice,
  NotificationCampaign,
  NewNotificationCampaign,
  NotificationEvent,
  NewNotificationEvent,
  NotificationType,
  NotificationCategory,
  NotificationStatus,
  NotificationPriority,
  CampaignStatus,
  EventType,
  Platform
} from '../schema/notifications';
import { BaseRepository, FilterOptions, PaginationOptions, PagedResult } from './base/base-repository';
import { DatabaseConnection } from '../connection';

export interface NotificationTemplateFilters extends FilterOptions {
  name?: string;
  type?: string;
  category?: string;
  language?: string;
  isActive?: boolean;
  search?: string;
}

export interface NotificationFilters extends FilterOptions {
  userId?: string;
  type?: string;
  category?: string;
  status?: string;
  priority?: string;
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CampaignFilters extends FilterOptions {
  name?: string;
  type?: string;
  category?: string;
  status?: string;
  createdBy?: string;
  search?: string;
}

export interface NotificationWithTemplate extends Notification {
  template?: NotificationTemplate;
}

export interface CampaignWithStats extends NotificationCampaign {
  stats?: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    unsubscribeRate: number;
  };
}

/**
 * Repository for notification templates
 */
export class NotificationTemplateRepository extends BaseRepository<
  typeof notificationTemplates,
  NotificationTemplate,
  NewNotificationTemplate
> {
  protected table = notificationTemplates;
  protected tableName = 'notification_templates';

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
   * Find template by name
   */
  async findByName(name: string): Promise<NotificationTemplate | null> {
    return await this.findOneBy({ name });
  }

  /**
   * Find templates by type and category
   */
  async findByTypeAndCategory(type: string, category: string): Promise<NotificationTemplate[]> {
    return await this.findBy({ type, category, isActive: true });
  }

  /**
   * Search templates with filters
   */
  async searchTemplates(
    filters: NotificationTemplateFilters,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PagedResult<NotificationTemplate>> {
    if (filters.search) {
      return await this.search(
        {
          query: filters.search,
          searchFields: ['name', 'subject', 'title', 'body'],
        },
        pagination,
        { 
          type: filters.type,
          category: filters.category,
          language: filters.language,
          isActive: filters.isActive 
        }
      );
    }

    return await this.findAll(pagination, filters);
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string, language: string = 'en'): Promise<NotificationTemplate[]> {
    return await this.findBy({ category, language, isActive: true });
  }

  /**
   * Clone template for different language
   */
  async cloneForLanguage(templateId: string, language: string): Promise<NotificationTemplate | null> {
    const template = await this.findById(templateId);
    if (!template) return null;

    const clonedData = {
      ...template,
      name: `${template.name}_${language}`,
      language,
      createdAt: undefined,
      updatedAt: undefined,
    };
    delete clonedData.id;

    return await this.create(clonedData as NewNotificationTemplate);
  }
}/**

 * Repository for notifications
 */
export class NotificationRepository extends BaseRepository<
  typeof notifications,
  Notification,
  NewNotification
> {
  protected table = notifications;
  protected tableName = 'notifications';

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
   * Find user notifications
   */
  async findUserNotifications(
    userId: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PagedResult<Notification>> {
    return await this.findAll(pagination, { 
      userId,
      channel: 'in_app'
    });
  }

  /**
   * Find unread notifications for user
   */
  async findUnreadNotifications(userId: string): Promise<Notification[]> {
    return await this.findBy({ 
      userId, 
      isRead: false,
      channel: 'in_app'
    });
  }

  /**
   * Get notification with template
   */
  async getNotificationWithTemplate(notificationId: string): Promise<NotificationWithTemplate | null> {
    return await this.executeKyselyQuery(async (db) => {
      const result = await db
        .selectFrom('notifications')
        .leftJoin('notification_templates', 'notifications.template_id', 'notification_templates.id')
        .select([
          'notifications.id',
          'notifications.user_id as userId',
          'notifications.template_id as templateId',
          'notifications.type',
          'notifications.category',
          'notifications.subject',
          'notifications.title',
          'notifications.body',
          'notifications.html_body as htmlBody',
          'notifications.recipient',
          'notifications.channel',
          'notifications.status',
          'notifications.priority',
          'notifications.scheduled_for as scheduledFor',
          'notifications.sent_at as sentAt',
          'notifications.delivered_at as deliveredAt',
          'notifications.read_at as readAt',
          'notifications.clicked_at as clickedAt',
          'notifications.is_read as isRead',
          'notifications.is_clicked as isClicked',
          'notifications.failure_reason as failureReason',
          'notifications.retry_count as retryCount',
          'notifications.max_retries as maxRetries',
          'notifications.data',
          'notifications.metadata',
          'notifications.external_id as externalId',
          'notifications.reference_type as referenceType',
          'notifications.reference_id as referenceId',
          'notifications.created_at as createdAt',
          'notifications.updated_at as updatedAt',
          'notification_templates.name as templateName',
          'notification_templates.description as templateDescription',
          'notification_templates.variables as templateVariables',
        ])
        .where('notifications.id', '=', notificationId)
        .executeTakeFirst();

      if (!result) return null;

      return {
        id: result.id,
        userId: result.userId,
        templateId: result.templateId,
        type: result.type,
        category: result.category,
        subject: result.subject,
        title: result.title,
        body: result.body,
        htmlBody: result.htmlBody,
        recipient: result.recipient,
        channel: result.channel,
        status: result.status,
        priority: result.priority,
        scheduledFor: result.scheduledFor,
        sentAt: result.sentAt,
        deliveredAt: result.deliveredAt,
        readAt: result.readAt,
        clickedAt: result.clickedAt,
        isRead: result.isRead,
        isClicked: result.isClicked,
        failureReason: result.failureReason,
        retryCount: result.retryCount,
        maxRetries: result.maxRetries,
        data: result.data,
        metadata: result.metadata,
        externalId: result.externalId,
        referenceType: result.referenceType,
        referenceId: result.referenceId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        template: result.templateName ? {
          id: result.templateId!,
          name: result.templateName,
          description: result.templateDescription,
          variables: result.templateVariables,
        } : undefined,
      } as NotificationWithTemplate;
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification | null> {
    return await this.update(notificationId, {
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Mark notification as clicked
   */
  async markAsClicked(notificationId: string): Promise<Notification | null> {
    return await this.update(notificationId, {
      isClicked: true,
      clickedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Update notification status
   */
  async updateStatus(
    notificationId: string, 
    status: string, 
    failureReason?: string,
    externalId?: string
  ): Promise<Notification | null> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === NotificationStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === NotificationStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (status === NotificationStatus.FAILED && failureReason) {
      updateData.failureReason = failureReason;
    }

    if (externalId) {
      updateData.externalId = externalId;
    }

    return await this.update(notificationId, updateData);
  }

  /**
   * Get pending notifications for sending
   */
  async getPendingNotifications(limit: number = 100): Promise<Notification[]> {
    return await this.executeKyselyQuery(async (db) => {
      const now = new Date();
      
      const notifications = await db
        .selectFrom('notifications')
        .selectAll()
        .where('status', '=', NotificationStatus.PENDING)
        .where((eb) => eb.or([
          eb('scheduled_for', 'is', null),
          eb('scheduled_for', '<=', now)
        ]))
        .orderBy('priority', 'desc')
        .orderBy('created_at', 'asc')
        .limit(limit)
        .execute();

      return notifications.map(n => ({
        id: n.id,
        userId: n.user_id,
        templateId: n.template_id,
        type: n.type,
        category: n.category,
        subject: n.subject,
        title: n.title,
        body: n.body,
        htmlBody: n.html_body,
        recipient: n.recipient,
        channel: n.channel,
        status: n.status,
        priority: n.priority,
        scheduledFor: n.scheduled_for,
        sentAt: n.sent_at,
        deliveredAt: n.delivered_at,
        readAt: n.read_at,
        clickedAt: n.clicked_at,
        isRead: n.is_read,
        isClicked: n.is_clicked,
        failureReason: n.failure_reason,
        retryCount: n.retry_count,
        maxRetries: n.max_retries,
        data: n.data,
        metadata: n.metadata,
        externalId: n.external_id,
        referenceType: n.reference_type,
        referenceId: n.reference_id,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      }));
    });
  }

  /**
   * Get failed notifications for retry
   */
  async getFailedNotificationsForRetry(limit: number = 50): Promise<Notification[]> {
    return await this.executeKyselyQuery(async (db) => {
      const notifications = await db
        .selectFrom('notifications')
        .selectAll()
        .where('status', '=', NotificationStatus.FAILED)
        .where(sql`CAST(retry_count AS INTEGER) < CAST(max_retries AS INTEGER)`)
        .orderBy('created_at', 'asc')
        .limit(limit)
        .execute();

      return notifications.map(n => ({
        id: n.id,
        userId: n.user_id,
        templateId: n.template_id,
        type: n.type,
        category: n.category,
        subject: n.subject,
        title: n.title,
        body: n.body,
        htmlBody: n.html_body,
        recipient: n.recipient,
        channel: n.channel,
        status: n.status,
        priority: n.priority,
        scheduledFor: n.scheduled_for,
        sentAt: n.sent_at,
        deliveredAt: n.delivered_at,
        readAt: n.read_at,
        clickedAt: n.clicked_at,
        isRead: n.is_read,
        isClicked: n.is_clicked,
        failureReason: n.failure_reason,
        retryCount: n.retry_count,
        maxRetries: n.max_retries,
        data: n.data,
        metadata: n.metadata,
        externalId: n.external_id,
        referenceType: n.reference_type,
        referenceId: n.reference_id,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      }));
    });
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(notificationId: string): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('notifications')
        .set({
          retry_count: sql`CAST(retry_count AS INTEGER) + 1`,
          updated_at: new Date(),
        })
        .where('id', '=', notificationId)
        .execute();
    });
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(days: number = 30): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalClicked: number;
    totalFailed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    byChannel: Record<string, { sent: number; delivered: number; read: number }>;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await db
        .selectFrom('notifications')
        .select([
          db.fn.count('id').filterWhere('status', '=', NotificationStatus.SENT).as('totalSent'),
          db.fn.count('id').filterWhere('status', '=', NotificationStatus.DELIVERED).as('totalDelivered'),
          db.fn.count('id').filterWhere('is_read', '=', true).as('totalRead'),
          db.fn.count('id').filterWhere('is_clicked', '=', true).as('totalClicked'),
          db.fn.count('id').filterWhere('status', '=', NotificationStatus.FAILED).as('totalFailed'),
        ])
        .where('created_at', '>=', startDate)
        .executeTakeFirst();

      const channelStats = await db
        .selectFrom('notifications')
        .select([
          'channel',
          db.fn.count('id').filterWhere('status', '=', NotificationStatus.SENT).as('sent'),
          db.fn.count('id').filterWhere('status', '=', NotificationStatus.DELIVERED).as('delivered'),
          db.fn.count('id').filterWhere('is_read', '=', true).as('read'),
        ])
        .where('created_at', '>=', startDate)
        .groupBy('channel')
        .execute();

      const totalSent = Number(stats?.totalSent) || 0;
      const totalDelivered = Number(stats?.totalDelivered) || 0;
      const totalRead = Number(stats?.totalRead) || 0;

      const byChannel: Record<string, { sent: number; delivered: number; read: number }> = {};
      channelStats.forEach(stat => {
        byChannel[stat.channel] = {
          sent: Number(stat.sent),
          delivered: Number(stat.delivered),
          read: Number(stat.read),
        };
      });

      return {
        totalSent,
        totalDelivered: totalDelivered,
        totalRead: totalRead,
        totalClicked: Number(stats?.totalClicked) || 0,
        totalFailed: Number(stats?.totalFailed) || 0,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0,
        clickRate: totalRead > 0 ? (Number(stats?.totalClicked) / totalRead) * 100 : 0,
        byChannel,
      };
    });
  }
}

/**
 * Repository for user notification preferences
 */
export class UserNotificationPreferencesRepository extends BaseRepository<
  typeof userNotificationPreferences,
  UserNotificationPreferences,
  NewUserNotificationPreferences
> {
  protected table = userNotificationPreferences;
  protected tableName = 'user_notification_preferences';

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
   * Find preferences by user ID
   */
  async findByUserId(userId: string): Promise<UserNotificationPreferences | null> {
    return await this.findOneBy({ userId });
  }

  /**
   * Create default preferences for user
   */
  async createDefaultPreferences(userId: string): Promise<UserNotificationPreferences> {
    return await this.create({
      userId,
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      orderNotifications: true,
      marketingNotifications: true,
      systemNotifications: true,
      loyaltyNotifications: true,
      vendorNotifications: true,
      emailFrequency: 'immediate',
      pushFrequency: 'immediate',
      smsFrequency: 'important_only',
      quietHoursEnabled: false,
      groupSimilarNotifications: true,
    } as NewUserNotificationPreferences);
  }

  /**
   * Get or create preferences for user
   */
  async getOrCreatePreferences(userId: string): Promise<UserNotificationPreferences> {
    let preferences = await this.findByUserId(userId);
    
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }
    
    return preferences;
  }

  /**
   * Check if user can receive notification
   */
  async canReceiveNotification(
    userId: string,
    type: string,
    category: string
  ): Promise<boolean> {
    const preferences = await this.getOrCreatePreferences(userId);
    
    // Check channel preference
    switch (type) {
      case NotificationType.EMAIL:
        if (!preferences.emailEnabled) return false;
        break;
      case NotificationType.PUSH:
        if (!preferences.pushEnabled) return false;
        break;
      case NotificationType.SMS:
        if (!preferences.smsEnabled) return false;
        break;
      case NotificationType.IN_APP:
        if (!preferences.inAppEnabled) return false;
        break;
    }

    // Check category preference
    switch (category) {
      case NotificationCategory.ORDER:
        return preferences.orderNotifications;
      case NotificationCategory.MARKETING:
        return preferences.marketingNotifications;
      case NotificationCategory.SYSTEM:
        return preferences.systemNotifications;
      case NotificationCategory.LOYALTY:
        return preferences.loyaltyNotifications;
      case NotificationCategory.VENDOR:
        return preferences.vendorNotifications;
      default:
        return true;
    }
  }

  /**
   * Check if user is in quiet hours
   */
  async isInQuietHours(userId: string): Promise<boolean> {
    const preferences = await this.getOrCreatePreferences(userId);
    
    if (!preferences.quietHoursEnabled || !preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    // Simple time comparison (doesn't handle timezone properly - would need more sophisticated logic)
    return currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd;
  }
}

/**
 * Repository for push notification devices
 */
export class PushNotificationDeviceRepository extends BaseRepository<
  typeof pushNotificationDevices,
  PushNotificationDevice,
  NewPushNotificationDevice
> {
  protected table = pushNotificationDevices;
  protected tableName = 'push_notification_devices';

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
   * Find devices by user ID
   */
  async findByUserId(userId: string): Promise<PushNotificationDevice[]> {
    return await this.findBy({ userId, isActive: true });
  }

  /**
   * Find device by token
   */
  async findByToken(deviceToken: string): Promise<PushNotificationDevice | null> {
    return await this.findOneBy({ deviceToken });
  }

  /**
   * Upsert device
   */
  async upsertDevice(data: {
    userId: string;
    deviceToken: string;
    platform: string;
    deviceId?: string;
    deviceName?: string;
    appVersion?: string;
    osVersion?: string;
    metadata?: any;
  }): Promise<PushNotificationDevice> {
    return await this.executeKyselyQuery(async (db) => {
      const existing = await db
        .selectFrom('push_notification_devices')
        .selectAll()
        .where('user_id', '=', data.userId)
        .where('device_token', '=', data.deviceToken)
        .executeTakeFirst();

      if (existing) {
        const updated = await db
          .updateTable('push_notification_devices')
          .set({
            platform: data.platform,
            device_id: data.deviceId,
            device_name: data.deviceName,
            app_version: data.appVersion,
            os_version: data.osVersion,
            metadata: JSON.stringify(data.metadata),
            is_active: true,
            last_used: new Date(),
            updated_at: new Date(),
          })
          .where('id', '=', existing.id)
          .returningAll()
          .executeTakeFirst();

        return {
          id: updated!.id,
          userId: updated!.user_id,
          deviceToken: updated!.device_token,
          platform: updated!.platform,
          deviceId: updated!.device_id,
          deviceName: updated!.device_name,
          appVersion: updated!.app_version,
          osVersion: updated!.os_version,
          isActive: updated!.is_active,
          lastUsed: updated!.last_used,
          metadata: updated!.metadata,
          createdAt: updated!.created_at,
          updatedAt: updated!.updated_at,
        } as PushNotificationDevice;
      } else {
        const created = await db
          .insertInto('push_notification_devices')
          .values({
            user_id: data.userId,
            device_token: data.deviceToken,
            platform: data.platform,
            device_id: data.deviceId,
            device_name: data.deviceName,
            app_version: data.appVersion,
            os_version: data.osVersion,
            metadata: JSON.stringify(data.metadata),
            is_active: true,
            last_used: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returningAll()
          .executeTakeFirst();

        return {
          id: created!.id,
          userId: created!.user_id,
          deviceToken: created!.device_token,
          platform: created!.platform,
          deviceId: created!.device_id,
          deviceName: created!.device_name,
          appVersion: created!.app_version,
          osVersion: created!.os_version,
          isActive: created!.is_active,
          lastUsed: created!.last_used,
          metadata: created!.metadata,
          createdAt: created!.created_at,
          updatedAt: created!.updated_at,
        } as PushNotificationDevice;
      }
    });
  }

  /**
   * Deactivate device
   */
  async deactivateDevice(deviceToken: string): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('push_notification_devices')
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where('device_token', '=', deviceToken)
        .execute();
    });
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(deviceToken: string): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('push_notification_devices')
        .set({
          last_used: new Date(),
          updated_at: new Date(),
        })
        .where('device_token', '=', deviceToken)
        .execute();
    });
  }

  /**
   * Clean up inactive devices
   */
  async cleanupInactiveDevices(days: number = 90): Promise<number> {
    return await this.executeKyselyQuery(async (db) => {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const result = await db
        .deleteFrom('push_notification_devices')
        .where('is_active', '=', false)
        .where('last_used', '<', cutoff)
        .executeTakeFirst();

      return Number(result.numDeletedRows);
    });
  }
}

/**
 * Repository for notification campaigns
 */
export class NotificationCampaignRepository extends BaseRepository<
  typeof notificationCampaigns,
  NotificationCampaign,
  NewNotificationCampaign
> {
  protected table = notificationCampaigns;
  protected tableName = 'notification_campaigns';

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
   * Find campaign with statistics
   */
  async getCampaignWithStats(campaignId: string): Promise<CampaignWithStats | null> {
    const campaign = await this.findById(campaignId);
    if (!campaign) return null;

    return await this.executeKyselyQuery(async (db) => {
      const stats = await db
        .selectFrom('notification_events')
        .select([
          db.fn.count('id').filterWhere('event_type', '=', EventType.SENT).as('sent'),
          db.fn.count('id').filterWhere('event_type', '=', EventType.DELIVERED).as('delivered'),
          db.fn.count('id').filterWhere('event_type', '=', EventType.READ).as('opened'),
          db.fn.count('id').filterWhere('event_type', '=', EventType.CLICKED).as('clicked'),
          db.fn.count('id').filterWhere('event_type', '=', EventType.UNSUBSCRIBED).as('unsubscribed'),
        ])
        .where('campaign_id', '=', campaignId)
        .executeTakeFirst();

      const sent = Number(stats?.sent) || 0;
      const delivered = Number(stats?.delivered) || 0;
      const opened = Number(stats?.opened) || 0;
      const clicked = Number(stats?.clicked) || 0;
      const unsubscribed = Number(stats?.unsubscribed) || 0;

      return {
        ...campaign,
        stats: {
          deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
          openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
          clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
          unsubscribeRate: delivered > 0 ? (unsubscribed / delivered) * 100 : 0,
        },
      } as CampaignWithStats;
    });
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(campaignId: string, status: string): Promise<NotificationCampaign | null> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === CampaignStatus.RUNNING) {
      updateData.startedAt = new Date();
    } else if (status === CampaignStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    return await this.update(campaignId, updateData);
  }

  /**
   * Update campaign metrics
   */
  async updateCampaignMetrics(campaignId: string, metrics: {
    totalRecipients?: number;
    sentCount?: number;
    deliveredCount?: number;
    readCount?: number;
    clickCount?: number;
    unsubscribeCount?: number;
  }): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      const updates: any = { updated_at: new Date() };
      
      if (metrics.totalRecipients !== undefined) {
        updates.total_recipients = metrics.totalRecipients.toString();
      }
      if (metrics.sentCount !== undefined) {
        updates.sent_count = metrics.sentCount.toString();
      }
      if (metrics.deliveredCount !== undefined) {
        updates.delivered_count = metrics.deliveredCount.toString();
      }
      if (metrics.readCount !== undefined) {
        updates.read_count = metrics.readCount.toString();
      }
      if (metrics.clickCount !== undefined) {
        updates.click_count = metrics.clickCount.toString();
      }
      if (metrics.unsubscribeCount !== undefined) {
        updates.unsubscribe_count = metrics.unsubscribeCount.toString();
      }

      await db
        .updateTable('notification_campaigns')
        .set(updates)
        .where('id', '=', campaignId)
        .execute();
    });
  }

  /**
   * Get scheduled campaigns
   */
  async getScheduledCampaigns(): Promise<NotificationCampaign[]> {
    return await this.executeKyselyQuery(async (db) => {
      const now = new Date();
      
      const campaigns = await db
        .selectFrom('notification_campaigns')
        .selectAll()
        .where('status', '=', CampaignStatus.SCHEDULED)
        .where('scheduled_for', '<=', now)
        .orderBy('scheduled_for', 'asc')
        .execute();

      return campaigns.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        category: c.category,
        templateId: c.template_id,
        subject: c.subject,
        title: c.title,
        body: c.body,
        htmlBody: c.html_body,
        targetAudience: c.target_audience,
        segmentIds: c.segment_ids,
        userIds: c.user_ids,
        status: c.status,
        scheduledFor: c.scheduled_for,
        startedAt: c.started_at,
        completedAt: c.completed_at,
        totalRecipients: c.total_recipients,
        sentCount: c.sent_count,
        deliveredCount: c.delivered_count,
        readCount: c.read_count,
        clickCount: c.click_count,
        unsubscribeCount: c.unsubscribe_count,
        priority: c.priority,
        maxRetries: c.max_retries,
        createdBy: c.created_by,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    });
  }
}

/**
 * Repository for notification events
 */
export class NotificationEventRepository extends BaseRepository<
  typeof notificationEvents,
  NotificationEvent,
  NewNotificationEvent
> {
  protected table = notificationEvents;
  protected tableName = 'notification_events';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'timestamp',
      },
    });
  }

  /**
   * Record notification event
   */
  async recordEvent(data: {
    notificationId: string;
    campaignId?: string;
    eventType: string;
    eventData?: any;
    externalEventId?: string;
    serviceProvider?: string;
    userAgent?: string;
    ipAddress?: string;
    location?: any;
  }): Promise<NotificationEvent> {
    return await this.create(data as NewNotificationEvent);
  }

  /**
   * Get events by notification
   */
  async getEventsByNotification(notificationId: string): Promise<NotificationEvent[]> {
    return await this.findBy({ notificationId });
  }

  /**
   * Get events by campaign
   */
  async getEventsByCampaign(campaignId: string): Promise<NotificationEvent[]> {
    return await this.findBy({ campaignId });
  }

  /**
   * Get event statistics
   */
  async getEventStats(days: number = 30): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByProvider: Record<string, number>;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const totalEvents = await db
        .selectFrom('notification_events')
        .select(db.fn.count('id').as('count'))
        .where('timestamp', '>=', startDate)
        .executeTakeFirst();

      const eventsByType = await db
        .selectFrom('notification_events')
        .select([
          'event_type',
          db.fn.count('id').as('count'),
        ])
        .where('timestamp', '>=', startDate)
        .groupBy('event_type')
        .execute();

      const eventsByProvider = await db
        .selectFrom('notification_events')
        .select([
          'service_provider',
          db.fn.count('id').as('count'),
        ])
        .where('timestamp', '>=', startDate)
        .where('service_provider', 'is not', null)
        .groupBy('service_provider')
        .execute();

      const typeStats: Record<string, number> = {};
      eventsByType.forEach(stat => {
        typeStats[stat.event_type] = Number(stat.count);
      });

      const providerStats: Record<string, number> = {};
      eventsByProvider.forEach(stat => {
        if (stat.service_provider) {
          providerStats[stat.service_provider] = Number(stat.count);
        }
      });

      return {
        totalEvents: Number(totalEvents?.count) || 0,
        eventsByType: typeStats,
        eventsByProvider: providerStats,
      };
    });
  }
}