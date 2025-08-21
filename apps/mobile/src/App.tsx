import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {PaperProvider} from 'react-native-paper';
import Toast from 'react-native-toast-message';

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {trpc} from '@/lib/trpc';
import {AppNavigator} from '@/navigation/AppNavigator';
import {AuthProvider} from '@/providers/AuthProvider';
import {theme} from '@/constants/theme';
import {toastConfig} from '@/constants/toastConfig';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const trpcClient = trpc.createClient({
  url: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/trpc',
  transformer: undefined, // Will be configured in trpc setup
});

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <StatusBar
                  barStyle="dark-content"
                  backgroundColor={theme.colors.surface}
                />
                <AppNavigator />
                <Toast config={toastConfig} />
              </AuthProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;