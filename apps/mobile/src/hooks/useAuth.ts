import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { trpc } from '../lib/trpc';
import { SecureStorage } from '../services/SecureStorage';
import { BiometricService } from '../services/BiometricService';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: true,
  });

  // tRPC mutations
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const refreshTokenMutation = trpc.auth.refreshToken.useMutation();
  const verifyTokenMutation = trpc.auth.verifyToken.useMutation();

  /**
   * Initialize authentication state on app start
   */
  const initializeAuth = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isInitializing: true }));

      // Try to get stored auth token
      const token = await SecureStorage.getAuthToken();
      if (!token) {
        setAuthState(prev => ({ 
          ...prev, 
          isInitializing: false,
          isAuthenticated: false,
          user: null 
        }));
        return;
      }

      // Verify token with server
      const result = await verifyTokenMutation.mutateAsync({ token });
      if (result.valid && result.user) {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: result.user,
          isInitializing: false,
        }));
      } else {
        // Token is invalid, clear it
        await SecureStorage.removeAuthToken();
        await SecureStorage.removeRefreshToken();
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          isInitializing: false,
        }));
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear potentially corrupted tokens
      await SecureStorage.removeAuthToken();
      await SecureStorage.removeRefreshToken();
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        isInitializing: false,
      }));
    }
  }, [verifyTokenMutation]);

  /**
   * Login with email and password
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const result = await loginMutation.mutateAsync(credentials);
      
      // Store tokens securely
      await SecureStorage.storeAuthToken(result.accessToken);
      if (result.refreshToken) {
        await SecureStorage.storeRefreshToken(result.refreshToken);
      }

      // Update auth state
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        user: result.user,
        isLoading: false,
      }));

      // Offer to enable biometric authentication
      const biometricAvailable = await BiometricService.isBiometricAvailable();
      if (biometricAvailable) {
        setTimeout(() => {
          Alert.alert(
            'Enable Biometric Authentication',
            'Would you like to enable biometric authentication for faster login?',
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Enable',
                onPress: () => enableBiometricAuth(credentials.email, result.accessToken),
              },
            ]
          );
        }, 1000);
      }

      return result;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [loginMutation]);

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegisterData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const result = await registerMutation.mutateAsync(data);
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      return result;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [registerMutation]);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Call logout endpoint
      await logoutMutation.mutateAsync();

      // Clear stored tokens and biometric data
      await SecureStorage.removeAuthToken();
      await SecureStorage.removeRefreshToken();
      await BiometricService.removeStoredCredentials();

      // Update auth state
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitializing: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if server logout fails, clear local data
      await SecureStorage.removeAuthToken();
      await SecureStorage.removeRefreshToken();
      await BiometricService.removeStoredCredentials();
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitializing: false,
      });
    }
  }, [logoutMutation]);

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const result = await refreshTokenMutation.mutateAsync({ refreshToken });
      
      // Store new tokens
      await SecureStorage.storeAuthToken(result.accessToken);
      if (result.refreshToken) {
        await SecureStorage.storeRefreshToken(result.refreshToken);
      }

      return result.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout user
      await logout();
      throw error;
    }
  }, [refreshTokenMutation, logout]);

  /**
   * Enable biometric authentication
   */
  const enableBiometricAuth = useCallback(async (email: string, token: string) => {
    try {
      await BiometricService.enableBiometricAuth({ email, token });
      Alert.alert('Success', 'Biometric authentication has been enabled.');
    } catch (error) {
      console.error('Enable biometric auth error:', error);
      Alert.alert('Error', 'Failed to enable biometric authentication.');
    }
  }, []);

  /**
   * Disable biometric authentication
   */
  const disableBiometricAuth = useCallback(async () => {
    try {
      await BiometricService.disableBiometricAuth();
      Alert.alert('Success', 'Biometric authentication has been disabled.');
    } catch (error) {
      console.error('Disable biometric auth error:', error);
      Alert.alert('Error', 'Failed to disable biometric authentication.');
    }
  }, []);

  /**
   * Login with biometric authentication
   */
  const loginWithBiometric = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const credentials = await BiometricService.authenticateAndGetCredentials(
        'Use biometric to sign in'
      );

      if (!credentials) {
        throw new Error('Biometric authentication failed');
      }

      // Verify the stored token is still valid
      const result = await verifyTokenMutation.mutateAsync({ token: credentials.token });
      
      if (result.valid && result.user) {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: result.user,
          isLoading: false,
        }));
      } else {
        // Token expired, need to refresh or re-login
        throw new Error('Stored token is invalid');
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      console.error('Biometric login error:', error);
      throw error;
    }
  }, [verifyTokenMutation]);

  /**
   * Check if biometric authentication is enabled
   */
  const isBiometricEnabled = useCallback(async () => {
    return await BiometricService.hasStoredCredentials();
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return {
    // State
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    isInitializing: authState.isInitializing,

    // Actions
    login,
    register,
    logout,
    refreshToken,
    loginWithBiometric,
    enableBiometricAuth,
    disableBiometricAuth,
    isBiometricEnabled,

    // Utilities
    initializeAuth,
  };
};