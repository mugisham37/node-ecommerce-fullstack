'use client';

import { TRPCProvider } from './TRPCProvider';
import { AuthProvider } from './AuthProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <TRPCProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </TRPCProvider>
  );
};