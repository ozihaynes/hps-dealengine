# Runbook: Reproducing ARV Calculation

Prereqs:
- Env vars: SUPABASE_URL, SUPABASE_ANON_KEY (Edge client); RENTCAST_API_KEY for live data (optional, stub used if absent); NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY for UI. Caller must have memberships row for target org and a deal with address/city/state/zip set.

Steps:
1) Select/create deal: use app Deals page or insert into public.deals (org-scoped, address fields populated). Confirm JWT has membership to the deal org.
2) Trigger valuation run:
   - Via UI: Underwrite page → "Refresh Valuation" (calls apps/hps-dealengine/lib/valuation.ts invokeValuationRun).
   - Via API: POST to Supabase Edge v1-valuation-run with caller JWT.
     Example payload: { "deal_id": "<deal-uuid>", "posture": "base", "force_refresh": false }
   - Response: { ok: true, valuation_run: {...}, snapshot: {...}, deduped?: true }
3) Review comps/confidence: UI renders valuationRun/output and comps from snapshot; gating vs policy min_closed_comps_required.
4) Apply suggested ARV to deal:
   - UI: "Use Suggested ARV" button in Market & Valuation.
   - API: call v1-valuation-apply-arv with { deal_id, valuation_run_id } using caller JWT. Updates deals.payload.market.arv/arv_source/arv_valuation_run_id/arv_as_of.
5) (Optional) Manual override:
   - UI: Override ARV/As-Is buttons (requires 10+ char reason).
   - API: v1-valuation-override-market with { deal_id, field: "arv"|"as_is_value", value, reason, valuation_run_id? }.
6) Run underwriting engine:
   - UI: "Analyze Deal" invokes v1-analyze with current deal payload (including ARV); optional "Save" calls v1-runs-save to persist runs with hashes.
7) Outputs/persistence:
   - property_snapshots row cached per address/source with expires_at.
   - valuation_runs row deduped by hashes; status failed if comps missing.
   - deals.payload.market updated by apply/override.
   - runs table holds engine outputs/traces when saved.

If environment missing (e.g., no policy valuation tokens or no deal), v1-valuation-run returns policy_missing_token/deal_not_found errors. No local CLI wrapper beyond supabase functions invoke; no standalone CLI/cron present.