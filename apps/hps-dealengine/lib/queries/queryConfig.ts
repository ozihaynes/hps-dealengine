/**
 * Query Configuration - Shared timing and retry settings
 *
 * Centralizes stale times, garbage collection, and retry logic
 * for consistent caching behavior across all queries.
 *
 * @module lib/queries/queryConfig
 * @version 1.0.0 (Slice 22 - Data Layer Integration)
 */

// ============================================================================
// TIME CONSTANTS (in milliseconds)
// ============================================================================

/** Time constants for readability */
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
} as const;

// ============================================================================
// STALE TIME CONFIGURATIONS
// ============================================================================

/**
 * Stale time configurations by query type
 *
 * Stale time = how long data is considered "fresh"
 * During this time, React Query will not refetch on mount/focus
 */
export const STALE_TIMES = {
  /** Dashboard/snapshot - needs to be relatively fresh */
  dashboard: 30 * TIME.SECOND, // 30 seconds

  /** Deal lists - moderate freshness */
  dealsList: 60 * TIME.SECOND, // 1 minute

  /** Deal detail - moderate freshness */
  dealDetail: 60 * TIME.SECOND, // 1 minute

  /** Latest snapshot - needs freshness after runs */
  snapshotLatest: 10 * TIME.SECOND, // 10 seconds

  /** Snapshot list - moderate freshness */
  snapshotList: 30 * TIME.SECOND, // 30 seconds

  /** Pipeline summary - aggregate, less volatile */
  pipelineSummary: 60 * TIME.SECOND, // 1 minute

  /** Comps - moderate freshness */
  comps: 2 * TIME.MINUTE, // 2 minutes
} as const;

// ============================================================================
// GARBAGE COLLECTION CONFIGURATIONS
// ============================================================================

/**
 * Garbage collection (gcTime) configurations
 *
 * GC time = how long inactive queries stay in cache
 * After this time, unused query data is garbage collected
 */
export const GC_TIMES = {
  /** Standard GC time for most queries */
  standard: 5 * TIME.MINUTE, // 5 minutes

  /** Short GC for frequently changing data */
  short: 2 * TIME.MINUTE, // 2 minutes

  /** Long GC for stable data */
  long: 10 * TIME.MINUTE, // 10 minutes

  /** Extended GC for rarely accessed data */
  extended: 30 * TIME.MINUTE, // 30 minutes
} as const;

// ============================================================================
// RETRY CONFIGURATIONS
// ============================================================================

/**
 * Retry configuration for failed queries
 */
export const RETRY_CONFIG = {
  /** Default retry count */
  retryCount: 3,

  /** Retry delay function (exponential backoff) */
  retryDelay: (attemptIndex: number): number =>
    Math.min(1000 * 2 ** attemptIndex, 30000),

  /** Status codes that should not trigger retry */
  noRetryStatusCodes: [401, 403, 404, 422],
} as const;

// ============================================================================
// QUERY DEFAULT OPTIONS
// ============================================================================

/**
 * Default options for queries by type
 */
export const DEFAULT_QUERY_OPTIONS = {
  dashboard: {
    staleTime: STALE_TIMES.dashboard,
    gcTime: GC_TIMES.standard,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: RETRY_CONFIG.retryCount,
    retryDelay: RETRY_CONFIG.retryDelay,
  },

  dealsList: {
    staleTime: STALE_TIMES.dealsList,
    gcTime: GC_TIMES.standard,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: RETRY_CONFIG.retryCount,
    retryDelay: RETRY_CONFIG.retryDelay,
  },

  dealDetail: {
    staleTime: STALE_TIMES.dealDetail,
    gcTime: GC_TIMES.standard,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: RETRY_CONFIG.retryCount,
    retryDelay: RETRY_CONFIG.retryDelay,
  },

  snapshotLatest: {
    staleTime: STALE_TIMES.snapshotLatest,
    gcTime: GC_TIMES.short,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: RETRY_CONFIG.retryCount,
    retryDelay: RETRY_CONFIG.retryDelay,
  },

  snapshotList: {
    staleTime: STALE_TIMES.snapshotList,
    gcTime: GC_TIMES.standard,
    refetchOnWindowFocus: true,
    retry: RETRY_CONFIG.retryCount,
    retryDelay: RETRY_CONFIG.retryDelay,
  },

  pipelineSummary: {
    staleTime: STALE_TIMES.pipelineSummary,
    gcTime: GC_TIMES.standard,
    refetchOnWindowFocus: true,
    retry: RETRY_CONFIG.retryCount,
    retryDelay: RETRY_CONFIG.retryDelay,
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if an error should trigger a retry
 */
export function shouldRetry(error: unknown, attemptIndex: number): boolean {
  // Max retries exceeded
  if (attemptIndex >= RETRY_CONFIG.retryCount) {
    return false;
  }

  // Check for HTTP status codes that should not retry
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    if (
      (RETRY_CONFIG.noRetryStatusCodes as readonly number[]).includes(status)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Get query options merged with defaults
 */
export function getQueryOptions<T extends keyof typeof DEFAULT_QUERY_OPTIONS>(
  type: T,
  overrides?: Partial<(typeof DEFAULT_QUERY_OPTIONS)[T]>
): (typeof DEFAULT_QUERY_OPTIONS)[T] {
  return {
    ...DEFAULT_QUERY_OPTIONS[type],
    ...overrides,
  } as (typeof DEFAULT_QUERY_OPTIONS)[T];
}

export default {
  TIME,
  STALE_TIMES,
  GC_TIMES,
  RETRY_CONFIG,
  DEFAULT_QUERY_OPTIONS,
  shouldRetry,
  getQueryOptions,
};
