# UI Components Audit
Date: 2026-01-03
Auditor: Claude Code

## Overview

UI components are located in `apps/hps-dealengine/components/`. The application follows a "dumb renderer" pattern where components display data from the engine without performing local calculations.

---

## Component Categories

### Offer Components (`components/offers/`)

#### OfferMenu.tsx

**Purpose:** Renders the tiered cash offer menu from V2 Competitive Offer Engine.

**Props:**
```typescript
type OfferMenuProps = {
  offerMenuCash: OfferMenuCash | null;
  onSelectTier?: (tier: 'base' | 'stretch' | 'premium') => void;
};
```

**Data Source:** `outputs.offer_menu_cash`

**Displays:**
- Base offer with label and amount
- Stretch offer (if eligible)
- Premium offer (if eligible)
- Eligibility status per tier

---

#### ConfidenceUnlock.tsx

**Purpose:** Displays HVI unlock opportunities.

**Props:**
```typescript
type ConfidenceUnlockProps = {
  unlocks: HviUnlock[] | null;
  onUnlockAction?: (key: string) => void;
};
```

**Data Source:** `outputs.hvi_unlocks`

**Displays:**
- Unlock item key and label
- Locked penalty amount
- Unlocked value potential
- Action button for unlock

---

### Overview Components (`components/overview/`)

#### TopDealKpis.tsx

**Purpose:** Dashboard KPI tiles showing key metrics.

**Props:**
```typescript
type TopDealKpisProps = {
  arv: number | null;
  aiv: number | null;
  buyerCeiling: number | null;
  respectFloor: number | null;
  spreadCash: number | null;
  primaryOffer: number | null;
};
```

**KPI Tiles:**
- ARV (After Repair Value)
- AIV (As-Is Value)
- Buyer Ceiling (MAO)
- Respect Floor
- Cash Spread
- Primary Offer

---

#### OverviewTab.tsx

**Purpose:** Main overview tab with deal summary.

**Data Sources:**
- Deal payload
- Analysis outputs
- Workflow state

**Sections:**
- Property identity snapshot
- Key metrics grid
- Workflow state indicator
- Confidence grade display

---

### Underwrite Components (`components/underwrite/`)

#### UnderwriteTab.tsx

**Purpose:** Full underwriting analysis tab.

**Props:**
```typescript
type UnderwriteTabProps = {
  dealId: string;
  outputs: AnalyzeOutputs | null;
  trace: TraceFrame[] | null;
  isLoading: boolean;
  onReanalyze: () => void;
};
```

**Sections:**
- Valuation panel (ARV/AIV)
- Floor/ceiling visualization
- Risk gates panel
- Evidence summary
- Offer menu
- Confidence display

---

### Command Center Components (`components/command-center/`)

#### DecisionCanvas.tsx

**Purpose:** Central decision-making visualization.

**Features:**
- Price geometry bar
- Risk gate status strip
- Verdict display
- Action buttons

---

#### ScoreGauge.tsx

**Purpose:** Circular gauge for confidence/quality scores.

**Props:**
```typescript
type ScoreGaugeProps = {
  value: number;
  max: number;
  label: string;
  colorBand: 'green' | 'yellow' | 'red';
};
```

---

#### EvidenceRing.tsx

**Purpose:** Circular progress indicator for evidence completeness.

**Props:**
```typescript
type EvidenceRingProps = {
  completeness: number;
  missingCritical: string[];
};
```

---

### Deal Components (`components/deals/`)

#### DealsTable.tsx

**Purpose:** Main deals listing table.

**Columns:**
- Property address
- Client name
- Workflow state
- Confidence grade
- Primary offer
- Created date
- Actions

**Features:**
- Sorting
- Filtering
- Pagination
- Row selection

---

#### NewDealForm.tsx

**Purpose:** Form for creating new deals.

**Fields:**
- Client name
- Client phone
- Client email
- Property street
- Property city
- Property state
- Property ZIP

---

### Intake Components (`components/intake/`)

#### IntakeForm.tsx

**Purpose:** Multi-section client intake form.

**Props:**
```typescript
type IntakeFormProps = {
  token: string;
  linkId: string;
  schema: IntakeSchemaApi;
  initialPayload: Record<string, unknown> | null;
  prefillData?: Record<string, string> | null;
  initialSectionIndex?: number;
  canEdit?: boolean;
  submissionStatus?: string | null;
  onSubmitSuccess: () => void;
};
```

**Features:**
- Multi-section navigation
- Field validation
- Auto-save (draft)
- File upload zones
- Progress indicator

---

#### IntakeFormSection.tsx

**Purpose:** Individual form section renderer.

**Field Types Supported:**
- text
- email
- phone
- number
- currency
- select
- multiselect
- date
- textarea
- address (with autocomplete)

---

#### IntakeSubmissionDetail.tsx

**Purpose:** Staff view of submitted intake form.

**Features:**
- Read-only form display
- Evidence file viewer
- Approval/rejection actions
- Populate-to-deal action

---

#### IntakeProgressBar.tsx

**Purpose:** Section progress indicator.

---

### Import Components (`components/import/`)

#### ImportWizard.tsx

**Purpose:** Multi-step bulk import wizard.

**Steps:**
1. Upload file
2. Map columns
3. Review items
4. Confirm import

---

#### ItemsTable.tsx

**Purpose:** Import items review table.

**Columns:**
- Row number
- Address
- Client info
- Validation status
- Duplicate status
- Actions

---

### Auth Components (`app/login/`)

#### LoginForm.tsx

**Purpose:** Authentication login form.

**Fields:**
- Email
- Password

**Features:**
- Sign in
- Auto sign-up for dev
- SSO buttons (Google, Apple)

---

## Page Components (`app/(app)/`)

### overview/page.tsx

**Purpose:** Deal overview page wrapper.

### dashboard/page.tsx

**Purpose:** Portfolio dashboard page.

**Features:**
- Portfolio summary stats
- Deals by workflow state
- Risk distribution chart
- Recent activity

### deals/page.tsx

**Purpose:** Deals listing page.

### import/page.tsx

**Purpose:** Bulk import page.

---

## Component Architecture

### Dumb Renderer Pattern

All data-displaying components follow the dumb renderer pattern:

```typescript
// CORRECT: Component receives pre-computed data
function OfferMenu({ offerMenuCash }: { offerMenuCash: OfferMenuCash }) {
  return <div>{offerMenuCash.base.offer}</div>;
}

// INCORRECT: Component performs calculations
function OfferMenu({ arv, margin }: { arv: number; margin: number }) {
  const offer = arv * (1 - margin); // DON'T DO THIS
  return <div>{offer}</div>;
}
```

### Context Providers

- `DealSessionContext` - Current deal state
- `AnalyzeBus` - Analysis request/response
- `AuthContext` - User authentication

### Data Hooks

- `useAnalyze()` - Trigger analysis
- `useDeals()` - Fetch deals list
- `useOverviewData()` - Fetch overview metrics
- `useImportJobs()` - Import job management
- `useSnapshot()` - Portfolio snapshots

---

## Summary

| Category | Component Count |
|----------|----------------|
| Offers | 2 |
| Overview | 2 |
| Underwrite | 1 |
| Command Center | 3 |
| Deals | 2 |
| Intake | 5 |
| Import | 2 |
| Auth | 1 |
| **Total** | **18+** |

### Key UI Components by PRD Mapping

| PRD Component | Current Component | Status |
|---------------|-------------------|--------|
| Decision Bar | DecisionCanvas.tsx | EXISTS |
| Deal Verdict Chip | WorkflowStateBadge.tsx | PARTIAL |
| Price Geometry Module | (embedded in UnderwriteTab) | PARTIAL |
| Profit Cockpit | TopDealKpis.tsx | PARTIAL |
| Risk Gates Panel | (embedded in UnderwriteTab) | EXISTS |
| ARV Band Widget | (embedded in valuation panel) | PARTIAL |
| Comps Evidence Pack | (via evidence list) | PARTIAL |
| Missing Evidence Checklist | ConfidenceUnlock.tsx | EXISTS |
| Offer Waterfall | OfferMenu.tsx | EXISTS |
| Market Velocity Card | GAP | MISSING |
| Liquidity Card | GAP | MISSING |
| Evidence Freshness Badges | (embedded) | PARTIAL |
| Property Identity Snapshot | (in OverviewTab) | EXISTS |
| Field Mode View | GAP | MISSING |
