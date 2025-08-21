import { TRPCLink, httpBatchLink, wsLink, splitLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import superjson from 'superjson';
import type { AppRouter } from '@ecommerce/api';

export interface LinkConfig {
  apiUrl: string;
  wsUrl?: string;
  getAuthToken?: () => string | null;
  onError?: (error: any) => void;
  enableRetry?: boolean;
  maxRetries?: number;
}

/**
 * Create authentication link that adds auth headers
 */
export function createAuthLink(getAuthToken?: () => string | null): TRPCLink<AppRouter> {
  return () => {
    return ({ next, op }) => {
      return observable((observer) => {
        const token = getAuthToken?.();
        
        // Add auth header if token exists
        if (token) {
          op.context = {
            ...op.context,
            headers: {
              ...op.context.headers,
              Authorization: `Bearer ${token}`,
            },
          };
        }

        return next(op).subscribe(observer);
      });
    };
  };
}

/**
 * Create error handling link
 */
export function createErrorLink(onError?: (error: any) => void): TRPCLink<AppRouter> {
  return () => {
    return ({ next, op }) => {
      return observable((observer) => {
        return next(op).subscribe({
          next: (result) => observer.next(result),
          error: (error) => {
            onError?.(error);
            observer.error(error);
          },
          complete: () => observer.complete(),
        });
      });
    };
  };
}

/**
 * Create retry link for failed requests
 */
export function createRetryLink(maxRetries: number = 3): TRPCLink<AppRouter> {
  return () => {
    return ({ next, op }) => {
      return observable((observer) => {
        let retryCount = 0;

        const attempt = () => {
          return next(op).subscribe({
            next: (result) => observer.next(result),
            error: (error) => {
              if (retryCount < maxRetries && isRetryableError(error)) {
                retryCount++;
                setTimeout(attempt, Math.pow(2, retryCount) * 1000); // Exponential backoff
              } else {
                observer.error(error);
              }
            },
            complete: () => observer.complete(),
          });
        };

        return attempt();
      });
    };
  };
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on network errors or 5xx server errors
  return (
    error?.data?.httpStatus >= 500 ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('network')
  );
}

/**
 * Create HTTP link with configuration
 */
export function createHttpLink(config: LinkConfig) {
  return httpBatchLink({
    url: `${config.apiUrl}/trpc`,
    headers: () => {
      const token = config.getAuthToken?.();
      return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
    },
    transformer: superjson,
  });
}

/**
 * Create WebSocket link with configuration
 */
export function createWsLink(config: LinkConfig) {
  if (!config.wsUrl) {
    throw new Error('WebSocket URL is required for WebSocket link');
  }

  return wsLink({
    url: config.wsUrl,
    transformer: superjson,
    connectionParams: () => {
      const token = config.getAuthToken?.();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
  });
}

/**
 * Create complete link chain with all features
 */
export function createLinkChain(config: LinkConfig) {
  const links: TRPCLink<AppRouter>[] = [];

  // Add error handling
  if (config.onError) {
    links.push(createErrorLink(config.onError));
  }

  // Add retry logic
  if (config.enableRetry) {
    links.push(createRetryLink(config.maxRetries));
  }

  // Add authentication
  if (config.getAuthToken) {
    links.push(createAuthLink(config.getAuthToken));
  }

  // Add transport layer
  const httpLink = createHttpLink(config);
  
  if (config.wsUrl) {
    const wsLinkInstance = createWsLink(config);
    
    // Split between HTTP and WebSocket based on operation type
    links.push(
      splitLink({
        condition: (op) => op.type === 'subscription',
        true: wsLinkInstance,
        false: httpLink,
      })
    );
  } else {
    links.push(httpLink);
  }

  return links;
}