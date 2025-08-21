import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// TODO: Replace with actual User type from @ecommerce/shared
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },
      
      setToken: (token: string) => {
        set({ token });
        // Update localStorage for tRPC client
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth-token', token);
        }
      },
      
      login: (user: User, token: string) => {
        set({ 
          user, 
          token, 
          isAuthenticated: true, 
          isLoading: false 
        });
        // Update localStorage for tRPC client
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth-token', token);
        }
      },
      
      logout: () => {
        set(initialState);
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
        }
      },
      
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },
      
      clearAuth: () => {
        set(initialState);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors for better performance
export const useAuth = () => useAuthStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
}));

export const useAuthActions = () => useAuthStore((state) => ({
  login: state.login,
  logout: state.logout,
  setLoading: state.setLoading,
  clearAuth: state.clearAuth,
}));