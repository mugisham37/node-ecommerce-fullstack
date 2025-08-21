import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import NotificationService, { 
  NotificationPayload, 
  NotificationSettings 
} from '../services/NotificationService';

export interface UseNotificationsReturn {
  // Settings
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  
  // Permissions
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  
  // Notifications
  showNotification: (payload: NotificationPayload) => Promise<void>;
  scheduleNotification: (payload: NotificationPayload) => Promise<void>;
  cancelNotification: (id: string) => void;
  cancelAllNotifications: () => void;
  
  // History
  notificationHistory: NotificationPayload[];
  clearHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  
  // Token
  fcmToken: string | null;
  
  // Status
  isInitialized: boolean;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    inventoryAlerts: true,
    orderUpdates: true,
    systemNotifications: true,
    lowStockAlerts: true,
    supplierUpdates: true,
    soundEnabled: true,
    vibrationEnabled: true,
    badgeEnabled: true,
  });
  
  const [hasPermission, setHasPermission] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<NotificationPayload[]>([]);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize notification service
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await NotificationService.initialize();
        
        // Get initial settings
        const initialSettings = NotificationService.getSettings();
        setSettings(initialSettings);
        
        // Get FCM token
        const token = NotificationService.getFCMToken();
        setFcmToken(token);
        
        // Get notification history
        const history = await NotificationService.getNotificationHistory();
        setNotificationHistory(history);
        
        setIsInitialized(true);
        setHasPermission(true); // Assume permission granted if initialization succeeds
        
        console.log('Notifications initialized successfully');
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        setIsInitialized(false);
        setHasPermission(false);
      }
    };

    initializeNotifications();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // The permission request is handled in NotificationService.initialize()
      // This is a wrapper for explicit permission requests
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Enable Notifications',
          'Allow notifications to stay updated with inventory alerts, order updates, and important system messages.',
          [
            { text: 'Not Now', style: 'cancel' },
            { 
              text: 'Enable', 
              onPress: async () => {
                try {
                  await NotificationService.initialize();
                  setHasPermission(true);
                } catch (error) {
                  console.error('Permission request failed:', error);
                  setHasPermission(false);
                }
              }
            },
          ]
        );
      } else {
        // Android permission is handled automatically
        setHasPermission(true);
      }
      
      return hasPermission;
    } catch (error) {
      console.error('Failed to request permission:', error);
      return false;
    }
  }, [hasPermission]);

  // Update notification settings
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    try {
      await NotificationService.updateSettings(newSettings);
      const updatedSettings = NotificationService.getSettings();
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  }, []);

  // Show notification
  const showNotification = useCallback(async (payload: NotificationPayload) => {
    try {
      await NotificationService.showLocalNotification(payload);
      
      // Refresh history
      const history = await NotificationService.getNotificationHistory();
      setNotificationHistory(history);
    } catch (error) {
      console.error('Failed to show notification:', error);
      throw error;
    }
  }, []);

  // Schedule notification
  const scheduleNotification = useCallback(async (payload: NotificationPayload) => {
    try {
      if (!payload.scheduledTime) {
        throw new Error('Scheduled time is required for scheduled notifications');
      }
      
      await NotificationService.scheduleNotification(payload);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }, []);

  // Cancel notification
  const cancelNotification = useCallback((id: string) => {
    try {
      NotificationService.cancelNotification(id);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }, []);

  // Cancel all notifications
  const cancelAllNotifications = useCallback(() => {
    try {
      NotificationService.cancelAllNotifications();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }, []);

  // Clear notification history
  const clearHistory = useCallback(async () => {
    try {
      await NotificationService.clearNotificationHistory();
      setNotificationHistory([]);
    } catch (error) {
      console.error('Failed to clear notification history:', error);
      throw error;
    }
  }, []);

  // Refresh notification history
  const refreshHistory = useCallback(async () => {
    try {
      const history = await NotificationService.getNotificationHistory();
      setNotificationHistory(history);
    } catch (error) {
      console.error('Failed to refresh notification history:', error);
    }
  }, []);

  return {
    // Settings
    settings,
    updateSettings,
    
    // Permissions
    hasPermission,
    requestPermission,
    
    // Notifications
    showNotification,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    
    // History
    notificationHistory,
    clearHistory,
    refreshHistory,
    
    // Token
    fcmToken,
    
    // Status
    isInitialized,
  };
};

export default useNotifications;