# Data Flow Map
Date: 2026-01-03
Auditor: Claude Code

## Overview

This document maps the complete data flow from user input to UI display in the HPS DealEngine.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UI LAYER                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ /overview   │ │ /underwrite │ │ /sandbox    │ │ /intake (public)        ││
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └───────────┬─────────────┘│
│         │               │               │                     │              │
│         └───────────────┴───────┬───────┴─────────────────────┘              │
│                                 │                                            │
│  ┌──────────────────────────────▼──────────────────────────────────────────┐│
│  │                      REACT HOOKS & CONTEXT                               ││
│  │  useAnalyze() │ useDeal() │ useSnapshot() │ useIntakeAutoSave()         ││
│  │              DealSessionContext │ AnalyzeBus                             ││
│  └──────────────────────────────┬──────────────────────────────────────────┘│
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE FUNCTIONS                                     │
│  ┌─────────────┐ ┌─────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│  │ v1-analyze  │ │ v1-valuation-*  │ │ v1-evidence-*  │ │ v1-intake-*    │  │
│  └──────┬──────┘ └────────┬────────┘ └───────┬────────┘ └───────┬────────┘  │
│         │                 │                   │                  │           │
│         └─────────────────┴───────────────────┴──────────────────┘           │
│                                  │                                           │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ENGINE PACKAGE                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    computeUnderwriting()                               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐  │  │
│  │  │computeFloor │ │computeCeil  │ │computeRisk  │ │computeOfferMenu │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                  │                                           │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTRACTS PACKAGE                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ AnalyzeOutputsSchema │ OfferMenuCashSchema │ HviUnlockSchema          │  │
│  │ RiskSummarySchema │ EvidenceSummarySchema │ WorkflowStateSchema       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   deals     │ │    runs     │ │policy_vers  │ │ intake_submissions      ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ attachments │ │audit_logs   │ │organizations│ │ deal_import_*           ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Flow 1: Deal Creation

```
User Input (NewDealForm)
        │
        ▼
┌───────────────────────────────────────┐
│ Form Fields:                          │
│ - clientName, clientPhone, clientEmail│
│ - propertyStreet, city, state, zip    │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ API: supabase.from('deals').insert()  │
│ - Validates via Zod schema            │
│ - Assigns org_id from RLS             │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Database: public.deals                │
│ - id, org_id, payload_json            │
│ - client_name, client_phone           │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Response: { deal_id }                 │
│ - Navigate to /deals/{id}             │
└───────────────────────────────────────┘
```

---

## Flow 2: Underwriting Analysis

```
User Action: Click "Analyze" or navigate to deal
        │
        ▼
┌───────────────────────────────────────┐
│ UI: useAnalyze() hook                 │
│ - Reads deal from DealSessionContext  │
│ - Gets posture from sandbox settings  │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Edge Function: v1-analyze             │
│ Request:                              │
│ { deal_id, posture, overrides? }      │
└───────────────────────────────────────┘
        │
        ├──────────────────────────────────────────┐
        │                                          │
        ▼                                          ▼
┌───────────────────────────┐      ┌───────────────────────────┐
│ Load deal from DB         │      │ Load policy from DB       │
│ - deals.payload_json      │      │ - policy_versions         │
│ - attachments (evidence)  │      │ - Apply sandbox overrides │
└───────────────────────────┘      └───────────────────────────┘
        │                                          │
        └──────────────┬───────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Engine: computeUnderwriting(input, policy, trace)                         │
│                                                                           │
│ Step 1: computeAiv()           → outputs.aiv                              │
│ Step 2: computeFloorInvestor() → outputs.floor_investor                   │
│ Step 3: computePayoffEssentials() → outputs.payoff_plus_essentials        │
│ Step 4: computeRespectFloor()  → outputs.respect_floor                    │
│         Trace: RESPECT_FLOOR                                              │
│                                                                           │
│ Step 5: computeBuyerCeiling()  → outputs.buyer_ceiling, mao_*             │
│         Trace: BUYER_CEILING, HOLD_COST_POLICY                            │
│                                                                           │
│ Step 6: computeRiskGates()     → outputs.risk_summary                     │
│         Trace: RISK_GATES_POLICY                                          │
│                                                                           │
│ Step 7: computeEvidenceFreshness() → outputs.evidence_summary             │
│         Trace: EVIDENCE_FRESHNESS_POLICY                                  │
│                                                                           │
│ Step 8: computeConfidenceGrade() → outputs.confidence_grade               │
│         Trace: CONFIDENCE_POLICY                                          │
│                                                                           │
│ Step 9: computeWorkflowState() → outputs.workflow_state                   │
│         Trace: WORKFLOW_STATE_POLICY                                      │
│                                                                           │
│ Step 10: computeOfferMenuCash() → outputs.offer_menu_cash                 │
│          Trace: OFFER_MENU_ELIGIBILITY_OVERLAY                            │
│                                                                           │
│ Step 11: computeHviUnlocks()   → outputs.hvi_unlocks                      │
│          Trace: HVI_UNLOCK_LOOP                                           │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Save to DB: public.runs               │
│ - input, output, trace, policy_hash   │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Response to UI:                       │
│ { run_id, outputs, trace }            │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ UI Components Render (Dumb Renderers):                                    │
│                                                                           │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│ │ TopDealKpis     │ │ OfferMenu       │ │ConfidenceUnlock │               │
│ │ - arv           │ │ - offer_menu_   │ │ - hvi_unlocks   │               │
│ │ - buyer_ceiling │ │   cash          │ │                 │               │
│ │ - respect_floor │ │                 │ │                 │               │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│                                                                           │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│ │ RiskGatesPanel  │ │ EvidencePanel   │ │ WorkflowBadge   │               │
│ │ - risk_summary  │ │ - evidence_     │ │ - workflow_state│               │
│ │                 │ │   summary       │ │                 │               │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘               │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Flow 3: Evidence Upload

```
User Action: Upload evidence file
        │
        ▼
┌───────────────────────────────────────┐
│ UI: FileUploader component            │
│ - Select file, kind (payoff_letter)   │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Edge Function: v1-evidence-start      │
│ Request:                              │
│ { deal_id, kind, filename, mime, size}│
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Response:                             │
│ { evidence_id, upload_url, token }    │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Direct Upload to Supabase Storage     │
│ - PUT to signed upload_url            │
│ - Bucket: evidence                    │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Database: hps.attachments             │
│ - deal_id, kind, storage_path         │
│ - uploaded_at, uploaded_by            │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Re-trigger Analysis                   │
│ - Evidence now included in input      │
│ - EVIDENCE_FRESHNESS_POLICY recalc    │
└───────────────────────────────────────┘
```

---

## Flow 4: Public Intake Form

```
Client Access: Public intake link
        │
        ▼
┌───────────────────────────────────────┐
│ URL: /intake/[token]                  │
│ - No authentication required          │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Edge Function: v1-intake-validate     │
│ - Validates token                     │
│ - Returns schema, prefill data        │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ UI: IntakeForm component              │
│ - Multi-section form                  │
│ - Auto-save drafts                    │
└───────────────────────────────────────┘
        │
        │ (Auto-save on field change)
        ▼
┌───────────────────────────────────────┐
│ Edge Function: v1-intake-save-draft   │
│ - Updates intake_submissions          │
│ - Saves section_index for resume      │
└───────────────────────────────────────┘
        │
        │ (On submit)
        ▼
┌───────────────────────────────────────┐
│ Edge Function: v1-intake-submit       │
│ - Validates all required fields       │
│ - Computes payload_hash               │
│ - Updates status to SUBMITTED         │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Database: intake_submissions          │
│ - payload_json, payload_hash          │
│ - status: SUBMITTED                   │
└───────────────────────────────────────┘
        │
        │ (Staff reviews via /intake-inbox)
        ▼
┌───────────────────────────────────────┐
│ Edge Function: v1-intake-populate     │
│ - Creates deal from submission        │
│ - Links files to deal                 │
│ - Updates populated_deal_id           │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Database: deals                       │
│ - New deal created                    │
│ - Client info populated               │
│ - Property info populated             │
└───────────────────────────────────────┘
```

---

## Flow 5: Bulk Import

```
User Action: Upload CSV file
        │
        ▼
┌───────────────────────────────────────┐
│ UI: ImportWizard - Step 1             │
│ - Parse CSV headers                   │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Edge Function: v1-import-job-create   │
│ - Creates import_job record           │
│ - Returns job_id                      │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ UI: ImportWizard - Step 2             │
│ - Map CSV columns to deal fields      │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Edge Function: v1-import-items-upsert │
│ - Batch insert import_items           │
│ - Compute dedupe_key per item         │
│ - Flag duplicates                     │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Database: deal_import_items           │
│ - payload_json per row                │
│ - dedupe_key (SHA256)                 │
│ - is_duplicate flag                   │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ UI: ImportWizard - Step 3             │
│ - Review items, duplicates            │
│ - Select items to import              │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Edge Function: v1-import-promote      │
│ - Creates deal per selected item      │
│ - Updates promoted_deal_id            │
│ - Skips duplicates                    │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Database: deals                       │
│ - New deals created                   │
│ - Linked back to import_items         │
└───────────────────────────────────────┘
```

---

## Flow 6: Portfolio Snapshot

```
User Action: View Dashboard
        │
        ▼
┌───────────────────────────────────────┐
│ UI: useSnapshot() hook                │
│ - Request portfolio snapshot          │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Edge Function: v1-snapshot-generate   │
│ - Fetches all org deals               │
│ - Fetches latest runs per deal        │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Engine: computePortfolioSnapshot()    │
│ - Aggregates by workflow_state        │
│ - Sums ARV, calculates avg confidence │
│ - Computes risk distribution          │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Database: dashboard_snapshots         │
│ - snapshot_data (JSONB)               │
│ - as_of_date                          │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ UI: Dashboard components              │
│ - Portfolio summary cards             │
│ - Charts by workflow/risk             │
│ - Deal listing                        │
└───────────────────────────────────────┘
```

---

## Trace Frame Flow

```
Engine Computation
        │
        ├── RESPECT_FLOOR
        │   └── { floor_investor, payoff_plus_essentials, composition_mode }
        │
        ├── BUYER_CEILING
        │   └── { arv, margin, repairs, carry_months, buyer_ceiling }
        │
        ├── HOLD_COST_POLICY
        │   └── { hold_cost_per_month, total_hold_cost }
        │
        ├── RISK_GATES_POLICY
        │   └── { gates: { insurability, title, flood, ... } }
        │
        ├── EVIDENCE_FRESHNESS_POLICY
        │   └── { freshness_by_kind, any_blocking, missing_critical }
        │
        ├── CONFIDENCE_POLICY
        │   └── { grade, reasons, rubric_raw }
        │
        ├── WORKFLOW_STATE_POLICY
        │   └── { workflow_state, reasons }
        │
        ├── OFFER_MENU_ELIGIBILITY_OVERLAY
        │   └── { eligibility, blocking_gate_keys, blocking_evidence_kinds }
        │
        └── HVI_UNLOCK_LOOP
            └── { standard_price, premium_price, unlocks }
```

---

## Data Dependencies

```
          ┌──────────────────────────────────────────────────┐
          │                    ARV                           │
          └──────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
          ┌─────────────────┐     ┌─────────────────┐
          │      AIV        │     │  BUYER_CEILING  │
          │ (AIV = ARV *    │     │ (MAO = ARV *    │
          │  condition adj) │     │  margin - costs)│
          └─────────────────┘     └─────────────────┘
                    │                       │
                    ▼                       │
          ┌─────────────────┐               │
          │ FLOOR_INVESTOR  │               │
          │ (AIV * discount)│               │
          └─────────────────┘               │
                    │                       │
                    ▼                       │
          ┌─────────────────┐               │
          │ PAYOFF_FLOOR    │               │
          │ (mortgage + lien│               │
          │  + essentials)  │               │
          └─────────────────┘               │
                    │                       │
                    ▼                       │
          ┌─────────────────┐               │
          │ RESPECT_FLOOR   │               │
          │ (max of floors) │               │
          └─────────────────┘               │
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌─────────────────┐
                    │   OFFER_MENU    │
                    │ (floor→ceiling) │
                    └─────────────────┘
```
