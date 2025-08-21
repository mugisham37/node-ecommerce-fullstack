import { createTRPCClient, type TRPCClientConfig } from '../trpc/client';
import { AsyncStorageImpl, SecureStorage } from '../auth/storage';
import { AuthManager } from '../auth/manager';

/**
 * Mobile platform specific configuration and utilities
 */
export interface MobilePlatformConfig extends TRPCClientConfig {
  enableOfflineSync?: boolean;
  enableBackgroundSync?: boolean;
  secureStorage?: boolean;
  networkTimeout?: number;
}

/**
 * Create optimized tRPC client for mobile platforms
 */
export function createMobileClient(config: MobilePlatformConfig) {
  const storage = config.secureStorage ? new SecureStorage() : new AsyncStorageImpl();
  
  const authManager = new AuthManager({
    apiUrl: config.apiUrl,
    storage,
    onError: config.onError,
  });

  const client = createTRPCClient({
    ...config,
    getAuthToken: () => authManager.getAccessToken(),
    // Mobile-specific optimizations
    enableBatching: true, // Reduce network requests
    enableWebSockets: false, // Disable by default for battery life
  });

  return {
    client,
    authManager,
    storage,
  };
}

/**
 * Mobile-specific error handling
 */
export function handleMobileError(error: any) {
  // Handle network timeout
  if (error.message?.includes('timeout')) {
    console.error('Network timeout:', error);
    // Show retry mechanism
    return;
  }

  // Handle no internet connection
  if (error.message?.includes('Network request failed')) {
    console.error('No internet connection:', error);
    // Show offline mode indicator
    return;
  }

  // Handle background app state
  if (error.message?.includes('Background')) {
    console.error('Background execution error:', error);
    // Queue for when app becomes active
    return;
  }

  // Generic mobile error handling
  console.error('Mobile platform error:', error);
}

/**
 * Network state manager for React Native
 */
export class NetworkStateManager {
  private netInfo: any;
  private listeners: ((isConnected: boolean) => void)[] = [];

  constructor() {
    try {
      this.netInfo = require('@react-native-community/netinfo');
    } catch (error) {
      console.warn('NetInfo not available:', error);
    }
  }

  async initialize(): Promise<void> {
    if (!this.netInfo) return;

    // Listen for network state changes
    this.netInfo.addEventListener((state: any) => {
      const isConnected = state.isConnected && state.isInternetReachable;
      this.listeners.forEach(listener => listener(isConnected));
    });
  }

  async getCurrentState(): Promise<{ isConnected: boolean; type: string }> {
    if (!this.netInfo) {
      return { isConnected: true, type: 'unknown' };
    }

    const state = await this.netInfo.fetch();
    return {
      isConnected: state.isConnected && state.isInternetReachable,
      type: state.type,
    };
  }

  addListener(callback: (isConnected: boolean) => void): () => void {
    this.listeners.push(callback);
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

/**
 * Background sync manager for mobile
 */
export class BackgroundSyncManager {
  private pendingOperations: Array<{
    id: string;
    operation: () => Promise<any>;
    retries: number;
    maxRetries: number;
  }> = [];

  private isProcessing = false;

  addOperation(
    id: string,
    operation: () => Promise<any>,
    maxRetries: number = 3
  ): void {
    this.pendingOperations.push({
      id,
      operation,
      retries: 0,
      maxRetries,
    });

    // Process immediately if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.pendingOperations.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.pendingOperations.length > 0) {
      const operation = this.pendingOperations[0];

      try {
        await operation.operation();
        // Success - remove from queue
        this.pendingOperations.shift();
      } catch (error) {
        console.error(`Background sync failed for ${operation.id}:`, error);
        
        operation.retries++;
        if (operation.retries >= operation.maxRetries) {
          // Max retries reached - remove from queue
          console.error(`Max retries reached for ${operation.id}`);
          this.pendingOperations.shift();
        } else {
          // Move to end of queue for retry
          this.pendingOperations.push(this.pendingOperations.shift()!);
        }
      }

      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  getPendingCount(): number {
    return this.pendingOperations.length;
  }

  clear(): void {
    this.pendingOperations = [];
  }
}

/**
 * Mobile performance monitor
 */
export class MobilePerformanceMonitor {
  private startTimes: Map<string, number> = new Map();

  startTimer(label: string): void {
    this.startTimes.set(label, Date.now());
  }

  endTimer(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      console.warn(`Timer ${label} was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(label);
    
    console.log(`${label}: ${duration}ms`);
    
    // Send to analytics
    this.sendMetric(label, duration);
    
    return duration;
  }

  measureMemory(): void {
    if ('performance' in global && 'memory' in performance) {
      const memory = (performance as any).memory;
      const metrics = {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
      };

      console.log('Memory usage:', metrics);
      this.sendMetric('memory', metrics);
    }
  }

  private sendMetric(name: string, value: any): void {
    // Implementation would send to your analytics service
    // e.g., Firebase Analytics, Crashlytics, etc.
  }
}

/**
 * Mobile-specific cache manager with SQLite
 */
export class MobileCacheManager {
  private db: any = null;

  async initialize(): Promise<boolean> {
    try {
      // Use SQLite for mobile caching
      const SQLite = require('react-native-sqlite-storage');
      this.db = await SQLite.openDatabase({
        name: 'api_cache.db',
        location: 'default',
      });

      await this.createTables();
      return true;
    } catch (error) {
      console.error('Failed to initialize mobile cache:', error);
      return false;
    }
  }

  private async createTables(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(query, [], resolve, reject);
      });
    });
  }

  async get(key: string): Promise<any | null> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          'SELECT value, expires_at FROM cache WHERE key = ? AND expires_at > ?',
          [key, Date.now()],
          (_: any, result: any) => {
            if (result.rows.length > 0) {
              try {
                const value = JSON.parse(result.rows.item(0).value);
                resolve(value);
              } catch (error) {
                console.error('Cache parse error:', error);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          },
          () => resolve(null)
        );
      });
    });
  }

  async set(key: string, value: any, ttl: number = 3600000): Promise<void> {
    if (!this.db) return;

    const expiresAt = Date.now() + ttl;
    const serializedValue = JSON.stringify(value);

    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          'INSERT OR REPLACE INTO cache (key, value, expires_at, created_at) VALUES (?, ?, ?, ?)',
          [key, serializedValue, expiresAt, Date.now()],
          resolve,
          reject
        );
      });
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql('DELETE FROM cache WHERE key = ?', [key], resolve, reject);
      });
    });
  }

  async clear(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql('DELETE FROM cache', [], resolve, reject);
      });
    });
  }

  async cleanup(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          'DELETE FROM cache WHERE expires_at <= ?',
          [Date.now()],
          resolve,
          reject
        );
      });
    });
  }
}