'use client';

// Mock Socket.IO types for demo purposes
interface Socket {
  connected: boolean;
  on: (event: string, callback: (data: any) => void) => void;
  emit: (event: string, data: any) => void;
  disconnect: () => void;
  auth?: any;
}

// Mock io function for demo purposes
const io = (url: string, options: any): Socket => {
  console.log('Mock WebSocket connection to:', url);
  return {
    connected: false,
    on: () => {},
    emit: () => {},
    disconnect: () => {},
  };
};

export interface WebSocketConfig {
  url: string;
  auth?: {
    token: string;
  };
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  id?: string;
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface InventoryUpdateMessage {
  type: 'inventory_update';
  productId: string;
  productName: string;
  oldQuantity: number;
  newQuantity: number;
  changeType: 'adjustment' | 'sale' | 'restock' | 'return';
  timestamp: number;
  userId?: string;
}

export interface OrderStatusMessage {
  type: 'order_status';
  orderId: string;
  orderNumber: string;
  oldStatus: string;
  newStatus: string;
  timestamp: number;
  userId?: string;
}

export type RealtimeMessage = NotificationMessage | InventoryUpdateMessage | OrderStatusMessage;

export class WebSocketClient {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...config,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.connectionState = 'connecting';

      try {
        this.socket = io(this.config.url, {
          auth: this.config.auth,
          reconnection: this.config.reconnection,
          reconnectionAttempts: this.config.reconnectionAttempts,
          reconnectionDelay: this.config.reconnectionDelay,
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          console.log('WebSocket connected');
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          this.connectionState = 'disconnected';
          console.log('WebSocket disconnected:', reason);
          this.handleDisconnection();
        });

        this.socket.on('connect_error', (error) => {
          this.connectionState = 'error';
          console.error('WebSocket connection error:', error);
          reject(error);
        });

        this.socket.on('reconnect', (attemptNumber) => {
          this.connectionState = 'connected';
          console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
        });

        this.socket.on('reconnect_error', (error) => {
          console.error('WebSocket reconnection error:', error);
        });

        this.socket.on('reconnect_failed', () => {
          this.connectionState = 'error';
          console.error('WebSocket reconnection failed');
        });

        // Handle incoming messages
        this.socket.on('message', (data: WebSocketMessage) => {
          this.handleMessage(data);
        });

        // Handle specific message types
        this.socket.on('notification', (data: NotificationMessage) => {
          this.emit('notification', data);
        });

        this.socket.on('inventory_update', (data: InventoryUpdateMessage) => {
          this.emit('inventory_update', data);
        });

        this.socket.on('order_status', (data: OrderStatusMessage) => {
          this.emit('order_status', data);
        });

      } catch (error) {
        this.connectionState = 'error';
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionState = 'disconnected';
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getConnectionState(): string {
    return this.connectionState;
  }

  // Subscribe to specific message types
  on<T = any>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  // Emit events to listeners
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Send message to server
  send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Message not sent:', { event, data });
    }
  }

  // Join a room (for targeted notifications)
  joinRoom(room: string): void {
    this.send('join_room', { room });
  }

  // Leave a room
  leaveRoom(room: string): void {
    this.send('leave_room', { room });
  }

  // Subscribe to user-specific notifications
  subscribeToUserNotifications(userId: string): void {
    this.joinRoom(`user_${userId}`);
  }

  // Subscribe to inventory updates for specific products
  subscribeToProductUpdates(productIds: string[]): void {
    productIds.forEach(productId => {
      this.joinRoom(`product_${productId}`);
    });
  }

  // Subscribe to order updates
  subscribeToOrderUpdates(userId?: string): void {
    if (userId) {
      this.joinRoom(`user_orders_${userId}`);
    } else {
      this.joinRoom('all_orders');
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle generic messages
    this.emit('message', message);
    
    // Handle specific message types
    if (message.type) {
      this.emit(message.type, message.payload);
    }
  }

  private handleDisconnection(): void {
    // Implement custom reconnection logic if needed
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    }
  }

  // Update authentication token
  updateAuth(token: string): void {
    this.config.auth = { token };
    if (this.socket) {
      this.socket.auth = { token };
    }
  }
}

// Default WebSocket client instance
let defaultClient: WebSocketClient | null = null;

export const createWebSocketClient = (config: WebSocketConfig): WebSocketClient => {
  return new WebSocketClient(config);
};

export const getDefaultWebSocketClient = (): WebSocketClient | null => {
  return defaultClient;
};

export const setDefaultWebSocketClient = (client: WebSocketClient): void => {
  defaultClient = client;
};

// Utility function to get WebSocket URL based on environment
export const getWebSocketUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'ws://localhost:3001'; // Server-side default
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.host}`
    : 'ws://localhost:3001';
  
  return host;
};