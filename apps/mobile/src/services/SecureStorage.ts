import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

export interface SecureStorageOptions {
  accessGroup?: string;
  touchID?: boolean;
  showModal?: boolean;
  kLocalizedFallbackTitle?: string;
}

class SecureStorageClass {
  private readonly SERVICE_NAME = 'InventoryApp';

  /**
   * Store a key-value pair securely
   */
  async setItem(
    key: string,
    value: string,
    options?: SecureStorageOptions
  ): Promise<boolean> {
    try {
      const keychainOptions: Keychain.Options = {
        service: this.SERVICE_NAME,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
        ...options,
      };

      // For iOS, we can use additional security options
      if (Platform.OS === 'ios') {
        keychainOptions.accessGroup = options?.accessGroup;
        keychainOptions.touchID = options?.touchID ?? true;
        keychainOptions.showModal = options?.showModal ?? true;
        keychainOptions.kLocalizedFallbackTitle = 
          options?.kLocalizedFallbackTitle ?? 'Use Passcode';
      }

      const result = await Keychain.setInternetCredentials(
        key,
        key,
        value,
        keychainOptions
      );

      return result !== false;
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
      return false;
    }
  }

  /**
   * Retrieve a value by key
   */
  async getItem(key: string, options?: SecureStorageOptions): Promise<string | null> {
    try {
      const keychainOptions: Keychain.Options = {
        service: this.SERVICE_NAME,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
        ...options,
      };

      if (Platform.OS === 'ios') {
        keychainOptions.accessGroup = options?.accessGroup;
        keychainOptions.touchID = options?.touchID ?? true;
        keychainOptions.showModal = options?.showModal ?? true;
        keychainOptions.kLocalizedFallbackTitle = 
          options?.kLocalizedFallbackTitle ?? 'Use Passcode';
      }

      const credentials = await Keychain.getInternetCredentials(key, keychainOptions);

      if (credentials && credentials.password) {
        return credentials.password;
      }

      return null;
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  }

  /**
   * Remove a key-value pair
   */
  async removeItem(key: string): Promise<boolean> {
    try {
      const result = await Keychain.resetInternetCredentials(key, {
        service: this.SERVICE_NAME,
      });
      return result;
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async hasItem(key: string): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(key, {
        service: this.SERVICE_NAME,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
      });
      return credentials !== false;
    } catch (error) {
      // If authentication fails or key doesn't exist, return false
      return false;
    }
  }

  /**
   * Get all stored keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      // Note: Keychain doesn't provide a direct way to get all keys
      // This is a limitation of the secure storage approach
      // In practice, you'd maintain a list of keys in your app state
      console.warn('getAllKeys is not supported by Keychain. Maintain keys list in app state.');
      return [];
    } catch (error) {
      console.error('SecureStorage getAllKeys error:', error);
      return [];
    }
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<boolean> {
    try {
      // Note: This will reset all credentials for the service
      const result = await Keychain.resetGenericPassword({
        service: this.SERVICE_NAME,
      });
      return result;
    } catch (error) {
      console.error('SecureStorage clear error:', error);
      return false;
    }
  }

  /**
   * Store user credentials securely
   */
  async storeUserCredentials(
    username: string,
    password: string,
    options?: SecureStorageOptions
  ): Promise<boolean> {
    try {
      const keychainOptions: Keychain.Options = {
        service: this.SERVICE_NAME,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
        ...options,
      };

      const result = await Keychain.setInternetCredentials(
        'user_credentials',
        username,
        password,
        keychainOptions
      );

      return result !== false;
    } catch (error) {
      console.error('SecureStorage storeUserCredentials error:', error);
      return false;
    }
  }

  /**
   * Retrieve user credentials
   */
  async getUserCredentials(options?: SecureStorageOptions): Promise<{
    username: string;
    password: string;
  } | null> {
    try {
      const keychainOptions: Keychain.Options = {
        service: this.SERVICE_NAME,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
        ...options,
      };

      const credentials = await Keychain.getInternetCredentials(
        'user_credentials',
        keychainOptions
      );

      if (credentials && credentials.username && credentials.password) {
        return {
          username: credentials.username,
          password: credentials.password,
        };
      }

      return null;
    } catch (error) {
      console.error('SecureStorage getUserCredentials error:', error);
      return null;
    }
  }

  /**
   * Remove user credentials
   */
  async removeUserCredentials(): Promise<boolean> {
    try {
      const result = await Keychain.resetInternetCredentials('user_credentials', {
        service: this.SERVICE_NAME,
      });
      return result;
    } catch (error) {
      console.error('SecureStorage removeUserCredentials error:', error);
      return false;
    }
  }

  /**
   * Store authentication token securely
   */
  async storeAuthToken(token: string, options?: SecureStorageOptions): Promise<boolean> {
    return this.setItem('auth_token', token, options);
  }

  /**
   * Retrieve authentication token
   */
  async getAuthToken(options?: SecureStorageOptions): Promise<string | null> {
    return this.getItem('auth_token', options);
  }

  /**
   * Remove authentication token
   */
  async removeAuthToken(): Promise<boolean> {
    return this.removeItem('auth_token');
  }

  /**
   * Store refresh token securely
   */
  async storeRefreshToken(token: string, options?: SecureStorageOptions): Promise<boolean> {
    return this.setItem('refresh_token', token, options);
  }

  /**
   * Retrieve refresh token
   */
  async getRefreshToken(options?: SecureStorageOptions): Promise<string | null> {
    return this.getItem('refresh_token', options);
  }

  /**
   * Remove refresh token
   */
  async removeRefreshToken(): Promise<boolean> {
    return this.removeItem('refresh_token');
  }

  /**
   * Check if biometric authentication is supported
   */
  async isBiometricSupported(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      console.error('SecureStorage isBiometricSupported error:', error);
      return false;
    }
  }

  /**
   * Get supported biometry type
   */
  async getSupportedBiometryType(): Promise<string | null> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType;
    } catch (error) {
      console.error('SecureStorage getSupportedBiometryType error:', error);
      return null;
    }
  }
}

export const SecureStorage = new SecureStorageClass();