'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider, ReactQueryDevtools, api } from '@/lib/mocks';

interface TRPCProviderProps {
  children: React.ReactNode;
}

export const TRPCProvider = ({ children }: TRPCProviderProps) => {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => api.createClient());

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools />
        )}
      </QueryClientProvider>
    </api.Provider>
  );
};

// Helper function to get the base URL
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

// Helper function to get auth token from storage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem('auth-token');
  } catch {
    return null;
  }
}