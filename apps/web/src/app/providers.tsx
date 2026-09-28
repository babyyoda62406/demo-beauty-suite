'use client';

import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@fgd/ui';
import { makeQueryClient } from '@/lib/query-client';

/**
 * Client-side provider tree: TanStack Query + toast viewport.
 * A single QueryClient instance is kept per browser session via `useState`.
 */
export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [queryClient] = React.useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
