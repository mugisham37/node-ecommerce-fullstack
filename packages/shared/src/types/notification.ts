// Notification system types for tRPC compatibility

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any; // JSON object for additional notification data
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType = 
  | 'order_status'
  | 'payment_received'
  | 'payment_failed'
  | 'product_low_stock'
  | 'product_out_of_stock'
  | 'loyalty_points_earned'
  | 'loyalty_tier_upgraded'
  | 'promotion_available'
  | 'system_maintenance'
  | 'account_security'
  | 'vendor_application'
  | 'vendor_payout'
  | 'review_received'
  | 'custom';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  name: string;
  subject: string;
  bodyTemplate: string;
  emailTemplate: string | null;
  pushTemplate: string | null;
  smsTemplate: string | null;
  isActive: boolean;
  variables: string[]; // Array of variable names used in templates
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: NotificationType;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PushNotificationDevice {
  id: string;
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Input types
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export interface SendNotificationInput {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels?: NotificationChannel[];
  scheduleAt?: Date;
}

export interface BulkNotificationInput {
  userFilter?: UserFilter;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels?: NotificationChannel[];
  scheduleAt?: Date;
}

export interface UserFilter {
  role?: string[];
  isActive?: boolean;
  hasOrders?: boolean;
  loyaltyTier?: string[];
  registeredAfter?: Date;
  registeredBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

export type NotificationChannel = 'email' | 'push' | 'sms' | 'in_app';

// Template input types
export interface CreateNotificationTemplateInput {
  type: NotificationType;
  name: string;
  subject: string;
  bodyTemplate: string;
  emailTemplate?: string;
  pushTemplate?: string;
  smsTemplate?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface UpdateNotificationTemplateInput {
  name?: string;
  subject?: string;
  bodyTemplate?: string;
  emailTemplate?: string;
  pushTemplate?: string;
  smsTemplate?: string;
  variables?: string[];
  isActive?: boolean;
}

// Preference input types
export interface UpdateNotificationPreferencesInput {
  preferences: Array<{
    type: NotificationType;
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    inApp?: boolean;
  }>;
}

// Response types
export interface NotificationSummary {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  recent: Notification[];
}

export interface NotificationDeliveryStatus {
  notificationId: string;
  userId: string;
  email?: {
    sent: boolean;
    deliveredAt?: Date;
    error?: string;
  };
  push?: {
    sent: boolean;
    deliveredAt?: Date;
    error?: string;
  };
  sms?: {
    sent: boolean;
    deliveredAt?: Date;
    error?: string;
  };
  inApp: {
    created: boolean;
    createdAt: Date;
  };
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  deliveryRate: number;
  readRate: number;
  byType: Record<NotificationType, {
    sent: number;
    delivered: number;
    read: number;
    deliveryRate: number;
    readRate: number;
  }>;
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    deliveryRate: number;
  }>;
  trend: Array<{
    date: Date;
    sent: number;
    delivered: number;
    read: number;
  }>;
}

// Scheduled notification types
export interface ScheduledNotification {
  id: string;
  userId: string | null; // null for bulk notifications
  userFilter: UserFilter | null;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  channels: NotificationChannel[];
  scheduleAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt: Date | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduledNotificationInput {
  userId?: string;
  userFilter?: UserFilter;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels?: NotificationChannel[];
  scheduleAt: Date;
}

// Push notification specific types
export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  icon?: string;
  image?: string;
  clickAction?: string;
}

export interface RegisterDeviceInput {
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
}