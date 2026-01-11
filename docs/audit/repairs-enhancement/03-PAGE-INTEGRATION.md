# Page Integration Analysis

**File:** `apps/hps-dealengine/app/(app)/repairs/page.tsx`
**Lines:** 1,090
**Last Updated:** 2026-01-09

---

## Layout Structure

### Three-Column Desktop Layout (lg+)
```
┌─────────────────────────────────────────────────────────────────────┐
│                           HEADER                                     │
│  [Title + Tooltip]                    [Autosave + Action Buttons]   │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┬────────────────────────────────────┬─────────────────┐
│   LEFT RAIL  │          CENTER RAIL               │   RIGHT RAIL    │
│   (3 cols)   │         (6-7 cols)                 │    (2-3 cols)   │
│              │                                    │                 │
│ - Sqft Input │ - RepairsTab (legacy)             │ - Breakdown     │
│ - Applied $  │ - EnhancedRepairsSection          │   by section    │
│ - $/sqft     │ - BiddingCockpit                  │ - Alerts panel  │
│ - Rate Prof  │                                    │                 │
│ - Key Totals │                                    │                 │
│              │                                    │                 │
│ [STICKY]     │                                    │ [STICKY]        │
└──────────────┴────────────────────────────────────┴─────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    MODALS (Portal)                                   │
│  - RequestEstimateModal                                              │
│  - ManualUploadModal                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< lg)
```
┌─────────────────────────────────────────────────────────────────────┐
│                           HEADER                                     │
│  [Title + Tooltip]                                                   │
│  [Autosave + Action Buttons]                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        LEFT RAIL (full width)                        │
│  - Sqft Input only (compact)                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        CENTER RAIL (full width)                      │
│  - RepairsTab                                                        │
│  - EnhancedRepairsSection                                            │
│  - BiddingCockpit                                                    │
└─────────────────────────────────────────────────────────────────────┘

(Right rail hidden on mobile - lg:block)
```

---

## Component Composition

### Header Section (lines 656-725)
```tsx
<div className="flex items-start justify-between gap-3">
  {/* Left: Title + Tooltip */}
  <h1>Repairs</h1>

  {/* Right: Autosave + Actions */}
  <AutosaveIndicator />
  <Button onClick={openEstimateModal}>Request Estimate</Button>
  <Button onClick={openManualUpload}>Manual Upload</Button>
  <Button onClick={handleMarkNoRepairs}>No Repairs Needed</Button>
</div>
```

### Left Rail (lines 730-899)
```tsx
<div className="lg:col-span-3">
  <div className="lg:sticky lg:top-24">
    <GlassCard>
      {/* Sqft Input */}
      {/* Applied Total + $/sqft (desktop only) */}
    </GlassCard>

    {/* Desktop only panels */}
    <GlassCard>Rate Profile</GlassCard>
    <GlassCard>Key Totals</GlassCard>
  </div>
</div>
```

### Center Rail (lines 901-964)
```tsx
<div className="lg:col-span-6 xl:col-span-7">
  {/* Legacy RepairsTab */}
  <RepairsTab ... />

  {/* Enhanced Estimator (V2) */}
  <GlassCard>
    <EnhancedRepairsSection ... />
  </GlassCard>

  {/* Bidding Cockpit */}
  <BiddingCockpit ... />
</div>
```

### Right Rail (lines 966-1058)
```tsx
<div className="hidden lg:block lg:col-span-3 xl:col-span-2">
  <div className="lg:sticky lg:top-24">
    <GlassCard>Breakdown by section</GlassCard>
    <GlassCard>Alerts & sanity checks</GlassCard>
  </div>
</div>
```

---

## State Management

### Deal Session Context
```tsx
const {
  deal,                    // Current deal data
  setDeal,                 // Update deal
  posture,                 // Repair posture (base, aggressive, etc.)
  refreshRepairRates,      // Fetch rates
  activeRepairProfile,     // Current rate profile
  activeRepairProfileId,   // Profile ID
  lastAnalyzeResult,       // Engine calculations
  repairRates,             // Loaded rates
  repairRatesLoading,      // Loading state
  repairRatesError,        // Error state
  dbDeal,                  // Database deal record
  autosaveStatus,          // Autosave state
  saveWorkingStateNow,     // Manual save trigger
} = useDealSession();
```

### Local State
```tsx
// V1 Legacy Estimator
const [estimatorState, setEstimatorState] = useState<EstimatorState>();

// V2 Enhanced Estimator
const [enhancedEstimatorState, setEnhancedEstimatorState] = useState<EnhancedEstimatorState>();

// UI State
const [isExportingPdf, setIsExportingPdf] = useState(false);
const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false);
const [isManualUploadOpen, setIsManualUploadOpen] = useState(false);

// Form State
const [localSqft, setLocalSqft] = useState<string>("");
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
```

### Estimate Requests Hook
```tsx
const [estimateState] = useEstimateRequests(dealId);
// Returns: { requests, isLoading, error }
```

---

## Data Flow

### Props → BiddingCockpit
```tsx
<BiddingCockpit
  estimateData={biddingEstimateData}       // From enhancedEstimatorState
  estimateRequests={biddingEstimateRequests}  // From useEstimateRequests
  isLoading={estimateState.isLoading}
  isDemoMode={isDemoMode}
  onRequestEstimate={() => setIsEstimateModalOpen(true)}
  onManualUpload={() => setIsManualUploadOpen(true)}
  onViewEstimate={handleViewEstimate}
  onDownloadEstimate={handleDownloadEstimate}
/>
```

### Props → EnhancedRepairsSection
```tsx
<EnhancedRepairsSection
  enhancedEstimatorState={enhancedEstimatorState}
  onLineItemUpdate={handleLineItemUpdate}
  onExportPdf={handleExportPdf}
  isExportingPdf={isExportingPdf}
  rehabLevel={currentRehabLevel}
  isDemoMode={isDemoMode}
/>
```

### Data Transform: EstimateRequests → BiddingEstimateRequest
```tsx
const biddingEstimateRequests = useMemo((): BiddingEstimateRequest[] => {
  return estimateState.requests.map((req) => ({
    id: req.id,
    gc_name: req.gc_name,
    gc_email: req.gc_email ?? undefined,
    status: req.status as "pending" | "sent" | "viewed" | "submitted",
    submitted_at: req.submitted_at ?? undefined,
    sent_at: req.sent_at ?? undefined,
    file_path: req.estimate_file_path ?? undefined,
  }));
}, [estimateState.requests]);
```

### Data Transform: EnhancedEstimatorState → EstimateData
```tsx
const biddingEstimateData = useMemo((): EstimateData | null => {
  if (!enhancedEstimatorState || enhancedEstimatorState.grandTotal === 0) {
    return null;
  }
  return {
    baseEstimate: enhancedEstimatorState.grandTotal,
    contingency: enhancedEstimatorState.contingencyAmount,
    contingencyPercent: enhancedEstimatorState.contingencyPercent,
    totalBudget: enhancedEstimatorState.totalWithContingency,
    categories: /* mapped from enhancedEstimatorState.categories */
  };
}, [enhancedEstimatorState]);
```

---

## Page-Level Styling

### Grid Classes
```css
/* Container */
.space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0

/* Left Rail */
.lg:col-span-3

/* Center Rail */
.lg:col-span-6 xl:col-span-7

/* Right Rail */
.hidden lg:block lg:col-span-3 xl:col-span-2
```

### Sticky Rails
```css
.lg:sticky lg:top-24
```

### GlassCard Styling (from @/components/ui)
- Used for all rail panels
- Provides: bg, border, backdrop-blur, rounded corners

---

## Modal Integration

### RequestEstimateModal
```tsx
<RequestEstimateModal
  dealId={dealId ?? ""}
  propertyAddress={propertyAddress}
  isOpen={isEstimateModalOpen}
  onClose={() => setIsEstimateModalOpen(false)}
  onSuccess={() => setIsEstimateModalOpen(false)}
/>
```

### ManualUploadModal
```tsx
<ManualUploadModal
  isOpen={isManualUploadOpen}
  onClose={() => setIsManualUploadOpen(false)}
  dealId={dealId ?? ""}
  orgId={orgId ?? ""}
  propertyAddress={propertyAddress}
  onSuccess={() => setIsManualUploadOpen(false)}
/>
```

---

## Key Observations

### Strengths
1. Clean 12-column grid layout
2. Responsive: 3-col desktop → single-col mobile
3. Sticky rails for context retention
4. Clear data flow from context → components
5. Demo mode detection and handling
6. Autosave integration

### Opportunities
1. **Page-level entry animation** - No AnimatePresence on page content
2. **Section dividers** - No visual separation between RepairsTab, Enhanced, Cockpit
3. **Right rail on tablet** - Currently hidden, could show condensed version
4. **Breadcrumb context** - No back navigation indicator
5. **Section headers** - Each major section (Legacy, V2, Cockpit) could have clearer headers

### Dependencies
- `@/components/ui` - GlassCard, Button, NumericInput, Tooltip
- `@/components/shared/AutosaveIndicator`
- `@/components/repairs/*` - All repair components
- `@/hooks/useEstimateRequests`
- `@/lib/dealSessionContext`
- `@/lib/repairsMath`, `@/lib/repairsMathEnhanced`
- `@/lib/repairsPdf`
- `@hps-internal/contracts`
