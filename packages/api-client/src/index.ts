// Main exports
export * from './trpc';
export * from './auth';
export * from './websocket';
export * from './platforms';

// Re-export React and React Native specific modules
export * as React from './react';
export * as ReactNative from './react-native';

// Version
export const VERSION = '1.0.0';

// Default configuration
export const DEFAULT_CONFIG = {
  enableBatching: true,
  enableWebSockets: false,
  enableRetry: true,
  maxRetries: 3,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
};

/**
 * Main API client factory function
 */
export function createApiClient(config: {
  apiUrl: string;
  wsUrl?: string;
  platform?: 'web' | 'mobile' | 'auto';
  enableWebSockets?: boolean;
  getAuthToken?: () => string | null;
  onError?: (error: any) => void;
}) {
  const { createPlatformClient } = require('./platforms');
  
  const platform = config.platform === 'auto' ? undefined : config.platform;
  
  return createPlatformClient({
    ...DEFAULT_CONFIG,
    ...config,
    platform,
  });
}