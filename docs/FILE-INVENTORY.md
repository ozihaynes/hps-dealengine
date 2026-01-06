# Command Center V2.1 — Complete File Inventory

## Summary

| Category | Files | Lines (approx) |
|----------|-------|----------------|
| Components | 15 | ~4,500 |
| Hooks | 3 | ~1,200 |
| Engine/Utilities | 2 | ~600 |
| Pages/Routes | 2 | ~200 |
| Tests | 6 | ~3,000 |
| Configuration | 2 | ~200 |
| Documentation | 8 | ~2,500 |
| Database | 2 | ~100 |
| Edge Functions | 5 | ~500 |
| **Total** | **~45** | **~12,800** |

---

## Application Code

### Pages & Routes

```
apps/hps-dealengine/app/
├── dashboard/
│   └── page.tsx                 # Portfolio dashboard route
└── overview/
    └── page.tsx                 # Deal overview route
```

### Components — Command Center

```
apps/hps-dealengine/components/command-center/
├── VerdictCard.tsx              # Primary verdict display
├── ScoreGauge.tsx               # Circular score visualization
├── KeyMetrics.tsx               # Metrics grid (MAO, ARV, etc.)
├── SignalCard.tsx               # Priority signal cards
├── TimelineSimulator.tsx        # Timeline visualization
├── OverviewDashboard.tsx        # Main overview layout
└── OverviewSkeleton.tsx         # Loading skeleton
```

### Components — Portfolio

```
apps/hps-dealengine/components/portfolio/
├── PortfolioDashboard.tsx       # Main portfolio layout
├── PortfolioHeader.tsx          # Title, search, actions
├── PortfolioPulse.tsx           # Aggregate metrics strip
├── DealPipelineGrid.tsx         # Responsive deal grid
├── DealCard.tsx                 # Individual deal cards
├── PortfolioSkeleton.tsx        # Loading skeleton
└── usePortfolioData.ts          # Portfolio data hook
```

### Hooks

```
apps/hps-dealengine/hooks/
├── useOverviewData.ts           # Deal overview data
├── usePortfolioData.ts          # Portfolio aggregation
└── useDealsData.ts              # Base deals fetching
```

### Engine & Utilities

```
apps/hps-dealengine/lib/
└── engine/
    └── portfolio-utils.ts       # Pure utility functions
        ├── deriveVerdict()
        ├── computeMetrics()
        ├── groupByVerdict()
        ├── formatCurrency()
        ├── formatPercent()
        ├── formatTimeAgo()
        ├── clampScore()
        └── extractNumber()
```

### Design Tokens

```
apps/hps-dealengine/styles/
└── tokens.css                   # Design system tokens
    ├── Colors (verdict palettes)
    ├── Spacing
    ├── Typography
    └── Shadows
```

---

## Test Suites

### Unit Tests

```
apps/hps-dealengine/tests/
├── portfolio-utils.test.ts      # 66 unit tests
└── setup.ts                     # Vitest setup
```

### Integration Tests

```
apps/hps-dealengine/tests/edge-functions/
├── edge-function-test-utils.ts  # Mock utilities
└── snapshots.test.ts            # 27 integration tests
```

### E2E Tests

```
apps/hps-dealengine/e2e/
├── e2e-test-utils.ts            # Page objects
└── command-center.spec.ts       # 45 E2E tests
```

### Configuration

```
apps/hps-dealengine/
└── playwright.config.ts         # Playwright configuration
```

---

## Database

### Migrations

```
supabase/migrations/
└── YYYYMMDD_dashboard_snapshots.sql
    ├── CREATE TABLE dashboard_snapshots
    ├── CREATE INDEX idx_snapshots_deal_id
    ├── CREATE INDEX idx_snapshots_created_by
    ├── CREATE INDEX idx_snapshots_created_at
    ├── RLS POLICY "Users can view own snapshots"
    ├── RLS POLICY "Users can insert own snapshots"
    └── RLS POLICY "Users can update own snapshots"
```

### Schema Reference

```sql
-- dashboard_snapshots table
CREATE TABLE dashboard_snapshots (
  id UUID PRIMARY KEY,
  deal_id UUID NOT NULL,
  run_id UUID,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  deleted_at TIMESTAMPTZ
);
```

---

## Edge Functions

```
supabase/functions/
├── create-snapshot/
│   └── index.ts                 # Create new snapshot
├── get-snapshot/
│   └── index.ts                 # Retrieve snapshot
├── update-snapshot/
│   └── index.ts                 # Update snapshot
├── delete-snapshot/
│   └── index.ts                 # Soft delete snapshot
└── run-analysis/
    └── index.ts                 # Trigger analysis run
```

---

## Documentation

### Devlog

```
apps/hps-dealengine/docs/devlog/
└── 2026-01-03-command-center-v2.1.md
    ├── Executive Summary
    ├── Implementation Timeline (22 slices)
    ├── Architecture Decisions
    ├── Technical Debt Tracker
    ├── Quality Gates Summary
    └── Commit History
```

### Architecture

```
apps/hps-dealengine/docs/architecture/
└── command-center-v2.1.md
    ├── System Overview (ASCII diagram)
    ├── Data Flow Diagrams
    ├── Component Architecture
    ├── Database Schema
    ├── Engine Functions
    ├── Security Model
    ├── Test Architecture
    └── Deployment Guide
```

### Testing

```
apps/hps-dealengine/docs/testing/
└── coverage-report-v2.1.md
    ├── Test Summary (138 tests)
    ├── Unit Tests (66 detailed)
    ├── Integration Tests (27 detailed)
    ├── E2E Tests (45 detailed)
    └── CI/CD Integration
```

### Roadmap

```
apps/hps-dealengine/docs/
└── roadmap-v2.1-update.md
    ├── Version History
    ├── V2.1 Features (complete)
    ├── V2.2 Planned Features
    ├── V3.0 Planned Features
    └── Release Checklist
```

### Review & Audit

```
apps/hps-dealengine/docs/review/
├── slice16-complete/
├── slice17-complete/
├── slice18-complete/
├── slice19-complete/
├── slice20-complete/
└── slice21-complete/

apps/hps-dealengine/docs/audit/
├── slice16/
├── slice17/
├── slice18/
├── slice19/
├── slice20/
└── slice21/
```

---

## File Counts by Slice

| Slice | Description | Files | Lines |
|-------|-------------|-------|-------|
| 1 | Database Schema | 1 | ~50 |
| 2 | TypeScript Contracts | 2 | ~200 |
| 3 | L2 Score Engine | 1 | ~150 |
| 4 | Signal Generation | 1 | ~150 |
| 5 | Edge Function: Create | 1 | ~100 |
| 6 | Edge Functions: CRUD | 3 | ~300 |
| 7 | Design Tokens | 1 | ~100 |
| 8 | VerdictCard | 1 | ~200 |
| 9 | ScoreGauge | 1 | ~200 |
| 10 | KeyMetrics | 1 | ~150 |
| 11 | SignalCard | 1 | ~150 |
| 12 | TimelineSimulator | 1 | ~200 |
| 13 | useOverviewData | 1 | ~400 |
| 14 | OverviewDashboard | 2 | ~500 |
| 15 | Page Integration | 1 | ~100 |
| 15.1-15.3 | Bug Fixes | - | ~50 |
| 16 | Portfolio Dashboard | 8 | ~3,000 |
| 17 | Unit Tests | 3 | ~1,100 |
| 18 | Integration Tests | 2 | ~1,400 |
| 19 | E2E Tests | 3 | ~1,250 |
| 20 | Documentation | 5 | ~1,500 |
| 21 | Final Verification | 4 | ~800 |

---

## Package Dependencies Added

```json
{
  "devDependencies": {
    "@playwright/test": "^1.x.x",
    "vitest": "^1.x.x"
  }
}
```

### Scripts Added

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:headed": "playwright test --headed",
    "e2e:debug": "playwright test --debug"
  }
}
```

---

## Verification Commands

```bash
# Verify all files exist
find apps/hps-dealengine -name "*.tsx" -o -name "*.ts" | wc -l

# Verify test files
ls -la apps/hps-dealengine/tests/
ls -la apps/hps-dealengine/e2e/

# Verify documentation
ls -la apps/hps-dealengine/docs/

# Count lines of code
find apps/hps-dealengine/components -name "*.tsx" | xargs wc -l
find apps/hps-dealengine/lib -name "*.ts" | xargs wc -l
```

---

**Inventory Version:** 1.0.0
**Generated:** 2026-01-03
**Total Files:** ~45
**Total Lines:** ~12,800
