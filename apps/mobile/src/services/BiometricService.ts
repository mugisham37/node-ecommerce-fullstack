import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { SecureStorage } from './SecureStorage';

export interface BiometricCredentials {
  email: string;
  token: string;
}

class BiometricServiceClass {
  private rnBiometrics: ReactNativeBiometrics;
  private readonly CREDENTIALS_KEY = 'biometric_credentials';

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: true,
    });
  }

  /**
   * Check if biometric authentication is available on the device
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      return available && (
        biometryType === BiometryTypes.TouchID ||
        biometryType === BiometryTypes.FaceID ||
        biometryType === BiometryTypes.Biometrics
      );
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get the type of biometric authentication available
   */
  async getBiometricType(): Promise<string | null> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      if (!available) return null;

      switch (biometryType) {
        case BiometryTypes.TouchID:
          return 'Touch ID';
        case BiometryTypes.FaceID:
          return 'Face ID';
        case BiometryTypes.Biometrics:
          return 'Biometrics';
        default:
          return 'Biometric';
      }
    } catch (error) {
      console.error('Error getting biometric type:', error);
      return null;
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(promptMessage?: string): Promise<boolean> {
    try {
      const biometricType = await this.getBiometricType();
      const message = promptMessage || `Use ${biometricType || 'biometric'} to authenticate`;

      const { success } = await this.rnBiometrics.simplePrompt({
        promptMessage: message,
        cancelButtonText: 'Cancel',
      });

      return success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Create biometric keys for secure authentication
   */
  async createBiometricKeys(): Promise<boolean> {
    try {
      const { available } = await this.rnBiometrics.isSensorAvailable();
      if (!available) return false;

      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      if (keysExist) return true;

      const { publicKey } = await this.rnBiometrics.createKeys();
      return !!publicKey;
    } catch (error) {
      console.error('Error creating biometric keys:', error);
      return false;
    }
  }

  /**
   * Delete biometric keys
   */
  async deleteBiometricKeys(): Promise<boolean> {
    try {
      const { keysDeleted } = await this.rnBiometrics.deleteKeys();
      return keysDeleted;
    } catch (error) {
      console.error('Error deleting biometric keys:', error);
      return false;
    }
  }

  /**
   * Store credentials for biometric authentication
   */
  async storeCredentials(credentials: BiometricCredentials): Promise<boolean> {
    try {
      const available = await this.isBiometricAvailable();
      if (!available) return false;

      await SecureStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(credentials));
      return true;
    } catch (error) {
      console.error('Error storing biometric credentials:', error);
      return false;
    }
  }

  /**
   * Retrieve stored credentials
   */
  async getStoredCredentials(): Promise<BiometricCredentials | null> {
    try {
      const credentialsString = await SecureStorage.getItem(this.CREDENTIALS_KEY);
      if (!credentialsString) return null;

      return JSON.parse(credentialsString) as BiometricCredentials;
    } catch (error) {
      console.error('Error retrieving biometric credentials:', error);
      return null;
    }
  }

  /**
   * Remove stored credentials
   */
  async removeStoredCredentials(): Promise<boolean> {
    try {
      await SecureStorage.removeItem(this.CREDENTIALS_KEY);
      return true;
    } catch (error) {
      console.error('Error removing biometric credentials:', error);
      return false;
    }
  }

  /**
   * Check if biometric credentials are stored
   */
  async hasStoredCredentials(): Promise<boolean> {
    try {
      const credentials = await this.getStoredCredentials();
      return !!credentials;
    } catch (error) {
      console.error('Error checking stored credentials:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication for a user
   */
  async enableBiometricAuth(credentials: BiometricCredentials): Promise<boolean> {
    try {
      const available = await this.isBiometricAvailable();
      if (!available) {
        throw new Error('Biometric authentication is not available on this device');
      }

      // Create biometric keys if they don't exist
      const keysCreated = await this.createBiometricKeys();
      if (!keysCreated) {
        throw new Error('Failed to create biometric keys');
      }

      // Test authentication
      const authenticated = await this.authenticate('Enable biometric authentication');
      if (!authenticated) {
        throw new Error('Biometric authentication failed');
      }

      // Store credentials
      const stored = await this.storeCredentials(credentials);
      if (!stored) {
        throw new Error('Failed to store credentials');
      }

      return true;
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      throw error;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<boolean> {
    try {
      await this.removeStoredCredentials();
      await this.deleteBiometricKeys();
      return true;
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
      return false;
    }
  }

  /**
   * Authenticate and retrieve credentials
   */
  async authenticateAndGetCredentials(promptMessage?: string): Promise<BiometricCredentials | null> {
    try {
      const hasCredentials = await this.hasStoredCredentials();
      if (!hasCredentials) return null;

      const authenticated = await this.authenticate(promptMessage);
      if (!authenticated) return null;

      return await this.getStoredCredentials();
    } catch (error) {
      console.error('Error in biometric authentication flow:', error);
      return null;
    }
  }
}

export const BiometricService = new BiometricServiceClass();