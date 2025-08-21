import {createTRPCReact} from '@trpc/react-query';
import {createTRPCClient, httpBatchLink, loggerLink} from '@trpc/client';
import {createWSClient, wsLink, splitLink} from '@trpc/client';
import superjson from 'superjson';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the router type from your API
// This should match your API router type
export type AppRouter = any; // TODO: Import actual router type from API

// Create the tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Get API URL from environment or use default
const getApiUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
  return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
};

// Get WebSocket URL
const getWsUrl = () => {
  const apiUrl = getApiUrl();
  return apiUrl.replace('http', 'ws') + '/ws';
};

// Create WebSocket client for real-time features
const wsClient = createWSClient({
  url: getWsUrl(),
  onOpen: () => {
    console.log('WebSocket connected');
  },
  onClose: () => {
    console.log('WebSocket disconnected');
  },
});

// Authentication token management
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Create tRPC client with configuration
export const createTrpcClient = () => {
  return createTRPCClient<AppRouter>({
    transformer: superjson,
    links: [
      // Logger link for development
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === 'development' ||
          (opts.direction === 'down' && opts.result instanceof Error),
      }),
      // Split link for HTTP and WebSocket
      splitLink({
        condition(op) {
          return op.type === 'subscription';
        },
        true: wsLink({
          client: wsClient,
          transformer: superjson,
        }),
        false: httpBatchLink({
          url: `${getApiUrl()}/trpc`,
          transformer: superjson,
          async headers() {
            const token = await getAuthToken();
            return {
              authorization: token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
            };
          },
        }),
      }),
    ],
  });
};

// Export utilities for manual usage
export const trpcClient = createTrpcClient();

// Utility functions for token management
export const setAuthToken = async (token: string) => {
  try {
    await AsyncStorage.setItem('auth_token', token);
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
};

export const removeAuthToken = async () => {
  try {
    await AsyncStorage.removeItem('auth_token');
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};

// Query client configuration for React Query
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      retry: (failureCount: number, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error.status)) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
};