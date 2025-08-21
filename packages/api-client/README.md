# @ecommerce/api-client

Type-safe API client library for the e-commerce platform, built with tRPC and React Query.

## Features

- 🔒 **Type Safety**: Full TypeScript support with automatic type inference
- 🚀 **Performance**: Built-in caching, batching, and optimistic updates
- 📱 **Cross-Platform**: Works on web, React Native, and Node.js
- 🔄 **Real-time**: WebSocket support for live updates
- 🔐 **Authentication**: Built-in auth management with automatic token refresh
- 📡 **Offline Support**: Offline-first capabilities for mobile apps
- 🎯 **Developer Experience**: Excellent DX with React Query integration

## Installation

```bash
npm install @ecommerce/api-client
```

### Peer Dependencies

For React applications:
```bash
npm install react @tanstack/react-query
```

For React Native applications:
```bash
npm install react react-native @tanstack/react-query @react-native-community/netinfo @react-native-async-storage/async-storage
```

## Quick Start

### Web Application (React/Next.js)

```tsx
import { TRPCProvider, createApiClient } from '@ecommerce/api-client/react';

// Create API client
const { client, authManager } = createApiClient({
  apiUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:3000',
  enableWebSockets: true,
});

// Wrap your app with the provider
function App() {
  return (
    <TRPCProvider
      client={client}
      config={{
        apiUrl: 'http://localhost:3000',
        getAuthToken: () => authManager.getAccessToken(),
      }}
    >
      <YourApp />
    </TRPCProvider>
  );
}

// Use in components
function ProductList() {
  const { data: products, isLoading } = trpc.products.getAll.useQuery({
    page: 1,
    limit: 20,
  });

  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      utils.products.getAll.invalidate();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {products?.data.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

### React Native Application

```tsx
import { TRPCProvider, createApiClient } from '@ecommerce/api-client/react-native';

// Create API client with mobile optimizations
const { client, authManager } = createApiClient({
  apiUrl: 'https://api.example.com',
  enableOfflineSync: true,
  secureStorage: true,
});

function App() {
  return (
    <TRPCProvider
      client={client}
      config={{
        apiUrl: 'https://api.example.com',
        getAuthToken: () => authManager.getAccessToken(),
      }}
    >
      <YourApp />
    </TRPCProvider>
  );
}

// Use offline-aware hooks
function InventoryScreen() {
  const { data: inventory } = useNetworkAwareQuery(
    trpc.inventory.getAll.useQuery,
    {
      staleTimeOffline: 60 * 60 * 1000, // 1 hour offline
      refetchOnReconnect: true,
    }
  );

  const updateInventory = useOfflineMutation(
    trpc.inventory.update.useMutation,
    {
      enableOfflineQueue: true,
      optimisticUpdate: (variables) => {
        // Update UI immediately
      },
    }
  );

  return (
    <FlatList
      data={inventory}
      renderItem={({ item }) => <InventoryItem item={item} />}
    />
  );
}
```

### Node.js/Server Usage

```typescript
import { createTRPCClient } from '@ecommerce/api-client';

const client = createTRPCClient({
  apiUrl: 'http://localhost:3000',
  getAuthToken: () => process.env.API_TOKEN,
});

// Use directly
const products = await client.products.getAll.query({
  page: 1,
  limit: 10,
});
```

## Authentication

### Setup Authentication

```tsx
import { AuthProvider, useAuth } from '@ecommerce/api-client';

function App() {
  return (
    <AuthProvider
      apiUrl="https://api.example.com"
      storageType="browser" // or 'secure' for React Native
    >
      <YourApp />
    </AuthProvider>
  );
}

function LoginForm() {
  const { login, isLoading } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      // User is now authenticated
    } catch (error) {
      // Handle login error
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* Login form */}
    </form>
  );
}
```

### Protected Routes

```tsx
import { useRequireAuth } from '@ecommerce/api-client';

function ProtectedPage() {
  const { canAccess, isLoading } = useRequireAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!canAccess) return <div>Please log in</div>;

  return <div>Protected content</div>;
}
```

## Real-time Features

### WebSocket Subscriptions

```tsx
import { useWebSocket, useSubscription } from '@ecommerce/api-client';

function RealTimeInventory() {
  // Subscribe to inventory updates
  useSubscription('inventory.updated', (data) => {
    console.log('Inventory updated:', data);
    // Update local state or refetch queries
  });

  // Subscribe to notifications
  const { notifications } = useWebSocketNotifications();

  return (
    <div>
      {notifications.map(notification => (
        <div key={notification.id}>{notification.message}</div>
      ))}
    </div>
  );
}
```

## Advanced Usage

### Custom Hooks

```tsx
import { usePaginatedQuery, useOptimisticMutation } from '@ecommerce/api-client/react';

function ProductManager() {
  // Paginated query with built-in state management
  const {
    data: products,
    pagination,
    nextPage,
    prevPage,
    updateFilters,
  } = usePaginatedQuery(
    trpc.products.getAll.useQuery,
    { category: 'electronics' },
    { limit: 20 }
  );

  // Optimistic mutation with rollback
  const createProduct = useOptimisticMutation(
    trpc.products.create.useMutation,
    {
      optimisticUpdate: (variables) => {
        // Add to local state immediately
      },
      rollback: (variables) => {
        // Remove from local state on error
      },
    }
  );

  return (
    <div>
      {/* Product list with pagination */}
    </div>
  );
}
```

### Error Handling

```tsx
import { useErrorHandler } from '@ecommerce/api-client';

function MyComponent() {
  const handleError = useErrorHandler();

  const { data, error } = trpc.products.getAll.useQuery(
    { page: 1 },
    {
      onError: handleError, // Automatic error handling
    }
  );

  return <div>{/* Component content */}</div>;
}
```

## Configuration

### Client Configuration

```typescript
interface TRPCClientConfig {
  apiUrl: string;
  wsUrl?: string;
  getAuthToken?: () => string | null;
  onError?: (error: any) => void;
  enableBatching?: boolean;
  enableWebSockets?: boolean;
}
```

### Platform-Specific Options

```typescript
// Web-specific
interface WebPlatformConfig extends TRPCClientConfig {
  enableServiceWorker?: boolean;
  enableOfflineSupport?: boolean;
  cacheStrategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

// Mobile-specific
interface MobilePlatformConfig extends TRPCClientConfig {
  enableOfflineSync?: boolean;
  enableBackgroundSync?: boolean;
  secureStorage?: boolean;
  networkTimeout?: number;
}
```

## API Reference

### Core Exports

- `createApiClient()` - Main client factory
- `TRPCProvider` - React provider component
- `trpc` - tRPC React hooks
- `useAuth()` - Authentication hook
- `useWebSocket()` - WebSocket connection hook

### Platform Exports

- `@ecommerce/api-client/react` - React-specific exports
- `@ecommerce/api-client/react-native` - React Native-specific exports

## License

MIT