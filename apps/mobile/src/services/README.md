# Mobile Services - Push Notifications and Offline Support

This directory contains the core services for mobile push notifications and offline data synchronization.

## Services Overview

### NotificationService
Handles all push notification functionality including:
- Firebase Cloud Messaging (FCM) integration
- Local notifications
- Notification scheduling
- Permission management
- Notification history
- Settings management

**Key Features:**
- Cross-platform support (iOS/Android)
- Notification channels for Android
- Background message handling
- Notification actions and interactions
- Customizable notification settings

### OfflineStorage
Manages offline data storage and caching:
- SQLite database for persistent storage
- MMKV for fast key-value storage
- Data versioning and conflict detection
- Sync queue management
- Cache optimization

**Key Features:**
- Dual storage system (SQLite + MMKV)
- Data integrity with checksums
- Automatic cleanup of old data
- Conflict resolution support
- Storage statistics and monitoring

### SyncService
Handles data synchronization between local and server:
- Network status monitoring
- Automatic sync when online
- Background synchronization
- Conflict resolution
- Retry mechanisms

**Key Features:**
- Intelligent sync scheduling
- Batch processing for efficiency
- Network-aware synchronization
- Conflict detection and resolution
- Progress tracking and status updates

## Usage Examples

### Basic Notification Usage

```typescript
import NotificationService from '../services/NotificationService';

// Initialize the service
await NotificationService.initialize();

// Show a notification
await NotificationService.showLocalNotification({
  id: 'inventory-alert-1',
  title: 'Low Stock Alert',
  body: 'Product XYZ is running low on stock',
  type: 'low_stock',
  priority: 'high',
});

// Schedule a notification
await NotificationService.scheduleNotification({
  id: 'reminder-1',
  title: 'Daily Inventory Check',
  body: 'Time to check your inventory levels',
  type: 'system_notification',
  priority: 'normal',
  scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
});
```

### Offline Storage Usage

```typescript
import OfflineStorage from '../services/OfflineStorage';

// Initialize storage
await OfflineStorage.initialize();

// Store data offline
await OfflineStorage.storeData({
  id: 'product-123',
  type: 'product',
  data: { name: 'Widget', price: 29.99, stock: 50 },
  syncStatus: 'pending',
  lastModified: Date.now(),
});

// Retrieve data
const product = await OfflineStorage.getData('product-123');

// Add to sync queue
await OfflineStorage.addToSyncQueue({
  id: 'sync-product-123',
  action: 'update',
  type: 'product',
  data: product.data,
  maxRetries: 3,
  priority: 'normal',
});
```

### Sync Service Usage

```typescript
import SyncService from '../services/SyncService';

// Initialize sync service
await SyncService.initialize();

// Start manual sync
await SyncService.startSync({
  forceSync: true,
  syncTypes: ['product', 'inventory'],
  batchSize: 10,
});

// Listen for sync status changes
SyncService.addSyncListener((status) => {
  console.log('Sync status:', status);
});

// Listen for conflicts
SyncService.addConflictListener((conflict) => {
  console.log('Sync conflict detected:', conflict);
});
```

### Using Hooks

```typescript
import { useNotifications, useOfflineSync } from '../hooks';

function MyComponent() {
  const {
    settings,
    updateSettings,
    showNotification,
    hasPermission,
    requestPermission,
  } = useNotifications();

  const {
    isOnline,
    isSyncing,
    syncProgress,
    startSync,
    storeOfflineData,
    conflicts,
    resolveConflict,
  } = useOfflineSync();

  // Component logic here...
}
```

## Configuration

### Firebase Setup

1. Add your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) files
2. Configure Firebase project with FCM enabled
3. Set up server-side FCM token management

### Notification Channels (Android)

The service automatically creates these notification channels:
- `inventory_alerts` - High priority inventory notifications
- `order_updates` - High priority order status updates
- `system_notifications` - Default priority system messages
- `low_stock` - High priority low stock alerts
- `supplier_updates` - Default priority supplier notifications

### Storage Configuration

Default storage settings:
- Max cache size: 100MB
- Max retries: 3
- Sync interval: 30 seconds
- Compression: Enabled
- Encryption: Enabled

## Security Considerations

1. **Data Encryption**: Sensitive data is encrypted using MMKV's built-in encryption
2. **Token Security**: FCM tokens are stored securely using react-native-keychain
3. **Data Validation**: All data is validated before storage and sync
4. **Network Security**: All API calls use HTTPS and proper authentication

## Performance Optimization

1. **Lazy Loading**: Services are initialized only when needed
2. **Batch Processing**: Sync operations are batched for efficiency
3. **Cache Management**: Automatic cleanup of old and unnecessary data
4. **Background Processing**: Heavy operations run in background threads
5. **Memory Management**: Proper cleanup and garbage collection

## Troubleshooting

### Common Issues

1. **Notifications not appearing**:
   - Check permissions are granted
   - Verify Firebase configuration
   - Check notification settings

2. **Sync not working**:
   - Verify network connectivity
   - Check authentication status
   - Review sync queue for errors

3. **Storage issues**:
   - Check available device storage
   - Verify database initialization
   - Review storage statistics

### Debug Mode

Enable debug logging by setting:
```typescript
// In your app initialization
console.log('Debug mode enabled');
```

## Testing

### Unit Tests
Run unit tests for services:
```bash
npm test -- --testPathPattern=services
```

### Integration Tests
Test offline/online scenarios:
```bash
npm run test:integration
```

### Manual Testing
1. Test notifications in foreground/background
2. Test offline data storage and sync
3. Test conflict resolution scenarios
4. Test network connectivity changes

## Dependencies

### Core Dependencies
- `@react-native-firebase/app` - Firebase core
- `@react-native-firebase/messaging` - FCM messaging
- `react-native-push-notification` - Local notifications
- `react-native-sqlite-storage` - SQLite database
- `react-native-mmkv` - Fast key-value storage
- `@react-native-community/netinfo` - Network status

### Platform-specific Dependencies
- iOS: `@react-native-community/push-notification-ios`
- Android: Built-in notification support

## Future Enhancements

1. **Rich Notifications**: Support for images, actions, and interactive elements
2. **Smart Sync**: AI-powered sync optimization based on usage patterns
3. **Offline Analytics**: Track offline usage and sync patterns
4. **Advanced Conflict Resolution**: Machine learning-based conflict resolution
5. **Real-time Sync**: WebSocket-based real-time synchronization