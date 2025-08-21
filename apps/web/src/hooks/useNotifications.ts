'use client';

import { useCallback, useEffect } from 'react';
import { useNotifications as useNotificationStore, Notification } from '@/store/notificationStore';
import { useWebSocket, useRealtimeNotifications } from './useWebSocket';
import { useToast } from '@/components/notifications/ToastProvider';

export interface NotificationHookOptions {
  enableToastNotifications?: boolean;
  enableRealtimeSync?: boolean;
  autoMarkAsReadDelay?: number;
}

export const useNotifications = (options: NotificationHookOptions = {}) => {
  const {
    enableToastNotifications = true,
    enableRealtimeSync = true,
    autoMarkAsReadDelay = 5000,
  } = options;

  const notificationStore = useNotificationStore();
  const { isConnected } = useWebSocket({ autoConnect: enableRealtimeSync });
  const toast = useToast();

  // Handle real-time notifications from WebSocket
  const handleRealtimeNotification = useCallback((data: any) => {
    let notification: Partial<Notification>;

    switch (data.type) {
      case 'notification':
        notification = {
          type: data.type || 'info',
          title: data.title,
          message: data.message,
          category: data.category || 'system',
          priority: data.priority || 'medium',
          userId: data.userId,
          metadata: data.metadata,
          actionUrl: data.actionUrl,
          actionLabel: data.actionLabel,
        };
        break;

      case 'inventory_update':
        notification = {
          type: 'info',
          title: 'Inventory Updated',
          message: `${data.productName} stock changed from ${data.oldQuantity} to ${data.newQuantity}`,
          category: 'inventory',
          priority: data.newQuantity <= 10 ? 'high' : 'medium',
          metadata: {
            productId: data.productId,
            changeType: data.changeType,
            oldQuantity: data.oldQuantity,
            newQuantity: data.newQuantity,
          },
          actionUrl: `/dashboard/inventory?product=${data.productId}`,
          actionLabel: 'View Product',
        };
        break;

      case 'order_status':
        notification = {
          type: getOrderStatusNotificationType(data.newStatus),
          title: 'Order Status Updated',
          message: `Order #${data.orderNumber} status changed to ${data.newStatus}`,
          category: 'order',
          priority: ['cancelled', 'failed'].includes(data.newStatus.toLowerCase()) ? 'high' : 'medium',
          metadata: {
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            oldStatus: data.oldStatus,
            newStatus: data.newStatus,
          },
          actionUrl: `/dashboard/orders/${data.orderId}`,
          actionLabel: 'View Order',
        };
        break;

      default:
        notification = {
          type: 'info',
          title: 'System Notification',
          message: data.message || 'You have a new notification',
          category: 'system',
          priority: 'low',
        };
    }

    // Add to notification store
    notificationStore.addNotification(notification);

    // Show toast notification if enabled
    if (enableToastNotifications) {
      showToastNotification(notification, toast);
    }
  }, [notificationStore, enableToastNotifications, toast]);

  // Set up real-time notification listener
  useRealtimeNotifications(handleRealtimeNotification);

  // Auto-mark notifications as read after delay
  useEffect(() => {
    if (autoMarkAsReadDelay > 0) {
      const unreadNotifications = notificationStore.getUnreadNotifications();
      
      unreadNotifications.forEach(notification => {
        const timeElapsed = Date.now() - notification.timestamp;
        const remainingTime = autoMarkAsReadDelay - timeElapsed;
        
        if (remainingTime > 0) {
          setTimeout(() => {
            notificationStore.markAsRead(notification.id);
          }, remainingTime);
        } else {
          // Already past the delay, mark as read immediately
          notificationStore.markAsRead(notification.id);
        }
      });
    }
  }, [notificationStore.notifications, autoMarkAsReadDelay, notificationStore]);

  // Notification management functions
  const createNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string,
    options?: Partial<Notification>
  ) => {
    const notification: Partial<Notification> = {
      type,
      title,
      message,
      category: 'user',
      priority: 'medium',
      ...options,
    };

    notificationStore.addNotification(notification);

    if (enableToastNotifications) {
      showToastNotification(notification, toast);
    }
  }, [notificationStore, enableToastNotifications, toast]);

  // Convenience methods
  const success = useCallback((title: string, message: string, options?: Partial<Notification>) => {
    createNotification('success', title, message, options);
  }, [createNotification]);

  const error = useCallback((title: string, message: string, options?: Partial<Notification>) => {
    createNotification('error', title, message, options);
  }, [createNotification]);

  const warning = useCallback((title: string, message: string, options?: Partial<Notification>) => {
    createNotification('warning', title, message, options);
  }, [createNotification]);

  const info = useCallback((title: string, message: string, options?: Partial<Notification>) => {
    createNotification('info', title, message, options);
  }, [createNotification]);

  // Inventory-specific notifications
  const notifyInventoryUpdate = useCallback((
    productName: string,
    oldQuantity: number,
    newQuantity: number,
    changeType: string
  ) => {
    const isLowStock = newQuantity <= 10;
    const notification: Partial<Notification> = {
      type: isLowStock ? 'warning' : 'info',
      title: isLowStock ? 'Low Stock Alert' : 'Inventory Updated',
      message: `${productName} stock ${changeType}: ${oldQuantity} → ${newQuantity}${isLowStock ? ' (Low Stock!)' : ''}`,
      category: 'inventory',
      priority: isLowStock ? 'high' : 'medium',
    };

    notificationStore.addNotification(notification);

    if (enableToastNotifications) {
      showToastNotification(notification, toast);
    }
  }, [notificationStore, enableToastNotifications, toast]);

  // Order-specific notifications
  const notifyOrderUpdate = useCallback((
    orderNumber: string,
    status: string,
    message?: string
  ) => {
    const notification: Partial<Notification> = {
      type: getOrderStatusNotificationType(status),
      title: 'Order Update',
      message: message || `Order #${orderNumber} is now ${status}`,
      category: 'order',
      priority: ['cancelled', 'failed'].includes(status.toLowerCase()) ? 'high' : 'medium',
    };

    notificationStore.addNotification(notification);

    if (enableToastNotifications) {
      showToastNotification(notification, toast);
    }
  }, [notificationStore, enableToastNotifications, toast]);

  return {
    // Store state and actions
    ...notificationStore,
    
    // Connection state
    isRealtimeConnected: isConnected,
    
    // Notification creation methods
    createNotification,
    success,
    error,
    warning,
    info,
    
    // Domain-specific methods
    notifyInventoryUpdate,
    notifyOrderUpdate,
  };
};

// Utility functions
const getOrderStatusNotificationType = (status: string): Notification['type'] => {
  const lowerStatus = status.toLowerCase();
  
  if (['completed', 'delivered', 'shipped'].includes(lowerStatus)) {
    return 'success';
  }
  
  if (['cancelled', 'failed', 'rejected'].includes(lowerStatus)) {
    return 'error';
  }
  
  if (['pending', 'processing', 'delayed'].includes(lowerStatus)) {
    return 'warning';
  }
  
  return 'info';
};

const showToastNotification = (
  notification: Partial<Notification>,
  toast: ReturnType<typeof useToast>
) => {
  const { type = 'info', title, message } = notification;
  
  switch (type) {
    case 'success':
      toast.success(title, message);
      break;
    case 'error':
      toast.error(title, message);
      break;
    case 'warning':
      toast.warning(title, message);
      break;
    case 'info':
    default:
      toast.info(title, message);
      break;
  }
};

// Hook for specific notification types
export const useInventoryNotifications = () => {
  const { notifyInventoryUpdate, getNotificationsByCategory } = useNotifications();
  
  return {
    notifyInventoryUpdate,
    inventoryNotifications: getNotificationsByCategory('inventory'),
  };
};

export const useOrderNotifications = () => {
  const { notifyOrderUpdate, getNotificationsByCategory } = useNotifications();
  
  return {
    notifyOrderUpdate,
    orderNotifications: getNotificationsByCategory('order'),
  };
};

// Hook for notification settings management
export const useNotificationSettings = () => {
  const { settings, updateSettings } = useNotificationStore();
  
  const toggleCategory = useCallback((category: keyof typeof settings.categories) => {
    updateSettings({
      categories: {
        ...settings.categories,
        [category]: !settings.categories[category],
      },
    });
  }, [settings.categories, updateSettings]);
  
  const togglePriority = useCallback((priority: keyof typeof settings.priorities) => {
    updateSettings({
      priorities: {
        ...settings.priorities,
        [priority]: !settings.priorities[priority],
      },
    });
  }, [settings.priorities, updateSettings]);
  
  const setQuietHours = useCallback((quietHours: Partial<typeof settings.quietHours>) => {
    updateSettings({
      quietHours: {
        ...settings.quietHours,
        ...quietHours,
      },
    });
  }, [settings.quietHours, updateSettings]);
  
  return {
    settings,
    updateSettings,
    toggleCategory,
    togglePriority,
    setQuietHours,
  };
};