'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  WebSocketClient, 
  WebSocketConfig, 
  RealtimeMessage,
  createWebSocketClient,
  getWebSocketUrl,
  setDefaultWebSocketClient,
  getDefaultWebSocketClient
} from '@/lib/websocket';
// Mock useAuth hook for demo purposes
const useAuth = () => ({
  user: { id: 'demo-user', token: 'demo-token' },
});

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectOnAuthChange?: boolean;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connectionState: string;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { user } = useAuth();
  const clientRef = useRef<WebSocketClient | null>(null);
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    connectionState: 'disconnected',
  });

  const {
    url = getWebSocketUrl(),
    autoConnect = true,
    reconnectOnAuthChange = true,
  } = options;

  // Initialize WebSocket client
  const initializeClient = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    const config: WebSocketConfig = {
      url,
      auth: user?.token ? { token: user.token } : undefined,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    };

    const client = createWebSocketClient(config);
    clientRef.current = client;
    setDefaultWebSocketClient(client);

    return client;
  }, [url, user?.token]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!clientRef.current) {
      initializeClient();
    }

    if (clientRef.current && !clientRef.current.isConnected()) {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      try {
        await clientRef.current.connect();
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          connectionState: 'connected',
        }));

        // Subscribe to user-specific notifications if authenticated
        if (user?.id) {
          clientRef.current.subscribeToUserNotifications(user.id);
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error as Error,
          connectionState: 'error',
        }));
      }
    }
  }, [initializeClient, user?.id]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      connectionState: 'disconnected',
    });
  }, []);

  // Send message
  const send = useCallback((event: string, data: any) => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.send(event, data);
    } else {
      console.warn('WebSocket not connected. Cannot send message:', { event, data });
    }
  }, []);

  // Subscribe to events
  const subscribe = useCallback(<T = any>(event: string, callback: (data: T) => void) => {
    if (clientRef.current) {
      return clientRef.current.on(event, callback);
    }
    return () => {}; // Return empty unsubscribe function
  }, []);

  // Join room
  const joinRoom = useCallback((room: string) => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.joinRoom(room);
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback((room: string) => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.leaveRoom(room);
    }
  }, []);

  // Subscribe to specific data types
  const subscribeToProductUpdates = useCallback((productIds: string[]) => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.subscribeToProductUpdates(productIds);
    }
  }, []);

  const subscribeToOrderUpdates = useCallback((userId?: string) => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.subscribeToOrderUpdates(userId);
    }
  }, []);

  // Auto-connect on mount and auth changes
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (clientRef.current) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect]);

  // Reconnect when auth changes
  useEffect(() => {
    if (reconnectOnAuthChange && clientRef.current && user?.token) {
      clientRef.current.updateAuth(user.token);
      
      // Resubscribe to user notifications
      if (user.id) {
        clientRef.current.subscribeToUserNotifications(user.id);
      }
    }
  }, [user?.token, user?.id, reconnectOnAuthChange]);

  // Update connection state
  useEffect(() => {
    if (clientRef.current) {
      const updateState = () => {
        setState(prev => ({
          ...prev,
          isConnected: clientRef.current?.isConnected() ?? false,
          connectionState: clientRef.current?.getConnectionState() ?? 'disconnected',
        }));
      };

      // Check connection state periodically
      const interval = setInterval(updateState, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  return {
    // State
    ...state,
    client: clientRef.current,

    // Actions
    connect,
    disconnect,
    send,
    subscribe,
    joinRoom,
    leaveRoom,
    subscribeToProductUpdates,
    subscribeToOrderUpdates,
  };
};

// Hook for listening to specific message types
export const useWebSocketMessage = <T = any>(
  event: string,
  callback: (data: T) => void,
  deps: React.DependencyList = []
) => {
  const { subscribe } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    const unsubscribe = subscribe<T>(event, callback);
    return unsubscribe;
  }, [subscribe, event, ...deps]);
};

// Hook for real-time notifications
export const useRealtimeNotifications = (callback: (notification: RealtimeMessage) => void) => {
  useWebSocketMessage('notification', callback);
  useWebSocketMessage('inventory_update', callback);
  useWebSocketMessage('order_status', callback);
};

// Hook for inventory updates
export const useInventoryUpdates = (
  productIds: string[],
  callback: (update: any) => void
) => {
  const { subscribeToProductUpdates } = useWebSocket();

  useEffect(() => {
    if (productIds.length > 0) {
      subscribeToProductUpdates(productIds);
    }
  }, [productIds, subscribeToProductUpdates]);

  useWebSocketMessage('inventory_update', callback);
};

// Hook for order status updates
export const useOrderStatusUpdates = (
  userId: string | undefined,
  callback: (update: any) => void
) => {
  const { subscribeToOrderUpdates } = useWebSocket();

  useEffect(() => {
    subscribeToOrderUpdates(userId);
  }, [userId, subscribeToOrderUpdates]);

  useWebSocketMessage('order_status', callback);
};