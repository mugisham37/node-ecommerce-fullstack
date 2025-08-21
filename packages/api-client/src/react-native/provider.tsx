import React, { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '../trpc/client';
import type { TRPCClientConfig } from '../trpc/client';
import { createLinkChain } from '../trpc/links';
import { AppState, type AppStateStatus } from 'react-native';

export interface TRPCProviderProps {
  children: ReactNode;
  config: TRPCClientConfig;
  queryClientConfig?: {
    defaultOptions?: {
      queries?: {
        staleTime?: number;
        cacheTime?: number;
        retry?: number | boolean;
        refetchOnWindowFocus?: boolean;
      };
      mutations?: {
        retry?: number | boolean;
      };
    };
  };
}

/**
 * tRPC Provider component optimized for React Native
 */
export function TRPCProvider({
  children,
  config,
  queryClientConfig,
}: TRPCProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 60 * 1000, // 10 minutes (longer for mobile)
            cacheTime: 30 * 60 * 1000, // 30 minutes (longer for mobile)
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
                return false;
              }
              // More aggressive retry for mobile (network issues)
              return failureCount < 5;
            },
            refetchOnWindowFocus: false,
            // Mobile-specific: refetch when app becomes active
            refetchOnMount: true,
            ...queryClientConfig?.defaultOptions?.queries,
          },
          mutations: {
            retry: (failureCount, error: any) => {
              // Retry network errors on mobile
              if (error?.message?.includes('Network request failed')) {
                return failureCount < 3;
              }
              return false;
            },
            ...queryClientConfig?.defaultOptions?.mutations,
          },
        },
      })
  );

  const [trpcClient] = useState(() => {
    const links = createLinkChain({
      apiUrl: config.apiUrl,
      wsUrl: config.wsUrl,
      getAuthToken: config.getAuthToken,
      onError: config.onError,
      enableRetry: true,
      maxRetries: 5, // More retries for mobile
    });

    return trpc.createClient({
      links,
      transformer: require('superjson'),
    });
  });

  // Handle app state changes for React Native
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Refetch queries when app becomes active
        queryClient.refetchQueries();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, [queryClient]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

/**
 * Hook to access the tRPC client directly
 */
export function useTRPCClient() {
  return trpc.useContext();
}

/**
 * Hook to access the Query Client
 */
export function useQueryClient() {
  const { queryClient } = trpc.useContext();
  return queryClient;
}