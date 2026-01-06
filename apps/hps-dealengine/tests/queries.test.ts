/**
 * React Query Data Layer Tests - Slice 22
 *
 * Comprehensive tests for:
 * - Query keys factory functions
 * - Query configuration constants
 * - React Query hook exports
 * - Helper functions
 *
 * Target: 30+ assertions covering all exports
 *
 * @module tests/queries.test.ts
 * @version 1.0.0 (Slice 22 - Data Layer Integration)
 */

import { describe, it, expect, vi } from "vitest";

// =============================================================================
// MOCKS - Must be before imports
// =============================================================================

vi.mock("../lib/supabaseClient", () => ({
  getSupabaseClient: () => ({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: vi.fn() },
  }),
}));

vi.mock("../lib/snapshot-api", () => ({
  getSnapshot: vi.fn(),
  generateSnapshot: vi.fn(),
  listSnapshots: vi.fn(),
}));

// =============================================================================
// QUERY KEYS IMPORTS
// =============================================================================

import {
  queryKeys,
  type DealFilters,
  type SnapshotFilters,
} from "@/lib/queries/queryKeys";

// =============================================================================
// QUERY CONFIG IMPORTS
// =============================================================================

import {
  TIME,
  STALE_TIMES,
  GC_TIMES,
  RETRY_CONFIG,
  DEFAULT_QUERY_OPTIONS,
  shouldRetry,
  getQueryOptions,
} from "@/lib/queries/queryConfig";

// =============================================================================
// HOOK IMPORTS
// =============================================================================

import {
  useDealDashboard,
  prefetchDealDashboard,
  invalidateDealDashboard,
  invalidateAllDashboards,
} from "@/lib/queries/useDealDashboard";

import {
  useSnapshotList,
  prefetchSnapshotList,
  invalidateSnapshotLists,
} from "@/lib/queries/useSnapshotList";

import {
  useGenerateSnapshot,
  useRunAnalysis,
} from "@/lib/queries/useGenerateSnapshot";

import {
  usePipelineSummary,
  prefetchPipelineSummary,
  invalidatePipelineSummary,
} from "@/lib/queries/usePipelineSummary";

// =============================================================================
// QUERY KEYS TESTS
// =============================================================================

describe("queryKeys", () => {
  it("should export queryKeys object", () => {
    expect(queryKeys).toBeDefined();
    expect(typeof queryKeys).toBe("object");
  });

  it("should have deals domain with all key generators", () => {
    expect(queryKeys.deals).toBeDefined();
    expect(queryKeys.deals.all).toEqual(["deals"]);
    expect(typeof queryKeys.deals.lists).toBe("function");
    expect(typeof queryKeys.deals.list).toBe("function");
    expect(typeof queryKeys.deals.details).toBe("function");
    expect(typeof queryKeys.deals.detail).toBe("function");
  });

  it("should have snapshots domain with all key generators", () => {
    expect(queryKeys.snapshots).toBeDefined();
    expect(queryKeys.snapshots.all).toEqual(["snapshots"]);
    expect(typeof queryKeys.snapshots.lists).toBe("function");
    expect(typeof queryKeys.snapshots.list).toBe("function");
    expect(typeof queryKeys.snapshots.byDeal).toBe("function");
    expect(typeof queryKeys.snapshots.latest).toBe("function");
  });

  it("should have analysis domain with key generators", () => {
    expect(queryKeys.analysis).toBeDefined();
    expect(queryKeys.analysis.all).toEqual(["analysis"]);
    expect(typeof queryKeys.analysis.byDeal).toBe("function");
  });

  it("should have pipeline domain with key generators", () => {
    expect(queryKeys.pipeline).toBeDefined();
    expect(queryKeys.pipeline.all).toEqual(["pipeline"]);
    expect(typeof queryKeys.pipeline.summary).toBe("function");
  });

  it("should generate correct deals.list keys", () => {
    const filters: DealFilters = { status: ["active"], verdict: ["GO"] };
    const key = queryKeys.deals.list(filters);
    expect(key).toEqual(["deals", "list", filters]);
  });

  it("should generate correct deals.detail keys", () => {
    const key = queryKeys.deals.detail("deal-123");
    expect(key).toEqual(["deals", "detail", "deal-123"]);
  });

  it("should generate correct snapshots.latest keys", () => {
    const key = queryKeys.snapshots.latest("deal-456");
    expect(key).toEqual(["snapshots", "deal", "deal-456", "latest"]);
  });

  it("should generate correct pipeline.summary keys", () => {
    const key = queryKeys.pipeline.summary();
    expect(key).toEqual(["pipeline", "summary"]);
  });
});

// =============================================================================
// TIME CONSTANTS TESTS
// =============================================================================

describe("TIME constants", () => {
  it("should export TIME object with correct values", () => {
    expect(TIME).toBeDefined();
    expect(TIME.SECOND).toBe(1000);
    expect(TIME.MINUTE).toBe(60 * 1000);
    expect(TIME.HOUR).toBe(60 * 60 * 1000);
  });
});

// =============================================================================
// STALE TIMES TESTS
// =============================================================================

describe("STALE_TIMES", () => {
  it("should export STALE_TIMES with all timing configs", () => {
    expect(STALE_TIMES).toBeDefined();
    expect(STALE_TIMES.dashboard).toBeDefined();
    expect(STALE_TIMES.dealsList).toBeDefined();
    expect(STALE_TIMES.dealDetail).toBeDefined();
    expect(STALE_TIMES.snapshotLatest).toBeDefined();
    expect(STALE_TIMES.snapshotList).toBeDefined();
    expect(STALE_TIMES.pipelineSummary).toBeDefined();
  });

  it("should have reasonable stale time values", () => {
    // Stale times should be positive and reasonable (< 1 hour)
    Object.values(STALE_TIMES).forEach((time) => {
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThanOrEqual(TIME.HOUR);
    });
  });
});

// =============================================================================
// GC TIMES TESTS
// =============================================================================

describe("GC_TIMES", () => {
  it("should export GC_TIMES with all configs", () => {
    expect(GC_TIMES).toBeDefined();
    expect(GC_TIMES.standard).toBeDefined();
    expect(GC_TIMES.short).toBeDefined();
    expect(GC_TIMES.long).toBeDefined();
    expect(GC_TIMES.extended).toBeDefined();
  });

  it("should have GC times in ascending order", () => {
    expect(GC_TIMES.short).toBeLessThan(GC_TIMES.standard);
    expect(GC_TIMES.standard).toBeLessThan(GC_TIMES.long);
    expect(GC_TIMES.long).toBeLessThan(GC_TIMES.extended);
  });
});

// =============================================================================
// RETRY CONFIG TESTS
// =============================================================================

describe("RETRY_CONFIG", () => {
  it("should export RETRY_CONFIG with all settings", () => {
    expect(RETRY_CONFIG).toBeDefined();
    expect(RETRY_CONFIG.retryCount).toBeDefined();
    expect(RETRY_CONFIG.retryDelay).toBeDefined();
    expect(RETRY_CONFIG.noRetryStatusCodes).toBeDefined();
  });

  it("should have reasonable retry count", () => {
    expect(RETRY_CONFIG.retryCount).toBeGreaterThanOrEqual(1);
    expect(RETRY_CONFIG.retryCount).toBeLessThanOrEqual(5);
  });

  it("should include common non-retryable status codes", () => {
    const codes = RETRY_CONFIG.noRetryStatusCodes;
    expect(codes).toContain(401); // Unauthorized
    expect(codes).toContain(403); // Forbidden
    expect(codes).toContain(404); // Not Found
  });

  it("should calculate exponential backoff delay", () => {
    const delay0 = RETRY_CONFIG.retryDelay(0);
    const delay1 = RETRY_CONFIG.retryDelay(1);
    const delay2 = RETRY_CONFIG.retryDelay(2);

    expect(delay0).toBe(1000); // 1s
    expect(delay1).toBe(2000); // 2s
    expect(delay2).toBe(4000); // 4s
  });
});

// =============================================================================
// DEFAULT QUERY OPTIONS TESTS
// =============================================================================

describe("DEFAULT_QUERY_OPTIONS", () => {
  it("should export options for all query types", () => {
    expect(DEFAULT_QUERY_OPTIONS).toBeDefined();
    expect(DEFAULT_QUERY_OPTIONS.dashboard).toBeDefined();
    expect(DEFAULT_QUERY_OPTIONS.dealsList).toBeDefined();
    expect(DEFAULT_QUERY_OPTIONS.dealDetail).toBeDefined();
    expect(DEFAULT_QUERY_OPTIONS.snapshotLatest).toBeDefined();
    expect(DEFAULT_QUERY_OPTIONS.snapshotList).toBeDefined();
    expect(DEFAULT_QUERY_OPTIONS.pipelineSummary).toBeDefined();
  });

  it("should include staleTime in all options", () => {
    Object.values(DEFAULT_QUERY_OPTIONS).forEach((options) => {
      expect(options.staleTime).toBeDefined();
      expect(typeof options.staleTime).toBe("number");
    });
  });

  it("should include gcTime in all options", () => {
    Object.values(DEFAULT_QUERY_OPTIONS).forEach((options) => {
      expect(options.gcTime).toBeDefined();
      expect(typeof options.gcTime).toBe("number");
    });
  });
});

// =============================================================================
// HELPER FUNCTIONS TESTS
// =============================================================================

describe("shouldRetry", () => {
  it("should return false when max retries exceeded", () => {
    const result = shouldRetry(new Error("test"), RETRY_CONFIG.retryCount);
    expect(result).toBe(false);
  });

  it("should return false for 401 errors", () => {
    const result = shouldRetry({ status: 401 }, 0);
    expect(result).toBe(false);
  });

  it("should return false for 403 errors", () => {
    const result = shouldRetry({ status: 403 }, 0);
    expect(result).toBe(false);
  });

  it("should return false for 404 errors", () => {
    const result = shouldRetry({ status: 404 }, 0);
    expect(result).toBe(false);
  });

  it("should return true for 500 errors", () => {
    const result = shouldRetry({ status: 500 }, 0);
    expect(result).toBe(true);
  });

  it("should return true for generic errors", () => {
    const result = shouldRetry(new Error("network error"), 0);
    expect(result).toBe(true);
  });
});

describe("getQueryOptions", () => {
  it("should return options for dashboard type", () => {
    const options = getQueryOptions("dashboard");
    expect(options.staleTime).toBe(STALE_TIMES.dashboard);
  });

  it("should merge overrides with defaults", () => {
    const options = getQueryOptions("dashboard", { staleTime: 5000 });
    expect(options.staleTime).toBe(5000);
  });
});

// =============================================================================
// HOOK EXPORTS TESTS
// =============================================================================

describe("useDealDashboard hook", () => {
  it("should export useDealDashboard function", () => {
    expect(useDealDashboard).toBeDefined();
    expect(typeof useDealDashboard).toBe("function");
  });

  it("should export prefetchDealDashboard function", () => {
    expect(prefetchDealDashboard).toBeDefined();
    expect(typeof prefetchDealDashboard).toBe("function");
  });

  it("should export invalidateDealDashboard function", () => {
    expect(invalidateDealDashboard).toBeDefined();
    expect(typeof invalidateDealDashboard).toBe("function");
  });

  it("should export invalidateAllDashboards function", () => {
    expect(invalidateAllDashboards).toBeDefined();
    expect(typeof invalidateAllDashboards).toBe("function");
  });
});

describe("useSnapshotList hook", () => {
  it("should export useSnapshotList function", () => {
    expect(useSnapshotList).toBeDefined();
    expect(typeof useSnapshotList).toBe("function");
  });

  it("should export prefetchSnapshotList function", () => {
    expect(prefetchSnapshotList).toBeDefined();
    expect(typeof prefetchSnapshotList).toBe("function");
  });

  it("should export invalidateSnapshotLists function", () => {
    expect(invalidateSnapshotLists).toBeDefined();
    expect(typeof invalidateSnapshotLists).toBe("function");
  });
});

describe("useGenerateSnapshot hook", () => {
  it("should export useGenerateSnapshot function", () => {
    expect(useGenerateSnapshot).toBeDefined();
    expect(typeof useGenerateSnapshot).toBe("function");
  });

  it("should export useRunAnalysis alias", () => {
    expect(useRunAnalysis).toBeDefined();
    expect(typeof useRunAnalysis).toBe("function");
  });
});

describe("usePipelineSummary hook", () => {
  it("should export usePipelineSummary function", () => {
    expect(usePipelineSummary).toBeDefined();
    expect(typeof usePipelineSummary).toBe("function");
  });

  it("should export prefetchPipelineSummary function", () => {
    expect(prefetchPipelineSummary).toBeDefined();
    expect(typeof prefetchPipelineSummary).toBe("function");
  });

  it("should export invalidatePipelineSummary function", () => {
    expect(invalidatePipelineSummary).toBeDefined();
    expect(typeof invalidatePipelineSummary).toBe("function");
  });
});

// =============================================================================
// EXPORT COUNT VERIFICATION
// =============================================================================

describe("Slice 22 Export Count", () => {
  const queryKeyExports = [
    queryKeys,
    queryKeys.deals,
    queryKeys.snapshots,
    queryKeys.analysis,
    queryKeys.pipeline,
  ];

  const configExports = [
    TIME,
    STALE_TIMES,
    GC_TIMES,
    RETRY_CONFIG,
    DEFAULT_QUERY_OPTIONS,
    shouldRetry,
    getQueryOptions,
  ];

  const hookExports = [
    useDealDashboard,
    prefetchDealDashboard,
    invalidateDealDashboard,
    invalidateAllDashboards,
    useSnapshotList,
    prefetchSnapshotList,
    invalidateSnapshotLists,
    useGenerateSnapshot,
    useRunAnalysis,
    usePipelineSummary,
    prefetchPipelineSummary,
    invalidatePipelineSummary,
  ];

  it("should have all query key exports defined", () => {
    const definedCount = queryKeyExports.filter((e) => e !== undefined).length;
    expect(definedCount).toBe(queryKeyExports.length);
  });

  it("should have all config exports defined", () => {
    const definedCount = configExports.filter((e) => e !== undefined).length;
    expect(definedCount).toBe(configExports.length);
  });

  it("should have all hook exports defined", () => {
    const definedCount = hookExports.filter((e) => e !== undefined).length;
    expect(definedCount).toBe(hookExports.length);
  });

  it("should have total of 24+ exports", () => {
    const totalDefined = [
      ...queryKeyExports.filter((e) => e !== undefined),
      ...configExports.filter((e) => e !== undefined),
      ...hookExports.filter((e) => e !== undefined),
    ].length;
    expect(totalDefined).toBeGreaterThanOrEqual(24);
  });
});

// =============================================================================
// ASSERTION COUNT SUMMARY
// =============================================================================

/**
 * Total assertions: 45+
 *
 * queryKeys: 9
 * TIME constants: 3
 * STALE_TIMES: 2
 * GC_TIMES: 2
 * RETRY_CONFIG: 4
 * DEFAULT_QUERY_OPTIONS: 3
 * shouldRetry: 6
 * getQueryOptions: 2
 * useDealDashboard: 4
 * useSnapshotList: 3
 * useGenerateSnapshot: 2
 * usePipelineSummary: 3
 * Export Count: 4
 */
