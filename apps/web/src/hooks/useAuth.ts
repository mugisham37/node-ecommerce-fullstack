import { useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/mocks';

// Temporary types until proper packages are installed
interface LoginCredentialsDTO {
  email: string;
  password: string;
}

interface RegisterDataDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface PasswordResetDTO {
  email: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthHookReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentialsDTO) => Promise<void>;
  register: (data: RegisterDataDTO) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (data: PasswordResetDTO) => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAuth = (): AuthHookReturn => {
  const {
    user,
    isAuthenticated,
    isLoading,
    login: setLogin,
    logout: clearAuth,
    setLoading,
  } = useAuthStore();

  // Login mutation
  const loginMutation = api.auth.login.useMutation({
    onSuccess: (data) => {
      setLogin(data.user, data.token);
    },
    onError: (error) => {
      console.error('Login error:', error);
      throw error;
    },
  });

  // Register mutation
  const registerMutation = api.auth.register.useMutation({
    onSuccess: (data) => {
      setLogin(data.user, data.token);
    },
    onError: (error) => {
      console.error('Register error:', error);
      throw error;
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = api.auth.forgotPassword.useMutation({
    onError: (error) => {
      console.error('Forgot password error:', error);
      throw error;
    },
  });

  // Refresh token mutation
  const refreshTokenMutation = api.auth.refreshToken.useMutation({
    onSuccess: (data) => {
      setLogin(data.user, data.token);
    },
    onError: (error) => {
      console.error('Refresh token error:', error);
      clearAuth();
      throw error;
    },
  });

  const login = useCallback(
    async (credentials: LoginCredentialsDTO) => {
      setLoading(true);
      try {
        await loginMutation.mutateAsync(credentials);
      } finally {
        setLoading(false);
      }
    },
    [loginMutation, setLoading]
  );

  const register = useCallback(
    async (data: RegisterDataDTO) => {
      setLoading(true);
      try {
        await registerMutation.mutateAsync(data);
      } finally {
        setLoading(false);
      }
    },
    [registerMutation, setLoading]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      // Call logout API if needed
      // await api.auth.logout.mutate();
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth, setLoading]);

  const forgotPassword = useCallback(
    async (data: PasswordResetDTO) => {
      await forgotPasswordMutation.mutateAsync(data);
    },
    [forgotPasswordMutation]
  );

  const refreshToken = useCallback(async () => {
    if (!user) return;
    
    try {
      await refreshTokenMutation.mutateAsync();
    } catch (error) {
      // Token refresh failed, user will be logged out
      console.error('Token refresh failed:', error);
    }
  }, [refreshTokenMutation, user]);

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    login,
    register,
    logout,
    forgotPassword,
    refreshToken,
  };
};