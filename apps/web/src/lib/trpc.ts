import { createTRPCReact } from '@trpc/react-query';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import superjson from 'superjson';

// Import the AppRouter type from the API (this will be available once the API is set up)
// For now, we'll use a placeholder type
type AppRouter = any; // TODO: Replace with actual AppRouter type from @ecommerce/api-client

// Create the tRPC React hooks
export const api = createTRPCReact<AppRouter>();

// Create the tRPC client configuration
export function createTRPCClient() {
  return createTRPCProxyClient<AppRouter>({
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
  });
}

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

// Type helpers for better TypeScript experience
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// Export utils for invalidation and other operations
export const utils = api.useUtils;