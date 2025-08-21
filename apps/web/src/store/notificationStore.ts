'use client';

import { create } from 'zustand';
// Note: persist middleware would be imported from 'zustand/middleware' in a real implementation
// For demo purposes, we'll create a simple version
const persist = (config: any, options: any) => config;

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  userId?: string;
  metadata?: Record<string, any>;
  category?: 'system' | 'inventory' | 'order' | 'user' | 'security';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationFilters {
  type?: Notification['type'][];
  category?: Notification['category'][];
  priority?: Notification['priority'][];
  read?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface NotificationSettings {
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  enableSoundNotifications: boolean;
  categories: {
    system: boolean;
    inventory: boolean;
    order: boolean;
    user: boolean;
    security: boolean;
  };
  priorities: {
    low: boolean;
    medium: boolean;
    high: boolean;
    urgent: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
}

interface NotificationState {
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // UI State
  isNotificationCenterOpen: boolean;
  filters: NotificationFilters;
  settings: NotificationSettings;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  clearReadNotifications: () => void;
  
  // UI Actions
  toggleNotificationCenter: () => void;
  setNotificationCenterOpen: (open: boolean) => void;
  setFilters: (filters: Partial<NotificationFilters>) => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  
  // Getters
  getFilteredNotifications: () => Notification[];
  getNotificationsByCategory: (category: Notification['category']) => Notification[];
  getUnreadNotifications: () => Notification[];
}

const defaultSettings: NotificationSettings = {
  enablePushNotifications: true,
  enableEmailNotifications: true,
  enableSoundNotifications: true,
  categories: {
    system: true,
    inventory: true,
    order: true,
    user: true,
    security: true,
  },
  priorities: {
    low: true,
    medium: true,
    high: true,
    urgent: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      isNotificationCenterOpen: false,
      filters: {},
      settings: defaultSettings,

      // Actions
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          read: false,
        };

        set((state) => {
          const notifications = [newNotification, ...state.notifications];
          const unreadCount = notifications.filter(n => !n.read).length;
          
          return {
            notifications,
            unreadCount,
          };
        });

        // Play sound if enabled and not in quiet hours
        const { settings } = get();
        if (settings.enableSoundNotifications && !isInQuietHours(settings.quietHours)) {
          playNotificationSound(notification.priority || 'medium');
        }
      },

      markAsRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
          );
          const unreadCount = notifications.filter(n => !n.read).length;
          
          return {
            notifications,
            unreadCount,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(notification => ({
            ...notification,
            read: true,
          })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notifications = state.notifications.filter(n => n.id !== id);
          const unreadCount = notifications.filter(n => !n.read).length;
          
          return {
            notifications,
            unreadCount,
          };
        });
      },

      clearAllNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      clearReadNotifications: () => {
        set((state) => {
          const notifications = state.notifications.filter(n => !n.read);
          return {
            notifications,
            unreadCount: notifications.length,
          };
        });
      },

      // UI Actions
      toggleNotificationCenter: () => {
        set((state) => ({
          isNotificationCenterOpen: !state.isNotificationCenterOpen,
        }));
      },

      setNotificationCenterOpen: (open) => {
        set({ isNotificationCenterOpen: open });
      },

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      // Getters
      getFilteredNotifications: () => {
        const { notifications, filters } = get();
        
        return notifications.filter(notification => {
          // Filter by type
          if (filters.type && filters.type.length > 0) {
            if (!filters.type.includes(notification.type)) return false;
          }
          
          // Filter by category
          if (filters.category && filters.category.length > 0) {
            if (!notification.category || !filters.category.includes(notification.category)) return false;
          }
          
          // Filter by priority
          if (filters.priority && filters.priority.length > 0) {
            if (!notification.priority || !filters.priority.includes(notification.priority)) return false;
          }
          
          // Filter by read status
          if (filters.read !== undefined) {
            if (notification.read !== filters.read) return false;
          }
          
          // Filter by date range
          if (filters.dateRange) {
            const notificationDate = new Date(notification.timestamp);
            if (notificationDate < filters.dateRange.start || notificationDate > filters.dateRange.end) {
              return false;
            }
          }
          
          return true;
        });
      },

      getNotificationsByCategory: (category) => {
        const { notifications } = get();
        return notifications.filter(n => n.category === category);
      },

      getUnreadNotifications: () => {
        const { notifications } = get();
        return notifications.filter(n => !n.read);
      },
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({
        notifications: state.notifications,
        settings: state.settings,
      }),
    }
  )
);

// Utility functions
const isInQuietHours = (quietHours: NotificationSettings['quietHours']): boolean => {
  if (!quietHours.enabled) return false;
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const start = quietHours.start;
  const end = quietHours.end;
  
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }
  
  // Handle same-day quiet hours (e.g., 12:00 to 14:00)
  return currentTime >= start && currentTime <= end;
};

const playNotificationSound = (priority: Notification['priority']) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Create different sounds for different priorities
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different priorities
    const frequencies = {
      low: 400,
      medium: 600,
      high: 800,
      urgent: 1000,
    };
    
    oscillator.frequency.setValueAtTime(frequencies[priority || 'medium'], audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

// Hook for easier notification management
export const useNotifications = () => {
  const store = useNotificationStore();
  
  return {
    ...store,
    
    // Convenience methods
    success: (title: string, message: string, options?: Partial<Notification>) => {
      store.addNotification({
        type: 'success',
        title,
        message,
        category: 'system',
        priority: 'medium',
        ...options,
      });
    },
    
    error: (title: string, message: string, options?: Partial<Notification>) => {
      store.addNotification({
        type: 'error',
        title,
        message,
        category: 'system',
        priority: 'high',
        ...options,
      });
    },
    
    warning: (title: string, message: string, options?: Partial<Notification>) => {
      store.addNotification({
        type: 'warning',
        title,
        message,
        category: 'system',
        priority: 'medium',
        ...options,
      });
    },
    
    info: (title: string, message: string, options?: Partial<Notification>) => {
      store.addNotification({
        type: 'info',
        title,
        message,
        category: 'system',
        priority: 'low',
        ...options,
      });
    },
  };
};