import { createTRPCProxyClient, httpBatchLink, wsLink, splitLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';
import type { AppRouter } from '@ecommerce/api';

export interface TRPCClientConfig {
  apiUrl: string;
  wsUrl?: string;
  getAuthToken?: () => string | null;
  onError?: (error: any) => void;
  enableBatching?: boolean;
  enableWebSockets?: boolean;
}

/**
 * Create a vanilla tRPC client (for server-side or non-React usage)
 */
export function createTRPCClient(config: TRPCClientConfig) {
  const {
    apiUrl,
    wsUrl,
    getAuthToken,
    onError,
    enableBatching = true,
    enableWebSockets = false,
  } = config;

  const getHeaders = () => {
    const token = getAuthToken?.();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const httpLink = httpBatchLink({
    url: `${apiUrl}/trpc`,
    headers: getHeaders,
    transformer: superjson,
  });

  let link = httpLink;

  // Add WebSocket support if enabled and URL provided
  if (enableWebSockets && wsUrl) {
    const wsLinkInstance = wsLink({
      url: wsUrl,
      transformer: superjson,
      connectionParams: () => {
        const token = getAuthToken?.();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    });

    // Split link: subscriptions go to WebSocket, queries/mutations go to HTTP
    link = splitLink({
      condition: (op) => op.type === 'subscription',
      true: wsLinkInstance,
      false: httpLink,
    });
  }

  return createTRPCProxyClient<AppRouter>({
    links: [link],
    transformer: superjson,
  });
}

/**
 * Create tRPC React hooks
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Default client configuration
 */
export const defaultClientConfig: Partial<TRPCClientConfig> = {
  enableBatching: true,
  enableWebSockets: false,
  onError: (error) => {
    console.error('tRPC Error:', error);
  },
};