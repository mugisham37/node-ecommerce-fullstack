'use client';

import { TRPCProvider } from './TRPCProvider';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from '../notifications/ToastProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <TRPCProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </TRPCProvider>
  );
};