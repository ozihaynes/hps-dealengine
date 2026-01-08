# V25 Components Status

**Date:** 2026-01-06
**Decision:** DO NOT DELETE — Components are actively in use

## Current State

V25 folder exists at `apps/hps-dealengine/components/v25` with the following files:

| File | Purpose |
|------|---------|
| `index.ts` | Barrel export |
| `V25Dashboard.tsx` | Dashboard component |
| `V25DashboardEmpty.tsx` | Empty state |
| `V25DashboardSection.tsx` | Section component |
| `V25DashboardSkeleton.tsx` | Loading skeleton |
| `V25EnhancementsZone.tsx` | Enhancement zone component |

## Active Imports Found

```
./app/(app)/overview/page.tsx:32:import { V25EnhancementsZone } from "@/components/v25";
./tests/v25Dashboard.test.tsx:436: V25DashboardSection (test)
./tests/v25Dashboard.test.tsx:450: V25DashboardSection (test)
```

## Rationale

The `V25EnhancementsZone` component is actively imported and used in the `/overview` page.
This is part of the V2.5 dashboard system and should NOT be removed as part of Phase 7.

## Action Taken

- V25 components **NOT deleted**
- Status documented in this review file
- Prompt's Step 5 (remove deprecated V25 components) was skipped because components are still in use

## Future Consideration

When V25 components are eventually deprecated and replaced:
1. Search for all imports: `grep -rn "from.*v25\|import.*v25"`
2. Update/remove importing components
3. Delete V25 folder only when no imports remain
