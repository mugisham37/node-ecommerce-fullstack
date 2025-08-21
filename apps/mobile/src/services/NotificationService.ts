import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import PushNotification, { Importance } from 'react-native-push-notification';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorage } from './SecureStorage';

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  type: 'inventory_alert' | 'order_update' | 'system_notification' | 'low_stock' | 'supplier_update';
  priority: 'high' | 'normal' | 'low';
  scheduledTime?: Date;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
  destructive?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  inventoryAlerts: boolean;
  orderUpdates: boolean;
  systemNotifications: boolean;
  lowStockAlerts: boolean;
  supplierUpdates: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  badgeEnabled: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private fcmToken: string | null = null;
  private isInitialized = false;
  private notificationQueue: NotificationPayload[] = [];
  private settings: NotificationSettings = {
    enabled: true,
    inventoryAlerts: true,
    orderUpdates: true,
    systemNotifications: true,
    lowStockAlerts: true,
    supplierUpdates: true,
    soundEnabled: true,
    vibrationEnabled: true,
    badgeEnabled: true,
  };

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load settings from storage
      await this.loadSettings();

      // Request permissions
      await this.requestPermissions();

      // Configure push notifications
      this.configurePushNotifications();

      // Initialize Firebase messaging
      await this.initializeFirebaseMessaging();

      // Set up message handlers
      this.setupMessageHandlers();

      this.isInitialized = true;
      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      } else {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        return enabled;
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  /**
   * Configure push notifications
   */
  private configurePushNotifications(): void {
    PushNotification.configure({
      onRegister: (token) => {
        console.log('Push notification token:', token);
      },
      onNotification: (notification) => {
        this.handleNotificationReceived(notification);
      },
      onAction: (notification) => {
        this.handleNotificationAction(notification);
      },
      onRegistrationError: (error) => {
        console.error('Push notification registration error:', error);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      this.createNotificationChannels();
    }
  }

  /**
   * Create notification channels for Android
   */
  private createNotificationChannels(): void {
    const channels = [
      {
        channelId: 'inventory_alerts',
        channelName: 'Inventory Alerts',
        channelDescription: 'Notifications for inventory-related alerts',
        importance: Importance.HIGH,
      },
      {
        channelId: 'order_updates',
        channelName: 'Order Updates',
        channelDescription: 'Notifications for order status updates',
        importance: Importance.HIGH,
      },
      {
        channelId: 'system_notifications',
        channelName: 'System Notifications',
        channelDescription: 'General system notifications',
        importance: Importance.DEFAULT,
      },
      {
        channelId: 'low_stock',
        channelName: 'Low Stock Alerts',
        channelDescription: 'Notifications for low stock items',
        importance: Importance.HIGH,
      },
      {
        channelId: 'supplier_updates',
        channelName: 'Supplier Updates',
        channelDescription: 'Notifications for supplier-related updates',
        importance: Importance.DEFAULT,
      },
    ];

    channels.forEach(channel => {
      PushNotification.createChannel(channel, () => {
        console.log(`Channel ${channel.channelId} created`);
      });
    });
  }

  /**
   * Initialize Firebase messaging
   */
  private async initializeFirebaseMessaging(): Promise<void> {
    try {
      // Get FCM token
      this.fcmToken = await messaging().getToken();
      console.log('FCM Token:', this.fcmToken);

      // Store token securely
      if (this.fcmToken) {
        await SecureStorage.setItem('fcm_token', this.fcmToken);
      }

      // Listen for token refresh
      messaging().onTokenRefresh(async (token) => {
        console.log('FCM Token refreshed:', token);
        this.fcmToken = token;
        await SecureStorage.setItem('fcm_token', token);
        // TODO: Send updated token to server
      });
    } catch (error) {
      console.error('Firebase messaging initialization failed:', error);
    }
  }

  /**
   * Set up message handlers
   */
  private setupMessageHandlers(): void {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Message handled in the background!', remoteMessage);
      await this.processBackgroundMessage(remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Message received in foreground!', remoteMessage);
      await this.processForegroundMessage(remoteMessage);
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      this.handleNotificationOpened(remoteMessage);
    });

    // Check whether an initial notification is available
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          this.handleNotificationOpened(remoteMessage);
        }
      });
  }

  /**
   * Process background message
   */
  private async processBackgroundMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    const payload = this.parseRemoteMessage(remoteMessage);
    if (payload && this.shouldShowNotification(payload)) {
      await this.showLocalNotification(payload);
    }
  }

  /**
   * Process foreground message
   */
  private async processForegroundMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    const payload = this.parseRemoteMessage(remoteMessage);
    if (payload && this.shouldShowNotification(payload)) {
      await this.showLocalNotification(payload);
    }
  }

  /**
   * Parse remote message to notification payload
   */
  private parseRemoteMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): NotificationPayload | null {
    try {
      const { notification, data } = remoteMessage;
      if (!notification?.title || !notification?.body) return null;

      return {
        id: data?.id || Date.now().toString(),
        title: notification.title,
        body: notification.body,
        data: data || {},
        type: (data?.type as any) || 'system_notification',
        priority: (data?.priority as any) || 'normal',
      };
    } catch (error) {
      console.error('Failed to parse remote message:', error);
      return null;
    }
  }

  /**
   * Show local notification
   */
  public async showLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!this.settings.enabled || !this.shouldShowNotification(payload)) {
      return;
    }

    try {
      const channelId = this.getChannelId(payload.type);
      
      PushNotification.localNotification({
        id: payload.id,
        title: payload.title,
        message: payload.body,
        channelId,
        userInfo: payload.data,
        actions: payload.actions?.map(action => action.title) || [],
        playSound: this.settings.soundEnabled,
        vibrate: this.settings.vibrationEnabled,
        priority: payload.priority === 'high' ? 'high' : 'default',
        importance: payload.priority === 'high' ? 'high' : 'default',
        when: payload.scheduledTime?.getTime(),
      });

      // Store notification in history
      await this.storeNotificationHistory(payload);
    } catch (error) {
      console.error('Failed to show local notification:', error);
    }
  }

  /**
   * Schedule notification
   */
  public async scheduleNotification(payload: NotificationPayload): Promise<void> {
    if (!payload.scheduledTime) {
      throw new Error('Scheduled time is required for scheduled notifications');
    }

    try {
      const channelId = this.getChannelId(payload.type);
      
      PushNotification.localNotificationSchedule({
        id: payload.id,
        title: payload.title,
        message: payload.body,
        channelId,
        userInfo: payload.data,
        actions: payload.actions?.map(action => action.title) || [],
        playSound: this.settings.soundEnabled,
        vibrate: this.settings.vibrationEnabled,
        date: payload.scheduledTime,
      });

      console.log(`Notification scheduled for ${payload.scheduledTime}`);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Cancel notification
   */
  public cancelNotification(notificationId: string): void {
    PushNotification.cancelLocalNotification(notificationId);
  }

  /**
   * Cancel all notifications
   */
  public cancelAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
  }

  /**
   * Get notification history
   */
  public async getNotificationHistory(): Promise<NotificationPayload[]> {
    try {
      const history = await AsyncStorage.getItem('notification_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  /**
   * Clear notification history
   */
  public async clearNotificationHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem('notification_history');
    } catch (error) {
      console.error('Failed to clear notification history:', error);
    }
  }

  /**
   * Update notification settings
   */
  public async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  }

  /**
   * Get notification settings
   */
  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Get FCM token
   */
  public getFCMToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Private helper methods
   */
  private async loadSettings(): Promise<void> {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        this.settings = { ...this.settings, ...JSON.parse(settings) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  private shouldShowNotification(payload: NotificationPayload): boolean {
    if (!this.settings.enabled) return false;

    switch (payload.type) {
      case 'inventory_alert':
        return this.settings.inventoryAlerts;
      case 'order_update':
        return this.settings.orderUpdates;
      case 'system_notification':
        return this.settings.systemNotifications;
      case 'low_stock':
        return this.settings.lowStockAlerts;
      case 'supplier_update':
        return this.settings.supplierUpdates;
      default:
        return true;
    }
  }

  private getChannelId(type: NotificationPayload['type']): string {
    switch (type) {
      case 'inventory_alert':
        return 'inventory_alerts';
      case 'order_update':
        return 'order_updates';
      case 'system_notification':
        return 'system_notifications';
      case 'low_stock':
        return 'low_stock';
      case 'supplier_update':
        return 'supplier_updates';
      default:
        return 'system_notifications';
    }
  }

  private async storeNotificationHistory(payload: NotificationPayload): Promise<void> {
    try {
      const history = await this.getNotificationHistory();
      const updatedHistory = [
        { ...payload, receivedAt: new Date().toISOString() },
        ...history.slice(0, 99), // Keep last 100 notifications
      ];
      await AsyncStorage.setItem('notification_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to store notification history:', error);
    }
  }

  private handleNotificationReceived(notification: any): void {
    console.log('Notification received:', notification);
    // Handle notification received logic
  }

  private handleNotificationAction(notification: any): void {
    console.log('Notification action:', notification);
    // Handle notification action logic
  }

  private handleNotificationOpened(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    console.log('Notification opened:', remoteMessage);
    // Handle navigation based on notification data
    const { data } = remoteMessage;
    if (data?.screen) {
      // TODO: Navigate to specific screen
    }
  }
}

export default NotificationService.getInstance();