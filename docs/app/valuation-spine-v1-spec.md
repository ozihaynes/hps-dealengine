# Valuation Spine v1 Spec (Slice 1: Truth Map + Target Model)

## Purpose
Anchor the valuation flow with a clear current-state map, target contracts, and guardrails for address → comps → valuation outputs so Slice 2 can implement persistence and hydration without breaking determinism, auditability, or RLS.

## Non-Negotiables & Plan Tweaks
- Min closed comps must be configurable (default 3). Do **not** hard-code thresholds in UI/business logic; store as a policy token or org/provider config.
- Rename "Confidence" to "Valuation Confidence" in all UI/spec language to avoid collision with engine Confidence Grade.
- Address edits must create a new `valuation_run` and preserve history (no overwrites).
- `property_snapshots` caching must be org-scoped for v1 (no cross-tenant sharing).
- Snapshot TTL is policy-driven (`valuation.snapshot_ttl_hours`); confidence rubric is policy-driven (`valuation.confidence_rubric`).
- RentCast v1 evidence is **comparable sale listings**, not guaranteed closed sales; UI/provenance must state this and surface status breakdowns (active/inactive/other).
- Offer is an engine output shown on Dashboard; Market & Valuation should not collect Offer Price as an input or gate analysis on it.

## Inventory (Current State)
- **Market & Valuation block:** `apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx` (`UnderwritingSection` → `InputField` labels “ARV”, “As-Is Value”, “DOM (Zip, days)”, “MOI (Zip, months)”, “Price-to-List %”, “Local Discount (20th %)”); state set via `setDealValue` → `DealSession`.
- **Underwrite page orchestration:** `apps/hps-dealengine/app/(app)/underwrite/page.tsx`; uses `DealSession` state, `buildAnalyzeRequestPayload`, `analyze` (Edge `v1-analyze`), optional `saveRun` (Edge `v1-runs-save`), evidence banner.
- **Session state/persistence:** `apps/hps-dealengine/lib/dealSessionContext.tsx` holds in-memory `deal`, autosaves to `deal_working_states` via `upsertWorkingState` (`apps/hps-dealengine/lib/workingState.ts`) and hydrates from latest run or working state. No valuation_run table today.
- **Deal intake (address capture):**
  - UI: `apps/hps-dealengine/components/deals/NewDealForm.tsx` (street/city/state/zip + client info).
  - Routing: `/startup` (`apps/hps-dealengine/components/auth/StartupPage.tsx`) and `/deals` (`apps/hps-dealengine/app/(app)/deals/page.tsx`) invoke `createDealWithClientInfo`.
  - Persistence: `apps/hps-dealengine/lib/deals.ts` inserts into `public.deals` columns `address/city/state/zip` and mirrors into `payload.property.*`; org-scoped via RLS.
- **DB tables relevant now:**
  - `public.deals` (org-scoped) from `supabase/migrations/20251109000708_org_deals_and_audit_rls.sql`.
  - `public.deal_working_states` (per-user draft) from `supabase/migrations/20251228100000_deal_working_states.sql`.
  - `public.runs` (engine runs) - used by `v1-analyze` + `v1-runs-save`.
- **Comps section:** Underwrite CompsPanel renders valuationSnapshot.comps (property_snapshots) with provider/as-of/stub badges. Summary shows count, date range (comp listed/close), median distance, price variance (cv), concessions placeholder, status counts, and min-comps gating from policy. Refresh is user-click only (Re-run comps uses the valuation refresh handler).
- **State store:** React state via `DealSession` (Context) + autosave to `deal_working_states`. DB writes occur on deal creation, autosave drafts, and explicit run save; the Market & Valuation block does not persist directly to DB outside those flows.

### Current-State Diagram (Mermaid)
```mermaid
flowchart LR
  subgraph UI
    A[UnderwriteTab\nMarket & Valuation inputs]
    B[Underwrite Page\nAnalyze/Save buttons]
    D[Startup/Deals\nNewDealForm]
  end
  subgraph Session
    C[DealSession\nReact state]
  end
  subgraph DB
    E[(public.deals)]
    F[(deal_working_states)]
    G[(runs)]
  end
  subgraph Edge
    H[v1-analyze]
    I[v1-runs-save]
  end

  D -->|createDealWithClientInfo| E
  E -->|hydrate payload| C
  A -->|setDealValue| C
  C -->|autosave| F
  B -->|analyze payload| H -->|result shown in UI| B
  B -->|saveRun(input/output/trace)| I --> G
  C -->|hydrate from latest run or draft| B
```

## Target State (Slice 2+ Goals)
- Address edits trigger a new `valuation_run` (append-only) tied to the address snapshot; prior runs remain immutable.
- `property_snapshots` cache is org-scoped; connectors must never serve cross-tenant data.
- UI hydration flows from persisted `valuation_run` + `property_snapshots` (no silent recompute). Runs/reruns are deterministic via hashes.
- “Valuation Confidence” is the UI label; engine confidence grade remains a separate field.

### Target-State Diagram (Mermaid)
```mermaid
flowchart LR
  subgraph UI
    U1[Address Intake\n(NewDealForm / Address Editor)]
    U2[Market & Valuation block]
    U3[Comps View (to be built)]
    U4[Run Viewer/Hydrator]
  end
  subgraph Edge
    EF1[v1-connectors-proxy\n(org-scoped)]
    EF2[v1-valuation-run\n(new)]
  end
  subgraph DB
    DB1[(deals)]
    DB2[(property_snapshots\norg_id scoped)]
    DB3[(valuation_runs\nnew)]
    DB4[(runs)]
    DB5[(deal_working_states)]
  end

  U1 -->|create/update address| DB1
  U1 -->|request property data| EF1 --> DB2
  U2 -->|inputs + policy + snapshots| EF2 --> DB3
  EF2 -->|deterministic engine| DB4
  DB3 -->|hydrate| U4
  DB2 -->|hydrate comps/market| U2
  U2 -->|draft edits| DB5
```

## Field Mapping (Current → Target)
| Current UI Label | Current Storage | Target Contract Field | Source Type | Provenance Requirements | Notes |
| --- | --- | --- | --- | --- | --- |
| ARV | `deal.market.arv` in DealSession → autosave `deal_working_states.payload.deal.market.arv`; included in run input/output | `valuation_run.input.market.arv` | User-entered (until connectors arrive) | `source=user`, `as_of` (user entry timestamp), `window=null`, `sample_n=null` | Keep user vs connector origin explicit |
| As-Is Value | `deal.market.as_is_value` same path | `valuation_run.input.market.as_is_value` | User-entered | `source=user`, `as_of`, `window`, `sample_n` | Surface “Valuation Confidence” badge driven by run output |
| DOM (Zip, days) | `deal.market.dom_zip` | `valuation_run.input.market.dom_zip_days` | Computed/Connector (future) or user fallback | `source` (connector/provider/manual), `as_of`, `window`, `sample_n` | |
| MOI (Zip, months) | `deal.market.moi_zip` | `valuation_run.input.market.moi_zip_months` | Computed/Connector | `source`, `as_of`, `window`, `sample_n` | |
| Price-to-List % | `deal.market["price-to-list-pct"]` (stored as decimal) | `valuation_run.input.market.price_to_list_pct` | Computed/Connector or user | `source`, `as_of`, `window`, `sample_n` | Normalize decimal |
| Local Discount (20th %) | `deal.market.local_discount_20th_pct` (decimal) | `valuation_run.input.market.local_discount_pct_p20` | Policy/Config or Connector | `source`, `as_of`, `window`, `sample_n` | Default path should be policy/market config, not UI constant |
| Address (street/city/state/zip) | `public.deals` columns + `payload.property.*`; set only at creation | `deals.address_*` + `valuation_run.address_snapshot` | User-entered; normalized via policy/provider | `source=user`, `as_of`, `hash` of normalized address | Address edits must append a new `valuation_run` |
| Valuation Confidence (UI label) | Currently “Confidence” via run `confidence_grade` | `valuation_run.output.valuation_confidence` (display) + underlying `confidence_grade` | Computed | `source=engine`, `as_of`=run timestamp, `policy_version` | UI copy must say “Valuation Confidence” |
| Comp Set (missing today) | N/A | `property_snapshot.comps[]` + `valuation_run.input.comps[]` | Connector/provider | `source=provider_id/name`, `as_of`, `window`, `sample_n`, `query_radius_miles` | Min closed comps threshold via policy/config (default 3) |

## Proposed Target Data Contracts (v1)
```ts
// Org-scoped cache; no cross-tenant sharing
type PropertySnapshot = {
  id: string;
  org_id: string;
  address_fingerprint: string; // normalized address hash
  source: "mls" | "county" | "tax" | "manual" | "rentcast";
  provider?: string | null;
  as_of: string;
  window_days?: number | null;
  sample_n?: number | null;
  comps?: Comp[];
  market?: MarketSnapshot | null;
  raw?: Record<string, unknown>;
  created_at: string;
  expires_at?: string | null;
  stub?: boolean;
};

type MarketSnapshot = {
  dom_zip_days?: number | null;
  moi_zip_months?: number | null;
  price_to_list_pct?: number | null;
  local_discount_pct_p20?: number | null;
  avm_price?: number | null;
  avm_price_range_low?: number | null;
  avm_price_range_high?: number | null;
  source: string;
  as_of: string;
  window_days?: number | null;
  sample_n?: number | null;
};

type Comp = {
  id: string;
  address: string;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  close_date?: string | null;
  price?: number | null;
  price_per_sqft?: number | null;
  sqft?: number | null;
  beds?: number | null;
  baths?: number | null;
  lot_sqft?: number | null;
  year_built?: number | null;
  distance_miles?: number | null;
  correlation?: number | null;
  days_old?: number | null;
  days_on_market?: number | null;
  status?: string | null;
  listing_type?: string | null;
  comp_kind?: "sale_listing" | "closed_sale" | "rental" | null;
  source: string; // provider id/name
  as_of: string;
  hash?: string; // for determinism
};

type ValuationRunStatus = "queued" | "running" | "succeeded" | "failed";

type ValuationRun = {
  id: string;
  org_id: string;
  deal_id: string;
  address_snapshot: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    fingerprint: string;
  };
  input: {
    market: {
      arv?: number | null;
      as_is_value?: number | null;
      dom_zip_days?: number | null;
      moi_zip_months?: number | null;
      price_to_list_pct?: number | null;
      local_discount_pct_p20?: number | null;
    };
    comps?: Comp[] | null;
    policy_version_id?: string | null;
    property_snapshot_id?: string | null;
    property_snapshot_hash?: string | null;
    min_closed_comps_required?: number | null;
    posture: "conservative" | "base" | "aggressive";
    source: "user" | "connector";
  };
  output: {
    arv?: number | null;
    arv_range_low?: number | null;
    arv_range_high?: number | null;
    as_is_value?: number | null;
    valuation_confidence?: "A" | "B" | "C" | null; // UI label uses "Valuation Confidence"
    comp_count?: number | null;
    comp_set_stats?: {
      median_distance_miles?: number | null;
      median_correlation?: number | null;
      median_days_old?: number | null;
    };
    warnings?: string[] | null;
    messages?: string[] | null;
    rationale?: string | null;
  };
  provenance: {
    provider_id?: string | null;
    provider_name?: string | null;
    endpoints?: string[] | null;
    source: "connector" | "user" | "policy";
    as_of: string;
    window_days?: number | null;
    sample_n?: number | null;
    min_closed_comps_required?: number | null;
    property_snapshot_id?: string | null;
  };
  hashes: {
    input_hash: string;
    output_hash: string;
    policy_hash?: string | null;
    run_hash?: string | null;
  };
  status: ValuationRunStatus;
  created_by: string;
  created_at: string;
  failed_reason?: string | null;
};
```

### Min Closed Comps Configuration
- Default threshold should be **policy-driven** (e.g., `policy_versions -> valuation.min_closed_comps`, default 3) with the option for provider-level override per org. UI must read from policy/config; no literals in components.

## Files Expected to Change in Slice 2+
- UI: `apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx` (Market & Valuation), future Comps component (new), `/underwrite` and `/overview` hydration.
- Session: `apps/hps-dealengine/lib/dealSessionContext.tsx`, `lib/workingState.ts`.
- Edge Functions: new valuation run creator (name TBD), connectors proxy usage.
- DB: migrations for `valuation_runs`, `property_snapshots` (org-scoped), address audit triggers.
- Contracts: `packages/contracts` (valuation run + snapshot schemas).
- Tests: engine/unit for valuation run determinism; UI tests once comps UI exists.

## OPEN QUESTIONS
- Which provider(s) supply comps/market stats for v1? (MLS? county? none yet.)
- Where should the min closed comps token live today (policy JSON vs provider config), and how is it surfaced to the UI?
- What is the canonical deal payload authority for valuation fields (engine contract vs `DealSession` shape)? Do we introduce a dedicated valuation contract?
- Is there an existing address edit flow? If we add one, how do we backfill/retain existing runs tied to the old address?
- Should `valuation_run` live alongside `runs` or as a sibling table with a foreign key to `runs`? What retention/TTL applies?
- How should property normalization be performed (USPS, Smarty, custom) to derive `address_fingerprint`?
- What hashes should drive dedupe (address_fingerprint + policy_hash + input_hash + org_id?) and how do we replay valuations independently of full underwriting runs?
- Slice 5 DoD for the "Market & Valuation UI rebuild into Facts / Market / Comps / Confidence" isn't present (PLAN.docx missing). Which exact fields/actions belong in each lane and what acceptance criteria/gating copy should the UI follow?
- Should the "Facts" lane surface specific property metrics (beds/baths/sqft/year built/subject fingerprint) and, if so, what is the canonical source (deal payload vs valuation/property snapshot) and formatting?
- Offer vs Contract semantics: Offer is a computed output; contract_price_executed stays read-only. Where is the authoritative "under contract" state and executed contract price meant to be set going forward?
- Which output key is canonical for Offer (primary_offer vs instant_cash_offer) across postures?
- Do comps include a concessions field, and what is the canonical naming/type for it when present?

## Verification SQL (post-fix spine, closed-sales + AVM raw expected)

Expected outcomes for deal `f84bab8d-e377-4512-a4c8-0821c23a82ea` after a forced rerun:
- New `valuation_runs.created_at` > 2025-12-13.
- Output contains `suggested_arv_source_method`, `suggested_arv_comp_kind_used`, `warning_codes`, `avm_reference_*`.
- Snapshot raw includes both `closed_sales` (with request/response) and `avm_request`.

Top 5 latest valuation_runs (not just limit 1):

```sql
select
  id as valuation_run_id,
  created_at,
  status,
  output->>'suggested_arv_source_method' as suggested_arv_source_method,
  output->>'suggested_arv_comp_kind_used' as suggested_arv_comp_kind_used,
  output->'warning_codes' as warning_codes,
  output->>'avm_reference_price' as avm_reference_price,
  output->>'avm_reference_range_low' as avm_reference_range_low,
  output->>'avm_reference_range_high' as avm_reference_range_high
from valuation_runs
where deal_id = 'f84bab8d-e377-4512-a4c8-0821c23a82ea'
order by created_at desc
limit 5;
```

Latest snapshot + raw key inspection (joins the newest run above):

```sql
with vr as (
  select *
  from valuation_runs
  where deal_id = 'f84bab8d-e377-4512-a4c8-0821c23a82ea'
  order by created_at desc
  limit 1
),
ps as (
  select *
  from property_snapshots
  where id = (select property_snapshot_id from vr)
)
select
  vr.id as valuation_run_id,
  vr.created_at as valuation_created_at,
  ps.as_of as snapshot_as_of,
  ps.expires_at,
  (ps.raw -> 'closed_sales') is not null as has_closed_sales_raw,
  (ps.raw -> 'avm_request') is not null as has_avm_request_raw,
  (select count(*) from jsonb_array_elements(ps.comps) c where (c->>'comp_kind') = 'closed_sale') as closed_sale_comps,
  (select count(*) from jsonb_array_elements(ps.comps) c where (c->>'comp_kind') = 'sale_listing') as sale_listing_comps,
  (vr.output->'warning_codes') as warning_codes,
  vr.output->>'avm_reference_price' as avm_reference_price,
  vr.output->>'avm_reference_range_low' as avm_reference_range_low,
  vr.output->>'avm_reference_range_high' as avm_reference_range_high,
  ps.raw -> 'closed_sales' ->> 'request' as closed_sales_request,
  ps.raw -> 'closed_sales' -> 'response' as closed_sales_response_summary,
  ps.raw -> 'avm_request' as avm_request_raw
from vr
join ps on true;
```
