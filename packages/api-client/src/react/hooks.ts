import { useCallback, useMemo } from 'react';
import { trpc } from '../trpc/client';
import type { TRPCClientError } from '@trpc/client';

/**
 * Enhanced hooks for common tRPC patterns
 */

/**
 * Hook for paginated queries with built-in state management
 */
export function usePaginatedQuery<T>(
  queryFn: (input: { page: number; limit: number; [key: string]: any }) => any,
  initialFilters: Record<string, any> = {},
  options: {
    limit?: number;
    enabled?: boolean;
    keepPreviousData?: boolean;
  } = {}
) {
  const { limit = 20, enabled = true, keepPreviousData = true } = options;

  const [filters, setFilters] = React.useState({
    page: 1,
    limit,
    ...initialFilters,
  });

  const query = queryFn(filters, {
    enabled,
    keepPreviousData,
  });

  const nextPage = useCallback(() => {
    if (query.data?.pagination?.hasNext) {
      setFilters(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [query.data?.pagination?.hasNext]);

  const prevPage = useCallback(() => {
    if (query.data?.pagination?.hasPrev) {
      setFilters(prev => ({ ...prev, page: prev.page - 1 }));
    }
  }, [query.data?.pagination?.hasPrev]);

  const goToPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const updateFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  return {
    ...query,
    filters,
    pagination: query.data?.pagination,
    nextPage,
    prevPage,
    goToPage,
    updateFilters,
    hasNextPage: query.data?.pagination?.hasNext ?? false,
    hasPreviousPage: query.data?.pagination?.hasPrev ?? false,
  };
}

/**
 * Hook for optimistic updates with rollback
 */
export function useOptimisticMutation<TInput, TOutput>(
  mutationFn: any,
  options: {
    onSuccess?: (data: TOutput, variables: TInput) => void;
    onError?: (error: TRPCClientError, variables: TInput, context?: any) => void;
    onSettled?: (data: TOutput | undefined, error: TRPCClientError | null, variables: TInput) => void;
    optimisticUpdate?: (variables: TInput) => void;
    rollback?: (variables: TInput) => void;
  } = {}
) {
  const utils = trpc.useContext();

  return mutationFn({
    onMutate: async (variables: TInput) => {
      // Cancel outgoing refetches
      await utils.invalidate();
      
      // Apply optimistic update
      options.optimisticUpdate?.(variables);
      
      return { variables };
    },
    onError: (error: TRPCClientError, variables: TInput, context: any) => {
      // Rollback optimistic update
      options.rollback?.(variables);
      options.onError?.(error, variables, context);
    },
    onSuccess: options.onSuccess,
    onSettled: options.onSettled,
  });
}

/**
 * Hook for infinite queries (e.g., infinite scroll)
 */
export function useInfiniteQuery<T>(
  queryFn: any,
  options: {
    getNextPageParam?: (lastPage: any, allPages: any[]) => any;
    getPreviousPageParam?: (firstPage: any, allPages: any[]) => any;
    enabled?: boolean;
  } = {}
) {
  const {
    getNextPageParam = (lastPage: any) => lastPage.pagination?.hasNext ? lastPage.pagination.page + 1 : undefined,
    getPreviousPageParam = (firstPage: any) => firstPage.pagination?.hasPrev ? firstPage.pagination.page - 1 : undefined,
    enabled = true,
  } = options;

  return queryFn({
    getNextPageParam,
    getPreviousPageParam,
    enabled,
  });
}

/**
 * Hook for real-time subscriptions with automatic cleanup
 */
export function useSubscription<T>(
  subscriptionFn: any,
  options: {
    enabled?: boolean;
    onData?: (data: T) => void;
    onError?: (error: TRPCClientError) => void;
  } = {}
) {
  const { enabled = true, onData, onError } = options;

  return subscriptionFn({
    enabled,
    onData,
    onError,
  });
}

/**
 * Hook for batch operations
 */
export function useBatchMutation<TInput, TOutput>(
  mutationFn: any,
  options: {
    onBatchSuccess?: (results: TOutput[]) => void;
    onBatchError?: (errors: TRPCClientError[]) => void;
    onItemSuccess?: (data: TOutput, index: number) => void;
    onItemError?: (error: TRPCClientError, index: number) => void;
  } = {}
) {
  const mutation = mutationFn();

  const executeBatch = useCallback(async (items: TInput[]) => {
    const results: (TOutput | TRPCClientError)[] = [];
    
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await mutation.mutateAsync(items[i]);
        results.push(result);
        options.onItemSuccess?.(result, i);
      } catch (error) {
        results.push(error as TRPCClientError);
        options.onItemError?.(error as TRPCClientError, i);
      }
    }

    const successes = results.filter((r): r is TOutput => !(r instanceof Error));
    const errors = results.filter((r): r is TRPCClientError => r instanceof Error);

    if (successes.length > 0) {
      options.onBatchSuccess?.(successes);
    }
    if (errors.length > 0) {
      options.onBatchError?.(errors);
    }

    return { successes, errors };
  }, [mutation, options]);

  return {
    ...mutation,
    executeBatch,
  };
}

/**
 * Hook for error handling with toast notifications
 */
export function useErrorHandler() {
  return useCallback((error: TRPCClientError) => {
    // This would integrate with your toast/notification system
    console.error('API Error:', {
      code: error.data?.code,
      message: error.message,
      httpStatus: error.data?.httpStatus,
    });

    // You can customize error handling based on error type
    switch (error.data?.code) {
      case 'UNAUTHORIZED':
        // Handle auth errors (redirect to login, refresh token, etc.)
        break;
      case 'FORBIDDEN':
        // Handle permission errors
        break;
      case 'NOT_FOUND':
        // Handle not found errors
        break;
      case 'VALIDATION_ERROR':
        // Handle validation errors
        break;
      default:
        // Handle generic errors
        break;
    }
  }, []);
}