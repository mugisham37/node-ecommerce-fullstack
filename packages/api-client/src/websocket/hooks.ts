import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, type WebSocketConfig, type WebSocketMessage } from './client';

/**
 * Hook for WebSocket connection management
 */
export function useWebSocket(config: Omit<WebSocketConfig, 'onConnect' | 'onDisconnect' | 'onError' | 'onMessage'>) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<number>(WebSocket.CLOSED);
  const [error, setError] = useState<Event | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const clientRef = useRef<WebSocketClient | null>(null);
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());

  // Initialize WebSocket client
  useEffect(() => {
    const client = new WebSocketClient({
      ...config,
      onConnect: () => {
        setIsConnected(true);
        setConnectionState(WebSocket.OPEN);
        setError(null);
      },
      onDisconnect: (code, reason) => {
        setIsConnected(false);
        setConnectionState(WebSocket.CLOSED);
      },
      onError: (event) => {
        setError(event);
        setConnectionState(WebSocket.CLOSED);
      },
      onMessage: (message) => {
        setLastMessage(message);
      },
    });

    clientRef.current = client;

    // Auto-connect
    client.connect().catch(console.error);

    return () => {
      // Clean up subscriptions
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      subscriptionsRef.current.clear();
      
      client.disconnect();
    };
  }, [config.url, config.getAuthToken]);

  const send = useCallback((message: Omit<WebSocketMessage, 'id' | 'timestamp'>) => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.send(message as WebSocketMessage);
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    if (!clientRef.current) return () => {};

    const unsubscribe = clientRef.current.subscribe(eventType, callback);
    subscriptionsRef.current.set(eventType, unsubscribe);

    return () => {
      unsubscribe();
      subscriptionsRef.current.delete(eventType);
    };
  }, []);

  const connect = useCallback(() => {
    return clientRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  return {
    isConnected,
    connectionState,
    error,
    lastMessage,
    send,
    subscribe,
    connect,
    disconnect,
  };
}

/**
 * Hook for subscribing to specific WebSocket events
 */
export function useWebSocketSubscription<T = any>(
  eventType: string,
  callback: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { subscribe } = useWebSocket({
    url: '', // This should be provided by a context or config
  });

  useEffect(() => {
    const unsubscribe = subscribe(eventType, callback);
    return unsubscribe;
  }, [eventType, subscribe, ...deps]);
}

/**
 * Hook for real-time data with WebSocket updates
 */
export function useRealtimeData<T>(
  initialData: T,
  eventType: string,
  updateHandler: (currentData: T, eventData: any) => T
) {
  const [data, setData] = useState<T>(initialData);
  const { subscribe } = useWebSocket({
    url: '', // This should be provided by a context or config
  });

  useEffect(() => {
    const unsubscribe = subscribe(eventType, (eventData: any) => {
      setData(currentData => updateHandler(currentData, eventData));
    });

    return unsubscribe;
  }, [eventType, subscribe, updateHandler]);

  return data;
}

/**
 * Hook for WebSocket-based notifications
 */
export function useWebSocketNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { subscribe } = useWebSocket({
    url: '', // This should be provided by a context or config
  });

  useEffect(() => {
    const unsubscribe = subscribe('notification', (notification: any) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return unsubscribe;
  }, [subscribe]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
  };
}

/**
 * Hook for WebSocket connection status with retry logic
 */
export function useWebSocketStatus(url: string, getAuthToken?: () => string | null) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Event | null>(null);

  const { isConnected, error, connect } = useWebSocket({
    url,
    getAuthToken,
  });

  useEffect(() => {
    if (isConnected) {
      setStatus('connected');
      setRetryCount(0);
      setLastError(null);
    } else if (error) {
      setStatus('error');
      setLastError(error);
    } else {
      setStatus('disconnected');
    }
  }, [isConnected, error]);

  const retry = useCallback(async () => {
    setStatus('connecting');
    setRetryCount(prev => prev + 1);
    
    try {
      await connect();
    } catch (err) {
      setStatus('error');
      setLastError(err as Event);
    }
  }, [connect]);

  return {
    status,
    retryCount,
    lastError,
    retry,
    isConnected,
  };
}

/**
 * Hook for typing indicators in real-time
 */
export function useTypingIndicator(roomId: string, userId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const { send, subscribe } = useWebSocket({
    url: '', // This should be provided by a context or config
  });

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(`typing:${roomId}`, (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        if (data.isTyping && !prev.includes(data.userId)) {
          return [...prev, data.userId];
        } else if (!data.isTyping) {
          return prev.filter(id => id !== data.userId);
        }
        return prev;
      });
    });

    return unsubscribe;
  }, [roomId, subscribe]);

  const startTyping = useCallback(() => {
    send({
      type: `typing:${roomId}`,
      data: { userId, isTyping: true },
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      send({
        type: `typing:${roomId}`,
        data: { userId, isTyping: false },
      });
    }, 3000);
  }, [send, roomId, userId]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    send({
      type: `typing:${roomId}`,
      data: { userId, isTyping: false },
    });
  }, [send, roomId, userId]);

  return {
    typingUsers: typingUsers.filter(id => id !== userId), // Exclude current user
    startTyping,
    stopTyping,
  };
}