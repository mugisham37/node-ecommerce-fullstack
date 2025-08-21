import { EventEmitter } from 'events';
import WebSocket from 'isomorphic-ws';

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  getAuthToken?: () => string | null;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: Event) => void;
  onMessage?: (data: any) => void;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  id?: string;
  timestamp?: number;
}

/**
 * WebSocket client with automatic reconnection and authentication
 */
export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isManuallyDisconnected = false;

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.isManuallyDisconnected = false;

    try {
      const token = this.config.getAuthToken?.();
      const url = token 
        ? `${this.config.url}?token=${encodeURIComponent(token)}`
        : this.config.url;

      this.ws = new WebSocket(url, this.config.protocols);
      this.setupEventListeners();

      return new Promise((resolve, reject) => {
        const onOpen = () => {
          this.ws?.removeEventListener('error', onError);
          resolve();
        };

        const onError = (error: Event) => {
          this.ws?.removeEventListener('open', onOpen);
          reject(error);
        };

        this.ws?.addEventListener('open', onOpen, { once: true });
        this.ws?.addEventListener('error', onError, { once: true });
      });
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const messageWithMetadata: WebSocketMessage = {
      ...message,
      id: message.id || this.generateMessageId(),
      timestamp: message.timestamp || Date.now(),
    };

    this.ws.send(JSON.stringify(messageWithMetadata));
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe(eventType: string, callback: (data: any) => void): () => void {
    this.on(eventType, callback);
    
    // Send subscription message if connected
    if (this.isConnected()) {
      this.send({
        type: 'subscribe',
        data: { eventType },
      });
    }

    // Return unsubscribe function
    return () => {
      this.off(eventType, callback);
      
      if (this.isConnected()) {
        this.send({
          type: 'unsubscribe',
          data: { eventType },
        });
      }
    };
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.addEventListener('open', this.handleOpen.bind(this));
    this.ws.addEventListener('close', this.handleClose.bind(this));
    this.ws.addEventListener('error', this.handleError.bind(this));
    this.ws.addEventListener('message', this.handleMessage.bind(this));
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.config.onConnect?.();
    this.emit('connect');
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.clearTimers();
    this.config.onDisconnect?.(event.code, event.reason);
    this.emit('disconnect', event.code, event.reason);

    // Attempt reconnection if not manually disconnected
    if (!this.isManuallyDisconnected && this.shouldReconnect(event.code)) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.config.onError?.(event);
    this.emit('error', event);
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle system messages
      if (message.type === 'pong') {
        return; // Heartbeat response
      }

      this.config.onMessage?.(message);
      this.emit('message', message);
      this.emit(message.type, message.data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (!this.config.heartbeatInterval) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping', data: {} });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    const delay = Math.min(
      this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Check if should attempt reconnection based on close code
   */
  private shouldReconnect(code: number): boolean {
    // Don't reconnect on certain close codes
    const noReconnectCodes = [1000, 1001, 1005, 4000, 4001, 4002, 4003];
    return !noReconnectCodes.includes(code);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}