'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { token, clearAuth } = useAuthStore();

  useEffect(() => {
    // Check if token is expired on app load
    if (token) {
      try {
        // Decode JWT token to check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (payload.exp < currentTime) {
          // Token is expired, clear auth
          clearAuth();
        }
      } catch (error) {
        // Invalid token format, clear auth
        clearAuth();
      }
    }
  }, [token, clearAuth]);

  return <>{children}</>;
};