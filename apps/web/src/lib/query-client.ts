import { QueryClient } from '@tanstack/react-query';

/**
 * Factory for a TanStack Query client with sensible SaaS defaults:
 * conservative retries, a short stale window, and no refetch-on-focus storms.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
