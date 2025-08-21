import { createTRPCClient, type TRPCClientConfig } from '../trpc/client';
import { BrowserStorage } from '../auth/storage';
import { AuthManager } from '../auth/manager';

/**
 * Web platform specific configuration and utilities
 */
export interface WebPlatformConfig extends TRPCClientConfig {
  enableServiceWorker?: boolean;
  enableOfflineSupport?: boolean;
  cacheStrategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

/**
 * Create optimized tRPC client for web platforms
 */
export function createWebClient(config: WebPlatformConfig) {
  const storage = new BrowserStorage();
  
  const authManager = new AuthManager({
    apiUrl: config.apiUrl,
    storage,
    onError: config.onError,
  });

  const client = createTRPCClient({
    ...config,
    getAuthToken: () => authManager.getAccessToken(),
  });

  return {
    client,
    authManager,
    storage,
  };
}

/**
 * Web-specific error handling
 */
export function handleWebError(error: any) {
  // Handle network errors
  if (error.message?.includes('fetch')) {
    console.error('Network error:', error);
    // Show offline indicator or retry mechanism
    return;
  }

  // Handle CORS errors
  if (error.message?.includes('CORS')) {
    console.error('CORS error:', error);
    // Show appropriate error message
    return;
  }

  // Handle quota exceeded (localStorage)
  if (error.name === 'QuotaExceededError') {
    console.error('Storage quota exceeded:', error);
    // Clear old data or show storage warning
    return;
  }

  // Generic error handling
  console.error('Web platform error:', error);
}

/**
 * Service Worker utilities for offline support
 */
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;

  async register(scriptUrl: string = '/sw.js'): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register(scriptUrl);
      console.log('Service Worker registered:', this.registration);
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      this.registration = null;
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  async update(): Promise<void> {
    if (this.registration) {
      await this.registration.update();
    }
  }

  onUpdateAvailable(callback: () => void): void {
    if (!this.registration) return;

    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            callback();
          }
        });
      }
    });
  }
}

/**
 * Web performance monitoring
 */
export class WebPerformanceMonitor {
  private observer: PerformanceObserver | null = null;

  start() {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          this.logNavigationTiming(entry as PerformanceNavigationTiming);
        } else if (entry.entryType === 'resource') {
          this.logResourceTiming(entry as PerformanceResourceTiming);
        }
      });
    });

    this.observer.observe({ entryTypes: ['navigation', 'resource'] });
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private logNavigationTiming(entry: PerformanceNavigationTiming) {
    const metrics = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      dom: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      load: entry.loadEventEnd - entry.loadEventStart,
    };

    console.log('Navigation timing:', metrics);
    
    // Send to analytics service
    this.sendMetrics('navigation', metrics);
  }

  private logResourceTiming(entry: PerformanceResourceTiming) {
    if (entry.name.includes('/trpc/')) {
      const metrics = {
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize,
        cached: entry.transferSize === 0,
      };

      console.log('API timing:', metrics);
      
      // Send to analytics service
      this.sendMetrics('api', metrics);
    }
  }

  private sendMetrics(type: string, metrics: any) {
    // Implementation would send to your analytics service
    // e.g., Google Analytics, DataDog, etc.
  }
}

/**
 * Web-specific caching utilities
 */
export class WebCacheManager {
  private cache: Cache | null = null;

  async initialize(cacheName: string = 'api-cache'): Promise<boolean> {
    if (!('caches' in window)) {
      console.warn('Cache API not supported');
      return false;
    }

    try {
      this.cache = await caches.open(cacheName);
      return true;
    } catch (error) {
      console.error('Failed to initialize cache:', error);
      return false;
    }
  }

  async get(request: Request | string): Promise<Response | undefined> {
    if (!this.cache) return undefined;

    try {
      return await this.cache.match(request);
    } catch (error) {
      console.error('Cache get error:', error);
      return undefined;
    }
  }

  async put(request: Request | string, response: Response): Promise<void> {
    if (!this.cache) return;

    try {
      await this.cache.put(request, response.clone());
    } catch (error) {
      console.error('Cache put error:', error);
    }
  }

  async delete(request: Request | string): Promise<boolean> {
    if (!this.cache) return false;

    try {
      return await this.cache.delete(request);
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.cache) return;

    try {
      const keys = await this.cache.keys();
      await Promise.all(keys.map(key => this.cache!.delete(key)));
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}