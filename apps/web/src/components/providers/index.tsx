'use client';

import { TRPCProvider } from './trpc-provider';
import { ThemeProvider } from './theme-provider';
import { ToastProvider } from './toast-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ecommerce-ui-theme">
      <TRPCProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </TRPCProvider>
    </ThemeProvider>
  );
}

export { useTheme } from './theme-provider';
export { useToast } from './toast-provider';
export { api } from './trpc-provider';