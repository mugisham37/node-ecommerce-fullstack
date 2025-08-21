import React, { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { trpc } from '../trpc/client';
import type { TRPCClientConfig } from '../trpc/client';
import { createLinkChain } from '../trpc/links';

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
  enableDevtools?: boolean;
}

/**
 * tRPC Provider component for React applications
 */
export function TRPCProvider({
  children,
  config,
  queryClientConfig,
  enableDevtools = process.env.NODE_ENV === 'development',
}: TRPCProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
                return false;
              }
              return failureCount < 3;
            },
            refetchOnWindowFocus: false,
            ...queryClientConfig?.defaultOptions?.queries,
          },
          mutations: {
            retry: false,
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
      maxRetries: 3,
    });

    return trpc.createClient({
      links,
      transformer: require('superjson'),
    });
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {enableDevtools && <ReactQueryDevtools initialIsOpen={false} />}
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