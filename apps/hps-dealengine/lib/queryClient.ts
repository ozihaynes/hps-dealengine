import { QueryClient } from '@tanstack/react-query';

/**
 * React Query client configuration for HPS DealEngine
 *
 * Stale times calibrated for real estate deal data:
 * - Deal data: 30s (changes infrequently during session)
 * - List data: 60s (pagination can tolerate slight staleness)
 * - Analysis runs: 0 (always fresh after mutation)
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 30 seconds
        staleTime: 30 * 1000,

        // Keep unused data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,

        // Retry failed requests up to 3 times
        retry: 3,

        // Exponential backoff: 1s, 2s, 4s
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch on window focus for fresh data
        refetchOnWindowFocus: true,

        // Don't refetch on reconnect (user can manually refresh)
        refetchOnReconnect: false,
      },
      mutations: {
        // Retry mutations once (important for analysis runs)
        retry: 1,
      },
    },
  });
}

/**
 * Query key factory for type-safe, consistent query keys
 *
 * Usage:
 *   queryKey: queryKeys.deal.detail(dealId)
 *   queryKey: queryKeys.deals.list({ filter: 'active' })
 */
export const queryKeys = {
  // Deal queries
  deal: {
    all: ['deals'] as const,
    lists: () => [...queryKeys.deal.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.deal.lists(), filters] as const,
    details: () => [...queryKeys.deal.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.deal.details(), id] as const,
    dashboard: (id: string) =>
      [...queryKeys.deal.detail(id), 'dashboard'] as const,
  },

  // Analysis/run queries
  analysis: {
    all: ['analysis'] as const,
    byDeal: (dealId: string) => [...queryKeys.analysis.all, dealId] as const,
    latest: (dealId: string) =>
      [...queryKeys.analysis.byDeal(dealId), 'latest'] as const,
    history: (dealId: string) =>
      [...queryKeys.analysis.byDeal(dealId), 'history'] as const,
  },

  // Pipeline/portfolio queries
  pipeline: {
    all: ['pipeline'] as const,
    summary: () => [...queryKeys.pipeline.all, 'summary'] as const,
    byVerdict: (verdict: string) =>
      [...queryKeys.pipeline.all, 'verdict', verdict] as const,
  },
} as const;
