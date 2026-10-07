'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useStore } from '@/store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }));

  useEffect(() => useStore.subscribe((state, previous) => {
    if (state.token !== previous.token) {
      // Private query results must never survive a logout or account switch.
      queryClient.clear();
    }
  }), [queryClient]);

  useEffect(() => {
    const syncSession = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== 'xoana-store' && event.key !== null)) return;
      if (event.newValue === null) {
        useStore.getState().clearAuth();
      } else {
        void useStore.persist.rehydrate();
      }
    };
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
