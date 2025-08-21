export * from './web';
export * from './mobile';

// Platform detection utilities
export function isWeb(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

export function isMobile(): boolean {
  try {
    require('react-native');
    return true;
  } catch {
    return false;
  }
}

export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions && process.versions.node;
}

export function getPlatform(): 'web' | 'mobile' | 'node' | 'unknown' {
  if (isMobile()) return 'mobile';
  if (isWeb()) return 'web';
  if (isNode()) return 'node';
  return 'unknown';
}

/**
 * Platform-specific client factory
 */
export function createPlatformClient(config: any) {
  const platform = getPlatform();
  
  switch (platform) {
    case 'web':
      const { createWebClient } = require('./web');
      return createWebClient(config);
    
    case 'mobile':
      const { createMobileClient } = require('./mobile');
      return createMobileClient(config);
    
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}