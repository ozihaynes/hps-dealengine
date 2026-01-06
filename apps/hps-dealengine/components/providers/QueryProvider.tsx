'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { createQueryClient } from '@/lib/queryClient';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query provider with devtools
 *
 * Creates a new QueryClient per component instance to avoid
 * sharing state between users in SSR scenarios.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create client once per component instance
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
