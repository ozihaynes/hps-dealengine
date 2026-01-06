# Command Center V2.1 Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HPS DealEngine V2.1                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐                       │
│  │   Portfolio Dashboard │    │   Deal Command Center │                      │
│  │   (/dashboard)        │    │   (/overview)         │                      │
│  └──────────┬───────────┘    └──────────┬───────────┘                       │
│             │                            │                                   │
│             └────────────┬───────────────┘                                   │
│                          │                                                   │
│                          ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      Component Library                                 │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐         │   │
│  │  │ VerdictCard│ │ ScoreGauge │ │ KeyMetrics │ │ SignalCard │         │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘         │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐         │   │
│  │  │  DealCard  │ │PulseMetrics│ │ DealGrid   │ │  Skeleton  │         │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                          │                                                   │
│                          ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Data Layer                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │   │
│  │  │ usePortfolioData│  │ useOverviewData │  │ useDealsData    │       │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘       │   │
│  └───────────┼────────────────────┼────────────────────┼────────────────┘   │
│              │                    │                    │                     │
│              └────────────────────┼────────────────────┘                     │
│                                   │                                          │
│                                   ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     Engine Layer (Pure Functions)                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │   │
│  │  │ deriveVerdict() │  │ computeMetrics()│  │ formatCurrency()│       │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │   │
│  │  │ groupByVerdict()│  │  clampScore()   │  │ extractNumber() │       │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                   │                                          │
│                                   ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     Supabase Edge Functions                           │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │   │
│  │  │create-snapshot │  │ get-snapshot   │  │update-snapshot │          │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘          │   │
│  │  ┌────────────────┐  ┌────────────────┐                              │   │
│  │  │delete-snapshot │  │ run-analysis   │                              │   │
│  │  └────────────────┘  └────────────────┘                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                   │                                          │
│                                   ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Supabase Database                               │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │   │
│  │  │     deals      │  │      runs      │  │ dashboard_     │          │   │
│  │  │                │  │                │  │ snapshots      │          │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘          │   │
│  │                                                                        │   │
│  │  RLS Policies: Multi-tenant isolation via user_id/org_id              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Portfolio Dashboard Flow

```
User visits /dashboard
        │
        ▼
┌───────────────────┐
│ PortfolioDashboard│
│   Component       │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ usePortfolioData  │◄────── Filters (status, verdict, search)
│      Hook         │◄────── Sort (field, direction)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Supabase Client   │
│ (with RLS JWT)    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ deals table       │──► RLS filters by user_id/org_id
│ runs table        │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Engine Functions  │
│ - deriveVerdict() │
│ - computeMetrics()│
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ UI Components     │
│ - PortfolioPulse  │
│ - DealCard[]      │
└───────────────────┘
```

### Deal Overview Flow

```
User visits /overview?dealId=xxx
        │
        ▼
┌───────────────────┐
│ OverviewDashboard │
│    Component      │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ useOverviewData   │◄────── Deal ID from URL
│      Hook         │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ get-snapshot      │──► Edge Function with JWT
│ Edge Function     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ dashboard_        │──► RLS filters by created_by/org_id
│ snapshots table   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ UI Components     │
│ - VerdictCard     │
│ - ScoreGauges     │
│ - KeyMetrics      │
│ - SignalCards     │
└───────────────────┘
```

---

## Component Architecture

### VerdictCard

```typescript
interface VerdictCardProps {
  verdict: VerdictType;          // "GO" | "PROCEED_WITH_CAUTION" | "HOLD" | "PASS"
  confidenceGrade: string;       // "A" | "B" | "C" | "D" | "F"
  confidenceScore: number;       // 0-100
  runId?: string;                // Link to analysis run
}
```

**Styling:**
- GO: Green background (#22c55e)
- PROCEED_WITH_CAUTION: Amber (#f59e0b)
- HOLD: Blue (#3b82f6)
- PASS: Slate (#64748b)

### ScoreGauge

```typescript
interface ScoreGaugeProps {
  name: string;                  // "Closeability", "Urgency", etc.
  value: number;                 // 0-100
  maxValue?: number;             // Default 100
  colorScheme?: "default" | "inverted";
}
```

**Animation:**
- Fill animates from 0 to value on mount
- Duration: 800ms with ease-out

### DealCard

```typescript
interface DealCardProps {
  deal: DealSummary;
  onClick?: () => void;
  isSelected?: boolean;
}
```

**Features:**
- Mini gauges for scores
- Verdict badge
- Status indicator
- Last updated time
- Address display

---

## Database Schema

### dashboard_snapshots

```sql
CREATE TABLE dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id),
  run_id UUID REFERENCES runs(id),
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,  -- Soft delete
  
  CONSTRAINT valid_snapshot_data CHECK (
    snapshot_data ? 'closeability_index' AND
    snapshot_data ? 'verdict'
  )
);

-- Indexes
CREATE INDEX idx_snapshots_deal_id ON dashboard_snapshots(deal_id);
CREATE INDEX idx_snapshots_created_by ON dashboard_snapshots(created_by);
CREATE INDEX idx_snapshots_created_at ON dashboard_snapshots(created_at DESC);

-- RLS Policies
ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
  ON dashboard_snapshots FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert own snapshots"
  ON dashboard_snapshots FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own snapshots"
  ON dashboard_snapshots FOR UPDATE
  USING (created_by = auth.uid());
```

---

## Engine Functions

### deriveVerdict

```typescript
function deriveVerdict(
  closeability: number,
  urgency: number,
  spread: number
): VerdictType {
  // Rule 1: Time crunch with low probability
  if (urgency >= 90 && closeability < 60) return "PASS";
  
  // Rule 2: High closeability + good spread
  if (closeability >= 80 && spread >= 30000) return "GO";
  
  // Rule 3: Medium closeability + decent spread
  if (closeability >= 60 && spread >= 15000) return "PROCEED_WITH_CAUTION";
  
  // Rule 4: Low-medium closeability
  if (closeability >= 40) return "HOLD";
  
  // Rule 5: Default
  return "PASS";
}
```

### computeMetrics

```typescript
function computeMetrics(deals: DealSummary[]): PortfolioMetrics {
  return {
    totalDeals: deals.length,
    analyzedDeals: deals.filter(d => d.has_analysis).length,
    totalPipelineValue: deals.reduce((sum, d) => sum + (d.arv ?? 0), 0),
    totalSpreadOpportunity: deals.reduce((sum, d) => sum + d.risk_adjusted_spread, 0),
    avgCloseability: calculateAverage(deals, 'closeability_index'),
    avgUrgency: calculateAverage(deals, 'urgency_score'),
    byVerdict: groupByVerdict(deals),
    byStatus: groupByStatus(deals),
  };
}
```

---

## Security Model

### RLS (Row-Level Security)

All tables use RLS with policies based on:
- `auth.uid()` for user identity
- `org_id` for organization isolation
- JWT claims for role-based access

### Edge Function Authentication

```typescript
// Every Edge Function validates JWT
const authHeader = request.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
  });
}

const { data: userData } = await supabase.auth.getUser();
if (!userData?.user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
  });
}
```

### No service_role in User Flows

```typescript
// ❌ NEVER in user-facing code
const supabase = createClient(url, SERVICE_ROLE_KEY);

// ✅ Always use user's JWT
const supabase = createServerClient(request);
```

---

## Test Architecture

### Test Pyramid

```
                    ┌───────────────┐
                    │   E2E Tests   │  45 tests
                    │  (Playwright) │  User journeys
                    └───────┬───────┘
                            │
               ┌────────────┴────────────┐
               │   Integration Tests     │  27 tests
               │   (Vitest + Mocks)      │  Edge Functions
               └────────────┬────────────┘
                            │
       ┌────────────────────┴────────────────────┐
       │              Unit Tests                  │  66 tests
       │              (Vitest)                    │  Engine functions
       └──────────────────────────────────────────┘
```

### Coverage Goals

| Layer | Target | Actual |
|-------|--------|--------|
| Unit | 90% | 95% |
| Integration | 80% | 85% |
| E2E | 70% | 75% |

---

## Performance Considerations

### Data Fetching

- Portfolio: Single query with joins
- Pagination: Limit 50 deals per page
- Caching: React Query with 5min stale time

### Rendering

- Virtual scrolling for large lists (future)
- Memoized components
- Lazy loading for charts

### Bundle Size

- Tree-shaking enabled
- Component-level code splitting
- No heavy dependencies

---

## Deployment

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Testing
PLAYWRIGHT_BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=xxx
```

### CI/CD Pipeline

```yaml
steps:
  - pnpm install
  - pnpm typecheck
  - pnpm lint
  - pnpm test              # Unit + Integration
  - pnpm build
  - pnpm e2e               # E2E (staging only)
  - vercel deploy
```

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-03
