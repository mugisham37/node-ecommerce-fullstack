import type { AuthStorage } from './manager';

/**
 * Browser localStorage implementation
 */
export class BrowserStorage implements AuthStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get item from localStorage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to set item in localStorage:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item from localStorage:', error);
      throw error;
    }
  }
}

/**
 * Memory storage implementation (for testing or fallback)
 */
export class MemoryStorage implements AuthStorage {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

/**
 * React Native AsyncStorage implementation
 */
export class AsyncStorageImpl implements AuthStorage {
  private AsyncStorage: any;

  constructor() {
    try {
      // Dynamically import AsyncStorage to avoid issues in non-RN environments
      this.AsyncStorage = require('@react-native-async-storage/async-storage').default;
    } catch (error) {
      throw new Error('AsyncStorage is not available. Make sure @react-native-async-storage/async-storage is installed.');
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get item from AsyncStorage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to set item in AsyncStorage:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item from AsyncStorage:', error);
      throw error;
    }
  }
}

/**
 * Secure storage implementation for React Native
 */
export class SecureStorage implements AuthStorage {
  private Keychain: any;

  constructor() {
    try {
      // Dynamically import Keychain to avoid issues in non-RN environments
      this.Keychain = require('react-native-keychain');
    } catch (error) {
      throw new Error('Keychain is not available. Make sure react-native-keychain is installed.');
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const credentials = await this.Keychain.getInternetCredentials(key);
      return credentials ? credentials.password : null;
    } catch (error) {
      console.error('Failed to get item from Keychain:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.Keychain.setInternetCredentials(key, key, value);
    } catch (error) {
      console.error('Failed to set item in Keychain:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.Keychain.resetInternetCredentials(key);
    } catch (error) {
      console.error('Failed to remove item from Keychain:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create appropriate storage based on environment
 */
export function createStorage(options: {
  type?: 'browser' | 'memory' | 'async-storage' | 'secure';
  secure?: boolean;
} = {}): AuthStorage {
  const { type, secure = false } = options;

  // Auto-detect environment if type not specified
  if (!type) {
    if (typeof window !== 'undefined' && window.localStorage) {
      return new BrowserStorage();
    } else if (typeof require !== 'undefined') {
      try {
        require('react-native');
        return secure ? new SecureStorage() : new AsyncStorageImpl();
      } catch {
        return new MemoryStorage();
      }
    } else {
      return new MemoryStorage();
    }
  }

  switch (type) {
    case 'browser':
      return new BrowserStorage();
    case 'memory':
      return new MemoryStorage();
    case 'async-storage':
      return new AsyncStorageImpl();
    case 'secure':
      return new SecureStorage();
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
}