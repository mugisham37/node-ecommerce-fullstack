'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';

// TODO: Replace with actual AppRouter type from @ecommerce/api-client
type AppRouter = any;

const api = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use relative URL
    return '';
  }
  
  if (process.env.VERCEL_URL) {
    // SSR should use Vercel URL
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Dev SSR should use localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem('auth-token');
  } catch {
    return null;
  }
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
                return false;
              }
              return failureCount < 3;
            },
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    api.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: getBaseUrl() + '/api/trpc',
          headers() {
            const token = getAuthToken();
            return token ? { authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </api.Provider>
  );
}

export { api };