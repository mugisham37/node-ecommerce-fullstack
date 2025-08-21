import { useCallback, useEffect, useState } from 'react';
import { NetInfo, type NetInfoState } from '@react-native-community/netinfo';
import { trpc } from '../trpc/client';
import type { TRPCClientError } from '@trpc/client';

/**
 * React Native specific hooks for tRPC
 */

/**
 * Hook to handle offline/online state and sync
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingMutations, setPendingMutations] = useState<any[]>([]);
  const utils = trpc.useContext();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !isOnline;
      const isNowOnline = state.isConnected && state.isInternetReachable;
      
      setIsOnline(isNowOnline);

      // If we just came back online, sync pending mutations
      if (wasOffline && isNowOnline && pendingMutations.length > 0) {
        syncPendingMutations();
      }
    });

    return unsubscribe;
  }, [isOnline, pendingMutations]);

  const syncPendingMutations = useCallback(async () => {
    const mutations = [...pendingMutations];
    setPendingMutations([]);

    for (const mutation of mutations) {
      try {
        await mutation.execute();
      } catch (error) {
        console.error('Failed to sync mutation:', error);
        // Re-add to pending if it failed
        setPendingMutations(prev => [...prev, mutation]);
      }
    }
  }, [pendingMutations]);

  const addPendingMutation = useCallback((mutation: any) => {
    setPendingMutations(prev => [...prev, mutation]);
  }, []);

  return {
    isOnline,
    pendingMutations: pendingMutations.length,
    addPendingMutation,
    syncPendingMutations,
  };
}

/**
 * Hook for optimistic updates with offline support
 */
export function useOfflineMutation<TInput, TOutput>(
  mutationFn: any,
  options: {
    onSuccess?: (data: TOutput, variables: TInput) => void;
    onError?: (error: TRPCClientError, variables: TInput) => void;
    optimisticUpdate?: (variables: TInput) => void;
    rollback?: (variables: TInput) => void;
    enableOfflineQueue?: boolean;
  } = {}
) {
  const { isOnline, addPendingMutation } = useOfflineSync();
  const utils = trpc.useContext();

  return mutationFn({
    onMutate: async (variables: TInput) => {
      // Apply optimistic update immediately
      options.optimisticUpdate?.(variables);

      // If offline and queuing is enabled, add to pending
      if (!isOnline && options.enableOfflineQueue) {
        addPendingMutation({
          execute: () => mutationFn().mutateAsync(variables),
          variables,
        });
        return { variables, queued: true };
      }

      return { variables, queued: false };
    },
    onError: (error: TRPCClientError, variables: TInput, context: any) => {
      // Only rollback if not queued for later
      if (!context?.queued) {
        options.rollback?.(variables);
      }
      options.onError?.(error, variables);
    },
    onSuccess: options.onSuccess,
  });
}

/**
 * Hook for background refresh with network awareness
 */
export function useBackgroundRefresh(
  queryKeys: string[],
  options: {
    interval?: number;
    onlyWhenOnline?: boolean;
    onlyWhenActive?: boolean;
  } = {}
) {
  const { interval = 30000, onlyWhenOnline = true, onlyWhenActive = true } = options;
  const { isOnline } = useOfflineSync();
  const [isAppActive, setIsAppActive] = useState(true);
  const utils = trpc.useContext();

  useEffect(() => {
    const { AppState } = require('react-native');
    
    const handleAppStateChange = (nextAppState: string) => {
      setIsAppActive(nextAppState === 'active');
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (onlyWhenOnline && !isOnline) return;
    if (onlyWhenActive && !isAppActive) return;

    const intervalId = setInterval(() => {
      queryKeys.forEach(key => {
        utils.invalidate({ queryKey: [key] });
      });
    }, interval);

    return () => clearInterval(intervalId);
  }, [isOnline, isAppActive, interval, onlyWhenOnline, onlyWhenActive, queryKeys, utils]);

  return { isOnline, isAppActive };
}

/**
 * Hook for handling network-aware caching
 */
export function useNetworkAwareQuery<T>(
  queryFn: any,
  options: {
    staleTimeOnline?: number;
    staleTimeOffline?: number;
    cacheTimeOnline?: number;
    cacheTimeOffline?: number;
    refetchOnReconnect?: boolean;
  } = {}
) {
  const { isOnline } = useOfflineSync();
  const {
    staleTimeOnline = 5 * 60 * 1000, // 5 minutes
    staleTimeOffline = 60 * 60 * 1000, // 1 hour
    cacheTimeOnline = 10 * 60 * 1000, // 10 minutes
    cacheTimeOffline = 24 * 60 * 60 * 1000, // 24 hours
    refetchOnReconnect = true,
  } = options;

  return queryFn({
    staleTime: isOnline ? staleTimeOnline : staleTimeOffline,
    cacheTime: isOnline ? cacheTimeOnline : cacheTimeOffline,
    refetchOnReconnect: refetchOnReconnect && isOnline,
    enabled: true, // Always enabled, but with different cache behavior
  });
}

/**
 * Hook for push notification integration
 */
export function usePushNotifications() {
  const [notificationToken, setNotificationToken] = useState<string | null>(null);
  const utils = trpc.useContext();

  const registerForNotifications = useCallback(async () => {
    try {
      // This would integrate with your push notification service
      // e.g., Firebase Cloud Messaging, AWS SNS, etc.
      const token = await getNotificationToken();
      setNotificationToken(token);
      
      // Register token with backend
      // await utils.notifications.registerToken.mutate({ token });
      
      return token;
    } catch (error) {
      console.error('Failed to register for notifications:', error);
      return null;
    }
  }, [utils]);

  const handleNotification = useCallback((notification: any) => {
    // Handle incoming notification
    // This might trigger data refetches, navigation, etc.
    
    // Example: refetch data based on notification type
    switch (notification.type) {
      case 'inventory_update':
        utils.inventory.getAll.invalidate();
        break;
      case 'order_update':
        utils.orders.getAll.invalidate();
        break;
      default:
        break;
    }
  }, [utils]);

  return {
    notificationToken,
    registerForNotifications,
    handleNotification,
  };
}

// Mock function - replace with actual implementation
async function getNotificationToken(): Promise<string> {
  // This would use Firebase Messaging or similar
  return 'mock-token';
}