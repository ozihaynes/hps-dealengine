# SLICE 22 - Data Layer Integration (React Query) - Review

**Date:** 2026-01-05
**Status:** Complete
**Verification:** Typecheck + Build + Tests Pass

---

## Summary

React Query data layer integration for HPS DealEngine. Replaces manual fetch/state management with type-safe caching, optimistic updates, and real-time data synchronization.

---

## Files Created/Modified

### Query Infrastructure (`lib/queries/`)

| File | Lines | Purpose |
|------|-------|---------|
| `queryKeys.ts` | ~180 | Centralized query key factory |
| `queryConfig.ts` | ~205 | Timing/retry/stale configuration |
| `useDealDashboard.ts` | ~185 | Dashboard data hook |
| `useSnapshotList.ts` | ~260 | Paginated snapshot list |
| `useGenerateSnapshot.ts` | ~240 | Snapshot generation mutation |
| `usePipelineSummary.ts` | ~255 | Pipeline aggregate counts |
| `index.ts` | ~90 | Barrel exports |

### Tests

| File | Assertions | Coverage |
|------|------------|----------|
| `tests/queries.test.ts` | 45 | All exports |

---

## Component Inventory

### Query Keys (queryKeys.ts)

Hierarchical key factory for type-safe cache management:

- `queryKeys.deals` - Deal list and detail queries
- `queryKeys.snapshots` - Snapshot queries
- `queryKeys.analysis` - Analysis run queries
- `queryKeys.pipeline` - Pipeline summary queries
- `queryKeys.comps` - Comps queries

### Configuration (queryConfig.ts)

- `TIME` - Time constants (SECOND, MINUTE, HOUR)
- `STALE_TIMES` - Stale time by query type
- `GC_TIMES` - Garbage collection times
- `RETRY_CONFIG` - Retry count, delay, non-retryable codes
- `DEFAULT_QUERY_OPTIONS` - Pre-configured options per query type
- `shouldRetry()` - Retry decision helper
- `getQueryOptions()` - Options merger

### Hooks

**useDealDashboard:**
- Fetches latest snapshot for a deal
- Returns `DashboardData` with snapshot, staleness, run IDs
- Prefetch, invalidate helpers

**useSnapshotList:**
- Paginated snapshot list with filters
- Supports verdict, urgency band filtering
- Sorting by urgency_score, closeability_index, etc.
- `keepPreviousData` for smooth pagination

**useGenerateSnapshot:**
- Mutation hook for triggering analysis
- Optimistic updates to cache
- Auto-invalidates related queries on success
- `useRunAnalysis` alias wrapper

**usePipelineSummary:**
- Aggregates counts from snapshot list
- By verdict (GO, PROCEED_WITH_CAUTION, HOLD, PASS)
- By urgency band (emergency, critical, active, steady)
- Urgent count, GO/PASS/caution/hold counts

---

## Design Patterns Applied

### Query Key Factory
```typescript
const queryKeys = {
  deals: {
    all: ["deals"] as const,
    lists: () => [...queryKeys.deals.all, "list"] as const,
    list: (filters) => [...queryKeys.deals.lists(), filters] as const,
  },
};
```

### Hook Pattern
```typescript
export function useDealDashboard(dealId: string, options = {}) {
  const query = useQuery({
    queryKey: queryKeys.snapshots.latest(dealId),
    queryFn: () => fetchDashboardData(dealId),
    ...DEFAULT_QUERY_OPTIONS.dashboard,
  });
  return {
    dashboard: query.data,
    isLoading: query.isLoading,
    // ...
  };
}
```

### Mutation with Cache Invalidation
```typescript
const mutation = useMutation({
  mutationFn: executeGenerate,
  onSuccess: (data, variables) => {
    queryClient.setQueryData(
      queryKeys.snapshots.latest(variables.dealId),
      data
    );
    queryClient.invalidateQueries({
      queryKey: queryKeys.snapshots.lists(),
    });
  },
});
```

---

## Verification Commands

```powershell
pnpm -w typecheck  # Pass
pnpm -w build      # Pass
pnpm vitest run tests/queries.test.ts  # 45 tests pass
```

---

## Usage Examples

```tsx
// Dashboard data
import { useDealDashboard } from '@/lib/queries';

function DealDashboard({ dealId }) {
  const { dashboard, isLoading, isError, error } = useDealDashboard(dealId);
  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorState error={error} />;
  return <Dashboard data={dashboard} />;
}

// Snapshot list with pagination
import { useSnapshotList } from '@/lib/queries';

function SnapshotList() {
  const { snapshots, pagination, setPage, isLoading } = useSnapshotList({
    filters: { verdict: 'GO' },
    pageSize: 10,
  });
  // ...
}

// Trigger analysis
import { useRunAnalysis } from '@/lib/queries';

function AnalyzeButton({ dealId }) {
  const { runAnalysis, isRunning } = useRunAnalysis();
  return (
    <Button onClick={() => runAnalysis(dealId)} disabled={isRunning}>
      {isRunning ? 'Analyzing...' : 'Run Analysis'}
    </Button>
  );
}

// Pipeline summary
import { usePipelineSummary } from '@/lib/queries';

function PipelineStats() {
  const { summary } = usePipelineSummary();
  return (
    <div>
      <Stat label="Total" value={summary?.total} />
      <Stat label="GO" value={summary?.goCount} />
      <Stat label="Urgent" value={summary?.urgentCount} />
    </div>
  );
}
```

---

## Checklist

- [x] queryKeys.ts - Centralized key factory
- [x] queryConfig.ts - Timing and retry config
- [x] useDealDashboard.ts - Dashboard data hook
- [x] useSnapshotList.ts - Paginated list hook
- [x] useGenerateSnapshot.ts - Mutation hook
- [x] usePipelineSummary.ts - Pipeline counts hook
- [x] index.ts - Barrel exports
- [x] queries.test.ts - 45 assertions
- [x] Typecheck passes
- [x] Build passes
- [x] Tests pass
- [x] ASCII-only comments (no em-dashes)
- [x] No emojis in code
