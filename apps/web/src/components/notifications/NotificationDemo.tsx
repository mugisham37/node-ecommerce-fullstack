'use client';

import { useState } from 'react';
import { useToast } from './ToastProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationCenter } from './NotificationCenter';

export const NotificationDemo = () => {
  const toast = useToast();
  const notifications = useNotifications({
    enableToastNotifications: true,
    enableRealtimeSync: false, // Disable for demo since WebSocket server isn't running
  });

  const [demoMessage, setDemoMessage] = useState('');

  const handleToastDemo = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: { title: 'Success!', description: 'Operation completed successfully.' },
      error: { title: 'Error!', description: 'Something went wrong. Please try again.' },
      warning: { title: 'Warning!', description: 'Please review your input before proceeding.' },
      info: { title: 'Info', description: 'Here is some useful information for you.' },
    };

    const message = messages[type];
    toast[type](message.title, message.description);
  };

  const handleNotificationDemo = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: { title: 'Order Completed', message: 'Your order #12345 has been successfully processed.' },
      error: { title: 'Payment Failed', message: 'Unable to process payment. Please check your card details.' },
      warning: { title: 'Low Stock Alert', message: 'Product "Wireless Headphones" is running low (5 items left).' },
      info: { title: 'System Update', message: 'A new version of the application is available.' },
    };

    const notification = messages[type];
    notifications[type](notification.title, notification.message, {
      category: type === 'warning' ? 'inventory' : type === 'error' ? 'order' : 'system',
      priority: type === 'error' ? 'high' : 'medium',
      actionUrl: type === 'warning' ? '/dashboard/inventory' : undefined,
      actionLabel: type === 'warning' ? 'View Inventory' : undefined,
    });
  };

  const handleCustomNotification = () => {
    if (!demoMessage.trim()) return;

    notifications.info('Custom Notification', demoMessage, {
      category: 'user',
      priority: 'low',
    });
    setDemoMessage('');
  };

  const simulateRealtimeUpdates = () => {
    // Simulate inventory update
    setTimeout(() => {
      notifications.notifyInventoryUpdate('Wireless Mouse', 25, 8, 'sale');
    }, 1000);

    // Simulate order update
    setTimeout(() => {
      notifications.notifyOrderUpdate('ORD-2024-001', 'shipped', 'Your order is on its way!');
    }, 2000);

    // Simulate system notification
    setTimeout(() => {
      notifications.info('System Maintenance', 'Scheduled maintenance will begin at 2:00 AM UTC.', {
        category: 'system',
        priority: 'medium',
      });
    }, 3000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Real-Time Notifications Demo</h1>
        <p className="text-gray-600">
          Test the notification system with toast messages and persistent notifications.
        </p>
      </div>

      {/* Notification Center */}
      <div className="mb-8 flex justify-end">
        <NotificationCenter />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Toast Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Toast Notifications</h2>
          <p className="text-gray-600 mb-4">
            Temporary notifications that appear in the top-right corner and auto-dismiss.
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleToastDemo('success')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Success Toast
            </button>
            <button
              onClick={() => handleToastDemo('error')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Error Toast
            </button>
            <button
              onClick={() => handleToastDemo('warning')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Warning Toast
            </button>
            <button
              onClick={() => handleToastDemo('info')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Info Toast
            </button>
          </div>

          <div className="mt-4">
            <button
              onClick={() => toast.dismissAll()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Dismiss All Toasts
            </button>
          </div>
        </div>

        {/* Persistent Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Persistent Notifications</h2>
          <p className="text-gray-600 mb-4">
            Notifications that persist in the notification center until dismissed.
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleNotificationDemo('success')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Order Success
            </button>
            <button
              onClick={() => handleNotificationDemo('error')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Payment Error
            </button>
            <button
              onClick={() => handleNotificationDemo('warning')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Low Stock
            </button>
            <button
              onClick={() => handleNotificationDemo('info')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              System Info
            </button>
          </div>
        </div>

        {/* Custom Notification */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Custom Notification</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={demoMessage}
              onChange={(e) => setDemoMessage(e.target.value)}
              placeholder="Enter your custom message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCustomNotification}
              disabled={!demoMessage.trim()}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Send Custom Notification
            </button>
          </div>
        </div>

        {/* Real-time Simulation */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Real-time Simulation</h2>
          <p className="text-gray-600 mb-4">
            Simulate real-time notifications that would come from WebSocket connections.
          </p>
          
          <button
            onClick={simulateRealtimeUpdates}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Simulate Real-time Updates
          </button>
        </div>
      </div>

      {/* Notification Stats */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Notification Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{notifications.notifications.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{notifications.unreadCount}</div>
            <div className="text-sm text-gray-600">Unread</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {notifications.getNotificationsByCategory('inventory').length}
            </div>
            <div className="text-sm text-gray-600">Inventory</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {notifications.getNotificationsByCategory('order').length}
            </div>
            <div className="text-sm text-gray-600">Orders</div>
          </div>
        </div>

        <div className="mt-4 flex space-x-4">
          <button
            onClick={notifications.markAllAsRead}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Mark All Read
          </button>
          <button
            onClick={notifications.clearReadNotifications}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear Read
          </button>
          <button
            onClick={notifications.clearAllNotifications}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};