import { useState, useEffect, useCallback, useContext, createContext, type ReactNode } from 'react';
import { AuthManager, type AuthState, type User } from './manager';
import { createStorage } from './storage';

/**
 * Auth context
 */
const AuthContext = createContext<{
  authManager: AuthManager | null;
  state: AuthState;
}>({
  authManager: null,
  state: {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  },
});

/**
 * Auth provider component
 */
export function AuthProvider({
  children,
  apiUrl,
  storageType,
  onError,
}: {
  children: ReactNode;
  apiUrl: string;
  storageType?: 'browser' | 'memory' | 'async-storage' | 'secure';
  onError?: (error: any) => void;
}) {
  const [authManager] = useState(() => {
    const storage = createStorage({ type: storageType });
    return new AuthManager({
      apiUrl,
      storage,
      onError,
    });
  });

  const [state, setState] = useState<AuthState>(authManager.getState());

  useEffect(() => {
    const handleStateChange = (newState: AuthState) => {
      setState(newState);
    };

    authManager.on('stateChange', handleStateChange);
    return () => {
      authManager.off('stateChange', handleStateChange);
    };
  }, [authManager]);

  return (
    <AuthContext.Provider value={{ authManager, state }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state and methods
 */
export function useAuth() {
  const { authManager, state } = useContext(AuthContext);

  if (!authManager) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const login = useCallback(
    async (email: string, password: string) => {
      return authManager.login(email, password);
    },
    [authManager]
  );

  const register = useCallback(
    async (userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      return authManager.register(userData);
    },
    [authManager]
  );

  const logout = useCallback(async () => {
    return authManager.logout();
  }, [authManager]);

  const refreshTokens = useCallback(async () => {
    return authManager.refreshTokens();
  }, [authManager]);

  const getAccessToken = useCallback(() => {
    return authManager.getAccessToken();
  }, [authManager]);

  return {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    tokens: state.tokens,

    // Methods
    login,
    register,
    logout,
    refreshTokens,
    getAccessToken,
  };
}

/**
 * Hook for protected routes
 */
export function useRequireAuth() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    user,
    canAccess: isAuthenticated && !isLoading,
  };
}

/**
 * Hook for role-based access control
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  const hasRole = useCallback(
    (role: string) => {
      return isAuthenticated && user?.role === role;
    },
    [isAuthenticated, user?.role]
  );

  const hasAnyRole = useCallback(
    (roles: string[]) => {
      return isAuthenticated && user?.role && roles.includes(user.role);
    },
    [isAuthenticated, user?.role]
  );

  const isAdmin = useCallback(() => {
    return hasRole('ADMIN');
  }, [hasRole]);

  const isManager = useCallback(() => {
    return hasAnyRole(['ADMIN', 'MANAGER']);
  }, [hasAnyRole]);

  return {
    hasRole,
    hasAnyRole,
    isAdmin,
    isManager,
    currentRole: user?.role || null,
  };
}

/**
 * Hook for automatic token refresh
 */
export function useTokenRefresh() {
  const { getAccessToken, refreshTokens, isAuthenticated } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshIfNeeded = useCallback(async () => {
    if (!isAuthenticated || isRefreshing) {
      return null;
    }

    const token = getAccessToken();
    if (!token) {
      return null;
    }

    try {
      // Decode JWT to check expiration (simplified)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      
      // Refresh if token expires in the next 5 minutes
      if (expiresAt - now < 5 * 60 * 1000) {
        setIsRefreshing(true);
        await refreshTokens();
        return getAccessToken();
      }

      return token;
    } catch (error) {
      console.error('Token refresh check failed:', error);
      return token;
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, isRefreshing, getAccessToken, refreshTokens]);

  return {
    refreshIfNeeded,
    isRefreshing,
  };
}

/**
 * Hook for handling auth errors
 */
export function useAuthErrorHandler() {
  const { logout } = useAuth();

  const handleAuthError = useCallback(
    async (error: any) => {
      // Handle different types of auth errors
      if (error?.data?.code === 'UNAUTHORIZED' || error?.status === 401) {
        // Token is invalid, logout user
        await logout();
        return true; // Handled
      }

      if (error?.data?.code === 'TOKEN_EXPIRED') {
        // Token expired, try to refresh (handled by useTokenRefresh)
        return false; // Not handled here
      }

      return false; // Not an auth error
    },
    [logout]
  );

  return { handleAuthError };
}